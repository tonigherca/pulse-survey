"""Submission validation against the catalogue (backend spec §6).

Two layers:
  * validate_atom() — a single incoming answer is well-formed and its value(s)
    resolve to stable keys for that question in that path.
  * validate_complete() — at submit time, the full stored answer set satisfies
    required/skipped/foreign-id integrity before status flips to 'completed'.

Integrity, not security: we reject foreign or malformed ids/keys so the EAV
stays clean and analysable, never trusting client-declared structure.
"""
from __future__ import annotations

from . import catalogue


class AnswerError(ValueError):
    """Raised when an incoming answer is invalid. Message is client-safe."""


def validate_atom(path: str, question_id: str, value) -> None:
    """Validate one incoming answer for a path. Raises AnswerError if invalid.

    `value` is the runner-supplied value: a key (single), a list of keys
    (multi), a scale-point key (grid row), an ordered list (ranking), or a
    string (free text).
    """
    base, row = catalogue.split_grid_id(question_id)
    q = catalogue.get_question(path, base)
    if q is None:
        raise AnswerError(f"unknown question '{question_id}' for path '{path}'")

    qtype = q["type"]

    if row is not None:
        if qtype != "likert_grid":
            raise AnswerError(f"'{question_id}' is not a grid row")
        if row not in catalogue.row_keys(q):
            raise AnswerError(f"unknown grid row '{row}' for '{base}'")
        if value not in catalogue.scale_point_keys(q):
            raise AnswerError(f"invalid scale point '{value}' for '{question_id}'")
        return

    if qtype == "single_select":
        if value not in catalogue.option_keys(q):
            raise AnswerError(f"invalid option '{value}' for '{base}'")

    elif qtype == "multi_select":
        keys = catalogue.option_keys(q)
        vals = value if isinstance(value, (list, tuple)) else [value]
        if not vals:
            raise AnswerError(f"'{base}' requires at least one selection")
        bad = [v for v in vals if v not in keys]
        if bad:
            raise AnswerError(f"invalid option(s) {bad} for '{base}'")
        excl = q.get("exclusive_option")
        if excl and excl in vals and len(vals) > 1:
            raise AnswerError(f"'{excl}' is exclusive and cannot combine in '{base}'")

    elif qtype == "ranking":
        keys = catalogue.option_keys(q)
        if not isinstance(value, list):
            raise AnswerError(f"'{base}' must be an ordered list")
        if len(value) != len(set(value)):
            raise AnswerError(f"'{base}' contains duplicate ranks")
        if set(value) != keys:
            raise AnswerError(f"'{base}' must rank all options exactly once")

    elif qtype == "likert_grid":
        raise AnswerError(f"grid '{base}' must be answered per row (e.g. '{base}.<row>')")

    elif qtype == "free_text":
        if not isinstance(value, str):
            raise AnswerError(f"'{base}' must be text")
        if len(value) > q.get("max_length", 300):
            raise AnswerError(f"'{base}' exceeds max length")


def _answers_map(rows) -> dict[str, object]:
    """Collapse stored (question_id, value) rows into a base-question map for
    branch evaluation: single -> key, multi -> set of keys, grid -> present."""
    out: dict[str, object] = {}
    multi_bases = {
        q["id"] for path in catalogue.valid_paths()
        for q in catalogue.iter_questions(path) if q["type"] == "multi_select"
    }
    for qid, value in rows:
        base, _row = catalogue.split_grid_id(qid)
        if base in multi_bases:
            out.setdefault(base, set()).add(value)
        else:
            out[base] = value
    return out


def validate_complete(path: str, rows) -> None:
    """Validate the full stored answer set at submit time.

    `rows` is an iterable of (question_id, value). Raises AnswerError listing
    the first integrity failure.
    """
    answered_bases = set()
    grid_rows_seen: dict[str, set[str]] = {}
    for qid, _value in rows:
        base, row = catalogue.split_grid_id(qid)
        if catalogue.get_question(path, base) is None:
            raise AnswerError(f"foreign question '{qid}' not in path '{path}'")
        answered_bases.add(base)
        if row is not None:
            grid_rows_seen.setdefault(base, set()).add(row)

    amap = _answers_map(rows)
    skipped = catalogue.skipped_questions(path, amap)

    # No answers may be present for a skipped question.
    leaked = answered_bases & skipped
    if leaked:
        raise AnswerError(f"answers present for skipped question(s): {sorted(leaked)}")

    # All required questions must be answered.
    missing = catalogue.required_questions(path, amap) - answered_bases
    if missing:
        raise AnswerError(f"missing required answer(s): {sorted(missing)}")

    # Every required grid must have all its rows answered.
    for q in catalogue.iter_questions(path):
        if q["type"] == "likert_grid" and q["id"] in answered_bases:
            expected = catalogue.row_keys(q)
            seen = grid_rows_seen.get(q["id"], set())
            if seen != expected:
                raise AnswerError(
                    f"grid '{q['id']}' incomplete: missing rows {sorted(expected - seen)}"
                )
