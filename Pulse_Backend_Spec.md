# PULSUL DIGITALIZĂRII — Backend & Data Architecture Spec
## Brief 2 of 2 (companion: Pulse_Design_Brief.md)

Last updated: June 24, 2026
Target tool: Claude Code (shareable with SEAP scraper developer — same Postgres)
Status: Ready for build, pending verification checklist

Source of truth for content: `Pulse_Instrument_v3.md` (instrument v3, all five paths + decisions).

---

## PRE-BUILD VERIFICATION CHECKLIST
*(Clear this before writing any feature code. If any check fails, log it and STOP — do not work around.)*

1. **Anonymity wall confirmed in schema.** The email table has NO foreign key and NO usable join key (no `response_id`, no correlatable timestamp, no aligned sequence) back to `survey_responses`. Passing: a code review of both tables shows zero path from an email row to a response row. This is the single most important property of the system.
2. **Channel tag captured server-side from session, never from a client form field.** The `?src=` query param is read server-side on first landing-page hit, written to the server session, and attached to the response at submission from session. Passing: there is no hidden `<input>` carrying the channel value; editing the submitted payload cannot change the recorded channel.
3. **Schema is additive-only / write-once.** `survey_answers` uses the long/EAV shape so Year 2 questions are new rows, not migrations. Passing: adding a question requires no `ALTER` on existing answer data; no destructive migration exists in the epic.
4. **Public vs internal data boundary explicit.** Metabase (internal) and any future public view read from separate, named Postgres views. Public views are aggregate-only with a minimum-cell-size floor and never expose row-level responses or unfiltered free text. Passing: public view definitions enforce a floor (e.g. suppress cells with n < 10) and are the only thing a public surface can reach.
5. **CRM enrichment is scoped to the contact world only.** Any CRM lookup enriches the email/contact record, never references a response record. Passing: no code path reads CRM data and writes it onto, or joins it to, `survey_responses` or `survey_answers`.

If any check fails: log it in the kanban Blocked column and STOP. Surface it before proceeding.

---

## 1. WHAT THIS IS

The backend for the "Starea Digitalizării" survey: a permanent Django app on edus.ro that collects anonymous, role-routed survey responses, captures channel attribution and optional decoupled email opt-ins, writes to the shared Postgres (same instance the SEAP scraper uses), and exposes analysis views consumed by Metabase.

Five questionnaire paths (Director / Teacher / Secretariat / Parent / Inspector), mixed question types, conditional display, ~18–22 items per path. Year 1 runs to a visible cutoff (31 Aug 2026), then converts to always-on.

This spec covers: data model, submission/branching logic, channel capture, the decoupled email endpoint, the Metabase analysis layer, and the priority SQL views. It does NOT cover visual design (see Brief 1).

---

## 2. THE THREE DATA WORLDS (architecture constraint)

Three independent worlds. The wall is between response data and anything identity-shaped.

```
WORLD 1 — Anonymous responses          WORLD 2 — Email opt-ins         WORLD 3 — CRM
  survey_responses                       survey_emails                   (existing, external)
  survey_answers                           email                           contact records
  (channel tag, self-report,               opted_in_at                     customer/non-customer
   timestamps — NO identity)               (keyed to NOTHING in W1)        (enriches W2 only)

  World 3 MAY enrich World 2 (contact/marketing).
  World 3 and World 2 may NEVER reach World 1.
  No join exists, by design, between responses and any email/identity.
```

Consequence accepted by design: customer/non-customer segmentation comes from **channel tag + self-report (AD0/BD0/CD0/D4)**, NOT from CRM matching. We will never claim CRM-grade "customer vs non-customer answered X% vs Y%". This imprecision is the price of the anonymity promise and is the correct trade for a credibility-first research asset.

---

## 3. DATA MODEL

Long/EAV for the raw layer; typed analysis views pivoted on top. Raw tables are dumb and immutable; all shaping happens in views (same principle as the SEAP raw/interpretation split).

### Table: `survey_responses` (the envelope)

```
response_id     UUID PRIMARY KEY (server-generated)
path            ENUM('director','teacher','secretariat','parent','inspector')
channel         ENUM('web','email_client','inapp','gads','fb','other')  -- from session, see §5
status          ENUM('partial','completed')
started_at      TIMESTAMPTZ
completed_at    TIMESTAMPTZ NULL
wave            VARCHAR(10)  -- 'y1' for the Aug-31 campaign wave; future-proofs annual snapshots
-- NO identity columns. Ever.
```

Note: no IP, no user-agent fingerprint, no email, no school. `channel` is attribution, not identity. `wave` lets the report freeze a Year-1 snapshot and lets always-on data after Aug 31 be excluded from the Y1 report.

### Table: `survey_answers` (one row per atomic answer)

