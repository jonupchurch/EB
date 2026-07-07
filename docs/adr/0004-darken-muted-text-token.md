# ADR-0004: Darken the muted/secondary text token from #9A9088/#8A8378 to #6B6560

- **Status:** Accepted
- **Date:** 2026-07-07
- **Deciders:** Jon Upchurch

## Context

ADR-0003 tracked a recurring contrast failure: the palette's lightest
muted-gray text colors (`#9A9088`, `#8A8378`, and `#7C756C`) fail AA
against every light background in the palette (~2.6–3.9:1, needs
4.5:1), and ADR-0003 explicitly flagged that if this kept recurring on
increasingly central UI, the right move would be to fix the color
rather than keep excepting it. Reviewing
`Resources/wireframes/Admin Screens.html` found five more instances,
including on table column headers ("Order", "Customer", "Items",
"Status") and the `$`/`+$` currency symbols in every price field —
about as core and unavoidable as UI text gets. That's the trigger:
Jon confirmed fixing the token now rather than accepting an eighth
exception.

## Decision

**Use `#6B6560` as the muted/secondary text color** wherever the
palette currently reaches for `#9A9088`/`#8A8378`/`#7C756C` on a light
background. This isn't a new color — `#6B6560` already appears
throughout the same wireframes (e.g. stat-card labels, item
descriptions) and passes AA against every light background tested:

| Background | Contrast |
|---|---|
| `#FFFFFF` | 5.74:1 |
| `#FBFAF7` | 5.50:1 |
| `#FBF8F1` | 5.42:1 |
| `#F7F3EA` | 5.19:1 |
| `#F4F1EA` | 5.09:1 |
| `#F0EADD` | 4.79:1 |
| `#ECE3D2` | 4.51:1 (tightest, still passes) |

The lighter grays (`#9A9088`/`#8A8378`/`#7C756C`) remain fine for
non-text or large-scale decorative use (dividers, disabled-state fills,
large display text) and for text on **dark** backgrounds, where they
already pass comfortably (e.g. `#9A9088` on `#1B1815` is 5.66:1, per
the brand accessibility review) — this decision is scoped to muted
*text* on *light* backgrounds specifically.

This also resolves (not just excepts) the gray-family instances
previously accepted in ADR-0003: the promo-code empty state and
product-photo label in the Ember Design System file, and the category
label/counts in the Store Pages wireframe. Those entries in ADR-0003
stay as a historical record of what was found, but the underlying
color is fixed now rather than perpetually excepted.

## Alternatives considered

- **Keep accepting exceptions** (ADR-0003's original stance) — rejected
  now that the pattern has hit table headers and price symbols; per
  ADR-0003's own stated threshold, this is "anywhere even more
  central" than what was already accepted.
- **Pick a new hex value from scratch** — rejected in favor of reusing
  `#6B6560`, which is already present in the same design files serving
  the same "muted text" role successfully — no new color to introduce
  or get sign-off on.

## Consequences

When the real Tailwind theme gets built (no theme/colors exist in code
yet — `globals.css` is still a plain placeholder), the "muted text"
token should map to `#6B6560`, not `#9A9088`/`#8A8378`. No code changes
needed today. This is a note for that future work, plus the record of
why.
