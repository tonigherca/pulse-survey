---
project: edus
tags:
  - building
  - edus
  - copy
---

# STAREA DIGITALIZĂRII ÎN ȘCOLILE DIN ROMÂNIA
## Survey Instrument — Full Draft (Paths A–E), v3

Last updated: June 24, 2026
Status: Full rewrite. Five paths, comprehensive dimension coverage, audit-aligned taxonomy, host page + copy. Paths A/B carried from v2 with new dimensions folded in; C/D/E built this session.

---

## 1. BUILD & PRODUCTION DECISIONS

**Scope ambition.** This instrument measures the *complete picture* of school digitalization, not only administrative software: infrastructure/hardware, school-management systems, teaching and learning tools, admin software, data and safety practices, people and competency, leadership and strategy, institutional relations, and future demand. Coverage is achieved by routing dimensions to the roles that can actually speak to each, not by making every path exhaustive. The report covers everything; no single respondent answers everything.

**Collection model — Year 1 campaign to a visible cutoff, then always-on.**
Year 1 runs as a defined collection window closing **31 August 2026**, shown in the UI as a countdown. This creates urgency, produces a clean Year 1 sample, and lands the first findings mid-September when the school year starts and directors are in planning mode. After the cutoff the form converts to permanent always-on infrastructure feeding the Harta, blog stats, and the Year 2 base. The countdown messaging applies to this first wave only.

**Platform — Custom Django (not Tally/Typeform).**
Permanent page on edus.ro; five-path branching with within-path conditional display is too deep for third-party logic builders to handle robustly; responses land in the same Postgres the SEAP scraper writes to, so survey + procurement data share one analysis layer; inherits edus-system.css. Raw-data-immutable / interpretation-downstream principle applies as it does to SEAP. Caveat: the Django build queues behind the SEAP scraper dev handoff. If collection must start before the build is ready, a throwaway Tally instance is an acceptable temporary bridge — treat as disposable, accept re-keying.

**No PII on response records.**
No names, school names, or emails are stored on the answer set. Anonymity is a credibility feature: it lets open-text quotes be published as-is and supports honest non-adoption data.

**Email — optional, decoupled, value-exchange only.**
Email is collected *after* submission as an opt-in ("want the report when it is published?"), never as a gate to participating. It is stored in a separate table with no foreign key back to the response record, so "anonymous" stays literally true: the email list is a contact list, the response data is anonymous data, they do not join. The host-page and post-submit copy state this explicitly. Year 1 value exchange = access to the published aggregate report. (Architecture mirrors the audit: anonymous firmographics, identification only at opt-in email capture.)

**Personalized benchmarking — deferred to 2027 (target, not a Year 1 promise).**
Per-respondent or per-school benchmarking ("where your school sits vs. the national picture") is NOT offered in Year 1 and must not be promised in any copy. Rationale: cold-start — Year 1 may not clear a usable N (target 100-150 directors is a target, not a guarantee), and promising benchmarking the sample cannot support damages credibility. Benchmarking becomes a 2027 target, contingent on Year 1 producing a usable sample and on threshold logic comparable to the audit's county-completion gate. Until then the value exchange is the aggregate report only.

**Segmentation — self-report is the spine; URL channel tag is corroboration.**
The "platform user vs. non-user" cut (from AD0/BD0/CD0/D4) is the analytically meaningful and primary segmentation, more defensible than "Edison customer." Channel is tagged via URL parameter, stored as a hidden field on the anonymous response (channel, not identity), never asked of the respondent:
- Edison customers (CS / in-product sends): `?s=c`
- Cold non-user schools (SEAP-sourced sends): `?s=n`
- Organic / paid social (unknown): `?s=o`
Limitation acknowledged: organic and direct-link visitors land in "unknown"; this is why self-report, not the URL flag, is the spine.

**Incentive.** The published report is the incentive (see email decision). No cash, no prize draws — they add noise and cheapen the research framing.

---

## 2. TAXONOMY & ROLE-ROUTING MODEL

### Posture on the taxonomy

The Auditul de Maturitate Digitală already articulates a worked-out decomposition of school digital maturity: 3 layers, 15 dimensions. The survey **borrows this as a shared vocabulary and starting menu**, NOT as scripture. The audit was built for a different job (scoring one school's maturity, from the director's vantage point), so the survey adjusts freely:
- **Re-routes vantage point** where needed (e.g. teacher competency is *teachers self-reporting*, not a director rating staff).
- **Splits or merges** audit dimensions where the survey's job differs (e.g. the audit's L2.6 Adoption bundles smartboard use + equipment gap + parent-app adoption; the survey sends smartboard use to teachers and parent-app adoption to parents).
- **Adds survey-native dimensions** the audit never needed: end-of-day burden, the lived "digitalizare pe hârtie" double-entry experience (the audit has it only as a derived modifier), vendor-switching behavior, and future demand.

Where a question maps to an audit dimension it is tagged `[audit: X.X]` so the two assets can be cross-referenced. Where it has no audit equivalent it is tagged `[survey-native]`. This keeps the cross-asset link legible without pretending the audit is the source of truth.

### Scale logic — mixed by question purpose

- **Maturity-position questions** (where on the developmental path) use audit-style **0-3 ladders** ("pe hârtie → Excel → platformă dedicată → integrat") and carry an audit dimension tag. These are the cross-referenceable spine.
- **Perception / demand / burden / behavior questions** stay **survey-native** (Likert intensity, multi-select, single-select). A maturity ladder cannot carry "how stressed are you at audit time" or "how important is this to you" — those are not developmental positions.

### Role-routing map

Audit layers/dimensions down the side; the role that gives genuine population-level signal across the top. "owns" = primary, this role is the right source; "—" = not asked of this role.

| Audit dimension | Director | Teacher | Secretariat | Parent | Inspector |
|---|---|---|---|---|---|
| L1 Foundation (devices, connectivity, IT support) | **owns** | symptom | — | — | **system view** |
| L2.2 School management platform | core | — | **owns** | output | — |
| L2.3 Teaching & learning tools | secondary | **owns** | — | child exp. | — |
| L2.4 Administrative software | — | — | **owns** | — | — |
| L2.5 Safety / data / GDPR | secondary | — | secondary | **trust** | — |
| L2.6 Adoption / utilization | core | core | core | parent-app | — |
| L3.1 Teacher competency | secondary | **owns** | — | — | secondary |
| L3.3 Leadership & strategy | **owns** | — | — | — | secondary |
| L3.4 Data use & decisions | **owns** | secondary | — | — | core |
| L3.5 External / inter-institutional comms | secondary | — | — | — | **owns** |
| L3.6 Digital culture & student agency | secondary | core | — | parent view | — |
| *Survey-native: end-of-day burden* | ✓ | ✓ | ✓ | — | — |
| *Survey-native: double-entry / pe hârtie* | ✓ | ✓ | ✓ | offered-unused | — |
| *Survey-native: vendor behavior / switching* | ✓ | — | — | — | — |
| *Survey-native: future demand* | ✓ | ✓ | ✓ | ✓ | ✓ |

Every path stays under ~20 substantive items.

---

## 3. HOST PAGE — STRUCTURE & COPY

*Lives at edus.ro/studiu (confirm slug). Django/Bootstrap, edus-system.css. Job: establish this as a research instrument (not lead-gen), carry the Aug 31 countdown, set the value-exchange expectation, route the five roles. Editorial styling — hairline rules, display type, no filled-box/icon-chip containers. Register: dumneavoastră.*

### 3.1 Hero

**Overline:** STUDIU NAȚIONAL · EDIȚIA 2026
**Title:** Starea digitalizării în școlile din România
**Subhead:** Primul studiu dedicat exclusiv digitalizării învățământului preuniversitar românesc, construit din experiența directă a celor care o trăiesc zilnic: directori, profesori, secretariate, părinți și inspectori.

**Countdown element:** Colectarea răspunsurilor se închide pe 31 august 2026. [live countdown: "Au mai rămas X zile"]