```
id              BIGSERIAL PRIMARY KEY
response_id     UUID NOT NULL REFERENCES survey_responses(response_id)
question_id     VARCHAR(40) NOT NULL   -- e.g. 'A_inf1', 'B2.catalog_zilnic', 'A7'
value           JSONB NOT NULL         -- see encoding rules below
```

**Encoding rules (lock before build — see risk scan watch items):**
- **Single select:** `value` = the chosen option string (stable option key, not display label — see §4).
- **Multi-select:** one row per selected option, OR a single row with a JSON array. Use **one row per selected option** (`question_id='BD0'`, `value='"catalog"'` etc.) so counts are trivial `GROUP BY`. Exclusive options ("Nu folosesc...") stored as a single row with the exclusive key.
- **Likert grid (A3, A5, B2, C2, C5, C7, etc.):** **one row per grid row.** `question_id` is per-row, not per-grid — e.g. `A3.siiir`, `A3.ceac`. `value` = the point on the scale (stable key). This is mandatory or the grids can't be analysed cell-by-cell.
- **Forced ranking (A7):** single row, `value` = ordered JSON array of option keys, index 0 = rank 1. e.g. `["integrare","usurinta","pret",...]`.
- **Free text (A11, B8, C10, D9, E7):** single row, `value` = the text string, max 300 chars. Free text is flagged for moderation before any public surfacing.

### Table: `survey_emails` (World 2 — decoupled)

```
id              BIGSERIAL PRIMARY KEY
email           VARCHAR(255) NOT NULL
opted_in_at     TIMESTAMPTZ
wave            VARCHAR(10)
crm_synced      BOOLEAN DEFAULT false
-- NO response_id. NO foreign key to World 1. This absence is the feature.
```

The email is written in a separate transaction from the response submission, with no response reference in scope. See §6.

### Question catalogue

