
# Edus Website & Tools — Design System
**Version:** 2.0
**Last updated:** June 18, 2026
**Source of truth for:** all page builds, all interactive tool builds, dev handoff, every future Claude Design session
**Supersedes:** v1.2

---

## 0. What changed in v2.0

v1.2 covered the marketing site only. Since then, the Guides build and the Digital Maturity Audit build each needed patterns the marketing system never had, and each brief re-derived its own version of the token set instead of referencing this file. The two drifted from canon and from each other. This version fixes that.

- **Token drift corrected.** The Audit brief used `#1A1A2E` for primary text and `#0D9373` for teal. Neither is canon. Corrected to `#111827` and `#0D9488` below. If any Audit screens were already generated in Claude Design with the old values, regenerate them before build.
- **Two semantic colors promoted to canon:** teal `#0D9488` (already in quiet use on the AP sub-module badge) and amber `#D97706` (new, for warning/coming-soon states).
- **One restricted-use token added:** `#1B4F91`, an "impact accent" for full-bleed score or profile reveal moments only. Not a section background, not a button color, not a general accent.
- **New §4, Tool Component Library.** Interactive instruments need patterns the page-only system never covered: form inputs, radio/checkbox states, progress steppers, accordions, charts, profile reveal cards. These are now documented permanently, consolidated from the Guides and Audit builds.
- **New §7, Tool Templates.** The reusable scaffolding behind a tool front door, a question flow, and a results reveal — codified so the next tool (Product Tour, Harta sales variant, anything in the sales toolkit Layer B/C) doesn't reinvent these from scratch.
- **Process change going forward:** every new Claude Design brief references this file for tokens and components rather than re-specifying them. Any genuinely new component proposed in a brief gets merged back here before the next build session starts, not left to drift.

---

## 1. Stack & Setup

| Layer | Choice |
|-------|--------|
| Framework | Django |
| CSS base | Bootstrap 5 |
| Custom CSS | edus-system.css (in /static/css/) |
| Templates | `{% extends "base.html" %}` + `{% block content %}` only — no nav/footer in page files |
| Static files | `/static/images/new/` for all screenshots and assets |
| Staging | https://edus.ro/new-design/ |
| Interactive tool JS | Vanilla JS. No React, no npm, no build step on the production page. |
| Charts | Chart.js via CDN (`https://cdn.jsdelivr.net/npm/chart.js`) — used for the Calculator's cumulative savings chart and the Audit's radar chart |

### Dev setup checklist
1. Copy `edus-system.css` → `/static/css/edus-system.css`
2. Import in `base.html` after Bootstrap: `<link rel="stylesheet" href="{% static 'css/edus-system.css' %}">`
3. Fonts (Axiforma and Albra are commercial): load via `@font-face` in project — do NOT use Google Fonts
4. Add scroll fade-in JS to `base.html` (`.edus-fade-in` class, IntersectionObserver)
5. Drop page HTML files into templates folder, register URLs

**Note for Claude Design sessions:** tool builds (Calculator, Audit, future instruments) go through the same Django + Bootstrap 5 + edus-system.css pipeline as marketing pages. There is no separate stack for "tools." A Claude Design mockup is a visual reference; the build session afterward (Claude Code) renders it against this same system.

---

## 2. Design Tokens

### 2.1 Colors

**Core palette:**

| Token | Hex | Usage |
|-------|-----|-------|
| Primary blue | `#307FE2` | CTAs, links, icons, active states, borders |
| Light blue bg | `#E7F1FC` | Hero backgrounds, screenshot wrappers (blue), icon backgrounds, trust strip icons |
| Coral | `#FDF0EC` | Testimonial background (odd pages), warm card tints, priority flag tints |
| Mint | `#E8F9F6` | Testimonial background (even pages), screenshot wrappers (mint), success-adjacent tints |
| Yellow | `#FFFDE5` | Warm accent — signal callouts, coming-soon states, soft highlights |
| Dark | `#111827` | Primary text, display headings, dark badge backgrounds. **Only canonical near-black.** |
| Body grey | `#374151` | Body text, descriptions |
| Muted | `#6B7280` | Labels, meta text, card body, secondary text |
| Disabled | `#9CA3AF` | Greyed-out tier cards (Pro-only pages) |
| Border | `#E5E7EB` | Card borders, section dividers |
| Surface light | `#F9FAFB` | Alternating section backgrounds, card backgrounds in grids |
| White | `#ffffff` | Default page background |

**Semantic additions (v2.0):**

