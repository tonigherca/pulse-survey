"""Integrity tests for the survey backend.

These assert the properties the risk scan flagged as load-bearing: the anonymity
wall, server-side channel capture, branching, submission lifecycle/idempotency,
value validation, and the decoupled email endpoint. They run on SQLite (no
Postgres needed); the Postgres-only view/grant migrations no-op under SQLite.
"""
from __future__ import annotations

import json

from django.test import Client, TestCase
from django.urls import reverse

from . import catalogue
from .models import SurveyAnswer, SurveyEmail, SurveyResponse


def autofill(path: str, *, user: bool = True) -> dict:
    """Build a complete, valid submit payload for a path from the catalogue.

    user=False forces the non-user branch on the segmentation question so the
    conditional questions get skipped.
    """
    answers: dict[str, object] = {}
    for q in catalogue.iter_questions(path):
        qid, qtype = q["id"], q["type"]
        if qtype == "single_select":
            opts = list(catalogue.option_keys(q))
            if not user and q.get("segmentation"):
                answers[qid] = "school_none"  # D4 non-user
            else:
                answers[qid] = sorted(opts)[0]
        elif qtype == "multi_select":
            if not user and q.get("segmentation"):
                answers[qid] = [q["exclusive_option"]]
            else:
                non_excl = [k for k in catalogue.option_keys(q) if k != q.get("exclusive_option")]
                answers[qid] = [sorted(non_excl)[0]]
        elif qtype == "ranking":
            answers[qid] = [o["key"] for o in q["options"]]
        elif qtype == "likert_grid":
            point = catalogue.catalogue()["scales"][q["scale"]]["points"][0]["key"]
            for row in q["rows"]:
                answers[f"{qid}.{row['key']}"] = point
        elif qtype == "free_text":
            continue  # optional

    base_map = {}
    for k, v in answers.items():
        base, _ = catalogue.split_grid_id(k)
        base_map.setdefault(base, v)
    skipped = catalogue.skipped_questions(path, base_map)
    return {k: v for k, v in answers.items() if catalogue.split_grid_id(k)[0] not in skipped}


class ApiMixin:
    def setUp(self):
        self.c = Client()

    def post(self, name, payload, **kw):
        return self.c.post(reverse(name), data=json.dumps(payload),
                           content_type="application/json", **kw)

    def start(self, path="director", **kw):
        r = self.post("survey:start", {"path": path}, **kw)
        return r.json()["response_id"]


class AnonymityWallTest(ApiMixin, TestCase):
    def test_email_table_has_no_link_to_responses(self):
        for f in SurveyEmail._meta.get_fields():
            self.assertNotEqual(getattr(f, "related_model", None), SurveyResponse)

    def test_email_endpoint_ignores_supplied_response_id(self):
        rid = self.start()
        r = self.post("survey:email", {"email": "a@b.ro", "response_id": rid,
                                       "value": "smuggled"})
        self.assertEqual(r.status_code, 200)
        em = SurveyEmail.objects.get()
        self.assertEqual(em.email, "a@b.ro")
        self.assertFalse(hasattr(em, "response_id"))
        self.assertEqual(SurveyResponse.objects.get(pk=rid).status, "partial")


class ChannelCaptureTest(ApiMixin, TestCase):
    def test_src_param_recorded_from_session(self):
        self.c.get(reverse("survey:catalogue") + "?src=gads")
        rid = self.start()
        self.assertEqual(SurveyResponse.objects.get(pk=rid).channel, "gads")

    def test_unknown_src_becomes_other(self):
        self.c.get(reverse("survey:catalogue") + "?src=tiktok")
        rid = self.start()
        self.assertEqual(SurveyResponse.objects.get(pk=rid).channel, "other")

    def test_no_src_defaults_web(self):
        rid = self.start()
        self.assertEqual(SurveyResponse.objects.get(pk=rid).channel, "web")

    def test_channel_in_body_is_ignored(self):
        r = self.post("survey:start", {"path": "director", "channel": "fb"})
        rid = r.json()["response_id"]
        self.assertEqual(SurveyResponse.objects.get(pk=rid).channel, "web")


class BranchingTest(ApiMixin, TestCase):
    def test_nonuser_director_skips_adoption_questions(self):
        rid = self.start("director")
        answers = autofill("director")
        answers["AD0"] = ["none"]
        answers.pop("A4", None)
        answers.pop("A8", None)
        for k in list(answers):
            if k == "A5" or k.startswith("A5."):
                answers.pop(k)
        r = self.post("survey:submit", {"response_id": rid, "answers": answers})
        self.assertEqual(r.json().get("status"), "completed", r.json())

    def test_answer_to_skipped_question_is_rejected(self):
        rid = self.start("director")
        answers = autofill("director")
        answers["AD0"] = ["none"]  # makes A4/A5/A8 skipped, but we leave them in
        r = self.post("survey:submit", {"response_id": rid, "answers": answers})
        self.assertEqual(r.status_code, 400)
        self.assertIn("skipped", r.json()["error"])

    def test_parent_school_none_skips_conditionals(self):
        rid = self.start("parent")
        answers = autofill("parent", user=False)  # D4 = school_none
        r = self.post("survey:submit", {"response_id": rid, "answers": answers})
        self.assertEqual(r.json().get("status"), "completed", r.json())