*[Internal: countdown is Year 1 campaign-only. After cutoff, replace with always-on framing.]*

### 3.2 Value exchange band

**Heading:** Ce primiți în schimbul timpului dumneavoastră
**Body:** Răspunsurile dumneavoastră intră într-o imagine pe care nimeni nu a construit-o până acum la nivel național. La final, puteți lăsa o adresă de email pentru a primi raportul complet în momentul publicării, în septembrie 2026. Raportul este gratuit și public.

*[Internal: NO benchmarking promise. Aggregate report only. The "puteți lăsa" phrasing keeps email optional and post-hoc.]*

### 3.3 Anonymity assurance (hairline-ruled, small-caps label)

**Label:** CONFIDENȚIALITATE
**Body:** Studiul este complet anonim. Nu colectăm numele dumneavoastră, numele unității sau alte date de identificare. Dacă alegeți să primiți raportul, adresa de email este păstrată separat de răspunsuri și folosită exclusiv pentru a vă trimite raportul. Răspunsurile nu pot fi legate de identitatea dumneavoastră.

### 3.4 What it covers

**Heading:** Ce măsoară studiul
**Body:** Studiul acoperă întreaga realitate a digitalizării școlare, dincolo de catalogul electronic: infrastructura și echipamentele, platformele de management, instrumentele de predare, software-ul administrativ, competențele digitale ale personalului, modul în care conducerea folosește datele și relația digitală cu autoritățile. Fiecare rol răspunde doar la întrebările relevante pentru activitatea sa.

### 3.5 Role selector (= Q0)

**Heading:** Care este rolul dumneavoastră?
**Body:** Alegeți rolul pe care îl ocupați cel mai mult timp în activitatea zilnică. Veți răspunde la un set de întrebări adaptat acestui rol, în aproximativ 8-12 minute.
[Five role cards → routes to Q0 paths]

### 3.6 Credibility footer

**Body:** Studiul este realizat de echipa Edus, pe baza experienței de lucru cu aproape 1.000 de instituții publice din România și a datelor publice din portalul SEAP. Rezultatele vor fi publicate deschis, fără gard de acces.

*[Internal: Edison/Edus named in attribution only, per universal constraint. This is the one place the brand appears.]*

### 3.7 Post-submit email capture (appears AFTER final question, on completion)

**Heading:** Vă mulțumim. Răspunsurile au fost înregistrate.
**Body:** Dacă doriți să primiți raportul complet în septembrie, lăsați o adresă de email mai jos. Este opțional. Adresa este păstrată separat de răspunsurile dumneavoastră, care rămân anonime.
[email field — optional] [button: "Trimiteți-mi raportul"] [link: "Nu, mulțumesc"]

*[Internal: this screen is the ONLY place email is requested, decoupled, post-submission, optional. Stored in separate table, no FK to response.]*

---

## 4. THE INSTRUMENT

---

## Q0 — ROLE BRANCHING

> **"Care este rolul dumneavoastră principal în sistemul de educație?"**

*Dacă ocupați mai multe roluri (de exemplu, director și profesor în același timp), vă rugăm să răspundeți din perspectiva rolului căruia îi dedicați cel mai mult timp în activitatea zilnică.*

- Director / Director adjunct
- Profesor
- Secretar / Administrator / Personal auxiliar
- Părinte
- Inspector ISJ / Reprezentant autoritate educațională

---

---

# PATH A: DIRECTORI

*[New in v3: Section "Fundație și Infrastructură" (L1) added — directors own infrastructure/budget knowledge. Rest carried from v2.]*

---

## FIRMOGRAPHICS

**AF1.** "Ce tip de unitate școlară conduceți?" *[Single select]*
- Grădiniță
- Școală generală (clasele 0–8)
- Liceu teoretic
- Liceu tehnologic sau vocațional
- Colegiu național
- Școală profesională / duală
- Structură combinată (grădiniță + școală, sau gimnaziu + liceu)
- Școală pentru elevi cu cerințe educaționale speciale (CES)
- Altă unitate de învățământ

**AF2.** "Câți elevi are unitatea pe care o conduceți?" *[Single select]*
- Sub 100 de elevi
- 100–300 de elevi
- 300–700 de elevi
- 700–1.500 de elevi
- Peste 1.500 de elevi

**AF3.** "În ce tip de localitate se află unitatea dumneavoastră?" *[Single select]*
- Mediu rural (comună sau sat)
- Oraș mic (sub 20.000 de locuitori)
- Oraș mediu (20.000–100.000 de locuitori)
- Municipiu (100.000–300.000 de locuitori)
- Municipiu mare (peste 300.000 de locuitori)

**AF4.** "Unitatea dumneavoastră este:" *[Single select]*
- Publică
- Privată autorizată / acreditată

**AF5.** "De câți ani ocupați o funcție de conducere în învățământ?" *[Single select]*
- Sub 2 ani
- 2–5 ani
- 5–10 ani
- Peste 10 ani

---

## PROFIL DE DIGITALIZARE

**AD0.** "Ce instrumente digitale folosiți actualmente în unitatea dumneavoastră?"
*[Multi-select — select all that apply. Răspunsurile vor direcționa întrebările următoare.]*
- Catalog electronic și condică digitală
- Aplicație mobilă sau portal pentru comunicarea cu părinții
- Generare automată de documente administrative (adeverințe, diplome, certificate)
- Module de conformitate sau proceduri (SCIM, CEAC, Achiziții Publice)
- Platformă de conținut educațional digital (resurse interactive, bibliotecă digitală)
- Testare și evaluare online
- Dashboard-uri de conducere sau raportare automată (SIIIR, ISJ)
- Nu folosim platforme digitale de management

*[Internal: primary segmentation variable. Tag: catalog-only / partial / full / non-user.]*

---

## SECȚIUNEA I: Sarcina Zilnică

**A_hook.** "La finalul zilei de lucru, care este principalul lucru care vă împiedică să plecați la timp acasă?"
*[Single select — hook]* `[survey-native]`
- Rapoarte și situații care trebuie trimise urgent către ISJ, ANAP sau alte instituții
- Verificarea și semnarea documentelor administrative ale secretariatului
- Conversații cu profesori, elevi sau părinți care necesită atenție
- Pregătirea pentru o inspecție sau audit care se apropie
- Gestionarea problemelor operaționale și tehnice ale unității
- Altceva

*[Internal: pairs with B1 / C1 for "end of day burden by role" chart.]*

**A1.** "La finalul unei săptămâni de lucru, cât din timpul dumneavoastră a fost consumat de sarcini administrative în loc de conducere și pedagogie?" *[Single select]* `[survey-native]`
- Sub 20% (administrativul rămâne în plan secundar)
- 20–40% (un echilibru relativ rezonabil)
- 40–60% (administrativul domină prea mult)
- Peste 60% (rareori am timp pentru ce contează cu adevărat)

**A2.** "Cât timp estimați că dedică secretariatul și echipa de management săptămânal raportărilor manuale și centralizării datelor?" *[Single select]* `[survey-native]`
- Sub 5 ore
- 5–15 ore
- 15–30 ore
- Peste 30 de ore (echivalentul unui post full-time)

**A3.** "Cât timp și efort vă consumă fiecare dintre următoarele aspecte ale activității administrative?"
*[Multi-item Likert — Minim / Puțin / Moderat / Mult / Enorm]* `[survey-native]`

| Item | Minim | Puțin | Moderat | Mult | Enorm |
|------|-------|-------|---------|------|-------|
| Centralizarea manuală a datelor pentru raportările SIIIR | ○ | ○ | ○ | ○ | ○ |
| Pregătirea documentației pentru inspecții CEAC sau Curtea de Conturi | ○ | ○ | ○ | ○ | ○ |
| Gestionarea circuitului fizic al documentelor și dosarelor | ○ | ○ | ○ | ○ | ○ |
| Coordonarea achizițiilor publice și raportarea ANAP | ○ | ○ | ○ | ○ | ○ |
| Monitorizarea absențelor și riscului de abandon școlar | ○ | ○ | ○ | ○ | ○ |
| Comunicarea cu părinții pe canale neoficiale (telefon, WhatsApp) | ○ | ○ | ○ | ○ | ○ |

