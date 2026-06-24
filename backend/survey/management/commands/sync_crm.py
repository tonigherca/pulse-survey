"""Queued CRM sync for World-2 email opt-ins (backend spec §8).

CRM enrichment is contact-only and runs as a background job, NOT inline at
opt-in. The payload carries ONLY {email, source, wave} — never a response id or
any survey answer. World 3 may enrich the contact in the CRM; that enrichment
never returns to World 1.

OPEN ITEM: the CRM webhook format is unconfirmed. Until CRM_WEBHOOK_URL is set
and the format is locked, this runs in --dry-run and does not mark rows synced.
"""
from __future__ import annotations

import os

from django.core.management.base import BaseCommand

from survey.models import SurveyEmail

SOURCE = "studiu_starea_digitalizarii"


class Command(BaseCommand):
    help = "Sync un-synced email opt-ins to the CRM (contact-only)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true",
                            help="Build payloads and report, but do not POST or mark synced.")
        parser.add_argument("--limit", type=int, default=500)

    def handle(self, *args, **opts):
        webhook = os.environ.get("CRM_WEBHOOK_URL")
        dry = opts["dry_run"] or not webhook
        qs = SurveyEmail.objects.filter(crm_synced=False).order_by("id")[: opts["limit"]]

        payloads = [{"email": e.email, "source": SOURCE, "wave": e.wave} for e in qs]
        if dry:
            reason = "no CRM_WEBHOOK_URL set" if not webhook else "--dry-run"
            self.stdout.write(self.style.WARNING(
                f"DRY RUN ({reason}): {len(payloads)} contact(s) would sync. "
                f"Payload shape: {{email, source, wave}} — no response data."
            ))
            return

        # Real send path. Format intentionally minimal until CRM contract is
        # confirmed; adapt the request body to the CRM's expected schema here.
        import json
        import urllib.request

        synced_ids = []
        for email_obj, payload in zip(qs, payloads):
            req = urllib.request.Request(
                webhook, data=json.dumps(payload).encode(),
                headers={"Content-Type": "application/json"}, method="POST",
            )
            try:
                with urllib.request.urlopen(req, timeout=10) as resp:
                    if 200 <= resp.status < 300:
                        synced_ids.append(email_obj.id)
            except Exception as exc:  # noqa: BLE001 - log and continue, retry next run
                self.stderr.write(self.style.ERROR(f"{email_obj.email}: {exc}"))

        SurveyEmail.objects.filter(id__in=synced_ids).update(crm_synced=True)
        self.stdout.write(self.style.SUCCESS(f"Synced {len(synced_ids)} contact(s)."))