Question definitions (text, type, options with stable keys, tier/path, conditional rules) live in a versioned source — a `questions.json` or Django fixtures, NOT hardcoded across templates and analysis. Single source of truth so the runner, the submission validator, and the analysis layer all agree on `question_id`s and option keys. (Mirrors the audit's questions.json discipline.)

---

## 4. STABLE OPTION KEYS (not display labels)

`value` stores stable keys, never Romanian display strings. Display strings change (copy edits, register fixes); keys must not, or historical data desyncs. Example for AD0:

```
"catalog"        → "Catalog electronic și condică digitală"
"parent_app"     → "Aplicație mobilă sau portal pentru comunicarea cu părinții"
"doc_gen"        → "Generare automată de documente administrative"
"compliance"     → "Module de conformitate sau proceduri (SCIM, CEAC, AP)"
...
"none"           → "Nu folosim platforme digitale de management"
```

The key→label map lives in the question catalogue. Analysis joins on keys; display reads labels.

---

## 5. CHANNEL CAPTURE (server-side, session-based)

The distribution channels and their `?src=` values:

| Channel | `?src=` | Pushed via |
|---|---|---|
| Direct browsing | `web` (default if absent) | website navigation |
| Email to current clients | `email_client` | CS/Ana sends |
| In-app notification | `inapp` | product surface |
| Google Ads | `gads` | search campaign |
| Facebook Ads | `fb` | social campaign |
| Fallback / future | `other` | anything unmapped |

Flow:
1. Landing page (and any deep link into the runner) reads `?src=` **server-side** on first request.
2. Value validated against the enum (unknown → `other`) and written to the **server session**.
3. On response submission, channel is read **from session**, not from the request body, and written to `survey_responses.channel`.
4. If no session value (e.g. direct deep-link without param), default `web`.

Never a hidden form input. Never trust a client-submitted channel. (Risk-scan blocker #2.)

---

## 6. SUBMISSION & BRANCHING LOGIC

### Role routing (Q0)
Q0 selects path. Each path renders only its own questions. Server validates that submitted `question_id`s belong to the declared `path` (reject foreign IDs — integrity, not security).

### Conditional display
Branch rules live in the question catalogue (single source of truth — risk-scan watch item), consumed by both the runner (show/hide) and the submission validator (don't require hidden questions). Known gates:
- Director: AD0 = only `none` → skip A4, A5, A8 (adoption/satisfaction).
- Teacher: BD0 = only `none` → skip B2, B3.
- Secretariat: CD0 = only `none` → skip C4, C5.
- Parent: D4 = `school_none` → skip D5, D5b, D6.

### Partial responses
Create the `survey_responses` row (status `partial`) on **path start** (after Q0), write answers as the respondent advances, flip to `completed` on final submit. This gives abandonment data (where people drop) and means a refresh mid-survey doesn't lose prior answers. "Completed" counts filter `status='completed'`.

### Submission integrity
- All required (non-conditional, non-skipped) questions present before `completed`.
- Idempotent: re-POST of the same completed response_id does not duplicate.
- No CAPTCHA at launch (anonymous, low-stakes); add a soft honeypot field if spam appears.

---

## 7. EMAIL OPT-IN ENDPOINT (decoupled)

Appears only on the post-submit completion screen. Optional.

```
POST /studiu/email
body: { email }            -- NO response_id in scope, do not accept one
→ validate email format
→ INSERT into survey_emails (email, opted_in_at, wave)
→ queue for CRM sync (do NOT call CRM inline — see §8)
→ return { ok: true }
```

The endpoint must be architecturally incapable of associating the email with the just-submitted response. Implementation: the completion screen is a fresh request context; the email POST carries only the email. Even if the same browser session holds the response_id, the endpoint does not read it and does not store it. (Risk-scan blocker #1.)

Accessible label on the email input (the one input that matters — risk-scan note).

---

## 8. CRM SYNC (World 3, contact-only)

- `survey_emails` rows with `crm_synced=false` are synced to Edison's custom CRM by a background job, NOT inline at opt-in (CRM webhook format unconfirmed — build endpoint to accept the CRM's format, queue until confirmed; same open item as the audit).
- CRM may enrich the contact (is this a customer, which school) **in the CRM**. That enrichment never returns to World 1.
- Payload to CRM: `{ email, source: 'studiu_starea_digitalizarii', wave }`. No survey answers, no response_id.

---

## 9. ANALYSIS LAYER — METABASE ON POSTGRES VIEWS

Metabase points at the shared Postgres, reading **named analysis views**, not raw tables directly. Two view tiers:

### Internal views (Metabase, access-controlled)
Pivot the EAV into typed, queryable shapes. Build these as the priority set (from instrument v3 internal notes):

- `v_response_counts` — completed responses by path × channel × wave × day. The operational monitor for the Aug-31 window (are we getting non-users? rural? enough directors?).
- `v_segmentation` — every response tagged user/non-user from AD0/BD0/CD0/D4 self-report, plus channel. The segmentation spine.
- `v_burden_by_role` — A_hook / B1 / C1 distributions side by side.
- `v_adoption_depth` — A4 / B3 / C4 side by side.
- `v_admin_vs_pedagogy` — BD0 admin-tool adoption × B_ped2 pedagogy depth. **The headline cross-tab.**
- `v_pe_hartie` — C3 double-entry × CD0 × CF3 (rural/urban).
- `v_audit_readiness_gap` — A5 (director) vs C8 (secretariat).
- `v_pedagogy_demand` — D5c parent demand × B_ped2 teacher reality.
- `v_director_vs_inspector` — A6 × E2 diagnosis disagreement.
- `v_freetext` — A11/B8/C10/D9/E7, **moderation-flagged**, internal only.

Each view does the EAV→wide pivot for its questions. Document the pivot pattern once (a CTE that filters `survey_answers` by `question_id` prefix and pivots) and reuse.

### Public views (future, gated — NOT in launch build)
Aggregate-only, minimum-cell-size floor (suppress n < 10), no free text unmoderated, no cut thin enough to re-identify. These feed the report and any live "results so far" surface in September. Defined but not exposed at launch. (Risk-scan blocker #4.)

### Cross-asset note
Ladder items tagged `[audit: X.X]` in the instrument can be set against audit dimension scores in analysis. Not a build requirement for launch; note the `question_id`→audit-dimension map in the catalogue so it's available later.

---

## 10. SPLIT FOR PARALLEL BUILD

- **Claude Code (this spec):** schema + migrations, question catalogue, runner submission/branching/validation logic, channel capture, email endpoint, the internal Metabase views. The stateful, integrity-critical core.
- **Codex / Claude Design (Brief 1):** host page, email HTML — independent, parallelizable.
- The **survey runner UI** (Brief 1) and the **submission backend** (this brief) share the question catalogue as their contract. Build the catalogue first; both sides consume it.

---

## 11. OPEN ITEMS (confirm before / during build)
- [ ] CRM webhook format (blocks email sync, not collection — queue meanwhile).
- [ ] Page slug: `edus.ro/studiu` assumed.
- [ ] Postgres: same instance/schema as SEAP scraper — confirm schema name and access with that dev.
- [ ] Metabase instance: exists already, or stand up? (Low effort either way.)
- [ ] Minimum-cell-size floor value for public views (proposed: n < 10 suppressed).
- [ ] Spam posture: honeypot only at launch, revisit if abused.

---

## Related
- [[Pulse_Instrument_v3]]
- [[Pulse_Design_Brief]]
- [[edus_starea_digitalizarii_strategy]]
- [[seap_scraper_requirements]]
- [[Edus_Index]]
