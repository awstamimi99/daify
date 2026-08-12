# DAIFY design system

Single source of truth: `assets/css/variables.css`. Marketing (`style.css`) and
dashboard (`assets/css/dashboard/*.css`) both build on these tokens rather than
redefining color/spacing/radius values — that duplication was the original
problem this file fixes.

## Layering

```
variables.css        → brand tokens: color, type scale, radius, space, shadow
  ├─ style.css        → marketing-only components (hero, pricing cards, footer…)
  └─ dashboard/
       variables.css  → --dash-* tokens, all aliased to the tokens above
       layout.css/components.css/forms.css/tables.css/responsive.css
                       → dashboard-only components (sidebar, tables, cards…)
customizer.css / template-preview.css → chrome around the template engine,
       same brand tokens. The rendered menu inside stays on its own
       `--restaurant-*` token namespace (base-menu.css) — that's the
       customer's brand, deliberately isolated from DAIFY's own.
```

## Color

Red is the *only* brand accent — never mix in another accent hue. Budget:
roughly 60–70% white/warm-white/light-neutral, 20–30% charcoal/text/structure,
5–10% red. Red should feel intentional: primary CTAs, active nav/tab states,
"most popular" emphasis, selected states, key icons. Not every card, icon, or
heading.

| Token | Value | Use |
|---|---|---|
| `--brand-red` | `#e53935` | Primary CTA, active states, key accents |
| `--brand-red-hover` | `#c92f2b` | Hover/pressed |
| `--brand-red-strong` | `#b52322` | Strong emphasis, text on light bg |
| `--brand-red-soft` | `#fdecec` | Soft red card/badge backgrounds |
| `--brand-red-tint` | `#fff5f4` | Subtle highlighted sections |
| `--surface-primary` | `#ffffff` | Cards, main surfaces |
| `--surface-secondary` | `#fcfaf9` | Marketing page background |
| `--surface-muted` | `#f6f5f4` | Dashboard page background |
| `--surface-dark` | `#171717` | Optional dark sections |
| `--text-primary` | `#202020` | Headings, primary content |
| `--text-secondary` | `#66615f` | Secondary content |
| `--text-muted` | `#8c8784` | Metadata, placeholders only |
| `--text-on-brand` | `#ffffff` | Text on red/dark surfaces |
| `--border-default` | `#e8e5e3` | Borders, dividers |
| `--success` / `--warning` / `--error` / `--info` | see `variables.css` | Status only |

`--brand-red` on white is ~4.25:1 contrast — below the 4.5:1 AA text threshold
but the same value as Material Design's red-600, a widely-shipped accessible
convention for bold white-on-red button labels. Keep red button/badge text at
600+ weight; never use red as small/regular body text on white.

## Type scale

`--fs-display` → `--fs-caption`, all `clamp()`-based (see `variables.css`).
Headline font stays `--font-serif` (DM Serif Display) — a deliberate DAIFY
identity choice distinct from typical bold-sans SaaS sites. Body/UI stays
`--font-sans` (Inter). RTL swaps to `--font-arabic` (Noto Kufi Arabic) via
`html[dir="rtl"] body`.

## Buttons

One system, three variants, used identically on marketing and dashboard:
`.btn` (base) + `.btn--primary` (red/white), `.btn--secondary` (white/dark
border), `.btn--tertiary` (text link). Legacy `.btn--dark` / `.btn--ghost` /
`.btn--light` selectors are kept as aliases during the redesign sweep — new
markup should use the `--primary/--secondary/--tertiary` names.

## What's aliased vs. what's swept

`--mf-*` tokens still exist and resolve to the new values for structural
roles (ink, ivory, stone, mist, radius, space, shadow) — those are genuine
1:1 role matches, safe to alias. `--mf-sage` / `--mf-champagne` keep their
**original** green/gold values on purpose: they held the "accent" role, and
blindly redirecting that to red everywhere would apply an unreviewed color
change. Files get moved to `--brand-red` directly as they're touched, not by
alias — check a given file's actual color usage before assuming it's on the
new system.
