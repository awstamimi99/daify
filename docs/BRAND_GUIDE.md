# DAIFY Brand Kit

## Brand idea

**Better Guest Experiences.**

DAIFY (Arabic: ضيفي) is a premium hospitality product built with the restraint of a modern SaaS company. Food & Beverage is the primary identity; hospitality and spa/salon/service use cases are supported without visually equalizing them with F&B. The identity avoids obvious forks, cloches, plates, QR codes, and restaurant clichés. Domain direction: daify.net.

## Logo concept — placeholder notice

The real DAIFY mark (a red "D"/ribbon icon, provided by the user as reference images) has not yet been supplied as usable asset files, so the files below currently hold a **temporary text-based placeholder** (a red circle + "D" monogram, plus a plain "DAIFY" wordmark) — not a redesign attempt. Swap in the final vector files once available; filenames were kept as-is (legacy `menuflow-*` names) so no code references need to change.

Primary assets:

- `assets/icons/menuflow-logo.svg` — primary logo for light backgrounds *(placeholder)*
- `assets/icons/menuflow-logo-dark.svg` — reversed logo for dark backgrounds *(placeholder)*
- `assets/icons/menuflow-icon.svg` — standalone symbol *(placeholder)*
- `assets/icons/favicon.svg` — browser icon derived from the symbol *(placeholder)*

Sizing note: containers holding these logos use height-based sizing (`height: X; width: auto`), not a fixed width tied to the current SVG's aspect ratio, so a differently-proportioned final logo (e.g. a wider horizontal lockup) will drop in cleanly.

## Brand colors

| Name | Hex | Use |
|---|---|---|
| Brand Red | `#E53935` | Primary actions, active states, small brand highlights (5–10% of any screen — not a red interface) |
| Near-Black | `#0D1117` | Primary text, dark sections |
| Dark Gray | `#2A2F36` | Secondary dark surfaces |
| Medium Gray | `#5A6068` | Secondary text |
| Off-White | `#F7F3EE` | Main website background |
| White | `#FFFFFF` | Cards, contrast on dark backgrounds |

Recommended balance: 60–70% white/neutral, 20–30% near-black/gray, 5–10% red. Full token table (including hover/soft/tint variants and semantic success/warning/error colors) lives in `assets/css/variables.css`, documented in `docs/DESIGN_SYSTEM.md`.

## Typography

- **Poppins** (Latin) for navigation, buttons, and product UI — falls back to Inter where Poppins isn't loaded.
- **Tajawal / Cairo** (Arabic) for RTL content — see `--font-arabic` in `assets/css/variables.css`.
- **DM Serif Display** selectively for hero, stories, and editorial headings.

## Brand voice

Clear, elegant, confident, warm, short, and visually driven. Avoid exaggerated startup language and AI claims.

## Logo usage

Maintain generous clear space around the full logo. The horizontal logo should not appear below 140px on the web; 160–190px is preferred in navigation. Do not stretch, skew, recolor individual pieces, add effects, or place the logo directly over busy photography without sufficient contrast. These rules carry over unchanged once the placeholder is replaced with the final logo.
