"""HTTP API and page views for the survey runner (Brief 1 + Brief 2).

JSON API endpoints are CSRF-exempt (anonymous, no authenticated session to
forge). Page views are standard Django views that render templates.

The channel is read from the server session at submit, never from the body
(spec blocker #2). The email endpoint never reads or stores a response id
(spec blocker #1).
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone as dt_timezone

from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.http import JsonResponse
from django.shortcuts import redirect, render
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import catalogue
from .channel import channel_from_session
from .models import SurveyAnswer, SurveyEmail, SurveyResponse
from .validation import AnswerError, validate_atom, validate_complete


# ── Page views ────────────────────────────────────────────────────────────────

def landing(request):
    """Host/landing page — role selector (Q0) and study overview."""
    cat = catalogue.catalogue()
    q0 = cat.get('q0', {})
    wave_cfg = cat.get('meta', {}).get('wave', {})
    cutoff_iso = wave_cfg.get('y1_cutoff', '2026-08-31T23:59:59+03:00')

    try:
        cutoff_dt = datetime.fromisoformat(cutoff_iso)
        if cutoff_dt.tzinfo is None:
            cutoff_dt = cutoff_dt.replace(tzinfo=dt_timezone.utc)
        is_y1 = timezone.now() <= cutoff_dt.astimezone(dt_timezone.utc).replace(tzinfo=timezone.utc)
        days_remaining = max(0, (cutoff_dt.date() - date.today()).days)
    except ValueError:
        is_y1 = True
        days_remaining = 0

    return render(request, 'survey/landing.html', {
        'q0_options': q0.get('options', []),
        'is_y1': is_y1,
        'days_remaining': days_remaining,
    })


def runner(request):
    """Survey runner shell. ?path= param required; invalid paths redirect to landing."""
    path = request.GET.get('path', '').strip()
    if path not in catalogue.valid_paths():
        return redirect('survey:landing')
    return render(request, 'survey/runner.html', {'path': path})


# ── JSON API ───────────────────────────────────────────────────────────────────

def _json_body(request) -> dict:
    try:
        return json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        raise AnswerError("malformed JSON body")


def _err(message, status=400):
    return JsonResponse({"ok": False, "error": str(message)}, status=status)


@require_GET
def get_catalogue(request):
    """Full catalogue for the runner. Read-only, safe to cache."""
    return JsonResponse(catalogue.catalogue())


@require_GET
def count(request):
    """Live response counter for the landing page. Cached 60 s per spec §12."""
    cached = cache.get('survey_count_data')
    if cached is None:
        n = SurveyResponse.objects.filter(status=SurveyResponse.Status.COMPLETED).count()
        if n < 300:
            target, percent = 300, round(n / 300 * 100, 1)
        elif n < 500:
            target, percent = 500, round(n / 500 * 100, 1)
        elif n < 1000:
            target, percent = 1000, round(n / 1000 * 100, 1)
        else:
            target, percent = None, None
        cached = {'count': n, 'target': target, 'percent': percent}
        cache.set('survey_count_data', cached, 60)
    return JsonResponse(cached)


@csrf_exempt
@require_POST
def start(request):
    """Create the partial response on path start (after Q0).

    Accepts {path} or {role} (a Q0 option key). Channel and wave are server-set.
    """
    try:
        body = _json_body(request)
    except AnswerError as e:
        return _err(e)

    path = body.get("path") or catalogue.path_for_role(body.get("role", ""))
    if path not in catalogue.valid_paths():
        return _err("unknown path/role")

    resp = SurveyResponse.objects.create(
        path=path,
        channel=channel_from_session(request),
        status=SurveyResponse.Status.PARTIAL,
        wave=catalogue.wave_for(timezone.now()),
    )
    return JsonResponse({"ok": True, "response_id": str(resp.response_id)})


def _save_answer(response: SurveyResponse, question_id: str, value) -> None:
    """Validate and persist one answer. Multi-select is replace-all (so
    deselection works); everything else is a single upserted row."""
    validate_atom(response.path, question_id, value)
    base, _row = catalogue.split_grid_id(question_id)
    q = catalogue.get_question(response.path, base)

    with transaction.atomic():
        if q["type"] == "multi_select":
            response.answers.filter(question_id=base).delete()
            vals = value if isinstance(value, (list, tuple)) else [value]
            SurveyAnswer.objects.bulk_create(
                [SurveyAnswer(response=response, question_id=base, value=v) for v in vals]
            )
        else:
            # single / ranking / free_text / grid-row: one row per question_id.
            response.answers.filter(question_id=question_id).delete()
            SurveyAnswer.objects.create(
                response=response, question_id=question_id, value=value
            )


def _get_response(response_id):
    """Fetch a response; return (resp, None) or (None, error_response)."""
    try:
        return SurveyResponse.objects.get(pk=response_id), None
    except (SurveyResponse.DoesNotExist, ValidationError, ValueError):
        return None, _err("unknown response", status=404)


@csrf_exempt
@require_POST
def save_answer(request):
    """Persist a single answer as the respondent advances."""
    try:
        body = _json_body(request)
    except AnswerError as e:
        return _err(e)

    resp, err = _get_response(body.get("response_id"))
    if err:
        return err
    if resp.status == SurveyResponse.Status.COMPLETED:
        return _err("response already completed", status=409)

    qid, value = body.get("question_id"), body.get("value")
    if not qid:
        return _err("question_id required")
    try:
        _save_answer(resp, qid, value)
    except AnswerError as e:
        return _err(e)
    return JsonResponse({"ok": True})


@csrf_exempt
@require_POST
def submit(request):
    """Finalize a response. Optionally bulk-saves {answers} first, then
    validates the full set and flips to completed. Idempotent."""
    try:
        body = _json_body(request)
    except AnswerError as e:
        return _err(e)

    resp, err = _get_response(body.get("response_id"))
    if err:
        return err

    # Idempotent: re-POST of a completed response is a no-op success.
    if resp.status == SurveyResponse.Status.COMPLETED:
        return JsonResponse({"ok": True, "status": "completed", "idempotent": True})

    answers = body.get("answers") or {}
    try:
        for qid, value in answers.items():
            _save_answer(resp, qid, value)
        rows = list(resp.answers.values_list("question_id", "value"))
        validate_complete(resp.path, rows)
    except AnswerError as e:
        return _err(e)

    resp.status = SurveyResponse.Status.COMPLETED
    resp.completed_at = timezone.now()
    resp.save(update_fields=["status", "completed_at"])
    return JsonResponse({"ok": True, "status": "completed"})


@csrf_exempt
@require_POST
def email_optin(request):
    """World 2 opt-in. Decoupled by construction: this endpoint reads ONLY the
    email (and an optional honeypot). It does NOT read, accept, or store any
    response id — even if the body carries one. (Spec blocker #1.)"""
    try:
        body = _json_body(request)
    except AnswerError as e:
        return _err(e)

    # Honeypot: a hidden field real users never fill. If filled, accept silently
    # (return ok) without writing — denies bots the signal that they were caught.
    if body.get("website"):
        return JsonResponse({"ok": True})

    email = (body.get("email") or "").strip()
    try:
        validate_email(email)
    except ValidationError:
        return _err("invalid email")

    # We deliberately ignore every other key in the body, including any
    # response_id a client might send. World 1 is never referenced here.
    SurveyEmail.objects.create(email=email, wave=catalogue.wave_for(timezone.now()))
    return JsonResponse({"ok": True})