---

## SECȚIUNEA II: Fundație și Infrastructură *(NEW in v3)*

*[Internal: L1 Foundation, routed to directors who own budget/infra knowledge. Maturity-position questions → 0-3 ladders, audit-tagged. Compare against inspector E-section system view and against rural/urban (AF3).]*

**A_inf1.** "Cum ați descrie dotarea cu dispozitive (calculatoare, tablete) pentru personalul didactic?"
*[Single select — 0-3 ladder]* `[audit: 1.1]`
- Nu există dispozitive dedicate cadrelor didactice
- Câteva dispozitive partajate, disponibile la cerere
- Majoritatea cadrelor didactice au acces regulat la un dispozitiv
- Fiecare cadru didactic are propriul dispozitiv funcțional

**A_inf2.** "Cum funcționează conexiunea la internet în unitate?"
*[Single select — 0-3 ladder]* `[audit: 1.3]`
- Nu există conexiune sau este foarte instabilă
- Există, dar acoperă doar câteva spații (secretariat, direcțiune)
- Disponibilă în majoritatea spațiilor, cu viteze variabile
- Stabilă și rapidă în toată unitatea, inclusiv în sălile de clasă

**A_inf3.** "Cum este asigurat suportul tehnic în unitate?"
*[Single select — 0-3 ladder]* `[audit: 1.4]`
- Nu există o persoană sau un serviciu responsabil
- Apelăm informal la cineva din personal când apare o problemă
- Avem contract cu un furnizor extern de servicii IT
- Avem o persoană dedicată intern, eventual și contract extern

**A_inf4.** "Care a fost principala sursă de finanțare pentru dotările digitale ale unității în ultimii 2 ani?"
*[Single select]* `[survey-native]` *(was A10 in v2, moved here as it belongs to infrastructure)*
- PNRR sau fonduri europene
- Buget local (primărie sau consiliu județean)
- Resurse proprii sau sponsorizări
- Nu am beneficiat de finanțări semnificative în această perioadă

---

## SECȚIUNEA III: Adoptare și Eficiență

*[Internal: Show A4 and A5 only if AD0 ≠ only "Nu folosim platforme". If non-user, skip to A6.]*

**A4.** "Cum ați descrie stadiul actual de digitalizare al unității dumneavoastră?"
*[Single select — 0-3 ladder, adoption depth proxy]* `[audit: 2.2/2.6 framing]`
- Digitalizare completă: nu mai folosim registre sau dosare fizice
- Hibrid: folosim platforme digitale, dar menținem și formatul fizic în paralel
- Incipient: avem dotări hardware, dar fluxurile digitale sunt parțiale
- Doar raportarea obligatorie (SIIIR): restul rămâne pe hârtie

**A5.** "Față de situația de dinaintea platformei actuale, indiferent dacă era pe hârtie sau cu un alt sistem digital, cât de mult a crescut eficiența în fiecare dintre următoarele aspecte?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Semnificativ / Complet transformat]* `[survey-native]`

| Item | Deloc | Puțin | Moderat | Semnificativ | Complet transformat |
|------|-------|-------|---------|--------------|---------------------|
| Volumul de muncă administrativă al secretariatului | ○ | ○ | ○ | ○ | ○ |
| Transparența informațiilor pentru părinți | ○ | ○ | ○ | ○ | ○ |
| Pregătirea pentru inspecții și audituri | ○ | ○ | ○ | ○ | ○ |
| Comunicarea internă în echipa școlii | ○ | ○ | ○ | ○ | ○ |
| Monitorizarea situației elevilor cu risc de abandon | ○ | ○ | ○ | ○ | ○ |
| Raportarea automată către ISJ sau ANAP | ○ | ○ | ○ | ○ | ○ |

**A6.** "Care este cel mai mare obstacol în calea adoptării depline a instrumentelor digitale de către personalul din unitatea dumneavoastră?" *[Single select]* `[survey-native]`
- Teama de dublă muncă (și pe hârtie, și digital)
- Lipsa competențelor digitale de bază ale personalului
- Echipamentele hardware insuficiente sau învechite
- Rezistența față de schimbarea rutinelor de lucru
- Lipsa timpului pentru training și onboarding
- Calitatea slabă a suportului tehnic din partea furnizorului
- Nu există obstacole semnificative în unitatea noastră

---

## SECȚIUNEA IV: Conducere și Date *(expanded in v3)*

*[Internal: L3.3 Leadership and L3.4 Data use, directors own both. Ladder items audit-tagged.]*

**A_lead1.** "Există un plan de digitalizare pentru unitatea dumneavoastră?"
*[Single select — 0-3 ladder]* `[audit: 3.3]`
- Nu, digitalizarea a avansat reactiv, fără un plan documentat
- Există intenții și discuții, dar nimic formalizat
- Există un plan informal, cunoscut de conducere dar nedocumentat
- Există un plan scris, cu obiective, responsabili și termene clare

**A_data1.** "Datele din platformă (note, absențe, frecvență) sunt folosite activ pentru decizii în unitate?"
*[Single select — 0-3 ladder]* `[audit: 3.4]`
- Nu, datele se colectează pentru raportări externe, nu pentru uz intern
- Uneori, fără un proces clar
- Da, conducerea revizuiește periodic datele și ia decizii pe baza lor
- Da, există un proces structurat de analiză, cu dashboard-uri și întâlniri regulate

---

## SECȚIUNEA V: Comportament față de Furnizori

**A7.** "Ordonați următoarele criterii după importanța lor atunci când evaluați sau alegeți o platformă de management școlar. Trageți de la cel mai important (1) la cel mai puțin important." *[Forced ranking]* `[survey-native]`
- Ușurința de utilizare pentru profesori și secretariat
- Acoperirea completă a nevoilor (catalog + administrație + conformitate într-un singur sistem)
- Conformitatea juridică și omologarea oficială (GDPR, Minister)
- Calitatea suportului tehnic și a trainingului oferit
- Integrarea cu sistemele de raportare existente (SIIIR, ANAP)
- Reputația furnizorului și referințele de la alte școli
- Prețul și costul total de utilizare

*[Internal: price position more informative than any Likert. Cross-tab vs. AD0 and A8b.]*

**A8.** "Cât de satisfăcut sunteți în ansamblu de platforma digitală pe care o utilizați în prezent?"
*[Single select — show only if AD0 ≠ only "Nu folosim platforme"]* `[survey-native]`
- Foarte satisfăcut
- Satisfăcut
- Neutru
- Nesatisfăcut
- Foarte nesatisfăcut

**A8b.** "De cât timp folosiți instrumente digitale de management școlar în unitatea dumneavoastră?" *[Single select]* `[survey-native]`
- Sub 1 an
- 1–3 ani
- 3–6 ani
- Peste 6 ani

**A8c.** "De câte ori ați schimbat furnizorul principal de platformă digitală?" *[Single select]* `[survey-native]`
- Niciodată (am rămas cu primul furnizor)
- O dată
- De două ori
- De trei ori sau mai mult

*[Internal: sophistication curve — A8b × A8c × A7 integration rank × AD0.]*

---

## SECȚIUNEA VI: Priorități Viitoare

**A9.** "Cât de valoroase ar fi pentru dumneavoastră următoarele funcționalități, dacă nu le aveți deja?"
*[Multi-item Likert — Deloc util / Puțin util / Neutru / Util / Esențial]* `[survey-native]`

