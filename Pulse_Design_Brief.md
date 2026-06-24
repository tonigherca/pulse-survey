# PULSUL DIGITALIZĂRII — Design & Front-End Build Brief
## Brief 1 of 2 (companion: Pulse_Backend_Spec.md)

Last updated: June 24, 2026
Target tools: survey runner → Claude Code; host page + email HTML → Codex or Claude Design (parallelizable)
Status: Ready for build

Content source of truth: `Pulse_Instrument_v3.md` (instrument v3 — all copy, all five paths, host-page copy in Section 3).
Shared contract with backend: the question catalogue (build first — see Brief 2 §3, §10).

---

## 0. NON-NEGOTIABLE CONSTRAINTS (apply to all three pieces)

- **Stack:** Django + Bootstrap 5 + `edus-system.css`. NOT React (the audit was React; this is not). Vanilla JS for runner interactivity.
- **Design system:** `design.md` v2.0 tokens. Blue `#307FE2`, light blue `#E7F1FC`. Type: Albra 600 (display), Axiforma 600/300 (headings/body).
- **Editorial primitives, NOT container styling.** Hairline rules, display type, overlines, small-caps labels, stat-floats. NO tinted-fill / accent-border / icon-chip / caps-label callout boxes — that pattern is the AI-design hallmark to avoid. NO 2×2 colored-accent card grids with icon chips. Visual richness comes from editorial rhythm, not card proliferation.
- **No isometric.** Anywhere. Not a standing visual language for Edus.
- **Copy constraints (Romanian, customer-facing):** no hyphens, no em dashes, no rule-of-three / triplets, no "Nu X, ci Y" constructions, no closing CTAs in value content, natural register, scannable. Edus named in attribution only (host-page credibility footer — the one place).
- **Register:** dumneavoastră throughout (open issue: parents may warrant `tu` — see Brief notes; default dumneavoastră until decided).
- **All copy already exists** in instrument v3. Do not rewrite it. Lay it out.

---

## PIECE 1 — HOST / LANDING PAGE

*edus.ro/studiu (confirm slug). Static Django/Bootstrap. One persuasive screen-flow. Closest sibling: the audit and calculator landing pages. → Codex or Claude Design.*

### Job
Establish this as a research instrument, not a lead-gen form. Carry the Aug-31 countdown. Set the value-exchange expectation. Assure anonymity. Route the five roles. Persuade a busy director/teacher/parent to spend 8–12 minutes.

### Sections (copy verbatim from instrument v3 §3)
1. **Hero** — overline `STUDIU NAȚIONAL · EDIȚIA 2026`, display title, subhead, **live countdown** ("Au mai rămas X zile", to 31 Aug 2026).
2. **Value exchange band** — what you get (the published report, Sept 2026, free and public). NO benchmarking promise.
3. **Anonymity assurance** — hairline-ruled, small-caps `CONFIDENȚIALITATE` label. The load-bearing trust block: anonymous, no PII, email kept separate. Treat with editorial weight, not a tinted box.
4. **What it covers** — the complete-picture framing (infrastructure, platforms, teaching, admin, competency, data, institutional relations). Each role answers only its relevant part.
5. **Role selector (= Q0)** — five role options routing into the runner. This is the primary action. Five clean choices, not five icon-chip cards.
6. **Credibility footer** — Edus attribution (the one brand mention), SEAP basis, open/no-gate framing.

### Countdown
Driven by a config cutoff value (not hardcoded — Brief 2 note), so post-Aug-31 the page swaps to always-on framing without a code change. Build the swap as a template conditional on the cutoff date.

### Design direction
Editorial, authoritative, calm. This looks like a research institution published it, not a SaaS funnel. Generous whitespace, strong display type for the title, hairline rules between sections. The countdown is the only "urgent" element and it should be understated (a quiet line, not a pulsing red timer). Mobile-first — a large share of directors and most parents arrive on phones.

---

## PIECE 2 — SURVEY RUNNER

*The interactive, stateful, branching question experience. → Claude Code (needs real logic, consumes the question catalogue, writes via the Brief 2 submission flow).*

### Job
Move a respondent through 18–22 questions across one role path with **minimum friction and minimum abandonment**. This is the piece where design = completion rate. Borrow the audit runner's hard-won anti-abandonment decisions.

