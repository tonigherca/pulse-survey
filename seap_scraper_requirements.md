---
tags: [reference, edus, tool, brief]
project: edus
---

# SEAP Scraper — Technical Requirements
## Edison / Harta Digitalizării Project

Last updated: May 4, 2026
Status: Draft v1 — for developer review
Owner: Toni Gherca

---

## 1. PROJECT CONTEXT

Edison is building an internal database of digital platform procurement by Romanian public schools and local authorities, sourced from SEAP (Sistemul Electronic de Achiziții Publice). This database will power:

- The public Harta Digitalizării (interactive adoption map on edus.ro)
- Internal sales and marketing intelligence (competitor pricing, renewal timing, territory prioritization)
- The annual Starea Digitalizării report

The scraper is the sole data collection mechanism. Its output feeds directly into a PostgreSQL database with a schema defined separately (see: `seap_db_schema.md`). All downstream analysis, visualization, and reporting depends on the quality and completeness of what the scraper produces.

---

## 2. TARGET SYSTEM

**Portal:** e-licitatie.ro (SEAP public portal)

**Target notice type:** Anunțuri de atribuire a contractelor (Contract Award Notices) **only.**

Do not scrape:
- Anunțuri de intenție (intention notices — no contract confirmed)
- Anunțuri de participare (tender notices — procurement in progress, not awarded)
- Erată (corrigenda)

Rationale: only awarded contracts confirm that a school has actually purchased a platform. Tender notices create noise and false positives.

---

## 3. OPERATING MODES

The scraper must support two distinct operating modes from the start. They share the same extraction and output logic but differ in scope and scheduling.

### Mode A — Historical Backfill (one-time run)

- **Period:** January 1, 2020 to scrape launch date
- **Volume estimate:** 20,000–30,000 relevant contract records total across the full period
- **Execution:** Single run, resumable (see section 8). Expected runtime: days, not hours. Must be able to pause and resume without re-scraping already-processed pages.
- **Priority:** Run after Mode B is validated on a small recent dataset first. Don't start historical backfill blind.

### Mode B — Ongoing Monitoring (scheduled)

- **Cadence:** Monthly, on the 1st of each month
- **Scope:** Contract awards published in the previous calendar month
- **Volume estimate:** 400–800 raw records to process per run, producing 50–150 relevant output records per month
- **Scheduling:** Cron job or equivalent. Must log start time, end time, records processed, records written, errors encountered.

---

## 4. FILTERING STRATEGY

SEAP publishes tens of thousands of contract awards monthly across all sectors. The scraper must filter aggressively before writing to the database. Apply filters in this order — each layer reduces volume before the next, minimizing unnecessary parsing.

### Filter 1 — Contracting Authority Type (server-side if supported, otherwise client-side)

Target institution types:
- Unități de învățământ (schools — primary target)
- Primării / Consilii locale (local authorities — secondary target, buy on behalf of schools or for own digitalization)
- Consilii județene (county councils — tertiary target)

Exclude: hospitals, military, national agencies, ministries (unless they administrate school networks directly — flag these for manual review rather than auto-exclude).

**Implementation note:** SEAP's search interface allows filtering by contracting authority type. Use this at query time to reduce the result set before pagination. If the API/scrape interface does not support this filter natively, apply it client-side on each result page.

### Filter 2 — CPV Codes

Relevant CPV codes (include any contract where the primary CPV code starts with one of the following prefixes):

| CPV Prefix | Category | Relevance |
|-----------|----------|-----------|
| 48190000 | Educational software | HIGH — primary target |
| 48000000 | Software packages (general) | HIGH |
| 72000000 | IT services | MEDIUM — broad, needs keyword confirmation |
| 72200000 | Software programming and consultancy | MEDIUM |
| 72600000 | Computer support and consultancy | MEDIUM |
| 79000000 | Business services | LOW — include but flag as low confidence |

**Do not exclude** contracts with no CPV code or ambiguous CPV codes at this stage. Flag them with `cpv_confidence: low` and let the keyword filter run. SEAP CPV tagging by contracting authorities is inconsistent — schools frequently mislabel software purchases under generic service CPV codes.