| Token | Hex | Usage |
|-------|-----|-------|
| Teal | `#0D9488` | Success states, positive metrics, secondary accent. Already in use on the AP sub-module badge — now canonical everywhere. |
| Amber | `#D97706` | Warning states, "coming soon" badges, attention flags |
| Coral text (deep) | `#C2522A` | Text paired with coral backgrounds where body-on-coral needs more contrast than the base palette gives (modifier badges, priority labels) |
| Impact accent | `#1B4F91` | Restricted use only: full-bleed score/profile reveal cards (see §4.8). White text only. Never a section background, button, or general accent. |

**Deprecated, do not use:** `#1A1A2E` (use `#111827` instead) · `#0D9373` (use `#0D9488` instead)

### 2.2 Typography

| Role | Font | Weight | Size | Line height |
|------|------|--------|------|-------------|
| Display (hero H1) | Albra | 600 | 50–52px | 58–62px |
| Section title (H2) | Albra | 600 | 36–38px | 44–46px |
| Hub hero title | Albra | 600 | 52px | 62px |
| Card/feature title (H3) | Axiforma | 600 | 17–19px | 24–26px |
| CTA banner title | Albra | 600 | 40px | 50px |
| Tier card title | Albra | 600 | 22–26px | auto |
| Body / descriptions | Axiforma | 300 | 16px | 26px |
| Card body text | Axiforma | 300 | 14px | 22px |
| Feature list items | Axiforma | 300 | 15px | auto |
| Labels / overlines | Axiforma | 600 | 12–13px | auto — uppercase, letter-spacing 0.06–0.08em |
| Trust strip numbers | Albra | 600 | 28px | 1.1 |
| Trust strip labels | Axiforma | 300 | 13px | auto |
| CTA lead text | Axiforma | 300 | 17px | 28px |
| Nav/link text | Axiforma | 600 | 14–15px | auto |
| Score/stat headline (tools) | Albra | 600 | 56–72px | 1.1 |

**Note:** Axiforma 300 at 12px is the Figma spec for some elements, but 16px is used in edus-lead for accessibility. Always use 16px+ for body copy in production.

### 2.3 Spacing

Section vertical padding: `80px` top and bottom (applied via inline `padding-top: 80px !important; padding-bottom: 80px !important` on section elements, overriding Bootstrap `py-5`/`py-lg-6`).

Standard content gaps: Bootstrap `g-4` (24px) for card grids, `g-5` (48px) for feature block rows.

---

## 3. Page Component Library

### 3.1 Buttons

**Primary button**
```html
<a href="..." style="background-color: #307FE2; color: #fff; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block;">
  Label
</a>
```

**Ghost button**
```html
<a href="..." style="color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 15px; padding: 14px 28px; border-radius: 8px; text-decoration: none; display: inline-block; border: 1.5px solid #307FE2;">
  Label
</a>
```

**CTA banner primary (white on blue)**
```html
<a href="..." style="background-color: #fff; color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block;">
  Label
</a>
```

**CTA banner ghost (white outline)**
```html
<a href="..." style="background-color: transparent; color: #fff; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 15px; padding: 14px 32px; border-radius: 8px; text-decoration: none; display: inline-block; border: 1.5px solid rgba(255,255,255,0.6);">
  Label
</a>
```

---

### 3.2 Module Label (overline)

```html
<span class="edus-label mb-3 d-block" style="color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 13px; letter-spacing: 0.08em; text-transform: uppercase;">
  Modul 1 — Toate planurile
</span>
```

---

### 3.3 Screenshot Wrapper

**Blue variant**
```html
<div class="edus-screenshot-wrapper edus-screenshot--blue" style="background-color: #E7F1FC; border-radius: 16px; padding: 32px; display: flex; align-items: center; justify-content: center; min-height: 380px;">
  <img src="..." alt="..." class="img-fluid" style="border-radius: 10px; box-shadow: 0 8px 32px rgba(48, 127, 226, 0.15);">
</div>
```

**Mint variant**
```html
<div class="edus-screenshot-wrapper edus-screenshot--mint" style="background-color: #E8F9F6; border-radius: 16px; padding: 32px; display: flex; align-items: center; justify-content: center; min-height: 380px;">
  <img src="..." alt="..." class="img-fluid" style="border-radius: 10px; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);">
</div>
```

---

### 3.4 Trust Strip Item

```html
<div class="col-6 col-lg-3">
  <div class="d-flex flex-column flex-lg-row align-items-center align-items-lg-start gap-3">
    <div class="edus-trust__icon flex-shrink-0" style="width: 44px; height: 44px; background-color: #E7F1FC; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
      <!-- SVG icon, 22x22, fill #307FE2 -->
    </div>
    <div>
      <div class="edus-trust__number" style="font-family: 'Albra', serif; font-weight: 600; font-size: 28px; line-height: 1.1; color: #111827;">Metric</div>
      <div class="edus-trust__label" style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 13px; color: #6B7280; margin-top: 2px;">description</div>
    </div>
  </div>
</div>
```

---