| Item | Deloc util | Puțin util | Neutru | Util | Esențial |
|------|------------|------------|--------|------|----------|
| Sistem AI de alertă timpurie pentru riscul de abandon școlar | ○ | ○ | ○ | ○ | ○ |
| Dashboard centralizat cu date în timp real pentru conducere | ○ | ○ | ○ | ○ | ○ |
| Generare automată a rapoartelor CEAC și SCIM din datele existente | ○ | ○ | ○ | ○ | ○ |
| Raportare automată integrată cu SIIIR | ○ | ○ | ○ | ○ | ○ |
| Comunicare directă cu părinții prin aplicație mobilă | ○ | ○ | ○ | ○ | ○ |
| Planificarea și monitorizarea achizițiilor publice (ANAP) | ○ | ○ | ○ | ○ | ○ |
| Portofoliul digital al elevului acumulat pe parcursul anilor de școală | ○ | ○ | ○ | ○ | ○ |
| Instrumente pentru monitorizarea finanțărilor PNRR sau europene | ○ | ○ | ○ | ○ | ○ |
| Gestionarea mai multor structuri sau unități arondate dintr-un singur cont | ○ | ○ | ○ | ○ | ○ |
| Comunicare directă cu primăria sau ISJ din platformă | ○ | ○ | ○ | ○ | ○ |

**A11.** *(Întrebare deschisă — ultima)*
"Dacă ați putea schimba un singur lucru la birocrația școlară cu ajutorul tehnologiei, care ar fi acela?" *[Free text, max 300 caractere]* `[survey-native]`

---

---

# PATH B: PROFESORI

*[New in v3: Section II "Predarea Digitală" added — L2.3 teaching tools, L3.1 competency, L3.6 culture, the pedagogy dimension. Rest carried from v2.]*

---

## FIRMOGRAPHICS

**BF1.** "La ce nivel predați preponderent?" *[Single select]*
- Grădiniță / Învățământ preșcolar
- Primar (clasele 0–4)
- Gimnaziu (clasele 5–8)
- Liceu (clasele 9–12)
- Predau la mai multe niveluri

**BF2.** "Ce tip de unitate școlară?" *[Single select — same options as AF1]*

**BF3.** "Câți ani de experiență aveți în învățământ?" *[Single select]*
- Sub 5 ani
- 5–15 ani
- 15–25 ani
- Peste 25 de ani

**BF4.** "În ce tip de localitate se află unitatea dumneavoastră?" *[Single select — same options as AF3]*

**BF5.** "Câți elevi are unitatea școlară în care predați?" *[Single select — same options as AF2]*

---

## PROFIL DE DIGITALIZARE

**BD0.** "Ce instrumente digitale folosiți actualmente în activitatea dumneavoastră la școală?"
*[Multi-select]*
- Catalog electronic pentru note și absențe
- Aplicație mobilă sau portal pentru comunicarea cu părinții
- Platformă de conținut educațional digital (resurse interactive, simulări, bibliotecă)
- Testare și evaluare online
- Instrumente de gamificare și engagement în clasă (Kahoot, ClassDojo, Wordwall etc.)
- Nu folosesc platforme sau instrumente digitale în activitatea școlară

*[Internal: gamification selection isolates teacher-initiated adopters.]*

---

## SECȚIUNEA I: Fluxul Zilnic

**B1.** "La finalul zilei de lucru, care este principalul lucru care vă împiedică să plecați la timp acasă?"
*[Single select — hook]* `[survey-native]`
- Completarea notelor și absențelor (inclusiv în sisteme paralele sau pe hârtie)
- Pregătirea și corectarea lucrărilor și testelor
- Comunicarea cu părinții pe grupuri neoficiale de WhatsApp sau telefon
- Completarea condicii, portofoliilor de elev sau a altor formulare administrative
- Pregătirea materialelor pentru lecțiile următoare
- Altceva

**B2.** "Cât de mult a crescut eficiența în fiecare aspect al activității dumneavoastră de când folosiți instrumente digitale?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Semnificativ / Complet transformat]* `[survey-native]`
*[Show only if BD0 ≠ only "Nu folosesc platforme"]*

| Item | Deloc | Puțin | Moderat | Semnificativ | Complet transformat |
|------|-------|-------|---------|--------------|---------------------|
| Timpul necesar pentru completarea catalogului zilnic | ○ | ○ | ○ | ○ | ○ |
| Comunicarea cu părinții | ○ | ○ | ○ | ○ | ○ |
| Pregătirea situațiilor la final de semestru | ○ | ○ | ○ | ○ | ○ |
| Accesul la materiale didactice și resurse pentru lecții | ○ | ○ | ○ | ○ | ○ |
| Evaluarea elevilor și urmărirea progresului individual | ○ | ○ | ○ | ○ | ○ |
| Pregătirea pentru inspecții | ○ | ○ | ○ | ○ | ○ |

---

## SECȚIUNEA II: Predarea Digitală *(NEW in v3)*

*[Internal: the pedagogy dimension — the heart of the "complete picture" expansion. L2.3 teaching tools + L3.1 competency self-report + L3.6 culture. This establishes the second adoption curve (pedagogy) distinct from the admin curve. B_ped2 (depth) is the clean cross-tab variable: pedagogy adoption vs. admin adoption at school level is the headline "schools digitize admin first, pedagogy lags" finding.]*

**B_ped1.** "Ce faceți în mod curent cu instrumentele digitale în activitatea de predare?"
*[Multi-select]* `[audit: 3.1 / Q28, vantage re-routed to teacher self-report]`
- Folosesc prezentări digitale în predare
- Transmit teme și primesc lucrări digital
- Folosesc resurse interactive (simulări, modele 3D, experimente virtuale)
- Folosesc instrumente de evaluare digitală (teste, fișe generate digital)
- Creez conținut digital original pentru lecții
- Folosesc o platformă prin care elevii accesează materiale și teme (LMS)
- Niciunul dintre acestea în mod regulat

**B_ped2.** "Cât de centrală este tehnologia digitală în modul în care predați?"
*[Single select — depth proxy for pedagogy]* `[survey-native]`
- Digitalul este central: îmi structurez lecțiile în jurul lui
- Îl folosesc des, pentru anumite tipuri de lecții sau activități
- Îl folosesc ocazional, mai mult ca supliment
- Aș folosi mai mult, dar îmi lipsește timpul sau resursele
- Predau în continuare preponderent în mod tradițional

*[Internal: the pedagogy adoption curve. Cross with BD0 admin-tool selection and BF3 experience. "Aș folosi mai mult dar..." is the latent-demand segment.]*

**B_ped3.** "Cum ați descrie nivelul dumneavoastră de competență digitală pentru activitatea didactică?"
*[Single select — 0-3 ladder, self-report]* `[audit: 3.1 / Q27, vantage re-routed]`
- Am dificultăți cu instrumentele digitale de bază
- Mă descurc cu instrumentele de bază, dar rareori merg mai departe
- Folosesc digital în mod curent și sunt confortabil cu majoritatea instrumentelor
- Explorez activ instrumente noi și îi ajut și pe colegi

**B_ped4.** "Ați beneficiat de formare digitală formală în ultimii 2 ani?"
*[Single select — 0-3 ladder]* `[audit: 3.1 / Q29]`
- Nu a existat nicio formare
- O formare generală obligatorie, cu impact limitat
- Formări punctuale pe instrumente specifice, la cerere
- Un program structurat de dezvoltare a competențelor, cu urmărire a progresului

---

## SECȚIUNEA III: Adâncimea Adoptării

**B3.** "Dacă platforma digitală pe care o folosiți ar dispărea mâine, cât de repede ați simți absența?"
*[Single select — adoption depth proxy, compare with C4]* `[survey-native]`
*[Show only if BD0 ≠ only "Nu folosesc platforme"]*
- Imediat: nu mai pot concepe să lucrez altfel
- În câteva zile: ar fi incomod, dar ne-am descurca
- Probabil nu: mai am carnetul fizic sau alte sisteme paralele
- Nu folosesc o platformă digitală în prezent

**B4.** "Cum gestionați în prezent comunicarea cu părinții elevilor dumneavoastră?"
*[Multi-select]* `[survey-native]`
- Prin platforma sau aplicația școlii
- Prin grupuri de WhatsApp sau Messenger
- Prin SMS sau apeluri telefonice
- Prin carnetul de corespondență fizic
- La ședințele cu părinții (față în față)