### Filter 3 — Contract Value Range

Exclude contracts where `contract_value_ron` is:
- Below 500 RON (symbolic / framework placeholder values)
- Above 500,000 RON for a single school (implausibly large for a software license — likely infrastructure or hardware bundle)

Flag rather than hard-exclude contracts above 100,000 RON from a single school — these may be multi-year or multi-school framework contracts and warrant manual review. Set `value_confidence: low`.

Apply no lower/upper bound filter for primărie contracts — they may be purchasing on behalf of multiple schools and values will be proportionally larger.

### Filter 4 — Title Keyword Matching

Run against `contract_title_raw` after extracting the record. Match if the title contains any of the following (case-insensitive, diacritics-normalized):

**High-confidence keywords (mark as `classification_confidence: high`):**
- catalog digital / catalog electronic / catalog scolar
- platformă management școlar / platform management scolar
- platformă educațională / platforma educationala
- gestiune elevi / gestiune scolara
- pontaj profesori
- adservio / viva control / eduboom / regista / edison (vendor names)
- SCIM / CEAC / MATE / SASAT (compliance module acronyms)
- registratură electronică / registratura electronica

**Medium-confidence keywords (mark as `classification_confidence: medium`):**
- software scolar / software educational
- digitalizare scoala / digitalizare institutie
- servicii informatice / servicii software
- aplicatie web scolara
- management documente (for primărie/institution targets)
- e-learning / elearning

**Low-confidence / flag for review:**
- Any contract matching CPV filter but not matching any keyword above → set `classification_confidence: low`, write to DB, flag `needs_manual_review: true`

**Hard exclude** (do not write to DB) if title contains:
- echipamente / echipament (hardware)
- licențe Microsoft / licente Microsoft / Office 365 / Google Workspace (generic software, not platform)
- internet / conectivitate / fibra (connectivity)
- calculatoare / laptop / tablete (hardware)
- telefonie / telefon

---

## 5. FIELDS TO EXTRACT

Extract the following fields from each contract award notice. Field names map directly to the `seap_contracts` table in the database schema.

| Field | Source Location in SEAP | Type | Required | Notes |
|-------|------------------------|------|----------|-------|
| `seap_notice_id` | Notice URL / announcement ID | VARCHAR | YES | Primary deduplication key |
| `seap_contract_number` | Contract section of notice | VARCHAR | YES | As published |
| `publication_date` | Notice header | DATE | YES | Date the award notice was published on SEAP |
| `contract_title_raw` | Contract subject field | TEXT | YES | Extract verbatim — no cleaning |
| `institution_name_raw` | Contracting authority section | VARCHAR | YES | As published |
| `institution_cui` | Contracting authority section | VARCHAR | YES | Fiscal code — critical for DB join |
| `vendor_name_raw` | Winner/awarded to section | VARCHAR | YES | As published |
| `vendor_cui` | Winner section | VARCHAR | YES | |
| `contract_value_ron` | Contract value field | DECIMAL | YES | Store as numeric. If published with VAT noted separately, store ex-VAT. If unclear, store as published and set `value_confidence: low` |
| `contract_duration_months` | Duration field | INTEGER | YES | Normalize to months. If given in days: round to nearest month. If given in years: multiply by 12. |
| `contract_start_date` | Duration/execution section | DATE | NO | Not always stated explicitly — extract if present, leave NULL if not |
| `cpv_code` | CPV section | VARCHAR | YES | Primary CPV code only |
| `cpv_description` | CPV section | VARCHAR | NO | Label as published |
| `notice_url` | Page URL | VARCHAR | YES | Full URL to the SEAP notice — for audit and manual review |
| `raw_payload` | Full page | JSONB | YES | Full extracted content as JSON — full audit trail |
| `scraped_at` | System | TIMESTAMP | YES | UTC timestamp of extraction |

**Derived fields to compute at scrape time (before writing to DB):**