class ValidationTest(ApiMixin, TestCase):
    def _save(self, rid, qid, value):
        return self.post("survey:answer", {"response_id": rid,
                                            "question_id": qid, "value": value})

    def test_invalid_option_rejected(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "AF4", "bogus").status_code, 400)

    def test_grid_row_value_validated(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "A3.siiir", "minim").status_code, 200)
        self.assertEqual(self._save(rid, "A3.siiir", "wrong").status_code, 400)
        self.assertEqual(self._save(rid, "A3.unknownrow", "minim").status_code, 400)

    def test_free_text_length_capped(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "A11", "x" * 300).status_code, 200)
        self.assertEqual(self._save(rid, "A11", "x" * 301).status_code, 400)

    def test_ranking_must_be_full_permutation(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "A7", ["pret", "usurinta"]).status_code, 400)
        full = [o["key"] for o in catalogue.get_question("director", "A7")["options"]]
        self.assertEqual(self._save(rid, "A7", full).status_code, 200)

    def test_foreign_question_id_rejected(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "B1", "catalog").status_code, 400)

    def test_exclusive_multi_cannot_combine(self):
        rid = self.start("director")
        self.assertEqual(self._save(rid, "AD0", ["catalog", "none"]).status_code, 400)


class SubmissionLifecycleTest(ApiMixin, TestCase):
    def test_start_creates_partial(self):
        rid = self.start("teacher")
        self.assertEqual(SurveyResponse.objects.get(pk=rid).status, "partial")

    def test_double_submit_is_idempotent(self):
        rid = self.start("inspector")
        self.post("survey:submit", {"response_id": rid, "answers": autofill("inspector")})
        r2 = self.post("survey:submit", {"response_id": rid})
        self.assertTrue(r2.json().get("idempotent"))
        self.assertEqual(SurveyResponse.objects.get(pk=rid).status, "completed")

    def test_resaving_same_answer_does_not_duplicate(self):
        rid = self.start("director")
        for _ in range(3):
            self.post("survey:answer", {"response_id": rid, "question_id": "AF4",
                                        "value": "publica"})
        self.assertEqual(SurveyAnswer.objects.filter(response_id=rid,
                                                     question_id="AF4").count(), 1)

    def test_multiselect_writes_one_row_per_option(self):
        rid = self.start("director")
        self.post("survey:answer", {"response_id": rid, "question_id": "AD0",
                                    "value": ["catalog", "parent_app", "testing"]})
        self.assertEqual(SurveyAnswer.objects.filter(response_id=rid,
                                                     question_id="AD0").count(), 3)
        self.post("survey:answer", {"response_id": rid, "question_id": "AD0",
                                    "value": ["catalog"]})
        self.assertEqual(SurveyAnswer.objects.filter(response_id=rid,
                                                     question_id="AD0").count(), 1)

    def test_exclusive_none_stored_single_row(self):
        rid = self.start("director")
        self.post("survey:answer", {"response_id": rid, "question_id": "AD0",
                                    "value": ["none"]})
        rows = SurveyAnswer.objects.filter(response_id=rid, question_id="AD0")
        self.assertEqual(rows.count(), 1)
        self.assertEqual(rows.get().value, "none")

    def test_completed_response_rejects_further_answers(self):
        rid = self.start("inspector")
        self.post("survey:submit", {"response_id": rid, "answers": autofill("inspector")})
        r = self.post("survey:answer", {"response_id": rid, "question_id": "EF2",
                                        "value": "lt10"})
        self.assertEqual(r.status_code, 409)


class EmailDecoupledTest(ApiMixin, TestCase):
    def test_valid_email_stored(self):
        self.assertEqual(self.post("survey:email", {"email": "x@edus.ro"}).status_code, 200)
        self.assertEqual(SurveyEmail.objects.count(), 1)

    def test_invalid_email_rejected(self):
        self.assertEqual(self.post("survey:email", {"email": "nope"}).status_code, 400)
        self.assertEqual(SurveyEmail.objects.count(), 0)

    def test_honeypot_silently_drops(self):
        r = self.post("survey:email", {"email": "x@edus.ro", "website": "bot"})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SurveyEmail.objects.count(), 0)


class FullPathSubmitTest(ApiMixin, TestCase):
    def test_each_path_submits_clean(self):
        for path in catalogue.valid_paths():
            rid = self.start(path)
            r = self.post("survey:submit", {"response_id": rid, "answers": autofill(path)})
            self.assertEqual(r.json().get("status"), "completed",
                             f"{path}: {r.json()}")
