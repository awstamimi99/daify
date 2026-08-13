# Milestone 1 — Foundation: TypeScript / React / Next.js

## Status

**IN PROGRESS — implementation ready for independent review.** Kickoff was explicit on 2026-08-13. The production frontend foundation is implemented and all local automated gates pass. M1 is deliberately not marked complete until independent visual/accessibility review confirms the Atelier parity and migrated-page quality gates, and the first GitHub Actions run is observed green.

## Goal

Stand up the production web foundation (TypeScript, React, Next.js) and carry the existing design system, marketing shell, and dashboard shell onto it, while defining — but not yet completing — the template-migration strategy. By the end of M1, the production `web` boundary described in [PRODUCTION_ARCHITECTURE.md](../PRODUCTION_ARCHITECTURE.md) exists as a real Next.js application, even though it has no backend yet (M2) and no real auth yet (M3).

## Why this milestone exists

The current prototype is deliberately framework-free static HTML/CSS/JS — that was the right choice for a fast, disposable prototype, but it is not the production stack. `PRODUCTION_ARCHITECTURE.md` and `DECISIONS/INFRASTRUCTURE.md` already lock Next.js/React/TypeScript as the frontend direction. M1 is where that direction stops being a document and starts being a real, running application — without yet building the backend it will eventually talk to.

M1 is also explicitly a *learning* milestone, not a hand-off. The project owner is learning TypeScript/React/Next.js while building this, not receiving a generated application. Every sub-phase below separates what to learn, what to build personally, what to delegate to Codex, and what to review — on purpose, so Codex is not the one deciding how much you understand.

## What I need to learn

Each sub-phase lists its own specific learning goal below. At the milestone level, the throughline is: **you already understand this product's domain** (menus, sections, items, templates, roles) because you designed and reviewed the prototype. M1 is learning to express that same domain in TypeScript/React/Next.js, not learning the domain itself.

## What we will build

- A working Next.js + TypeScript + React application, with tooling (linting, formatting) that the prototype never had.
- TypeScript types for the core domain objects the prototype already implies (restaurant, menu, section, item, session/role) — modeled on real shapes from `assets/js/menu/menu-data.js` and `assets/js/dashboard/store.js`, not invented from scratch.
- The design system (`assets/css/variables.css` tokens) ported into the new app.
- The marketing site shell and the dashboard shell (navigation, layout) migrated — not necessarily every single page.
- A defined (not fully executed) strategy for migrating the nine-template menu-rendering engine, proven against one template.
- Playwright wired into the new app, including CI.

## Technical scope

- Next.js (App Router), React, TypeScript.
- No backend calls yet — M1 pages either render static/prototype data or reuse the same `localStorage`-backed data the current prototype uses, as a bridge. Real API integration is M2/M3/M4.
- No production authentication yet — the dashboard shell can be migrated with the existing prototype's simulated session, not real login.
- Styling approach: CSS Modules for component/layout isolation plus a small global token/reset layer. This preserves the existing CSS expertise and DAIFY tokens without copying the legacy monolith or introducing another styling runtime.

## Tasks