---

## SECȚIUNEA IV: Bariere și Suport Digital

**B5a.** "Cât de mult vă împiedică fiecare dintre următoarele aspecte să folosiți instrumentele digitale la capacitate maximă?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Mult / Foarte mult]* `[survey-native]`

| Barieră | Deloc | Puțin | Moderat | Mult | Foarte mult |
|---------|-------|-------|---------|------|-------------|
| Necesitatea de a introduce aceleași date în mai multe sisteme simultan | ○ | ○ | ○ | ○ | ○ |
| Calitatea slabă sau instabilitatea conexiunii la internet din școală | ○ | ○ | ○ | ○ | ○ |
| Interfață greu de utilizat sau neintuitivă | ○ | ○ | ○ | ○ | ○ |
| Lipsa echipamentelor hardware adecvate | ○ | ○ | ○ | ○ | ○ |
| Incertitudinea privind ce este obligatoriu digital și ce rămâne pe hârtie | ○ | ○ | ○ | ○ | ○ |
| Nivelul de stres în perioadele de încheiere a semestrului sau de audit | ○ | ○ | ○ | ○ | ○ |

**B5b.** "Cât de mult sunteți de acord cu fiecare afirmație despre suportul digital disponibil în școala dumneavoastră?"
*[Multi-item Likert — Dezacord total / Dezacord / Neutru / Acord / Acord total]* `[survey-native]`

| Afirmație | Dezacord total | Dezacord | Neutru | Acord | Acord total |
|-----------|----------------|----------|--------|-------|-------------|
| Am primit un training adecvat atunci când platforma a fost introdusă | ○ | ○ | ○ | ○ | ○ |
| Primesc informații când sunt adăugate funcționalități noi | ○ | ○ | ○ | ○ | ○ |
| Există un coleg sau responsabil tehnic la care pot apela rapid | ○ | ○ | ○ | ○ | ○ |
| Știu unde să găsesc ghiduri sau tutoriale pentru funcțiile pe care le folosesc | ○ | ○ | ○ | ○ | ○ |
| Suportul tehnic din partea furnizorului răspunde rapid când am o problemă | ○ | ○ | ○ | ○ | ○ |

**B6.** "Când întâmpinați o problemă cu platforma digitală, care este primul lucru pe care îl faceți?"
*[Single select]* `[survey-native]`
- Sun sau scriu la suportul tehnic al furnizorului
- Întreb un coleg din școală care se descurcă mai bine cu tehnologia
- Caut pe Google sau YouTube o soluție
- Încerc să rezolv singur prin trial and error
- Evit să mai folosesc acea funcționalitate
- Revin la varianta pe hârtie sau la sistemul anterior

*[Internal: "Evit" + "revin la hârtie" combined % = abandonment behavior. Cross with BF3 and B5b.]*

---

## SECȚIUNEA V: Nevoi Viitoare

**B7.** "Cât de utile v-ar fi următoarele funcționalități în activitatea dumneavoastră?"
*[Multi-item Likert — Deloc util / Puțin util / Neutru / Util / Esențial]* `[survey-native]`

| Item | Deloc util | Puțin util | Neutru | Util | Esențial |
|------|------------|------------|--------|------|----------|
| Resurse educaționale interactive (simulări, modele 3D, experimente virtuale) | ○ | ○ | ○ | ○ | ○ |
| Generare automată a testelor și fișelor de evaluare | ○ | ○ | ○ | ○ | ○ |
| Notificări automate către părinți la introducerea notelor și absențelor | ○ | ○ | ○ | ○ | ○ |
| Acces offline la catalog în zone cu internet slab sau instabil | ○ | ○ | ○ | ○ | ○ |
| Asistent AI pentru planificarea și adaptarea lecțiilor | ○ | ○ | ○ | ○ | ○ |
| Training continuu și tutoriale integrate direct în platformă | ○ | ○ | ○ | ○ | ○ |
| Comunitate de practică cu alți profesori pentru schimb de materiale | ○ | ○ | ○ | ○ | ○ |

**B8.** *(Întrebare deschisă — ultima)*
"Ce schimbare concretă în instrumentele digitale v-ar economisi cel mai mult timp săptămânal?" *[Free text, max 300 caractere]* `[survey-native]`

---

---

# PATH C: SECRETARIAT / ADMINISTRATIV

