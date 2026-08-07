# Product

## Register

product

## Users

A single person tracking their own personal finances on their phone — expenses, income, budgets, loans given/received, and Khumus (Islamic religious tithe) obligations. No accounts, no sync, no other users; data lives locally in SQLite with manual JSON backup/restore. The primary context is quick, one-handed daily logging: pulled out mid-errand, via a back-tap gesture or the floating add button, to log a transaction in under 10 seconds. Reviewing budgets/reports happens in calmer, seated moments, but entry speed is the higher-priority job.

## Product Purpose

Xpense is a fast, low-friction personal expense and budget tracker with built-in support for loan tracking and Khumus calculation. It exists to make daily financial logging effortless enough that the user actually keeps doing it, while giving enough structure (categories, budgets, pacing views) to stay aware of spending without needing a full accounting app.

## Brand Personality

Warm, friendly, smooth, precise, calm. It should feel like a well-made personal tool, not a cold enterprise fintech dashboard and not a gamified consumer app. Motion should be smooth and physical (spring-based), never bouncy or attention-seeking.

## Anti-references

- Cold enterprise fintech (navy + gold, dense tables, "trust us with your money" corporate tone)
- Gamified/flashy personal finance apps (confetti, streaks, badges, celebratory animations)
- Generic AI SaaS look: saturated purple/violet gradients and glassmorphism used as a default rather than a deliberate choice
- Dense spreadsheet/accounting-software density — this is a quick-glance tool, not a ledger

## Design Principles

- Entry speed over completeness: the fastest path (back-tap → amount → category → save) should always feel like the "main" flow; deeper detail (notes, splits, custom dates) stays available but secondary.
- Calm, not sterile: warmth comes from color and motion restraint, not decoration. Avoid turning a money app cold and clinical.
- One hero accent, used deliberately: color should guide the eye to the one thing that matters on a screen (amount, action, alert), not compete for attention everywhere.
- Physical motion: spring-based transitions that feel like real objects settling, not linear/bouncy/decorative animation.
- Never default to category clichés: reject the first color/theme instinct the "personal finance app" category suggests (navy+gold, purple gradients) in favor of choices earned by this product's specific personality.

## Accessibility & Inclusion

Text and financial figures (amounts, budget percentages) must hold WCAG AA contrast (4.5:1 body text, 3:1 large text) against their surfaces in both light and dark themes — this is a money app, misreading a number is a real cost. No information should be conveyed by color alone (income/expense already pair color with +/− prefixes and icons). Respect system font scaling; avoid motion-only affordances without a static fallback.
