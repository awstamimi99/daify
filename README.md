# DAIFY

DAIFY is a premium digital-menu SaaS product. The repository now contains the
M1 production frontend foundation alongside the preserved framework-free
prototype. Neither surface has a production backend yet.

## Run locally

Run the production frontend:

```bash
npm install
npm run dev:web
```

Open `http://localhost:3000`. Quality commands are `npm run lint`,
`npm run typecheck`, `npm run build`, and `npm run test:web`.

Run the preserved prototype with `python3 -m http.server 8080`, then open
`http://localhost:8080`. Its original browser suite remains available through
`npm run test:prototype`; `npm test` runs both prototype and production-web
browser suites.

## Production frontend foundation

- Next.js App Router, React, and strict TypeScript under `apps/web`.
- Shared domain contracts in `packages/types`, UI primitives in `packages/ui`,
  and strict shared compiler settings in `packages/config`.
- DAIFY tokens, self-hosted brand fonts, reusable buttons/cards/form fields,
  shared loading/error/not-found states, and responsive shell conventions.
- Shared marketing shell and real homepage, auth shell, responsive role-aware
  dashboard shell, and an Atelier renderer proof with English/Arabic RTL.
- Playwright coverage plus GitHub Actions checks for lint, typecheck, build, and
  Chromium tests.

## Preserved prototype

- Marketing: home, features, nine-template gallery, pricing, about, contact,
  privacy, terms, and cookies.
- Authentication prototype: login, signup, forgot-password, and reset-password
  flows with client-side validation and simulated success/error states.
- Restaurant dashboard: overview, restaurant profile, menus, menu builder,
  design, QR/publish, analytics, team, billing, settings, and help.
- Platform admin: overview, restaurants, restaurant detail, users,
  subscriptions, plans, templates, analytics, support, notifications, security,
  audit logs, and settings.
- Template tooling: gallery, full preview workspace, Design Studio, iframe live
  preview, English/Arabic switching, and RTL rendering.
- Nine templates: Feast plus the Classic-family Atelier, Verde, Noir, Amalfi,
  Sora, Ember, Souk, and Mellow designs.

All account, payment, email, contact, newsletter, analytics, and administration
operations are simulated. Prototype state lives only in the current browser.

## Repository structure

```text
apps/web/                       production Next.js frontend
packages/
  config/                       shared strict TypeScript configuration
  types/                        shared domain and renderer contracts
  ui/                           reusable React UI primitives
index.html, features.html, ...   public marketing/auth/legal pages
dashboard/                      restaurant owner/manager application
admin/                          DAIFY platform-admin application
templates/                      guest-facing restaurant menu shells
assets/
  branding/                     current DAIFY raster logo assets
  icons/                        favicon/touch icon plus retained legacy SVGs
  images/                       prototype marketing and menu imagery
  css/
    variables.css               shared DAIFY brand tokens
    style.css                   legacy marketing/auth page styles
    dashboard/                  dashboard/admin styles
    templates/                  guest-menu tokens and family art direction
  js/
    main.js, auth.js            marketing and auth behavior
    menu/                       template configs, renderers, preview, theme
    dashboard/                  store, permissions, shells, data, page modules
docs/                           roadmap, milestones, decisions, and architecture
tests/                          Playwright integration tests
```

The actual dashboard CSS is split across
`assets/css/dashboard/{variables,layout,components,forms,tables,responsive}.css`.

## Prototype state and data flow

The restaurant/dashboard state is persisted under the intentionally retained
legacy key `menuflow_platform_v1`. The admin directory and editable plan catalog
use `menuflow_admin_v1` and `menuflow_plans_v1` respectively. These identifiers
are compatibility contracts for the current prototype and must not be renamed
without a data migration.

`assets/js/menu/menu-data.js` reads the active restaurant/menu from the same
platform state before falling back to the built-in Oliva sample. Dashboard edits
therefore appear on guest-facing template pages in the same browser. Design and
layout changes are previewed through same-origin iframes using validated theme
objects and `postMessage`; public preview URLs use the same theme mechanism.

The prototype exposes legacy `window.MenuFlow*` JavaScript globals. They are
internal compatibility identifiers, not product branding. Milestone 1 will map
their concepts into typed modules rather than renaming them in place.

## Architecture references

- [Master roadmap](docs/ROADMAP.md)
- [Active milestone: M1 Foundation](docs/MILESTONES/M1_FOUNDATION.md)
- [Production architecture](docs/PRODUCTION_ARCHITECTURE.md)
- [Architecture decisions](docs/DECISIONS/)
- [Brand guide](docs/BRAND_GUIDE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Template engine](docs/TEMPLATE_ENGINE.md)

The production direction remains Next.js/React/TypeScript, NestJS, PostgreSQL,
and Prisma. M1 implements only the frontend boundary; backend, database, and
real authentication work remain intentionally deferred. `docs/ROADMAP.md` owns
milestone status; the active milestone file owns execution details.