*[Internal: the persona where Edison's strongest outcome evidence lives. Most operationally detailed path. C1/C4 parallel to A_hook/B1 and A4/B3. Register: dumneavoastră. Largely L2.4 admin software + L2.2 + survey-native double-entry.]*

---

## FIRMOGRAPHICS

**CF1.** "În ce tip de unitate lucrați?" *[Single select — same options as AF1]*

**CF2.** "Care este rolul dumneavoastră principal?" *[Single select]*
- Secretar / Secretar șef
- Administrator de patrimoniu
- Contabil / Personal financiar
- Informatician / Responsabil IT
- Alt personal auxiliar sau administrativ

**CF3.** "În ce tip de localitate se află unitatea dumneavoastră?" *[Single select — same options as AF3]*

**CF4.** "Câți elevi are unitatea în care lucrați?" *[Single select — same options as AF2]*

**CF5.** "De câți ani lucrați în administrația unei unități de învățământ?" *[Single select]*
- Sub 2 ani
- 2–5 ani
- 5–10 ani
- Peste 10 ani

---

## PROFIL DE DIGITALIZARE

**CD0.** "Ce instrumente digitale folosiți actualmente în activitatea administrativă?"
*[Multi-select]*
- Catalog electronic și condică digitală
- Generare automată de documente (adeverințe, diplome, certificate, situații școlare)
- Gestiune digitală a dosarelor de elevi și a burselor
- Aplicație de raportare către SIIIR
- Module de conformitate sau proceduri (SCIM, CEAC, Achiziții Publice)
- Semnătură electronică pentru documente oficiale
- Registratură sau circuit digital al documentelor
- Nu folosesc platforme digitale în activitatea administrativă

*[Internal: CD0 = segmentation spine for Path C.]*

---

## SECȚIUNEA I: Sarcina Zilnică

**C1.** "La finalul zilei de lucru, care este principalul lucru care vă împiedică să plecați la timp acasă?"
*[Single select — hook, parallels A_hook/B1]* `[survey-native]`
- Generarea și verificarea documentelor oficiale (adeverințe, diplome, situații)
- Centralizarea manuală a datelor pentru raportările către SIIIR sau ISJ
- Gestionarea circuitului fizic al documentelor și a dosarelor cu șină
- Introducerea acelorași date în mai multe sisteme sau registre
- Solicitări urgente venite de la conducere, părinți sau alte instituții
- Altceva

**C2.** "Cât timp dedicați într-o săptămână obișnuită fiecăreia dintre următoarele activități?"
*[Multi-item — Sub 1 oră / 1–3 ore / 3–6 ore / 6–10 ore / Peste 10 ore]* `[survey-native]`

| Activitate | Sub 1 oră | 1–3 ore | 3–6 ore | 6–10 ore | Peste 10 ore |
|-----------|-----------|---------|---------|----------|--------------|
| Generarea documentelor oficiale (adeverințe, diplome, certificate) | ○ | ○ | ○ | ○ | ○ |
| Centralizarea datelor și raportarea către SIIIR | ○ | ○ | ○ | ○ | ○ |
| Gestionarea dosarelor de elevi și a burselor | ○ | ○ | ○ | ○ | ○ |
| Circuitul fizic al documentelor (printare, semnături, arhivare) | ○ | ○ | ○ | ○ | ○ |
| Pregătirea documentației pentru inspecții și audituri | ○ | ○ | ○ | ○ | ○ |

*[Internal: headline data for secretariat chapter. Task-level time bands only — do NOT derive per-role admin-hours point figures (standing hard ruling).]*

**C3.** "Cât de des trebuie să introduceți aceleași informații în mai multe locuri (de exemplu, și în registrul fizic, și în platforma digitală, și într-un fișier separat)?"
*[Single select — double-entry / "digitalizare pe hârtie" diagnostic]* `[survey-native — maps conceptually to audit modifier digitalizare_pe_hartie]`
- Aproape niciodată: datele se introduc o singură dată
- Ocazional: pentru anumite raportări specifice
- Frecvent: pentru o bună parte din activitatea curentă
- Permanent: dubla evidență este regula, nu excepția

*[Internal: single most commercially relevant item in Path C. "Frecvent" + "Permanent" % quantifies "digitalizare pe hârtie." Cross with CD0 and CF3.]*

---

## SECȚIUNEA II: Adoptare și Eficiență

*[Internal: Show C4 and C5 only if CD0 ≠ only "Nu folosesc platforme". If non-user, skip to C6.]*

**C4.** "Dacă platforma digitală pe care o folosiți ar dispărea mâine, cât de repede ați simți absența?"
*[Single select — adoption depth, parallels B3]* `[survey-native]`
- Imediat: activitatea s-ar bloca, nu mai pot lucra altfel
- În câteva zile: ar fi dificil, dar ne-am descurca temporar
- Probabil nu: păstrăm oricum și evidența pe hârtie
- Nu folosesc o platformă digitală în prezent

**C5.** "Față de situația de dinaintea platformei actuale, cât de mult a crescut eficiența în fiecare dintre următoarele aspecte?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Semnificativ / Complet transformat]* `[survey-native]`

| Item | Deloc | Puțin | Moderat | Semnificativ | Complet transformat |
|------|-------|-------|---------|--------------|---------------------|
| Timpul necesar pentru generarea documentelor oficiale | ○ | ○ | ○ | ○ | ○ |
| Acuratețea documentelor și reducerea erorilor | ○ | ○ | ○ | ○ | ○ |
| Raportarea către SIIIR și alte instituții | ○ | ○ | ○ | ○ | ○ |
| Gestionarea dosarelor de elevi și a burselor | ○ | ○ | ○ | ○ | ○ |
| Pregătirea pentru inspecții și audituri | ○ | ○ | ○ | ○ | ○ |
| Volumul de hârtie și de arhivare fizică | ○ | ○ | ○ | ○ | ○ |

**C6.** "Care este cel mai mare obstacol în calea folosirii depline a instrumentelor digitale în activitatea administrativă?"
*[Single select]* `[survey-native]`
- Necesitatea de a menține în paralel și evidența pe hârtie
- Platforma nu acoperă toate tipurile de documente de care am nevoie
- Lipsa interoperabilității cu SIIIR sau alte sisteme obligatorii
- Interfața este greu de utilizat sau neintuitivă
- Lipsa trainingului adecvat pentru funcțiile administrative
- Calitatea slabă a suportului tehnic din partea furnizorului
- Nu există obstacole semnificative

*[Internal: "lipsa interoperabilității cu SIIIR" probes the value condition — SIIIR interoperability is what makes a private platform worth adopting.]*

---

## SECȚIUNEA III: Suport și Conformitate

**C7.** "Cât de mult sunteți de acord cu fiecare afirmație despre activitatea administrativă din unitatea dumneavoastră?"
*[Multi-item Likert — Dezacord total / Dezacord / Neutru / Acord / Acord total]* `[survey-native]`

| Afirmație | Dezacord total | Dezacord | Neutru | Acord | Acord total |
|-----------|----------------|----------|--------|-------|-------------|
| Am primit un training adecvat pentru instrumentele digitale pe care le folosesc | ○ | ○ | ○ | ○ | ○ |
| Știu unde să găsesc ajutor rapid când am o problemă tehnică | ○ | ○ | ○ | ○ | ○ |
| Perioadele de raportare obligatorie sunt o sursă majoră de stres | ○ | ○ | ○ | ○ | ○ |
| Aș putea prelua mai multe sarcini dacă aș petrece mai puțin timp cu documentele | ○ | ○ | ○ | ○ | ○ |
| Riscul de eroare în documentele oficiale mă preocupă constant | ○ | ○ | ○ | ○ | ○ |

**C8.** "Cât de pregătită este unitatea dumneavoastră pentru un control sau o inspecție neanunțată, din punctul de vedere al documentației?"
*[Single select]* `[survey-native]`
- Complet pregătiți: documentația este oricând la zi și accesibilă
- În mare parte pregătiți: ar fi nevoie de câteva ore de organizare
- Parțial: pregătirea pentru control înseamnă zile de muncă suplimentară
- Nepregătiți: fiecare control este o sursă majoră de stres

*[Internal: pairs with A5 director audit-readiness perception — gap between director belief and secretariat reality is a strong finding.]*

---

## SECȚIUNEA IV: Nevoi Viitoare

**C9.** "Cât de utile v-ar fi următoarele funcționalități în activitatea administrativă?"
*[Multi-item Likert — Deloc util / Puțin util / Neutru / Util / Esențial]* `[survey-native]`

| Item | Deloc util | Puțin util | Neutru | Util | Esențial |
|------|------------|------------|--------|------|----------|
| Generare automată a tuturor tipurilor de documente oficiale | ○ | ○ | ○ | ○ | ○ |
| Semnătură electronică integrată în fluxul de documente | ○ | ○ | ○ | ○ | ○ |
| Raportare automată integrată cu SIIIR (fără reintroducerea datelor) | ○ | ○ | ○ | ○ | ○ |
| Dosar digital complet al elevului, accesibil instantaneu | ○ | ○ | ○ | ○ | ○ |
| Gestionarea digitală a burselor și a dosarelor sociale | ○ | ○ | ○ | ○ | ○ |
| Arhivă digitală căutabilă a documentelor instituției | ○ | ○ | ○ | ○ | ○ |
| Pregătirea automată a documentației pentru inspecții | ○ | ○ | ○ | ○ | ○ |

**C10.** *(Întrebare deschisă — ultima)*
"Dacă ați putea elimina o singură sarcină administrativă repetitivă cu ajutorul tehnologiei, care ar fi aceea?" *[Free text, max 300 caractere]* `[survey-native]`

---

---

# PATH D: PĂRINȚI

*[Internal: parents have a genuine knowledge ceiling. Sized to it (~11 items). New in v3: D5b child's-learning-experience (the pedagogy dimension from the parent side, distinct from information access). Register: dumneavoastră (open issue: tu may be warmer — flagged). School type + locality for cross-tab against director/secretariat.]*

---

## CONTEXT

**DF1.** "Câți copii aveți în prezent în sistemul de învățământ (grădiniță, școală sau liceu)?" *[Single select]*
- Un copil
- Doi copii
- Trei sau mai mulți copii

**DF2.** "La ce nivel învață copilul dumneavoastră (sau copilul cel mai mare, dacă aveți mai mulți)?" *[Single select]*
- Grădiniță
- Primar (clasele 0–4)
- Gimnaziu (clasele 5–8)
- Liceu (clasele 9–12)

**DF3.** "În ce tip de localitate se află unitatea de învățământ?" *[Single select — same options as AF3]*

---

## SECȚIUNEA I: Accesul la Informație

**D1.** "În cât timp aflați, de obicei, că s-a pus o notă sau o absență copilului dumneavoastră?"
*[Single select — hook]* `[survey-native]`
- Instant: primesc o notificare pe telefon
- În aceeași zi: verific aplicația sau platforma seara
- După câteva zile: când apuc să vorbesc cu copilul
- Doar la ședința cu părinții
- Nu am acces digital la aceste informații

*[Internal: "Instant" + "În aceeași zi" % = parent-facing transparency headline. Cross with DF3 for rural/urban gap.]*

**D2.** "Prin ce canal primiți cele mai importante informații de la școală?"
*[Single select — production note: do not name any platform]* `[survey-native]`
- Aplicație sau platformă dedicată a școlii
- Grupuri de WhatsApp sau Messenger
- SMS-uri sau apeluri telefonice
- Carnetul de elev (format fizic)
- Anunțuri la ședințele cu părinții

**D3.** "Cât de mulțumit sunteți de modul în care comunicați în prezent cu școala copilului dumneavoastră?"
*[Single select]* `[survey-native]`
- Foarte mulțumit
- Mulțumit
- Neutru
- Nemulțumit
- Foarte nemulțumit

---

## SECȚIUNEA II: Experiența Digitală

**D4.** "Folosiți în prezent o aplicație sau o platformă digitală pentru a urmări situația școlară a copilului?"
*[Single select — segmentation gate for Path D]* `[survey-native]`
- Da, o folosesc regulat
- Da, dar o folosesc rar
- Nu, deși școala oferă una
- Nu, școala nu oferă o astfel de aplicație

*[Internal: D4 = parent-side segmentation spine. Gap between "școala oferă una" and real use = parent-side shallow-adoption signal, mirrors C3.]*

**D5.** "Cât de mult v-au îmbunătățit instrumentele digitale relația cu școala, în fiecare dintre următoarele aspecte?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Semnificativ / Complet transformat]* `[survey-native]`
*[Show only if D4 ≠ "Nu, școala nu oferă"]*

| Item | Deloc | Puțin | Moderat | Semnificativ | Complet transformat |
|------|-------|-------|---------|--------------|---------------------|
| Rapiditatea cu care aflu notele și absențele | ○ | ○ | ○ | ○ | ○ |
| Comunicarea directă cu profesorii | ○ | ○ | ○ | ○ | ○ |
| Înțelegerea progresului real al copilului | ○ | ○ | ○ | ○ | ○ |
| Accesul la orar, teme și anunțuri | ○ | ○ | ○ | ○ | ○ |

**D5b.** "Cât de des folosește copilul dumneavoastră instrumente digitale pentru învățarea propriu-zisă, acasă sau la școală?" *(NEW in v3 — pedagogy from parent side)*
*[Multi-select]* `[audit: 2.3 / 3.6, parent vantage]`
- Își face temele sau lucrările printr-o platformă digitală
- Accesează acasă materiale, lecții sau înregistrări de la școală
- Folosește resurse educaționale interactive oferite de școală
- Exersează sau este evaluat prin aplicații digitale
- Lucrează la proiecte digitale (prezentări, video, programare)
- Nu folosește instrumente digitale pentru învățare, după câte știu

**D5c.** "Cât de important este pentru dumneavoastră ca școala să folosească metode moderne de predare digitală, dincolo de comunicarea cu părinții?" *(NEW in v3 — pedagogy demand)*
*[Single select]* `[survey-native]`
- Foarte important: este un criteriu pentru mine
- Important, dar nu decisiv
- Neutru
- Nu este o prioritate pentru mine
- Prefer metodele tradiționale de predare

*[Internal: D5c is the high-value demand item — does parent demand exist for pedagogical digitalization, or only for transparency? Safe to publish, useful internally for content-module positioning.]*

**D6.** "Vă simțiți mai conectat la viața școlară a copilului de când școala folosește instrumente digitale?"
*[Single select — show only if D4 ≠ "Nu, școala nu oferă"]* `[survey-native]`
- Da, semnificativ mai conectat
- Da, puțin mai conectat
- Nu am observat o diferență
- Mă simt mai puțin conectat decât înainte

*[Internal: connected parent = renewal argument. Cross D6 × D4 usage frequency.]*

---

## SECȚIUNEA III: Încredere și Așteptări

**D7.** "Cât de mult vă îngrijorează siguranța datelor personale ale copilului în mediul digital școlar?"
*[Single select]* `[survey-native]`
- Deloc: am încredere în soluțiile oficiale și omologate
- Puțin: consider că beneficiile depășesc riscurile
- Moderat: îmi pun întrebări, dar folosesc platforma
- Mult: este o preocupare reală pentru mine

*[Internal: production ruling — if "Mult" dominates, frame as industry-wide trust challenge, never vendor-specific.]*

**D8.** "Care dintre următoarele v-ar fi cel mai util în relația cu școala?"
*[Single select]* `[survey-native]`
- Să văd ce învață efectiv copilul la clasă (resurse, materiale)
- Să comunic direct și rapid cu fiecare profesor
- Să primesc din timp semnale despre scăderea performanței copilului
- Să am acces la orar, meniul cantinei și anunțuri actualizate
- Să reduc numărul de aplicații și grupuri pe care le folosesc acum

**D9.** *(Întrebare deschisă — ultima)*
"Care este singurul lucru care v-ar îmbunătăți cel mai mult relația cu școala copilului?" *[Free text, max 300 caractere]* `[survey-native]`

---

---

# PATH E: INSPECTORI / AUTORITĂȚI EDUCAȚIONALE

*[Internal: smallest sample, highest authority per respondent. Captured in Year 1 because the ISJ → DJIP reorganization is in progress — baseline during transition is valuable for Year 2. ISJ/DJIP dual-naming. System-level (portfolio, not "your school"). Heavy on L3.4 data-use and L3.5 inter-institutional (E owns both). Register: dumneavoastră.]*

---

## CONTEXT

**EF1.** "Care este rolul dumneavoastră în cadrul autorității educaționale?" *[Single select]*
- Inspector școlar de specialitate
- Inspector școlar general / adjunct
- Personal de conducere în cadrul ISJ / DJIP
- Personal din cadrul DJIP cu atribuții de monitorizare
- Alt rol în administrația educațională

*[Internal: ISJ → DJIP reorganization in progress. Both terms included so respondents self-identify regardless of county transition status. The ISJ-vs-DJIP self-identification split is itself a small data point on reorganization progress.]*

**EF2.** "Câte unități de învățământ se află în portofoliul dumneavoastră de monitorizare?" *[Single select]*
- Sub 10 unități
- 10–30 de unități
- 30–60 de unități
- Peste 60 de unități

**EF3.** "Ce tip de județ sau zonă acoperiți preponderent?" *[Single select]*
- Preponderent rural
- Mixt (rural și urban în proporții relativ egale)
- Preponderent urban

---

## SECȚIUNEA I: Imaginea de Ansamblu

**E1.** "Cum ați descrie, în ansamblu, stadiul de digitalizare al unităților din portofoliul dumneavoastră?"
*[Single select]* `[survey-native]`
- Majoritatea sunt digitalizate complet sau în mare parte
- Imaginea este mixtă: unele avansate, altele la început
- Majoritatea sunt la un stadiu incipient
- Diferențele dintre unități sunt foarte mari și greu de generalizat

**E2.** "Care este, după observația dumneavoastră, principalul factor care diferențiază unitățile digitalizate de cele rămase în urmă?"
*[Single select]* `[survey-native]`
- Resursele financiare și accesul la finanțări (PNRR, buget local)
- Atitudinea și implicarea conducerii unității
- Competențele digitale ale personalului
- Infrastructura tehnică (internet, echipamente)
- Sprijinul și coordonarea de la nivel județean
- Calitatea soluțiilor digitale disponibile pe piață

*[Internal: inspector's diagnosis of the gap — complement to director A6. Where A6 and E2 disagree = useful tension.]*

---

## SECȚIUNEA II: Raportare și Date

**E3.** "Cât de mult vă îngreunează fiecare dintre următoarele aspecte activitatea de monitorizare?"
*[Multi-item Likert — Deloc / Puțin / Moderat / Mult / Foarte mult]* `[audit: 3.4 system-level / survey-native]`

| Aspect | Deloc | Puțin | Moderat | Mult | Foarte mult |
|--------|-------|-------|---------|------|-------------|
| Colectarea manuală a datelor de la unități | ○ | ○ | ○ | ○ | ○ |
| Formatele neunitare în care unitățile trimit raportările | ○ | ○ | ○ | ○ | ○ |
| Întârzierile în transmiterea datelor de la unități | ○ | ○ | ○ | ○ | ○ |
| Lipsa unei imagini centralizate, în timp real, a portofoliului | ○ | ○ | ○ | ○ | ○ |
| Verificarea acurateței datelor primite | ○ | ○ | ○ | ○ | ○ |

**E4.** "Cât de mult ar îmbunătăți activitatea dumneavoastră o raportare digitală standardizată, în care datele să ajungă automat de la unități?"
*[Single select]* `[audit: 3.5 system-level]`
- Ar transforma complet activitatea de monitorizare
- Ar îmbunătăți semnificativ activitatea
- Ar ajuta moderat
- Diferența ar fi minoră
- Nu este o prioritate în activitatea curentă

---

## SECȚIUNEA III: Priorități de Sistem

**E5.** "Cât de utile ar fi următoarele, la nivelul portofoliului dumneavoastră?"
*[Multi-item Likert — Deloc util / Puțin util / Neutru / Util / Esențial]* `[survey-native]`

| Item | Deloc util | Puțin util | Neutru | Util | Esențial |
|------|------------|------------|--------|------|----------|
| Tablou centralizat cu indicatorii cheie ai tuturor unităților | ○ | ○ | ○ | ○ | ○ |
| Raportare automată și standardizată dinspre unități | ○ | ○ | ○ | ○ | ○ |
| Semnale timpurii privind riscul de abandon la nivel de unitate | ○ | ○ | ○ | ○ | ○ |
| Interoperabilitate completă cu SIIIR | ○ | ○ | ○ | ○ | ○ |
| Comparabilitatea indicatorilor între unități similare | ○ | ○ | ○ | ○ | ○ |

**E6.** "Care considerați că ar trebui să fie principala prioritate în digitalizarea învățământului la nivelul județului dumneavoastră în următorii doi ani?"
*[Single select]* `[survey-native]`
- Dotarea cu echipamente și infrastructură de bază
- Adoptarea unor platforme de management în toate unitățile
- Standardizarea raportării și a fluxurilor de date
- Formarea digitală a personalului
- Reducerea birocrației prin automatizare

**E7.** *(Întrebare deschisă — ultima)*
"Din perspectiva dumneavoastră de monitorizare a mai multor unități, care este cea mai mare oportunitate ratată în digitalizarea școlilor din România?" *[Free text, max 300 caractere]* `[survey-native]`

---

---

## 5. INTERNAL NOTES — ALL PATHS (A–E)

### Key Cross-Tabs to Plan in Analysis

| Cross-tab | Question(s) | Hypothesis |
|-----------|-------------|------------|
| **Admin vs. pedagogy adoption curve** | BD0 (admin tools) × B_ped2 (pedagogy depth) | Schools digitize administration first; pedagogy lags far behind. THE headline finding. |
| Pedagogy demand | D5c (parent demand) × B_ped2 (teacher reality) | Parent demand for digital pedagogy may outstrip actual classroom adoption |
| Sophistication curve | A8b × A7 (integration rank) × AD0 | Longer-tenured digital users rank integration higher than price |
| Switching profile | A8c × A8 | Serial switchers show lower satisfaction, not higher |
| Skills gap by school type | BF2 × B5b / B_ped3 | Rural schools show weaker support and lower self-reported competency |
| Abandonment behavior | B6 × BF3 | Veteran teachers more likely to revert to paper |
| Infrastructure vs. adoption | A_inf1/2/3 × A4 | Having infrastructure does not guarantee deep adoption (pe hârtie) |
| Burden by role | A_hook × B1 × C1 | Different "late home" profiles reveal where burden concentrates by role |
| Double-entry / pe hârtie | C3 × CD0 × CF3 | Having tools does not eliminate double entry; rural worse |
| Audit-readiness perception gap | A5 (director) × C8 (secretariat) | Directors overestimate audit readiness vs. secretariat reality |
| Adoption depth by role | A4 × B3 × C4 | Secretariat deepest dependence; teachers most paper-fallback |
| SIIIR interoperability demand | C6 × C9 × E5 | Interoperability is the shared value condition across operational roles |
| Information transparency gap | D1 × DF3 | Rural parents learn of grades later — mirrors director-side gap |
| Parent connection value | D6 × D4 | Regular-use parents feel more connected — renewal argument |
| Director vs. inspector diagnosis | A6 × E2 | Directors and inspectors may disagree on primary cause of the gap |
| Leadership × maturity | A_lead1 × A4 × A_data1 | Schools with written plans show deeper adoption and more data use |

### Cross-Asset: Survey ↔ Audit
Ladder items tagged `[audit: X.X]` are directly comparable to the audit's dimension scores. In the report and in future analysis, the field-level survey picture can be set against the school-level audit self-assessment on the same dimension (e.g. "schools self-assess weakest on 3.4 data-use in the audit; the survey shows directors rarely use platform data for decisions — A_data1"). The audit is the borrowed vocabulary, not the source of truth; divergences are intentional and noted inline.

### Items Shared Across Paths for Comparability
- "End of day burden": A_hook / B1 / C1
- "Adoption depth" proxy: A4 / B3 / C4
- Firmographic school type and locality: AF1/AF3 = BF2/BF4 = CF1/CF3 = DF2/DF3
- "Digitalizare pe hârtie" signal: C3 (double entry) ≈ D4 (offered-but-unused) ≈ A4 "Doar raportarea obligatorie"
- Pedagogy curve: B_ped1/B_ped2 (teacher) ≈ D5b (parent observation of child)

### Data-Integrity Reminders (apply at analysis stage)
- C2 reports task-level time bands only. Do NOT derive per-teacher or per-role admin-hours point figures from any path (standing hard ruling).
- No vendor or platform names anywhere in the public-facing instrument or report body. Edus named only in host-page credibility footer (attribution).
- Segment every finding by platform-user vs. non-user (AD0/BD0/CD0/D4) — mandatory and transparent.
- Open-text (A11/B8/C10/D9/E7) reproduced as-is, not cherry-picked.
- No personalized/benchmarking claims in Year 1. Aggregate report only.

### Open Issues — for review before launch
- [ ] **Path D register:** dumneavoastră (current, consistent) vs. tu (warmer for parents). Decision needed.
- [ ] **Path A length:** v3 added Sections II (infrastructure, 4 items) and the leadership/data pair. Director path now ~22 items. Confirm acceptable or trim (candidates to cut: A_data1 overlaps A9 dashboard item; A_inf4 financing could move to firmographics).
- [ ] **Path E distribution channel:** no obvious cold list for inspectors — relies on direct ISJ/DJIP relationships. Confirm the channel exists before counting on E data.
- [ ] **B_ped section placement:** currently Section II, before adoption depth. Confirm flow feels right (pedagogy before the "if it vanished" question).
- [ ] **C2 vs. A3 scale mismatch:** C2 = hour bands, A3 = effort Likert. Intentional (secretariat estimates hours, directors estimate effort). Confirm acceptable for report.
- [ ] **D5b/D5c addition:** confirm parents can meaningfully answer child's-learning-experience, or whether D5b risks "nu știu" noise.
- [ ] **Host page slug:** edus.ro/studiu assumed. Confirm.
- [ ] **Aug 31 cutoff in UI:** countdown component — confirm with dev. After cutoff, swap to always-on framing.

### Changelog v2 → v3
- Added comprehensive dimension coverage via audit-borrowed taxonomy (Section 2).
- Path A: new Section II Fundație și Infrastructură (A_inf1-4, L1); new leadership/data pair (A_lead1, A_data1); A10 financing relocated to A_inf4.
- Path B: new Section II Predarea Digitală (B_ped1-4 — pedagogy, the core "complete picture" addition).
- Path D: new D5b (child learning experience) + D5c (pedagogy demand).
- Paths C, E: built (were pending in v2).
- Added host page structure + copy (Section 3).
- Added build decisions: Aug 31 visible cutoff → always-on; email decoupled value-exchange; benchmarking deferred to 2027.
- All maturity-position items tagged with audit dimension; all others tagged survey-native.

---

*Status: v3 full draft for review. On approval: fold decisions into edus_starea_digitalizarii_strategy.md, update kanban (C/D/E drafted → next = Django build spec), and the host-page copy can go to a Claude Design pass.*