| Field | Derivation |
|-------|-----------|
| `contract_end_date` | `contract_start_date + duration` if start date is known; `publication_date + duration` as fallback |
| `institution_matched` | Boolean — set TRUE if `institution_cui` resolves to a record in the `schools` table |
| `value_confidence` | `high` / `medium` / `low` per the rules in Filter 3 |
| `classification_confidence` | `high` / `medium` / `low` per Filter 4 keyword matching |
| `needs_manual_review` | Boolean — TRUE if `classification_confidence: low` or `value_confidence: low` or `institution_matched: false` |

---

## 6. OUTPUT FORMAT AND DATABASE WRITE

**Target:** PostgreSQL database, `seap_contracts` table.

**Write behavior:** INSERT only. Never UPDATE existing records. If a record with the same `seap_notice_id` already exists, skip and log as duplicate — do not overwrite. The raw data layer is immutable once written; corrections go in `contract_classifications`, not `seap_contracts`.

**Batch size:** Write in batches of 100 records. Commit each batch transactionally. On batch failure, log the failed batch contents to a dead-letter file (JSONL format) for manual re-insertion.

**Post-write:** After each successful write, trigger the classification pipeline to process newly inserted records. Classification can run asynchronously — it does not block the scraper.

---

## 7. DEDUPLICATION

A SEAP notice may appear in search results multiple times (amendments, corrigenda, re-indexing). The deduplication key is `seap_notice_id`.

Before writing any record, check: does this `seap_notice_id` already exist in `seap_contracts`? If yes, skip. Log the skip with the reason `duplicate_notice_id`.

**Note on amended contracts:** SEAP sometimes publishes amended award notices for the same contract (e.g., contract value revised, duration extended). These will have a different `seap_notice_id` but reference the same underlying contract via `seap_contract_number`. Do not try to deduplicate on `seap_contract_number` — write both records, flag the newer one with `is_amendment: true` if the SEAP notice type indicates an amendment. The classification pipeline handles the "which record is current" logic downstream.

---

## 8. ERROR HANDLING AND RESILIENCE

### Retry logic

On HTTP error (5xx, timeout, connection refused):
- Retry up to 3 times with exponential backoff: 30s, 2min, 8min
- After 3 failures, log the failed URL to a retry queue file and continue with the next record
- Process the retry queue at the end of each run

On parsing error (field not found, unexpected page structure):
- Log the URL, the expected field, and the raw HTML snippet where parsing failed
- Write the record with NULL for the unparseable field + `needs_manual_review: true`
- Do not skip the record entirely — partial data is better than no data

On DB connection error:
- Pause, retry connection up to 5 times
- If connection cannot be restored, write buffered records to a local JSONL fallback file and halt gracefully. Log the fallback file path.

### Resumability (critical for historical backfill)

The scraper must maintain a persistent progress file (e.g., `scraper_progress.json`) tracking:
- Last successfully processed page number (for paginated search results)
- Last successfully processed notice ID
- Total records processed in current run
- Total records written in current run

On restart after interruption, the scraper reads this file and resumes from the last checkpoint rather than starting over.

---

## 9. RATE LIMITING AND POLITENESS

SEAP is a government portal with no published rate limit policy. Apply conservative defaults to avoid triggering blocks or causing service degradation.

- Minimum delay between requests: **2 seconds**
- Maximum requests per minute: **20**
- Do not run concurrent requests (single-threaded HTTP client for SEAP requests)
- Respect `Retry-After` headers if present
- User-agent string: identify the scraper honestly — e.g., `Edison-DataCollector/1.0 (contact: tech@edison.ro)`
- Do not scrape between 08:00–17:00 EET on business days for the historical backfill run. SEAP load is higher during business hours. Schedule historical backfill for nights and weekends.
- Ongoing monthly runs can execute any time — small volume, no meaningful load impact.

---

## 10. LOGGING AND MONITORING

Each run must produce a structured log file (JSON format) containing:

```json
{
  "run_id": "uuid",
  "mode": "backfill | ongoing",
  "started_at": "ISO timestamp",
  "completed_at": "ISO timestamp",
  "pages_processed": 0,
  "records_fetched": 0,
  "records_passed_filters": 0,
  "records_written": 0,
  "records_skipped_duplicate": 0,
  "records_flagged_manual_review": 0,
  "errors": [],
  "retry_queue_size": 0,
  "fallback_file": null
}
```

