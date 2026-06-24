"""Data model for the Starea Digitalizarii survey.

THE THREE DATA WORLDS (architecture constraint — backend spec §2):

  World 1 — anonymous responses : SurveyResponse + SurveyAnswer (NO identity)
  World 2 — email opt-ins       : SurveyEmail (keyed to NOTHING in World 1)
  World 3 — CRM                 : external; may enrich World 2 only

The single most important property of this system: there is NO foreign key and
NO usable join key from a SurveyEmail row back to a SurveyResponse. That absence
is the feature. Do not add one. (Spec blocker #1.)
"""
from __future__ import annotations

import uuid

from django.db import models


class SurveyResponse(models.Model):
    """The envelope (World 1). No identity columns. Ever."""

    class Path(models.TextChoices):
        DIRECTOR = "director"
        TEACHER = "teacher"
        SECRETARIAT = "secretariat"
        PARENT = "parent"
        INSPECTOR = "inspector"

    class Channel(models.TextChoices):
        WEB = "web"
        EMAIL_CLIENT = "email_client"
        INAPP = "inapp"
        GADS = "gads"
        FB = "fb"
        OTHER = "other"

    class Status(models.TextChoices):
        PARTIAL = "partial"
        COMPLETED = "completed"

    response_id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    path = models.CharField(max_length=20, choices=Path.choices)
    # Attribution, NOT identity. Written from the server session at submit, never
    # from a client field.
    channel = models.CharField(max_length=20, choices=Channel.choices, default=Channel.WEB)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PARTIAL)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    # 'y1' for the Aug-31 campaign wave; future-proofs annual snapshots.
    wave = models.CharField(max_length=10)

    class Meta:
        db_table = "survey_responses"
        indexes = [
            models.Index(fields=["path", "status"]),
            models.Index(fields=["channel"]),
            models.Index(fields=["wave"]),
        ]

    def __str__(self):  # pragma: no cover - admin convenience
        return f"{self.path} / {self.status} / {self.response_id}"


class SurveyAnswer(models.Model):
    """One row per atomic answer (long/EAV). Dumb and immutable — all shaping
    happens in analysis views, not here."""

    id = models.BigAutoField(primary_key=True)
    response = models.ForeignKey(
        SurveyResponse, on_delete=models.CASCADE, related_name="answers"
    )
    # 'A_inf1', 'A3.siiir', 'BD0', ... (grid rows use the composite form).
    question_id = models.CharField(max_length=40)
    # Encoding rules live in CATALOGUE.md. Single value = a stable option key;
    # ranking = ordered array of keys; grid row = one scale-point key; multi =
    # one row per selected option.
    value = models.JSONField()

    class Meta:
        db_table = "survey_answers"
        constraints = [
            # Idempotency: re-saving the same atomic answer is a no-op. (A
            # multi-select legitimately has several rows with the same
            # question_id but distinct values.)
            models.UniqueConstraint(
                fields=["response", "question_id", "value"],
                name="uniq_answer_atom",
            ),
        ]
        indexes = [models.Index(fields=["question_id"])]


class SurveyEmail(models.Model):
    """World 2 — decoupled opt-in. NO response_id. NO foreign key to World 1.

    This table is architecturally incapable of being joined to a response. The
    absence of any reference is intentional and load-bearing.
    """

    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255)
    opted_in_at = models.DateTimeField(auto_now_add=True)
    wave = models.CharField(max_length=10)
    crm_synced = models.BooleanField(default=False)

    class Meta:
        db_table = "survey_emails"
        indexes = [models.Index(fields=["crm_synced"])]


class FreetextModeration(models.Model):
    """Moderation state for free-text answers (World 1 internal).

    Lives in its own table rather than as a column on the write-once
    survey_answers, preserving the additive-only / immutable raw layer (spec
    blocker #3). v_freetext joins this in; free text is never surfaced publicly
    before it is approved here.
    """

    class Status(models.TextChoices):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"

    answer = models.OneToOneField(
        SurveyAnswer, on_delete=models.CASCADE, related_name="moderation"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.PENDING
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewer = models.CharField(max_length=120, blank=True)

    class Meta:
        db_table = "survey_freetext_moderation"
        indexes = [models.Index(fields=["status"])]
