# Milestone 0 — Pre-Milestone Cleanup + Architecture Lock

## Status

**COMPLETE.** This file is a retrospective record of what actually happened, verified against the repository rather than against intent. Where something was planned but not implemented, it is listed under "Deferred," not under "Done."

## Goal

Get the prototype and its documentation into a state where production work (M1+) can start without dragging along unreviewed branding, unreviewed legacy naming, or undocumented architecture assumptions.

## Why this milestone exists

The repository began as a static front-end prototype originally named "MenuFlow," later rebranded to "DAIFY." Before spending real engineering time on a production stack, three things needed to happen: the public-facing branding needed to be consistent, the legacy naming needed a conscious decision (keep vs. rename vs. remove) instead of silent drift, and the production architecture needed to be written down once so Codex, Claude, and the project owner stop re-deriving it per conversation.

## What I need to learn

Nothing implementation-specific — M0 is a planning and cleanup milestone. The useful thing to internalize here is the *shape* of the decisions that got locked (multi-tenant Organization → Location → Menu, API-enforced authorization, immutable published versions, translation-table localization) because M1 onward assumes them without re-explaining them.

## What we will build

Nothing shipped to users. M0 produces documentation and repository hygiene, not product surface area.

## Technical scope

- Public branding consistency across HTML, `robots.txt`, `sitemap.xml`, and `llms.txt`.
- A written inventory of legacy `MenuFlow`-era identifiers and an explicit keep/defer decision for each category.
- A production architecture reference and five topic-scoped decision documents.
- A tagged snapshot of the prototype prior to any production-stack code landing.

## Tasks

### Branding cleanup

- [x] Canonical URLs, Open Graph tags, and JSON-LD across marketing/legal pages use `daify.net` (109 references verified at audit time).
- [x] `robots.txt` `Sitemap:` line updated from `menuflow.app` to `daify.net`.
- [x] `sitemap.xml` rewritten: all `<loc>` entries use `daify.net`, `<lastmod>` refreshed, and the new legal pages (`privacy.html`, `terms.html`, `cookies.html`) added as entries that did not exist before.
- [x] `llms.txt` rewritten from MenuFlow-branded copy to DAIFY, including an explicit "prototype, not production" accuracy note for AI assistants citing the site.
- [x] `README.md` rewritten to describe DAIFY (not MenuFlow) and to list what is actually implemented in the prototype, including the platform-admin app and the nine-template engine, which the previous README omitted.

### Legacy MenuFlow review

- [x] Reviewed and inventoried in [PRODUCTION_ARCHITECTURE.md](../PRODUCTION_ARCHITECTURE.md) under "Legacy prototype contract": `window.MenuFlow*` JS globals, `menuflow_*` localStorage keys (`menuflow_platform_v1`, `menuflow_admin_v1`, `menuflow_plans_v1`), `--mf-*` CSS variable aliases, and unused `assets/icons/menuflow-*` SVG files.
- [x] Decision recorded: keep all of the above during prototype stabilization rather than rename in place. New production code must not introduce new MenuFlow-named APIs. Removal requires a migration path, not a find-and-replace.

### Architecture decisions

- [x] [PRODUCTION_ARCHITECTURE.md](../PRODUCTION_ARCHITECTURE.md) — planned stack, system boundaries, product ownership model, and links to every decision document.
- [x] [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) — entity ownership from `User` through `AuditLog`.
- [x] [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md) — five roles and a full permission matrix.
- [x] [DECISIONS/PUBLISHING.md](../DECISIONS/PUBLISHING.md) — draft/preview/publish/rollback lifecycle and the stable public/QR route.
- [x] [DECISIONS/LOCALIZATION.md](../DECISIONS/LOCALIZATION.md) — translation-table model over per-language columns, with the reasoning kept alongside the decision.
- [x] [DECISIONS/INFRASTRUCTURE.md](../DECISIONS/INFRASTRUCTURE.md) — hosting/runtime direction, with unresolved vendor choices explicitly marked deferred rather than guessed at.

### Prototype preservation

- [x] Git tag `pre-milestone-0-prototype` marks the prototype exactly as it stood before any cleanup or production-stack work landed.
- [x] Production work proceeds on a dedicated `Milestone-1` branch rather than directly on `main`.

## Deliverables

- `docs/PRODUCTION_ARCHITECTURE.md`
- `docs/DECISIONS/DATA_MODEL.md`, `AUTH_RBAC.md`, `PUBLISHING.md`, `LOCALIZATION.md`, `INFRASTRUCTURE.md`
- `docs/ROADMAP.md` and `docs/MILESTONES/*` (this documentation set)
- Updated `README.md`, `llms.txt`, `robots.txt`, `sitemap.xml`
- Git tag `pre-milestone-0-prototype`

## Acceptance Criteria

- Every canonical/OG/sitemap/robots reference in the repository points at `daify.net`, not `menuflow.app`. ✅ verified by full-repository search.
- `docs/PRODUCTION_ARCHITECTURE.md` exists and answers "how is DAIFY designed technically," with no section describing the current prototype as if it already had a live backend. ✅
- Every legacy identifier category has a written keep/defer decision, not silence. ✅
- A rollback point to the pre-cleanup prototype exists in Git. ✅ Local tag `pre-milestone-0-prototype` points to commit `6f7931d`; the tag has not yet been published to `origin`.

## Tests

- `npm test`: all 17 existing Playwright tests pass, including Feast, preview/customizer integration, Dashboard Design, Arabic/RTL, and Classic-family regression.
- Static local-target audit: 48 HTML files checked with zero fake `href="#"` values and zero missing local targets.
- CSS asset audit: 26 CSS files checked with zero missing local assets.
- Browser smoke check: home, contact, forgot-password, dashboard help/publish, and admin overview returned HTTP 200 with no console or failed-resource errors.
- Syntax and diff checks passed for the modules changed during action-link cleanup.

## Dependencies

None. M0 is the starting point.

## Risks / Notes

- The legacy `menuflow_*` identifiers are a known, accepted source of confusion for anyone reading the code cold. This is intentional short-term debt, not an oversight — see the keep/defer decision above and the removal criteria in `PRODUCTION_ARCHITECTURE.md`.
- M0 did **not** address the prototype's other pre-existing gaps: `assets/images` is ~36MB with no compressed/lazy-loaded delivery, there is no CI running the existing Playwright suite, and there is no linting/formatting tooling. These are real but are **not** M0 blockers — image delivery is production-stack work (M1/M8), and CI/linting setup is naturally part of standing up the new repo tooling in M1.9 and M8, not a reason to hold up M1.
- Nothing in M0 required rewriting or discarding the static prototype. It stays live and referenceable throughout M1–M5 as the design/behavior source of truth for migration.
- The safety tag currently exists locally only. Publishing it to the shared remote is a useful operational follow-up, but the underlying commit remains in repository history and this does not block M1.

## Completion Checklist

- [x] Branding cleanup verified against the live repository, not assumed.
- [x] Legacy identifiers inventoried with an explicit decision.
- [x] Architecture and all five decision documents exist, cross-link each other, and cross-link forward to the milestone that will implement them.
- [x] Prototype preservation point exists and is discoverable (`git tag -l`).
- [x] `docs/ROADMAP.md` reflects M0 as complete and M1 as next.
- [x] No blockers identified before starting M1 (see `ROADMAP.md` for the live blocker list).
