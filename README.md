# DAIFY

DAIFY is a premium digital-menu SaaS product. The repository contains the
production Next.js frontend foundation, a NestJS/PostgreSQL/Prisma backend
foundation, and the preserved framework-free prototype.

## Run locally

Run the production frontend:

```bash
npm install
npm run dev:web
```

Open `http://localhost:3000`. Quality commands are `npm run lint`,
`npm run typecheck`, `npm run build`, and `npm run test:web`.

Run the production API with PostgreSQL:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
npm run db:up
docker compose up -d mailpit
npm run db:migrate
npm run dev:api
```

The API defaults to `http://localhost:4000`; liveness is at
`/api/v1/health`, database readiness uses `/api/v1/health?database=true`, and
the OpenAPI 3.1 contract is at `/api/docs/openapi.json`. If Docker is not
available, use `npm run db:dev --workspace @daify/api` and copy its PostgreSQL
URL into `DATABASE_URL`.

Development verification, reset and invitation emails go to the local SMTP
inbox at `http://localhost:8025`. Production requires your SMTP provider's
settings, a verified sender and an HTTPS `WEB_ORIGIN`; see
`apps/api/.env.example`. Delivery errors are reported, and verification links
can be requested again at `/resend-verification`. No real provider has been
configured or validated in this repository. The no-delivery `test` transport
and raw response tokens are restricted to `NODE_ENV=test`.

Run the preserved prototype with `python3 -m http.server 8080`, then open
`http://localhost:8080`. Its original browser suite remains available through
`npm run test:prototype`; `npm test` runs the prototype browser suite, the
production-web browser suite, and API unit/integration suites (the latter needs
both `DATABASE_URL` and `TEST_DATABASE_URL` pointing at a disposable migrated
PostgreSQL database whose name contains `test`). API integration tests clear
that database's fixtures; do not point them at development or production data.
Web tests start their own API/web processes and use test-only token responses.
After `npm run build`, `WEB_TEST_PRODUCTION=true npm run test:web` verifies the
compiled frontend with `next start` as well.

## Current authenticated workspace

M3 now includes real signup, email verification/resend, login/logout, password
reset, persistent organization and first-location setup, invitation acceptance,
and team role/status management. The dashboard loads the user's actual
memberships, permitted locations and navigation, with workspace switching for
users who belong to multiple organizations. Tenant authorization is enforced
by the API. Menus, publishing/QR, billing and analytics remain later milestones.
Platform-admin MFA enrollment/recovery and provider delivery verification are
still outstanding; M3 remains **in progress**. See the
[remediation record](docs/QA/REMEDIATION_2026-09-12.md) for tested behavior and limits.

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
apps/api/                       production NestJS API and Prisma schema
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
compose.yaml                    local PostgreSQL 17 service
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
- [Current milestone: M3 Auth / Organizations](docs/MILESTONES/M3_AUTH_ORGANIZATIONS.md)
- [Production architecture](docs/PRODUCTION_ARCHITECTURE.md)
- [Architecture decisions](docs/DECISIONS/)
- [Brand guide](docs/BRAND_GUIDE.md)
- [Design system](docs/DESIGN_SYSTEM.md)
- [Template engine](docs/TEMPLATE_ENGINE.md)

The production stack is Next.js/React/TypeScript, NestJS, PostgreSQL, and
Prisma. M1 established the web boundary, M2 established the API/database
boundary, and M3 implements real authentication and organization membership.
`docs/ROADMAP.md` owns milestone status; each milestone file owns execution
details.