Each sub-phase below follows the same four-part breakdown: **LEARN** (concept to understand before touching code), **BUILD MYSELF** (do this personally — it's where the learning happens), **BUILD WITH CODEX** (reasonable to delegate once the pattern is understood), **REVIEW** (how to know it actually worked).

### M1.1 — TypeScript foundation

- **LEARN:** Basic types, interfaces, union types, and why a compiler catching shape mismatches matters for a data model this nested (Organization → Location → Menu → Section → Item).
- **BUILD MYSELF:** Write TypeScript interfaces for the domain objects the prototype already has running data for — `Restaurant`, `Menu`, `MenuSection`, `MenuItem`, `Session`/`Role` — by reading `assets/js/menu/menu-data.js` and the data-shape comment at the top of `assets/js/dashboard/store.js` and translating them directly. This is deliberately not new design; it's learning TypeScript by describing something you already understand.
- **BUILD WITH CODEX:** `tsconfig.json` setup and any repetitive boilerplate once your hand-written types exist as the source of truth to scaffold from.
- **REVIEW:** Do your types actually match the real localStorage shape? Paste a real `menuflow_platform_v1` value from a browser dev tools session and check it against your types by hand.
- **EXPECTED OUTPUT:** Strict TypeScript configuration plus reviewed domain interfaces based on real prototype data.
- **ACCEPTANCE CRITERIA:** Typecheck passes without unjustified `any`; you can explain narrowing and why runtime input still needs validation.

### M1.2 — React foundation

- **LEARN:** Components, props, state, and the two or three hooks you'll actually use early (`useState`, `useEffect`). Compare this mentally against how `assets/js/dashboard/shell.js` currently builds DOM by hand — React is solving the same "render this data as UI" problem with a different mechanism.
- **BUILD MYSELF:** Rebuild one small, self-contained piece of the existing prototype as a React component — a good candidate is the footer newsletter form or a single menu item card — and get it behaviorally equivalent to the original.
- **BUILD WITH CODEX:** Repetitive component scaffolding once you've built the first one and understand the pattern.
- **REVIEW:** Put your React version and the live prototype version side by side. Same markup intent, same behavior on submit/interaction?
- **EXPECTED OUTPUT:** One small typed, accessible React component with an understood state/props boundary.
- **ACCEPTANCE CRITERIA:** Behavior matches the reference, keyboard interaction works, and you can explain what causes it to render.

### M1.3 — Create Next.js application

- **LEARN:** Why Next.js specifically — server-rendered public menu pages (for SEO and QR-scan load speed) is a real product requirement already written into `DECISIONS/PUBLISHING.md`, not a default framework choice. App Router basics: file-based routing, server components vs. client components.
- **BUILD MYSELF:** Run the initial `create-next-app` setup yourself and get one route rendering, so the base project structure isn't a black box.
- **BUILD WITH CODEX:** ESLint/TypeScript config wiring, any boilerplate beyond the first working route.
- **REVIEW:** `npm run dev` serves a real page. You can explain, in your own words, which parts of the generated project are Next.js convention versus your own code.
- **EXPECTED OUTPUT:** A minimal independently runnable Next.js App Router application with documented commands.
- **ACCEPTANCE CRITERIA:** Development server, production build, typecheck, and agreed static checks pass; no backend capability is implied.

### M1.4 — Project structure

- **LEARN:** How this specific product's four surfaces (marketing, authenticated dashboard, platform admin, public menu routes) map onto Next.js routing, consistent with the `web` boundary in `PRODUCTION_ARCHITECTURE.md`.
- **BUILD MYSELF:** Decide and write down the top-level route/folder structure (e.g., route groups separating marketing, `dashboard`, `admin`, and the public `/r/{slug}` menu route). This is an architectural decision worth making deliberately, not accepting a default.
- **BUILD WITH CODEX:** Scaffolding the folders/placeholder pages once the structure is decided.
- **REVIEW:** Does every existing prototype surface (marketing, dashboard, admin, public template pages) have an obvious home in the new structure? If something doesn't fit, that's worth resolving now, not in M1.6/M1.7.
- **EXPECTED OUTPUT:** Documented route/module tree with a clear home and dependency direction for each product surface.
- **ACCEPTANCE CRITERIA:** Every created folder has a current responsibility, server/client boundaries are clear, and no speculative empty architecture is added.

### M1.5 — Design system migration

- **LEARN:** How CSS custom properties from `assets/css/variables.css` map onto whichever styling approach is chosen for the new app. Decide the styling approach here if not already decided (see Technical scope above).
- **BUILD MYSELF:** Port the token values themselves (color, spacing, radius, type scale, shadow) by hand — this is the fastest way to actually learn the new styling system, and the values already exist and are documented in `docs/DESIGN_SYSTEM.md`.
- **BUILD WITH CODEX:** Migrating component-level styles (buttons, cards, form fields) once tokens exist and the pattern is proven on one or two components.
- **REVIEW:** Screenshot comparison against the live prototype for a handful of components sharing the same tokens (button variants, a card, an input). Colors, spacing, and radius should match, not just "look close."
- **EXPECTED OUTPUT:** Central production tokens and a small set of accessible Button/Card/Form primitives in the chosen styling system.
- **ACCEPTANCE CRITERIA:** Token values and component states are centralized, focus/contrast pass review, and the legacy monolithic CSS is not copied wholesale.

### M1.6 — Marketing shell migration

- **LEARN:** Next.js's metadata API as the replacement for the prototype's current pattern of hand-duplicating `<meta>`/Open Graph/canonical tags across 15 separate HTML files. This is a concrete, motivating improvement — the prototype's biggest structural weakness (no build step, hand-copied header/footer/meta across every page) goes away here.
- **BUILD MYSELF:** Migrate two representative pages yourself — the homepage and one legal page (`privacy.html` is a good choice; it already has the richest internal structure of the three) — to prove the layout/metadata pattern works end to end.
- **BUILD WITH CODEX:** The remaining marketing pages, once the pattern from your two pages is established and repetitive.
- **REVIEW:** Check nav links, footer links (including the newsletter form and mobile accordion built into the current footer), and OG/canonical tags against all 15 existing pages — nothing should regress silently the way the pre-cleanup footer inconsistencies did.
- **EXPECTED OUTPUT:** Shared marketing layout and migrated routes using centralized metadata/page conventions.
- **ACCEPTANCE CRITERIA:** Agreed marketing routes are responsive and accessible, internal links work, metadata is DAIFY-only, and no external destinations are invented.

### M1.7 — Dashboard shell migration

- **LEARN:** Protected layouts/routes in Next.js, and a state-management approach for the authenticated app. The prototype's `assets/js/dashboard/store.js` is a real, working reference for what the client-side data shape and API surface need to cover — don't redesign the domain, translate it.
- **BUILD MYSELF:** Migrate the shell itself — the sidebar/topbar navigation currently rendered dynamically by `shell.js` into `#dashShell` — into a Next.js layout. This is the highest-value learning step in M1 because it's the first real "dynamic, role-aware UI" piece.
- **BUILD WITH CODEX:** Individual dashboard pages (of the 11 that exist today) once the shell and its navigation pattern are proven.
- **REVIEW:** Does role-based navigation visibility still work for the roles the prototype already models (owner, manager)? Cross-check against `assets/js/dashboard/permissions.js`, not against a new guess at what managers can see.
- **EXPECTED OUTPUT:** Responsive dashboard layout/navigation with at least one representative page and typed fixture data.
- **ACCEPTANCE CRITERIA:** Navigation, keyboard, and mobile states work; permission visibility is labeled as UX only; prototype localStorage is not treated as production authorization.

### M1.8 — Template migration strategy

- **LEARN:** This sub-phase is strategy, not full migration — `PRODUCTION_ARCHITECTURE.md` explicitly defers full template migration to M5. The existing renderer-registry pattern (`menu-renderer.js` for the Classic family, `feast-renderer.js` for Feast) is real, working product IP and must be preserved, not rewritten from scratch.
- **BUILD MYSELF:** Write the TypeScript interface a renderer family must satisfy, by formalizing the shared interaction contract that already exists informally as `data-*` attributes in `docs/TEMPLATE_ENGINE.md` (`[data-menu-search]`, `[data-menu-item]`, `[data-menu-section]`, and so on).
- **BUILD WITH CODEX:** A proof-of-concept wrapping exactly one existing template (Atelier is the simplest Classic-family template) behind that interface — not all nine templates, not both families yet.
- **REVIEW:** Does the POC render visually identically to `templates/atelier.html` for the same sample data? This is the test that tells you whether the interface you designed actually captures the contract, or whether it's leaking assumptions from one template.
- **EXPECTED OUTPUT:** Typed renderer/view-model/theme/message contracts plus one limited Atelier migration proof and a written M5 handoff strategy.
- **ACCEPTANCE CRITERIA:** Stable slugs, capabilities, `--restaurant-*` tokens, localization/RTL, and renderer independence are preserved without claiming all templates are migrated.

### M1.9 — Testing + QA

- **LEARN:** Running Playwright against a Next.js dev server (mostly transferable from the existing `playwright.config.js`), and where CI fits — the prototype has Playwright configured but nothing runs it automatically today.
- **BUILD MYSELF:** Port the assertions from `tests/feast-template.spec.js` that apply to whatever you migrated in M1.6–M1.8, so you understand what the existing test coverage actually checks before extending it.
- **BUILD WITH CODEX:** GitHub Actions CI wiring to run Playwright automatically on push/PR — direct remediation of a gap the prototype has had since M0.
- **REVIEW:** Full Playwright run is green, and test coverage for what M1 migrated is not smaller than what the prototype had for the same surface.
- **EXPECTED OUTPUT:** Repeatable typecheck/static/build/browser commands locally and in CI with focused migrated-surface coverage.
- **ACCEPTANCE CRITERIA:** Quality commands pass, failures are actionable, migrated accessibility/responsive/RTL risks are covered, and the legacy 17-test baseline remains runnable.

## Deliverables

- A running Next.js + TypeScript + React application in the repository (location/package structure to be decided in M1.4).
- Ported design tokens and at least the button/card/form-field components.
- Migrated marketing shell (all 15 pages) and migrated dashboard shell (navigation + at least one real page).
- A documented, POC-validated template-migration interface for M5 to build on.
- Playwright running in CI.

## Acceptance Criteria

- The new app runs locally via a documented command and serves at least the full marketing site and the dashboard shell with role-aware navigation.
- Every marketing page's metadata (title, description, OG, canonical) is generated from a single source per page, not hand-duplicated markup.
- The Atelier template POC from M1.8 is visually indistinguishable from the current prototype's `templates/atelier.html`.
- CI runs Playwright automatically on every push/PR to the `Milestone-1` branch (or its successor).
- No production backend, database, or real authentication was introduced in M1 — those remain M2/M3 by design.

## Tests

- Playwright browser tests for migrated marketing pages (nav, footer, forms) and the migrated dashboard shell (role-based nav visibility).
- The M1.8 template POC gets a visual/structural parity test against its prototype equivalent, following the pattern already used in `tests/feast-template.spec.js`.
- No unit/API test suite yet — there is no backend to test until M2.

## Dependencies

- M0 must be complete (it is — see `M0_PRE_MILESTONE.md`).
- No dependency on M2+; M1 intentionally does not require a backend.

## Risks / Notes

- The biggest risk is scope creep into "just rebuild everything in Next.js now" — M1 is explicitly foundation plus *strategy*, not a full migration of all 11 dashboard pages, 13 admin pages, and 9 templates. Resist finishing what M4/M5/M7 own.
- Styling-approach choice (M1.5) should be made once and recorded here, not silently revisited per component.
- Because M1 has no backend, some dashboard/admin pages will keep reading the prototype's `localStorage` data during this milestone as a bridge. That bridge is expected to be removed in M2–M4, not preserved long-term.

## Completion Checklist

- [x] Styling approach decided and recorded in this file.
- [x] Domain TypeScript types written against the documented prototype contracts.
- [x] Next.js app created and running.
- [x] Project structure decided and documented.
- [x] Design tokens and base components ported.
- [ ] All 15 prototype top-level pages migrated. The nine marketing/legal routes and four auth routes are migrated; the legacy preview/customizer remain intentionally in place for M5.
- [x] Dashboard shell migrated with working role-based navigation.
- [x] Template migration interface designed and structurally validated against one template (Atelier).
- [ ] Playwright runs locally and CI is configured; the first remote GitHub Actions run still needs to be observed.
- [ ] `docs/ROADMAP.md` updated to mark M1 complete and M2 as next.

## Implementation record — 2026-08-13

### Architecture created

```text
apps/web/
  src/app/                    App Router layouts, routes, and shared states
  src/components/             brand, marketing, auth, and dashboard components
  src/data/                   typed static M1 content and fixtures
  src/features/templates/     renderer registry, Atelier proof, migration notes
  src/lib/                    production asset bridge to preserved legacy assets
  tests/                      M1 Playwright coverage
packages/
  config/                     strict shared TypeScript configuration
  types/                      domain, localization, role, menu, and renderer contracts
  ui/                         accessible Button, Card, and TextField primitives
```

The root remains an npm-workspaces monorepo. `apps/web` is the only production application in M1. Server Components are the default; client boundaries are limited to responsive navigation, form demonstrations, role-view switching, and locale switching. No API abstraction, database client, auth provider, or mock server was introduced.

### Migrated surfaces

- Shared marketing layout, DAIFY header/navigation, compact footer/newsletter interaction, homepage, features, templates, pricing, about, contact, privacy, terms, and cookies.
- Login, signup, forgot-password, and reset-password shells. Submissions prove UI behavior only and state explicitly that no account or API call exists.
- Responsive dashboard shell, overview, role-aware navigation fixture, and bounded placeholder routes for the remaining dashboard destinations.
- DAIFY brand tokens, Manrope/DM Serif Display/Noto Kufi Arabic fonts, focus states, buttons, cards, and form fields.
- Loading, error, and not-found patterns.
- Typed Atelier renderer proof with English/Arabic content, `dir` switching, stable slug/family/capabilities, `--restaurant-*` theme variables, and renderer-registry isolation.

### Intentionally retained prototype

The existing root HTML, CSS, JavaScript, dashboard/admin pages, nine guest templates, Design Studio, preview workspace, localStorage contracts, iframe/postMessage renderer, assets, and the legacy 17-test suite were not modified or removed. They remain the behavioral and visual reference. Full dashboard/admin migration belongs to M4/M7; full renderer, customizer, publishing, and public-route migration belongs to M5.

### Quality evidence

| Gate | Result |
| --- | --- |
| `npm run lint` | PASS — zero warnings |
| `npm run typecheck` | PASS — web, types, and UI workspaces |
| `npm run build` | PASS — Next.js production build, 24 generated routes/pages |
| `npm run test:web` | PASS — 6/6 Chromium tests |
| `npm run test:prototype` | PASS — retained baseline 17/17 |

GitHub Actions is configured in `.github/workflows/frontend.yml` for pushes to `main`/`Milestone-1` and pull requests. It runs lint, typecheck, build, and the production Playwright suite.

### Review gate and remaining issues

M1 is ready for an independent review but not yet complete. The reviewer should:

1. Compare the new homepage, auth shell, dashboard shell, and Atelier proof against the preserved prototype at desktop and mobile sizes.
2. Confirm keyboard order, visible focus, contrast, reduced-width navigation, and Arabic RTL behavior manually.
3. Decide whether the original “all 15 pages” line is a required M1 deliverable despite the same plan deferring preview/customizer migration to M5; those two tools are intentionally not migrated here.
4. Observe a green GitHub Actions run after the branch is pushed.

If those gates pass without required changes, mark M1 `COMPLETE` and make M2 `NEXT`. Do not start M2 automatically.