### 3.5 Feature List Item

```html
<li class="d-flex align-items-start gap-3 mb-3">
  <span style="color: #307FE2; flex-shrink: 0; margin-top: 4px;">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
  </span>
  <span style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 15px; color: #374151;">
    <strong style="font-weight: 600; color: #111827;">Bold label</strong> — description of feature or benefit
  </span>
</li>
```

---

### 3.6 Grid Card (edus-grid-card)

```html
<div class="col-sm-6 col-lg-3">
  <div class="edus-grid-card h-100" style="background-color: #fff; border-radius: 12px; border: 1px solid #E5E7EB; padding: 28px 24px;">
    <div class="edus-grid-card__icon mb-4" style="width: 48px; height: 48px; background-color: #E7F1FC; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
      <!-- SVG icon, 24x24, fill #307FE2 -->
    </div>
    <h3 class="edus-card-title mb-2" style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 17px; line-height: 24px; color: #111827;">Card title</h3>
    <p class="edus-card-body mb-0" style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 14px; line-height: 22px; color: #6B7280;">Card description. 2–3 sentences.</p>
  </div>
</div>
```

---

### 3.7 Testimonial

```html
<section style="background-color: #FDF0EC;"> <!-- coral = odd pages; #E8F9F6 = mint = even pages -->
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-lg-8 text-center">
        <!-- quotemark SVG -->
        <blockquote style="font-family: 'Albra', serif; font-weight: 600; font-size: 24px; line-height: 36px; color: #111827; font-style: normal;">
          Quote text.
        </blockquote>
        <!-- Avatar: 52px circle, #307FE2 bg, initial letter -->
        <div style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 15px; color: #111827;">Name Surname</div>
        <div style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 13px; color: #6B7280;">Role, Institution, City</div>
      </div>
    </div>
  </div>
</section>
```

**Testimonial parity rule:**
| Page | # | Bg |
|------|---|----|
| 1.1 Catalog | odd | Coral `#FDF0EC` |
| 1.2 Conținut | even | Mint `#E8F9F6` |
| 1.3 Administrare | odd | Coral |
| 1.4 Comunicare | even | Mint |
| 1.5 Conformitate | odd | Coral |
| 1.6 Intelligence | even | Mint |
| 1.7 Audio/Mobile | odd | Coral |

---

### 3.8 Tier Card (pricing comparison)

**Standard (included)**
```html
<div class="edus-tier-card h-100" style="background-color: #F9FAFB; border-radius: 16px; border: 1px solid #E5E7EB; padding: 32px 28px;">
  <!-- tier badge, title, description, feature list, link -->
</div>
```

**Featured (middle card on most pages — Plus)**
```html
<div class="edus-tier-card featured h-100" style="background-color: #307FE2; border-radius: 16px; border: 2px solid #307FE2; padding: 32px 28px; position: relative;">
  <div style="position: absolute; top: -13px; left: 50%; transform: translateX(-50%);">
    <span style="background-color: #111827; color: #fff; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 11px; padding: 4px 14px; border-radius: 20px; white-space: nowrap; letter-spacing: 0.06em; text-transform: uppercase;">Cel mai ales</span>
  </div>
  <!-- white text version of tier card contents -->
</div>
```

**Not included (greyed out — Pro-only pages 1.5 and 1.6)**
```html
<div class="edus-tier-card h-100" style="background-color: #F9FAFB; border-radius: 16px; border: 1px solid #E5E7EB; padding: 32px 28px; opacity: 0.7;">
  <!-- grey text, dash icon instead of checkmark -->
</div>
```

**S8 tier layout rules by page:**
| Pages | Start | Plus | Pro |
|-------|-------|------|-----|
| 1.1 Catalog | Included (basic) | Featured | Included |
| 1.2 Conținut | Not included | Featured | Included |
| 1.3 Administrare | Not included | Featured | Included |
| 1.4 Comunicare | Not included | Featured | Included |
| 1.5 Conformitate | Greyed out | Greyed out | Featured right — badge "Inclus în Pro" |
| 1.6 Intelligence | Greyed out | Greyed out | Featured right — badge "Inclus în Pro" |
| 1.7 Audio/Mobile | Included (basic) | Featured | Included (+ Intelligence integration) |

