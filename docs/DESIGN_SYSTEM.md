# DAIFY prototype design system

`assets/css/variables.css` is the prototype's shared token source. Marketing,
authentication, dashboard/admin, preview chrome, and the guest-menu engine build
on it, while guest restaurant branding is intentionally isolated.

## Layers

```text
assets/css/variables.css
  ├─ style.css                       legacy marketing/auth components and pages
  ├─ brand.css / mobile-menu.css    public-site brand/navigation refinements
  ├─ dashboard/
  │    variables.css                --dash-* aliases
  │    layout.css
  │    components.css
  │    forms.css
  │    tables.css
  │    responsive.css
  ├─ customizer.css                 Design Studio chrome
  ├─ template-preview.css           preview workspace chrome
  └─ templates/
       base-menu.css                --restaurant-* guest brand namespace
       polish.css                   Classic-family presentation
       feast.css                    Feast-family presentation
       [template].css               Classic template palette/art direction
```

`style.css` is intentionally left as a legacy monolith during Pre-Milestone 0;
splitting it belongs to the production rebuild rather than this cleanup.

## Tokens

- Brand: `--brand-red`, hover/strong/soft/tint variants.
- Functional UI: `--brand-blue`, semantic success/warning/error/info tokens.
- Surfaces: primary, secondary, muted, and dark.
- Text: primary, secondary, muted, and on-brand.
- Structure: border, radii, spacing, shadows, and container width.
- Typography: fluid display/body scales, Manrope, DM Serif Display, and Arabic
  fallbacks.

Legacy `--mf-*` aliases remain because thousands of prototype selectors depend
on them. They are internal compatibility tokens, not public branding. New
production tokens should use neutral names in typed theme contracts.

## Color policy

DAIFY red is the primary brand action color. Utility blue may be used for
information, links, charts, or focus within product UI. Semantic colors should
remain restricted to their meaning. Guest templates do not inherit DAIFY brand
colors: each restaurant uses validated `--restaurant-*` values.

The raw red `#e53935` is below WCAG AA for small regular red text on white; use
`--brand-red-strong` for small text and reserve the base red for sufficiently
large/bold labels, graphics, and primary surfaces. Production must automate
contrast checks for both DAIFY UI and restaurant-defined themes.

## Typography

- `--font-sans`: Manrope, then system sans-serif.
- `--font-serif`: DM Serif Display, then Georgia.
- `--font-arabic`: Noto Kufi Arabic, then Manrope/system sans-serif.
- `--fs-display` through `--fs-caption`: fluid prototype type scale.

## Components

Buttons use `.btn` plus primary, secondary, tertiary, and light-on-dark roles.
Legacy names (`.btn--dark`, `.btn--ghost`) remain as aliases because they are
widely used by generated markup. Dashboard components live in the dashboard
styles rather than being duplicated in page files.

## Production migration rule

Preserve visual roles and the isolated restaurant theme contract, not legacy
class names. The React application should express DAIFY components as typed
components/tokens and map validated Theme records into `--restaurant-*` CSS
variables for guest menus.
