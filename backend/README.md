# Pulse Survey — Backend (Django)

The integrity-critical core of the **Starea Digitalizarii** survey: anonymous
role-routed collection, server-side channel capture, the decoupled email opt-in,
and the Metabase analysis views. Content lives in `../catalogue/questions.json`
(the contract shared with the runner UI / Brief 1).

This is **Brief 2 of 2**. It does NOT include the runner UI, host page, or email
HTML (Brief 1 — Codex / Claude Design). Both sides consume the same catalogue.

## Layout

```
../catalogue/questions.json   single source of truth (84 questions, 5 paths)
../catalogue/CATALOGUE.md      conventions, keys, encoding, open decisions
config/settings.py             env-driven; Postgres (shared schema) or SQLite
survey/
  catalogue.py                 the only reader of questions.json
  models.py                    SurveyResponse, SurveyAnswer, SurveyEmail,
                               FreetextModeration  (the 3-worlds + moderation)
  channel.py                   ChannelCaptureMiddleware (?src= -> session)
  validation.py                atom + complete-submission validation
  views.py                     /studiu/api/{catalogue,start,answer,submit}, /studiu/email
  admin.py                     monitoring, free-text moderation, CRM review
  migrations/
    0001_initial               tables
    0002_analysis_views        10 internal views + floored public views (PG-only)
    0003_public_grants         read-only role + grants (PG-only, blocker #4)
  management/commands/
    validate_catalogue         CI guard for the catalogue
    flag_freetext              create pending moderation rows
    sync_crm                   queued, contact-only CRM sync (dry until format set)
```

## Setup

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # edit
```

### Local logic tests (SQLite — no Postgres needed)
```bash
python manage.py test survey         # 25 tests
python manage.py validate_catalogue  # catalogue CI guard
```
The Postgres-only view/grant migrations no-op under SQLite, so the model/logic
suite runs anywhere.

### Against the shared Postgres
```bash
export SURVEY_DB_ENGINE=postgres   # + POSTGRES_* in .env
python manage.py migrate           # creates schema, tables, views, role/grants
```
The migrations are self-contained: `0001` creates the `survey` schema if absent,
`0002` the views, `0003` the read-only role + grants. No manual SQL needed.

**DB privilege requirement:** the migration user needs `CREATEROLE` (so `0003`
can create `survey_public_ro`). If the deploy user can't, run the `0003` block
manually and `migrate --fake survey 0003` (see the migration docstring). For the
test runner, the user also needs `CREATEDB`.

Verified on PostgreSQL 16: clean-room `migrate` from a bare DB builds schema +
12 views + role + 2 grants; the public role is denied raw tables and
`v_freetext` but allowed the floored public views; all EAV pivots compute.

## API

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/studiu/api/catalogue` | — | full catalogue for the runner |
| POST | `/studiu/api/start` | `{path}` or `{role}` | creates the `partial` response; channel+wave server-set |
| POST | `/studiu/api/answer` | `{response_id, question_id, value}` | incremental save |
| POST | `/studiu/api/submit` | `{response_id, answers?}` | validates + completes; idempotent |
| POST | `/studiu/email` | `{email}` (+ honeypot `website`) | World-2 opt-in; ignores any response id |

Value encoding per question type is in `../catalogue/CATALOGUE.md`.

## Pre-build blocker status (from the risk scan)

| # | Blocker | Status |
|---|---|---|
| 1 | Anonymity wall (no join responses↔emails) | **Enforced** in schema; test `AnonymityWallTest` |
| 2 | Channel from session, never client field | **Enforced** in middleware; test `ChannelCaptureTest` |
| 3 | Additive-only EAV | **Enforced**; moderation in a side table, not a column |
| 4 | Public boundary grant-enforced | **Verified on PG 16**: role denied raw tables + `v_freetext`, allowed floored public views |
| 5 | CRM contact-only | **Enforced**; `sync_crm` payload = `{email, source, wave}` |

## Open items (confirm before / during launch)

- **Shared Postgres**: schema name (`survey` assumed), credentials, and migration
  toolchain coordination with the SEAP dev. Migrations 0001–0003 are **verified
  against a local PostgreSQL 16** (clean-room migrate, wall test, EAV pivots);
  re-confirm against the shared instance and agree the schema name.
- **CRM webhook format**: `sync_crm` stays dry until `CRM_WEBHOOK_URL` + format set.
- **D5b gating**: follows the backend spec (gated by `D4=school_none`); the
  instrument doesn't gate it — confirm intent (see CATALOGUE.md).
- **Public floor** `n<10`: set in `0002` (`PUBLIC_FLOOR`); confirm value.
- **CSRF**: API POSTs are `csrf_exempt` (anonymous, no auth to forge). Revisit if
  the runner is cross-origin.
- **Page slug** `edus.ro/studiu` assumed.
```