**Distinction from 4.14 Depth Selection Card:** this component compares pricing tiers (Start/Plus/Pro). §4.14 is visually similar but compares assessment depth inside a single tool (e.g. Audit's Quick/Operational/Full). Don't conflate the two — a depth selection card never has a price or a "most popular" badge.

---

### 3.9 Related Card (edus-related-card)

```html
<a href="..." class="edus-related-card d-block text-decoration-none h-100" style="background-color: #fff; border-radius: 12px; border: 1px solid #E5E7EB; padding: 28px 24px; transition: border-color 0.2s, box-shadow 0.2s;">
  <div class="d-flex align-items-center gap-3 mb-3">
    <div style="width: 40px; height: 40px; background-color: #E7F1FC; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <!-- SVG icon 20x20 -->
    </div>
    <span style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 12px; color: #307FE2; letter-spacing: 0.06em; text-transform: uppercase;">Modul X / Soluție / Persona</span>
  </div>
  <h3 style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 17px; line-height: 24px; color: #111827; margin-bottom: 8px;">Page title</h3>
  <p style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 14px; line-height: 22px; color: #6B7280; margin-bottom: 0;">One sentence connecting this page to the current page.</p>
</a>
```

---

### 3.10 CTA Banner (edus-cta-banner)

```html
<section style="background-color: #307FE2; padding-top: 80px !important; padding-bottom: 80px !important;">
  <div class="container">
    <div class="row justify-content-center text-center">
      <div class="col-lg-7">
        <h2 style="font-family: 'Albra', serif; font-weight: 600; font-size: 40px; line-height: 50px; color: #fff;">
          CTA headline — specific to the page topic
        </h2>
        <p style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 17px; line-height: 28px; color: rgba(255,255,255,0.85);">
          Demo duration + what it covers, specific to the module.
        </p>
        <!-- Primary (white) + ghost (white outline) buttons -->
        <p style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 13px; color: rgba(255,255,255,0.65); margin-top: 16px;">
          Fără angajamente. Aproape 1.000 de instituții publice din România folosesc Edus.
        </p>
      </div>
    </div>
  </div>
</section>
```

**CTA headline convention:** "Vedeți cum arată [specific outcome for this module]" — always concrete, never generic.

**Demo duration by module:**
| Module | Duration |
|--------|----------|
| 1.1 Catalog | 20 min |
| 1.2 Conținut | 20 min |
| 1.3 Administrare | 30 min |
| 1.4 Comunicare | 30 min |
| 1.5 Conformitate | 30 min |
| 1.6 Intelligence | 30 min |
| 1.7 Audio/Mobile | 20 min |

---

### 3.11 Sub-module Tag Badge

```html
<div class="d-flex gap-2 mb-3">
  <span style="background-color: #E7F1FC; color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 6px;">SCIM</span>
  <span style="background-color: #E7F1FC; color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 6px;">CEAC</span>
</div>
```

Mint/teal variant (used for AP block — this is where teal `#0D9488` originates as a canonical color):
```html
<span style="background-color: #E8F9F6; color: #0D9488; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 6px;">Achiziții Publice</span>
```

---

### 3.12 Module Hub Card (T2 only)

```html
<a href="..." class="d-block text-decoration-none h-100" style="background-color: #F9FAFB; border-radius: 14px; border: 1px solid #E5E7EB; padding: 32px 28px; transition: border-color 0.2s, box-shadow 0.2s;">
  <div class="d-flex align-items-start justify-content-between mb-4">
    <div style="width: 52px; height: 52px; background-color: #E7F1FC; border-radius: 12px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <!-- SVG icon 26x26 -->
    </div>
    <!-- Tier badge: "Toate planurile" = grey, "Plus & Pro" = blue, "Pro" = dark #111827 -->
  </div>
  <div style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 11px; color: #307FE2; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px;">Modul N</div>
  <h3 style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 19px; line-height: 26px; color: #111827; margin-bottom: 10px;">Module name</h3>
  <p style="font-family: 'Axiforma', sans-serif; font-weight: 300; font-size: 14px; line-height: 22px; color: #6B7280; margin-bottom: 20px;">2–3 sentence description.</p>
  <span style="font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 14px; color: #307FE2;">Explorează modulul →</span>
</a>
```

**Tier badge colors:**
| Tier | Background | Text |
|------|-----------|------|
| Toate planurile | `#F3F4F6` | `#6B7280` |
| Plus & Pro | `#E7F1FC` | `#307FE2` |
| Pro only | `#111827` | `#fff` |

---

## 4. Tool Component Library

Components needed by interactive instruments — the Calculator, the Digital Maturity Audit, and any future tool (Harta sales variant, Product Tour, etc.). All use the §2 token set. None of these existed in v1.2; consolidated here from the Guides and Audit builds.

### 4.1 Pill Badge

Small label above a hero headline, identifying the tool category.

```html
<span style="background-color: #E7F1FC; color: #307FE2; font-family: 'Axiforma', sans-serif; font-weight: 600; font-size: 13px; padding: 6px 14px; border-radius: 20px; display: inline-block;">
  Starea Digitalizării în Educație
</span>
```

### 4.2 Accent-Bordered Benefit Card

White card, 1px `#E5E7EB` border, 12px radius, 28px padding, left accent border 3px in a rotating color (blue/coral/teal/amber). Icon (28px) + title (Axiforma 600, 17px) + body (Axiforma 300, 15px, `#6B7280`, line-height 1.65). Used for "what you get" grids on tool front doors. The amber variant carries a small "în curând" badge (top-right, `#FFFDE5` bg, `#D97706` text, 11px) for coming-soon features — never a placeholder counter, an actual feature.

### 4.3 Form Input (text / number)

```css
border: 1.5px solid #E5E7EB;
border-radius: 8px;
padding: 12px 14px;
font-family: 'Axiforma', sans-serif;
font-size: 16px;
color: #111827;
width: 100%;
outline: none;
```
Focus state: `border-color: #307FE2`. Label above, Axiforma 600, 13px, uppercase, `#307FE2`, letter-spacing 0.06em. Inline plausibility warnings render below the field, Axiforma 300, 13px, `#6B7280`.

### 4.4 Radio Question Card

Four-option single-select. Each option 52px height, 1px border `#E5E7EB`, 8px radius.

- **Selected:** light blue fill `#E7F1FC`, 3px left border `#307FE2`, checkmark right.
- **Unselected:** white background, no accent.

Question heading above: Axiforma 600, dimension overline (13px, uppercase, `#6B7280`) plus the question itself in body weight.

### 4.5 Multi-select Checkbox Option

48px height rows. Checked state: blue checkbox fill (`#307FE2`), white check glyph. Unchecked: `#E5E7EB` border, no fill. Helper text above the group ("Selectează tot ce se aplică"), Axiforma 300, 13px, `#6B7280`.

### 4.6 Sticky Flow Header

64px height, white, 1px bottom border, sticky. Three-zone layout: wordmark left, step/layer progress center, exit link right ("Ieși din audit", Axiforma 300, 14px, `#6B7280`). Progress shows **named steps**, never a raw question count — current step in `#307FE2`, completed steps with a checkmark, upcoming dimmed.

### 4.7 Sticky Flow Footer

72px height, white, 1px top border, sticky to viewport bottom. Left: progress text ("2 din 15 întrebări completate", Axiforma 300, 13px, `#6B7280`). Right: primary button, active/disabled states per validation.

### 4.8 Score / Profile Reveal Card

The one place the impact accent (`#1B4F91`) is used. Full-bleed section, white text, centered content, max-width 800px, 64px padding.

Stack order: score label (Axiforma 300, 14px, white 70%) → score number (Albra 600, 56–72px, white) → score context ("din 100", Axiforma 300, 18px, white 70%) → divider (1px white 20%) → profile name (Albra 600, 30–36px, white) → modifier badge (coral bg `#FDF0EC`, coral text `#C2522A`, Axiforma 600, 13px) → modifier line (Axiforma 300, 15px, white 80%) → summary paragraph (Axiforma 300, 17px, white 85%, max-width 600px).

### 4.9 Radar Chart

Chart.js, three-axis minimum. Line color `#307FE2`, fill `#E7F1FC` at 40% opacity. Axis labels in Axiforma, `#6B7280`. Default render size 280–320px. At mobile widths under ~400px, fall back to horizontal score bars (one per axis, labeled) if the radar reads as cramped — propose whichever renders more clearly rather than forcing the radar.

### 4.10 Dimension Accordion

Collapsed row: 56px height, 1px bottom border `#F3F4F6`. Dimension name (Axiforma 600, 15px) + score bar (6px height, proportional blue fill, 200px max width) + score number in `#307FE2` + chevron.

Expanded: `#F9FAFB` background, 16px padding. Two labeled blocks: "CE ÎNSEAMNĂ PENTRU ȘCOALA TA" (Axiforma 600, 12px, `#6B7280` uppercase) with the finding below it, and a second label in `#307FE2` uppercase for the recommended next step.

### 4.11 Priority / Insight Card

Used inside a coral (`#FDF0EC`) section. White card, 1px border in a deeper coral (`#E8C4B0`), 12px radius, 24px padding. Structure: dimension label (Axiforma 600, 12px, `#6B7280` uppercase) → problem statement (Axiforma 600, 16px) → arrow → direction/recommendation (Axiforma 300, 15px, `#6B7280`).

### 4.12 Shareable Link Block

Small block: label ("Salvează sau distribuie rezultatele", Axiforma 600, 14px, `#6B7280`) above a read-only input showing the generated URL, with a copy icon button in `#307FE2`. Helper text below clarifies the link is auto-generated — no save action, no account.

### 4.13 Reassurance Footer Item

5-column grid (stacks on mobile) of trust signals: icon (22px, `#307FE2`) + label (Axiforma 600, 14px) + description (Axiforma 300, 13px, `#6B7280`). Standard set for any no-login tool: anonymous, free, no account, single session, no spam. Background `#F3F4F6`.

### 4.14 Depth Selection Card

Visually related to §3.8 Tier Card but a distinct component — compares **assessment depth within one tool**, not pricing tiers. No price, no "recomandat" badge logic; visual weight (a 2px blue border on the most complete option) communicates emphasis instead. Structure: time badge top (`~5 minute` style) → title (Albra 600, 22px) → metadata line (question count + duration) → "PENTRU CINE" label + text → "CE PRIMEȘTI" label + text → full-width CTA button.

### 4.15 Signal Callout

Yellow background `#FFFDE5`, left border-accent 4px `#307FE2`, border-radius 12px, padding 24–28px. Small overline ("SEMNAL CHEIE", Axiforma 600, 12px, `#6B7280` uppercase) above the signal text (Axiforma 600, 17px, `#111827`). Optional 20px icon.

### 4.16 Troubleshooting Panel (with optional illustration)

Background `#F9FAFB`, border-radius 12px, padding 24px. Where an illustration is assigned, it renders full-bleed at the top of the panel (`.ts-illus`, `aspect-ratio: 4/3`, top corners only, `loading="lazy"`, `aria-hidden="true"`); panels without an assigned image skip the slot entirely, never a placeholder. Problem statement Axiforma 600, 16px; response Axiforma 300, 16px/26.

### 4.17 Message-Template Card (copyable)

Bordered panel, `#F9FAFB` background, 12px radius, 28px padding. Header label "Model de mesaj" (Axiforma 600, 12px overline, muted). `[Bracketed fields]` render as pills (`#E7F1FC` bg, `#307FE2` text, 2px radius) so the user sees what to replace. "Copiază textul" button top-right, plain JS clipboard, no dependency.

### 4.18 Responsive Data Table (fillable)

Bordered, header row `#F9FAFB` or `#E7F1FC`, `#E5E7EB` borders, proper `<th scope>`. Blank/fillable fields render as light cells with a baseline underline so the table reads as something to fill in or print. Wrap in `overflow-x: auto` on mobile — never stack a fillable table.

### 4.19 Checklist Block

Each item: empty checkbox square (`#307FE2` border) + label (Axiforma 300, 16px). May toggle on click for screen use but is cosmetic — no persistence in this environment. Group headers as Axiforma 600, 14px overlines.

### 4.20 In-page TOC / Scrollspy

Sticky left rail at `≥lg` (anchor links, active-state highlight on scroll). Collapses to a `<details>` disclosure below `lg` — never hidden behind a hamburger.

### 4.21 Hero Meta Row

Horizontal row below a tool or guide subtitle, wraps on mobile: reading time / item count / duration, plus a primary CTA that scrolls to the tool or capture module.

### 4.22 Lead-Capture Module

Two variants, governed by one rule: **web content is never gated, only the downloadable/PDF deliverable is.**

- **Gated variant** (e.g. PDF packet download): heading + one-sentence value statement + fields (email required, school name required, CUI optional with helper text) + submit button + "Fără spam." Visual: blue accent panel (`#E7F1FC` or bordered card).
- **Soft variant** (e.g. Calculator, Audit results): identical field set, but inline and scrollable-past, never blocking. No visual gate treatment.

### 4.23 Stat Float Block

Two-column pairing on desktop: prose left (`col-lg-7`), stat block right (`col-lg-4`), 48px gap. Collapses to single column on mobile, stat block below, full width. Stat block: `#E7F1FC` background, 16px radius, 32px/28px padding. Internal stack: number (Albra 600, 56–64px, `#307FE2`) → label (Axiforma 600, 15px, dark) → context (Axiforma 300, 14px, `#6B7280`) → source attribution (Axiforma 300, 12px, `#6B7280`, prefixed "Sursă:"). Maximum one per chapter/section. Render as `<aside>` for accessibility. No empty float-zone if a section has no assigned stat — let prose run full width instead.

### 4.24 Annex Teaser Card

White card, 1px `#E5E7EB` border, 12px radius, image bleeds to top (4:3, 8px radius on top corners only), text padded 20px. Tag overline ("în pachetul PDF", `#6B7280`, 11px uppercase) → title (Axiforma 600, 15px) → description (Axiforma 300, 14px) → CTA with arrow (`#307FE2`, 14px). Entire card is a link to the capture module anchor. Hover: border turns `#307FE2`, subtle shadow.

---

## 5. Section Backgrounds — Alternating Pattern

T3 pages alternate section backgrounds for visual rhythm. Established pattern:

| Section | Background |
|---------|-----------|
| S1 Hero | `#E7F1FC` (always) |
| S2 Trust strip | `#ffffff` |
| S3 Feature block 1 | `#ffffff` |
| S4 Feature block 2 | `#F9FAFB` |
| S5 Feature block 3 | `#ffffff` |
| S6 Grid features | `#F9FAFB` |
| S7 Testimonial | Coral or Mint (parity rule) |
| S8 Tier context | `#ffffff` |
| S9 Related pages | `#F9FAFB` |
| S10 CTA banner | `#307FE2` (always) |

---

## 6. Page Template Structures

### T2 — Hub / Index (4 sections)

Used for: 1.0 Platformă, 2.0 Soluții (and future 3.0, 4.0)

```
S1  Hero — centered, no screenshot, shorter copy, trust line at bottom
S2  Main grid — full module or solution inventory (all cards link to T3/T4/T5)
S3  Supporting strip — tier overview (1.0) or persona/use case split (2.0)
S4  CTA banner
```

### T3 — Module Deep Dive (10 sections)

Used for: 1.1–1.7

```
S1  Hero — two-column, screenshot bottom-flush, light blue bg
S2  Trust strip — 4 proof points (icon + number + label)
S3  Feature block 1 — screenshot wrapper blue, text order-lg-2 (right)
S4  Feature block 2 — screenshot wrapper mint, text order-lg-1 (left)
S5  Feature block 3 — screenshot wrapper blue, text order-lg-2 (right)
S6  Grid features — 4 × edus-grid-card
S7  Testimonial — coral or mint per parity rule
S8  Tier context — 3 × edus-tier-card, layout varies per page
S9  Related pages — 3 × edus-related-card
S10 CTA banner
```

### T4 — Use Case (structure TBD)

Used for: 2.A.1–2.A.6

### T5 — Persona (structure TBD)

Used for: 2.B.1–2.B.6

### T6 — Pricing (structure TBD)

Used for: 1.8

### T7 — Guide / Booklet (long-form)

Used for: M1 prework guide, M2 90-day guide, any future long-form guide.

```
S1   Hero — text only, light blue bg, hero meta row (§4.21)
S2   Intro + TOC (§4.20)
S3…  Chapter sections (repeating): title → signal callout (§4.15) → "what usually happens" prose → "what to do" prose, with an optional stat float (§4.23) → troubleshooting panel(s) (§4.16)
Sx   Conclusion — editorial list of behavioral patterns
Sy   Appendix — tables (§4.18), checklists (§4.19), message-template cards (§4.17); gated lead-capture (§4.22) at the end. If the appendix uses mixed gating (one model free, rest as teasers), use annex teaser cards (§4.24).
Sz   Source attribution line
S+1  Soft next-step strip (sibling content + tools, edus-related-card)
S+2  Blue demo CTA banner (§3.10)
```

### T8 — Standalone (structure TBD)

Used for: 1.9, 3.x, 4.x, 5.x

---

## 7. Tool Templates

The reusable scaffolding behind any self-serve interactive instrument (Calculator, Audit, and future tools — Product Tour, Harta sales variant, anything from the sales toolkit Layer B/C).

### T-Tool-A — Front Door (landing + depth/path selection)

```
S1  Hero — pill badge (§4.1), H1, subhead, two CTAs (primary + secondary link)
S2  Why this exists — two-column text + decorative element
S3  Benefit cards — accent-bordered grid (§4.2), 4 cards typical, one may be a coming-soon amber variant
S4  How it works — equal-width columns, icon + heading + body
S5  Trust signals — centered text block, social proof, no fake counters
S6  Depth/path selection (§4.14) — the conversion point
S7  Reassurance footer (§4.13)
```

Not every tool needs all seven sections (the Calculator skips straight to the tool itself, no depth selection needed). Treat this as the full pattern; cut sections that don't apply rather than padding a simple tool to fit it.

### T-Tool-B — Flow (question / input screens)

```
Sticky header  — wordmark + named-step progress (§4.6) + exit link
Layer/section header — overline + H1 + subhead
Question area — radio cards (§4.4) and/or multi-select (§4.5), grouped by dimension overline
Sticky footer  — progress text + CTA (§4.7)
```

### T-Tool-C — Results / Reveal

```
Profile/score card (§4.8) — full-bleed impact accent
Visualization + analysis — radar (§4.9) or equivalent chart, paired with a written breakdown
Lead capture — soft variant (§4.22), never a gate
Detail accordion (§4.10) — per-dimension or per-section findings
Priority/insight cards (§4.11) — 2–4 cards, concrete next steps
"What others like you do" — optional, illustrative guidance paragraph(s)
Shareable link (§4.12)
```

---

## 8. Page Inventory

| ID | Page | Template | Status |
|----|------|----------|--------|
| 0 | Homepage | T1 | Not started |
| 1.0 | Platformă hub | T2 | Complete |
| 1.1 | Catalog digital | T3 | Complete |
| 1.2 | Conținut educațional | T3 | Complete |
| 1.3 | Administrare & secretariat | T3 | Complete |
| 1.4 | Comunicare | T3 | Complete |
| 1.5 | Conformitate & proceduri | T3 | Complete |
| 1.6 | Edus Intelligence | T3 | Complete |
| 1.7 | Notare audio & mobile | T3 | Complete |
| 1.8 | Prețuri | T6 | Not started |
| 1.9 | Solicită demo | T8 | Not started |
| 2.0 | Soluții hub | T2 | Not started |
| 2.A.1 | Audit readiness | T4 | Not started |
| 2.A.2 | Conformitate SCIM & CEAC | T4 | Not started |
| 2.A.3 | Prevenirea abandonului | T4 | Not started |
| 2.A.4 | Secretariat eficient | T4 | Not started |
| 2.A.5 | Procesul educațional | T4 | Not started |
| 2.A.6 | Comunicare școală-familie | T4 | Not started |
| 2.B.1 | Pentru directori | T5 | Not started |
| 2.B.2 | Pentru profesori | T5 | Not started |
| 2.B.3 | Pentru secretariat | T5 | Not started |
| 2.B.4 | Pentru părinți | T5 | Not started |
| 3.0 | Despre Edison | T2/T8 | Not started |
| 4.0 | Resurse | T2 | Not started |
| — | Ghidul de pregătire | T7 | Web design complete; PDF + annex tools in build |
| — | Ghidul 90 de zile | T7 | Web build pending Codex rebuild |
| — | Calculator economii de timp | T-Tool-A/B | Production pass complete, Claude Code session pending |
| — | Audit de maturitate digitală | T-Tool-A/B/C | Design briefs ready; build pending |

---

## 9. Copy Constraints

These apply to all customer-facing copy in all templates, page or tool.

**Never use:**
- Hyphens or em dashes (`-`, `—`) in copy
- Rule-of-three constructions
- Triplet structures (three items listed in parallel for rhetorical effect)
- Short punchy AI cadence sentences
- Closing CTAs inside value content sections (S3–S6 are content-only; CTAs belong in S10 or the equivalent close)
- "Nu X, ci Y" / "not just X, but Y" contrast constructions
- Observational or analytical register in conversational copy
- "ROI" in Romanian customer-facing copy — use "ore economisite" / "economii" framing

**Always:**
- Romanian for all customer-facing text (strategic discussions in English)
- Sentence-level concreteness — specific outcomes, not abstract benefits
- Scannable headers
- Quantified claims where possible (hours saved, percentage reduction, specific document types)
- Reply-or-call CTAs, never calendar booking links only
- "Edus" in customer-facing copy; "Edison" never appears outside internal documentation, except in the attribution line where the convention is "echipa Edus"

**Hero headline pattern:** Direct functional statement, no cleverness required. Focus on the outcome the persona cares about.

**Trust strip pattern:** 2–3 syllable number or word + short descriptor below. Keep it scannable.

**Feature block body:** One paragraph, 2–3 sentences. Describes the problem and the solution; does not list features (that's what the list below it is for).

**Testimonial quotes:** Written to sound like real speech. Specific outcome, specific time, no marketing polish. Always a named person with a real role and a real institution.

---

## 10. URL Structure

To be confirmed. Current convention in page files:

```
/nou-design/platforma/[slug]/       → T3 module pages
/nou-design/solutii/[slug]/         → T4 use case pages
/nou-design/solutii/pentru-[role]/  → T5 persona pages
/nou-design/preturi/                → T6 pricing
/nou-design/solicita-demo/          → T8 demo form
/resurse/[slug]/                    → T7 guides, tool front doors
```

---

## 11. Image Naming Convention

All screenshots in `/static/images/new/`. Pattern:

```
[module-slug]-[section]-screenshot.png

Examples:
catalog-hero-screenshot.png
catalog-notare-screenshot.png
admin-docgen-screenshot.png
conformitate-scim-ceac-screenshot.png
intelligence-early-warning-screenshot.png
audio-notare-screenshot.png
```

---

## 12. Open Questions

- [ ] URL structure — final confirmation from dev team
- [ ] Screenshot production process and timeline
- [ ] Pricing page structure — needs planning session before build
- [ ] T4 and T5 template structure — define before 2.A.1 build
- [ ] Homepage structure — last page to build, needs dedicated planning
- [ ] Axiforma and Albra licensing — confirm web font delivery method
- [ ] Confirm whether any Audit Claude Design screens were generated before this version and need regenerating against corrected tokens (`#111827`, `#0D9488`)
- [ ] Decide whether the isometric tool illustrations (Linear-inspired, M1 closing page) and the storyboard-editorial illustrations (troubleshooting panels) are intentionally two separate illustration systems for two different contexts, or whether one should be documented here as canonical — currently neither is formally part of this design system