**Alerting:** After each ongoing monthly run, send a summary email or Slack message to the data owner (Toni Gherca) with: records written, records flagged for review, any errors requiring attention.

**Dashboard (nice to have, not blocking):** A simple internal page showing run history, total records in DB, last update date, and count of records pending manual review.

---

## 11. DATA QUALITY FLAGS — SUMMARY

The following flags must be set on each written record. These drive the manual review queue.

| Flag | Type | Set When |
|------|------|----------|
| `institution_matched` | BOOLEAN | FALSE if `institution_cui` not found in `schools` table |
| `value_confidence` | ENUM | `low` if value is below 500 RON, above 100k RON for a school, or parsing was ambiguous |
| `classification_confidence` | ENUM | `low` if only CPV match, no keyword match |
| `needs_manual_review` | BOOLEAN | TRUE if any of the above are flagged, or if `is_amendment: true` |
| `is_amendment` | BOOLEAN | TRUE if SEAP notice type indicates an amendment to a prior contract |

Manual review queue: a simple internal view on the DB showing all records where `needs_manual_review = true`, sorted by `publication_date` descending. Reviewed by Edison data analyst. Estimated volume: 10–20% of total records initially, dropping as keyword rules are tuned.

---

## 12. VOLUME AND PERFORMANCE EXPECTATIONS

| Metric | Estimate |
|--------|----------|
| Total records in DB after historical backfill | 20,000–30,000 |
| Records added per ongoing monthly run | 50–150 |
| % of scraped records passing all filters | ~15–25% of raw education-sector contracts |
| % flagged for manual review (initial) | ~15–20% |
| Historical backfill runtime (at 20 req/min) | 3–7 days (nights/weekends only) |
| Ongoing monthly run runtime | 2–4 hours |
| DB storage estimate (5 years + raw payloads) | ~2–5 GB |

---

## 13. OUT OF SCOPE FOR VERSION 1

The following are explicitly not part of this build. They are documented here to prevent scope creep.

- Real-time SEAP API feed (Version 2 — requires SEAP API access agreement)
- Automatic classification pipeline (separate build — scraper writes raw data, classification runs independently)
- School geocoding (separate enrichment step using SIIIR address data)
- Any public-facing interface (map, dashboard) — downstream of this build
- Scraping non-SEAP sources (primărie websites, ISJ portals, etc.)
- Scraping anunțuri de participare (tender notices)
- Any data from before January 1, 2020 — older SEAP data structure is inconsistent and not worth the engineering cost

---

## 14. OPEN QUESTIONS FOR DEVELOPER

Before starting build, confirm the following:

1. **SEAP access method:** Does SEAP have a usable public API or data export endpoint, or is this a pure HTML scraper? If HTML: has the developer confirmed the DOM structure of an `anunț de atribuire` page and a search results page? SEAP has had UI changes — current structure should be confirmed before writing parsers.

2. **CUI lookup:** The `institution_cui` → `schools` table join requires the `schools` table to be populated first. Confirm the SIIIR data import is complete before validating the `institution_matched` flag.

3. **Filtering at query vs. client side:** Can the SEAP search interface be queried with CPV code and institution type parameters in the URL/API call, or does the scraper need to fetch all education-sector contracts and filter locally? This affects rate limit planning significantly.

4. **Framework contract handling:** Some schools purchase via a central framework contract managed by the county council or primărie. The award notice may be published under the primărie's CUI, not the school's CUI. Confirm: should the scraper write these records and flag them for manual CUI resolution, or attempt automated school attribution from the contract title?

5. **Historical data quality check:** Before committing to 2020 as the backfill start date, the developer should manually inspect 10–15 contract award records from 2020 and 2021 to confirm field structure is consistent with current SEAP format. If structure differs materially, the start date may need to move to 2022.

---

*Document End*
*Contact for questions: Toni Gherca*
*Related documents: seap_db_schema.md*

---

## Related
- [[Edus_Index]]
- [[Harta_Digitalizarii_Specs]]
- [[edus_product_documentation]]
