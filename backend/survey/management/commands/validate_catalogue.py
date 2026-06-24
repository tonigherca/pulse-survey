"""CI guard: structural integrity of questions.json.

Run in CI before deploy. Fails (exit 1) on duplicate ids/keys, dangling refs,
unknown scales/option sets, or branch/show_if targets that don't exist — the
catalogue is the contract for the runner, the validator, and the analysis layer,
so it must never ship inconsistent.
"""
from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand, CommandError

from survey import catalogue


class Command(BaseCommand):
    help = "Validate the question catalogue (questions.json) for structural integrity."

    def handle(self, *args, **opts):
        cat = catalogue.catalogue()
        errors: list[str] = []
        scales = set(cat["scales"])
        option_sets = set(cat["option_sets"])
        all_ids: list[str] = []

        for path in cat["paths"]:
            qindex = catalogue.question_index(path)
            all_ids.extend(qindex)
            for qid, q in qindex.items():
                t = q["type"]
                if "options_ref" in q and q["options_ref"] not in option_sets:
                    errors.append(f"{path}/{qid}: unknown options_ref {q['options_ref']}")
                if t == "likert_grid":
                    if q.get("scale") not in scales:
                        errors.append(f"{path}/{qid}: unknown scale {q.get('scale')}")
                    dup = [k for k, c in Counter(r["key"] for r in q["rows"]).items() if c > 1]
                    if dup:
                        errors.append(f"{path}/{qid}: duplicate row keys {dup}")
                if t in ("single_select", "multi_select", "ranking"):
                    if "options" not in q and "options_ref" not in q:
                        errors.append(f"{path}/{qid}: no options")
                    if "options" in q:
                        dup = [k for k, c in Counter(o["key"] for o in q["options"]).items() if c > 1]
                        if dup:
                            errors.append(f"{path}/{qid}: duplicate option keys {dup}")
                if t == "multi_select" and "exclusive_option" in q:
                    if q["exclusive_option"] not in catalogue.option_keys(q):
                        errors.append(f"{path}/{qid}: exclusive_option not in options")
                if "show_if" in q and q["show_if"]["question"] not in qindex:
                    errors.append(f"{path}/{qid}: show_if target {q['show_if']['question']} missing")

        dup_ids = [k for k, c in Counter(all_ids).items() if c > 1]
        if dup_ids:
            errors.append(f"Duplicate question ids across paths: {dup_ids}")

        for br in cat["branch_rules"]:
            qindex = catalogue.question_index(br["path"])
            if br["trigger"]["question"] not in qindex:
                errors.append(f"branch_rule {br['path']}: trigger missing")
            for s in br["skip"]:
                if s not in qindex:
                    errors.append(f"branch_rule {br['path']}: skip target {s} missing")

        for opt in cat["q0"]["options"]:
            if opt["path"] not in cat["paths"]:
                errors.append(f"Q0 option {opt['key']}: path {opt['path']} missing")

        if errors:
            for e in errors:
                self.stderr.write(self.style.ERROR(f"  {e}"))
            raise CommandError(f"{len(errors)} catalogue error(s)")

        counts = ", ".join(f"{p}={len(catalogue.question_index(p))}" for p in cat["paths"])
        self.stdout.write(self.style.SUCCESS(
            f"Catalogue OK — {len(all_ids)} questions ({counts}); "
            f"{len(scales)} scales, {len(option_sets)} option sets."
        ))
