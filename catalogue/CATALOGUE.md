# Question Catalogue — conventions & decisions

`questions.json` is the **single source of truth** for the Starea Digitalizarii survey. Three consumers read it and must agree:

1. **Runner UI** (Brief 1) — render, show/hide via `show_if`, enforce `exclusive_option`.
2. **Submission validator** (this backend) — require non-skipped questions, reject foreign `question_id`s, validate values against keys.
3. **Analysis layer** (Metabase views) — pivot the EAV on `question_id` + option/row keys.

Display **labels** may change freely (copy edits, diacritics, register). **Keys must never change** — historical data desyncs if they do. Analysis joins on keys; display reads labels.

> Diacritics note: labels here are ASCII-folded for portability. Final Romanian diacritics (ă/â/î/ș/ț) are a display-layer concern and can be restored in labels without touching keys.

---

## Structure

```
meta            version, channel config, wave rule, moderation note
scales          reusable Likert/time-band point sets (key + label)
option_sets     reusable option lists (school_type, school_size, locality)
q0              role selector -> path routing
branch_rules    machine-readable skip rules (validator + runner)
paths           director / teacher / secretariat / parent / inspector
  sections[]      ordered; section.title is display-only
    questions[]   the items
```

### Question shape

| field | applies to | meaning |
|---|---|---|
| `id` | all | stable `question_id`. Globally unique across paths. |
| `type` | all | `single_select` \| `multi_select` \| `likert_grid` \| `ranking` \| `free_text` |
| `text` | all | display prompt |
| `help` | optional | sub-prompt / instruction |
| `options` / `options_ref` | selects, ranking | inline options, or a reference into `option_sets` |
| `scale` | likert_grid | reference into `scales` |
| `rows` | likert_grid | per-row `{key,label}`; **one stored answer per row** |
| `exclusive_option` | multi_select | key that deselects all others ("none") |
| `segmentation` | AD0/BD0/CD0/D4 | marks the user/non-user spine variable |
| `ladder` | maturity items | 0-3 developmental ladder (option order = rung order) |
| `audit` | cross-ref items | audit dimension tag (e.g. `1.1`, `3.4`) |
| `tag` | survey-native items | `survey-native` (no audit equivalent) |
| `show_if` | conditional | `{question, not_only|not_equals|equals, <key>}` |
| `max_length` / `moderated` | free_text | char cap (300) + moderation requirement |

---

## Storage encoding (must match `survey_answers`)

The raw layer is long/EAV: one `survey_answers` row = one atomic answer. `value` is JSONB.

| type | rows written | `question_id` | `value` |
|---|---|---|---|
| single_select | 1 | the `id` | `"<option_key>"` |
| multi_select | 1 **per selected option** | the `id` | `"<option_key>"` (one row each) |
| multi_select (exclusive chosen) | 1 | the `id` | `"<exclusive_key>"` |
| likert_grid | 1 **per row** | `<id>.<row_key>` (e.g. `A3.siiir`) | `"<scale_point_key>"` |
| ranking | 1 | the `id` | ordered JSON array, index 0 = rank 1, e.g. `["integrare","usurinta",...]` |
| free_text | 1 | the `id` | `"<text>"` (<=300 chars) |

Multi-select one-row-per-option makes counts trivial `GROUP BY`. Grid one-row-per-row makes the grids analysable cell-by-cell. Both are mandatory.

---

## Branching (the 4 gates)

`branch_rules` is authoritative for the validator; each conditional question also carries its own `show_if` for the runner. They must stay in sync.

| path | trigger | skip |
|---|---|---|
| director | `AD0` selected **only** `none` | A4, A5, A8 |
| teacher | `BD0` selected **only** `none` | B2, B3 |
| secretariat | `CD0` selected **only** `none` | C4, C5 |
| parent | `D4` = `school_none` | D5, D5b, D6 |

`not_only: "none"` = show unless the *only* selection is the exclusive `none` key (i.e. show for any real tool). `not_equals` / `equals` = exact single-select match.

Validator rule: a skipped question must **not** be required and a submitted answer for a skipped question is rejected as a foreign id.

---

## Channel (canonical — resolves spec/instrument conflict)

Decision: **`?src=` with the 6-value enum** is canonical and stored on `survey_responses.channel`. The instrument's `?s=` 3-way (`c`/`n`/`o`) is **derived in analysis only**, per `meta.channel.rollup`:

- `customer` ← `email_client`, `inapp`
- `cold` ← `gads`, `fb`
- `organic` ← `web`, `other`

Captured server-side from session, never a client field (spec blocker #2). See `meta.channel`.

---

## Open decisions carried from the instrument (flagged, not blocking)

These do not block the build but should be confirmed before launch:

1. **D5b gating discrepancy.** Backend spec §6 lists `D5b` in the parent skip set (`D4=school_none`); the instrument gives D5b no show-condition. The catalogue follows the **spec** (D5b is gated). Content-wise D5b (child's own digital learning) is arguably independent of whether the school offers a tracking app — confirm intent. **D5c is intentionally NOT gated** (always shown — it is demand).
2. **Moderation flag has no home in `survey_answers`** (write-once/additive). Recommendation: a side table `survey_freetext_moderation(answer_id FK -> survey_answers.id, status, reviewed_at, reviewer)` populated lazily; `v_freetext` joins it. Decided at schema stage.
3. **Path D register** — `dumneavoastra` throughout (instrument open issue: `tu` may be warmer). Labels only; no key impact.
4. **Path A length** — 25 items incl. firmographics (~22 substantive). Instrument flags candidates to trim (A_data1 vs A9 dashboard; A_inf4 could move to firmographics). No action taken; faithful to v3.
5. **Grid stable keys were invented here** (the instrument had none). They are now the analysis contract; review before any view SQL references them.

---

## Assumptions to confirm (build-time)

- **Postgres schema:** building against a dedicated `survey` schema in the shared instance (assumption — confirm name/access with the SEAP dev; see backend spec §11).
- **Page slug:** `edus.ro/studiu`.
- **No vendor/platform names** appear in any label (verified — Kahoot/ClassDojo/Wordwall appear only as generic examples inside one teacher option, matching the instrument; revisit if that should be genericised for the public report).

---

## Adding a Year-2 question (additive-only)

1. Add the question object to the relevant path/section with a **new** `id` and stable keys.
2. Bump `meta.version`.
3. No migration on existing answer data (new answers are new rows). No `ALTER` to `survey_answers`.
4. Add any new analysis view or extend an existing one to pivot the new `question_id`.
