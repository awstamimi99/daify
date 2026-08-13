# DAIFY brand guide

## Brand idea

**Better Guest Experiences.**

DAIFY (Arabic: ضيفي) is a premium hospitality product. Food and beverage is the
primary product category; hotel, spa, salon, and related hospitality use cases
are secondary. The visual language is restrained, warm, editorial, and avoids
generic restaurant clichés. The confirmed public domain used by the prototype
is `daify.net`.

## Current logo assets

The prototype uses the supplied DAIFY red ribbon/D mark and bilingual wordmark:

- `assets/branding/daify-logo-light.png` — for light surfaces.
- `assets/branding/daify-logo-dark.png` — for dark surfaces.
- `assets/icons/favicon.png` — browser icon.
- `assets/icons/apple-touch-icon.png` — touch icon.

The older SVG files under `assets/icons/` whose filenames begin with the legacy
product name are unused placeholder assets. They remain only to avoid an
unnecessary destructive asset cleanup before Milestone 1 and must not be used
for new DAIFY UI.

Use height-based sizing with `width: auto`, preserve clear space, and never
stretch, skew, recolor, or add effects to the supplied lockup.

## Brand colors

The source of truth is `assets/css/variables.css`.

| Token | Value | Role |
|---|---:|---|
| Brand Red | `#e53935` | Primary CTA and selected brand moments |
| Brand Red Hover | `#c92f2b` | Hover/pressed primary state |
| Brand Red Strong | `#b52322` | Accessible red text on light surfaces |
| Warm White | `#fcfaf9` | Marketing background |
| White | `#ffffff` | Primary cards/surfaces |
| Muted Surface | `#f6f5f4` | Dashboard/page background |
| Charcoal | `#171717` | Dark surfaces |
| Primary Text | `#202020` | Main text |
| Secondary Text | `#66615f` | Supporting text |
| Utility Blue | `#587ff8` | Information, links, and data visualization |

Red remains the defining brand accent. Blue is a functional UI/status color,
not a second brand color. Semantic success, warning, error, and information
tokens are documented in the design system.

## Typography

- **Manrope**: body copy, navigation, controls, and product UI.
- **DM Serif Display**: editorial headings and selected brand moments.
- **Noto Kufi Arabic**, with Manrope/system fallbacks: Arabic/RTL content.

Fonts are currently requested from Google Fonts in `variables.css`; production
should self-host or use an equivalent privacy/performance-conscious strategy.

## Voice

Clear, elegant, confident, warm, short, and visually driven. Avoid exaggerated
startup language, unsupported claims, and AI language unless it describes a
real shipped capability.
