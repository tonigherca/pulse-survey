"""Loader and accessors for the question catalogue (questions.json).

The catalogue is the single source of truth shared by the runner UI, this
submission backend, and the analysis layer. This module is the *only* place the
backend reads it, so the runner-validator and analysis stay in lock-step on
question ids and option keys.

Nothing here mutates the catalogue; it is read-once and cached.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from functools import lru_cache

from django.conf import settings
from django.utils.dateparse import parse_datetime

GRID_SEP = "."  # composite question_id for a grid row, e.g. "A3.siiir"


@lru_cache(maxsize=1)
def catalogue() -> dict:
    with open(settings.CATALOGUE_PATH, encoding="utf-8") as fh:
        return json.load(fh)


# --- meta / channel / wave -------------------------------------------------

def channel_config() -> dict:
    return catalogue()["meta"]["channel"]


def channel_enum() -> list[str]:
    return channel_config()["enum"]


def normalize_channel(raw: str | None) -> str:
    """Map a raw ?src= value to a valid channel key (unknown -> 'other')."""
    cfg = channel_config()
    if not raw:
        return cfg["default"]
    return raw if raw in cfg["enum"] else "other"


def wave_for(started_at: datetime) -> str:
    """Wave is derived from start time vs the Year-1 cutoff."""
    wave = catalogue()["meta"]["wave"]
    cutoff = parse_datetime(wave["cutoff"])
    if started_at.tzinfo is None:
        started_at = started_at.replace(tzinfo=timezone.utc)
    return wave["current"] if started_at <= cutoff else "always_on"


# --- paths / questions -----------------------------------------------------

def valid_paths() -> list[str]:
    return list(catalogue()["paths"].keys())


def path_for_role(role_key: str) -> str | None:
    for opt in catalogue()["q0"]["options"]:
        if opt["key"] == role_key:
            return opt["path"]
    return None


def iter_questions(path: str):
    """Yield question dicts for a path in display order."""
    for section in catalogue()["paths"][path]["sections"]:
        yield from section["questions"]


@lru_cache(maxsize=None)
def question_index(path: str) -> dict[str, dict]:
    return {q["id"]: q for q in iter_questions(path)}


def get_question(path: str, qid: str) -> dict | None:
    return question_index(path).get(qid)


def _options(q: dict) -> list[dict]:
    if "options_ref" in q:
        return catalogue()["option_sets"][q["options_ref"]]
    return q.get("options", [])


def option_keys(q: dict) -> set[str]:
    return {o["key"] for o in _options(q)}


def row_keys(q: dict) -> set[str]:
    return {r["key"] for r in q.get("rows", [])}


def scale_point_keys(q: dict) -> set[str]:
    scale = catalogue()["scales"][q["scale"]]
    return {p["key"] for p in scale["points"]}


def split_grid_id(qid: str) -> tuple[str, str | None]:
    """('A3.siiir') -> ('A3', 'siiir'); ('A1') -> ('A1', None)."""
    if GRID_SEP in qid:
        base, row = qid.split(GRID_SEP, 1)
        return base, row
    return qid, None


# --- branching -------------------------------------------------------------

def branch_rules(path: str) -> list[dict]:
    return [r for r in catalogue()["branch_rules"] if r["path"] == path]


def skipped_questions(path: str, answers: dict[str, object]) -> set[str]:
    """Return the set of question ids skipped given the current answers.

    `answers` maps base question_id -> value, where a multi_select value is a
    list/set of selected option keys and a single_select value is the key.
    Authoritative for the validator; mirrors each question's `show_if`.
    """
    skipped: set[str] = set()
    for rule in branch_rules(path):
        trig = rule["trigger"]
        qid = trig["question"]
        if qid not in answers:
            continue
        val = answers[qid]
        fired = False
        if "only" in trig:
            selected = set(val) if isinstance(val, (list, set, tuple)) else {val}
            fired = selected == {trig["only"]}
        elif "equals" in trig:
            fired = val == trig["equals"]
        if fired:
            skipped.update(rule["skip"])
    return skipped


def required_questions(path: str, answers: dict[str, object]) -> set[str]:
    """Base question ids that must be answered for a complete submission.

    Everything non-skipped except optional free_text. Grids are required at the
    base level (at least one row answered is enforced in validation).
    """
    skipped = skipped_questions(path, answers)
    required = set()
    for q in iter_questions(path):
        if q["id"] in skipped:
            continue
        if q["type"] == "free_text":
            continue  # free text is always optional
        required.add(q["id"])
    return required
