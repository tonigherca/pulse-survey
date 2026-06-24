"""Create pending moderation rows for free-text answers that lack one.

Run periodically (or after a collection burst). Moderation rows are created
lazily here rather than at write time, keeping survey_answers write-once. Free
text is never surfaced publicly until a row here is approved.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from survey import catalogue
from survey.models import FreetextModeration, SurveyAnswer

FREETEXT_IDS = [
    q["id"]
    for path in catalogue.valid_paths()
    for q in catalogue.iter_questions(path)
    if q["type"] == "free_text"
]


class Command(BaseCommand):
    help = "Ensure a pending FreetextModeration exists for every free-text answer."

    def handle(self, *args, **opts):
        pending = (
            SurveyAnswer.objects.filter(question_id__in=FREETEXT_IDS, moderation__isnull=True)
        )
        created = FreetextModeration.objects.bulk_create(
            [FreetextModeration(answer=a) for a in pending]
        )
        self.stdout.write(self.style.SUCCESS(
            f"Flagged {len(created)} free-text answer(s) for moderation."
        ))