### Anti-abandonment rules (from the audit brief, they apply here)
- **Progress by section, not total count.** Show section name + progress within it. Do NOT show total question count upfront — it anchors expectation too heavily.
- **Estimated time remaining**, recalculated as questions are answered, instead of "question 7 of 22".
- **Back-navigation allowed**, within and across sections. Answers persist (partial-response storage, Brief 2 §6).
- **One question (or one grid) per screen** on mobile; grouping allowed on desktop where it doesn't crowd. Err toward fewer items per screen for the Likert grids — a 6-row grid is already dense.
- No login, no friction gates, no email until after submission.

### Question type rendering (six types, from the catalogue)
- **Single select (radio):** clean vertical list, generous tap targets. The 0–3 ladder items read as a progression top to bottom.
- **Multi-select:** checkboxes; exclusive options ("Nu folosesc...") enforce mutual exclusivity in the UI (selecting it clears others).
- **Likert grid:** the hardest to keep usable on mobile. Row label + 5 points. On narrow screens, consider one row at a time or a stacked layout rather than a squeezed table. This is the top abandonment risk — design it carefully.
- **Forced ranking (A7, directors only):** drag-and-drop with a numbered fallback (numbered input for no-drag/accessibility). Serializes to ordered array (Brief 2 §3).
- **Free text:** simple textarea, 300-char counter, optional feel (it's the last item each path).
- **Dropdown / number:** standard, rarely used here.

### Flow
Q0 (role) is on the host page's role selector → runner opens on the chosen path. Path renders its sections in order (see instrument v3). Conditional questions show/hide per the catalogue's branch rules (Brief 2 §6). Final submit → completion screen (Piece 3 of the runner = the email opt-in, below).

### Post-submit completion screen
- Thank-you + confirmation answers recorded.
- **Decoupled email opt-in** (instrument v3 §3.7): optional email field, "Trimiteți-mi raportul" + "Nu, mulțumesc". Copy states answers stay anonymous, email kept separate. Posts to `/studiu/email` (Brief 2 §7) carrying ONLY the email.
- Accessible label on the email input.

### Design direction
Low-chrome, focused, one thing at a time. The runner should feel lighter than the landing page — less editorial flourish, more "just answer and move on". Visible-but-quiet progress. The edus-system.css tokens for consistency, but the runner's job is to disappear.

---

## PIECE 3 — EMAIL HTML (the report-delivery / confirmation email)

*Self-contained, table-based HTML email. Print-like, robust across clients. → Codex (handles standalone artifacts well).*

### Scope
The email someone receives **if they opted in** — sent when the report is published (Sept 2026), confirming the report is ready with the link. (Not a transactional "thanks for submitting" — the completion screen does that. This is the value-exchange payoff.)

### Content
- Subject + preheader announcing the report is live.
- Brief body: the study they contributed to is published, here it is, it is free and public.
- Single primary link to the report (edus.ro/raport or similar).
- NO survey answers, NO personalization beyond generic (we have no PII — the email list is decoupled, so the email knows nothing about the recipient's responses). Plain, honest, "here is the thing we promised."
- Edus attribution in signature/footer only.
- Plain register, copy constraints as above.

### Technical
- Table-based layout, inline styles, email-client-safe (no flexbox/grid dependence).
- Edus palette and type where web-safe; graceful fallback.
- Light, single-column, mobile-first.

### Note
The actual report-ready copy can be finalized closer to September. Build the template now; the body text is a placeholder to refine when the report exists. Sender: TBD (likely a generic Edus/studiu sender, not Ana — this is a research list, not CS correspondence).

---

## BUILD ORDER & SPLIT

1. **Question catalogue first** (Brief 2 §3) — the shared contract. Runner and backend both consume it.
2. **Parallel after that:**
   - Claude Code: survey runner (Piece 2) + backend (Brief 2).
   - Codex / Claude Design: host page (Piece 1) + email HTML (Piece 3) — independent.
3. Runner ↔ backend integrate via the catalogue + the submission flow.

---

## OPEN ITEMS
- [ ] Parent register: dumneavoastră vs tu (affects Path D runner copy).
- [ ] Page slug confirm.
- [ ] Likert-grid mobile pattern — the key UX decision in the runner; prototype this early.
- [ ] Report-email sender identity (generic vs named).
- [ ] Host-page hero: any illustration, or pure typographic? (Recommendation: typographic + hairline rules, matching the research-institution tone and the S8-band precedent. No isometric.)

---

## Related
- [[Pulse_Instrument_v3]]
- [[Pulse_Backend_Spec]]
- [[edus_starea_digitalizarii_strategy]]
- [[Edus_Index]]
