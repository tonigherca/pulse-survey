# Product

## Register

product

## Users

Romanian public school personnel — directors, teachers, secretariat staff, parents, and school inspectors — arriving predominantly on mobile, during or between work hours, under time pressure. Secondary users: Edus/Edison internal team accessing Metabase analysis views and the Django admin for moderation.

Primary respondent context: a busy director or teacher who has 8–12 minutes and is mildly skeptical that this will be useful. They need to trust the instrument before they'll complete it. Parents arrive via school communication channels; inspectors are more motivated but equally time-pressed.

## Product Purpose

A permanent anonymous national survey measuring the real state of digital maturity in Romanian pre-university schools — the first of its kind. Five role-routed paths (director/teacher/secretariat/parent/inspector), 14–25 questions each, writing to a shared PostgreSQL instance alongside the SEAP scraper. Metabase reads named analysis views; the public gets two floored aggregate views. The survey's primary success metric is completion rate; anonymity and trust are prerequisites.

## Brand Personality

Institutional, research-grade, calm. The instrument should feel like it was published by a research institute — not a SaaS funnel, not a government portal, not a quiz. Three words: authoritative, transparent, unhurried.

## Anti-references

- AI-gradient startup pages (SaaS-purple / cream / hero-metric template)
- Generic dark dashboards (not this)
- Playful quiz mechanics (progress gamification, confetti, achievement badges)
- Excessive card decoration (icon-chip grids, tinted-fill callout boxes, 2×2 colored-accent card grids)
- Vague consulting language and triplet structures
- Sales-first lead capture before value delivery
- Isometric illustrations — not a standing visual language for Edus

## Design Principles

1. **Trust before action.** Anonymity and transparency are load-bearing. Every screen reinforces that nothing identifies the respondent. Never make data feel collected.
2. **Minimum friction, maximum completion.** Design = completion rate. Every UX decision is measured against whether it helps or hurts a tired teacher on a phone in a staffroom.
3. **Editorial weight, not SaaS chrome.** Visual richness comes from type rhythm, hairline rules, and generous whitespace — not from tinted boxes, icon chips, or card proliferation. The runner should disappear; the landing page should feel like a serious publication.
4. **One thing at a time.** One question per screen on mobile. Progress by section, not total count. Never show how much is left until the respondent is already invested.
5. **No dark patterns.** Email is post-submit, optional, and genuinely decoupled from responses. The honeypot runs silently. No urgency theater beyond the wave deadline.

## Accessibility & Inclusion

Target WCAG AA. All interactive elements keyboard-navigable. Form labels explicit (not placeholder-only). Touch targets ≥ 44px. Mobile-first layout — majority of respondents arrive on phones. Reduced-motion media query respected. Romanian as the language throughout.
