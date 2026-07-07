# ADR-0003: Accept specific contrast exceptions in the Ember Design System v0.1 mockup

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

`Resources/brand/Ember Design System.html` (a "v0.1 · Ember direction"
token/component mockup) claims "All foreground/background pairings
below meet WCAG AA." Verifying that claim with a proper DOM-nesting-
aware contrast check (see the memory log for the method — a flat
regex over nearby hex codes gives false positives) found three real
counterexamples:

- Promo-code empty state ("—") and a cart icon ("🛒"): `#9A9088` on
  `#F0EADD` — 2.61:1.
- A checkmark icon: `#1B1815` on teal `#0F6C68` — 2.83:1.
- The "product photo" placeholder label (11px): `#8A8378` on
  `#FBFAF7` — 3.59:1.

All three fail AA for their actual use (the first two fail even the
relaxed 3:1 icon/large-text bar). Per Constitution Principle III,
accessibility is a target to close on, not a hard compliance gate for
this small business's site — so the question here isn't "must this be
fixed before merge," it's "is this an acceptable exception or does it
need fixing before it becomes real UI."

## Decision

**Accept these three specific pairings as known exceptions.** They're
in a prior-art mockup (`Resources/`), not live product code, and none
of them are load-bearing to completing an order (a placeholder photo
label, an empty promo-code state, and one status icon). No fix is
required before proceeding to real component work.

## Alternatives considered

- **Fix the colors in the mockup now** — rejected as premature work on
  a prior-art reference file (per Constitution Governance,
  `Resources/` informs planning but isn't itself a committed artifact)
  rather than the real theme.
- **Treat as a blocking issue requiring resolution before ratification**
  — rejected; this is exactly the category of "close miss, not a real
  barrier to completing an order" Principle III already describes as
  acceptable.

## Consequences

These three pairings don't need to change as-is. The same underlying
tokens (`#8A8378`/`#9A9088` on light backgrounds) should still get a
second look if they end up somewhere more load-bearing later — e.g. if
either gray becomes the site's actual "muted text" Tailwind token used
for real body copy, not just a placeholder label or empty-state dash
(see `docs/adr/0001` era memory notes / the brand accessibility review
for the darker-shade recommendation in that specific case). This ADR
covers only the three pairings listed above, not a blanket exemption
for reusing these colors anywhere.
