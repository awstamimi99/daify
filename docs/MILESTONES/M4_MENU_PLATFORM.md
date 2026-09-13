# Milestone 4 — Menu Platform

## Status

**IN PROGRESS — local implementation complete and tested.** Explicit owner kickoff
on 2026-09-12. Actual object-store/provider acceptance remains open. M3's external
operational gates remain open under the sequencing exception in the roadmap.
See [QA results and media runbook](../QA/M4_2026-09-12.md): 78 API, 22 compiled-web
and 17 prototype tests passed, together with build, typecheck and lint.
The [2026-09-13 revalidation](../QA/READINESS_2026-09-13.md) passes 78 API,
30 compiled-web (including accessibility) and 17 prototype tests, with zero
dependency-audit findings. Actual object-store acceptance remains open.

## Goal

Turn Locations, Menus, Sections, and Items into real backend-owned resources with full CRUD, replacing the prototype's `localStorage`-backed menu editing.

## Why this milestone exists

The prototype's dashboard (`assets/js/dashboard/pages/menu-builder.js`, `menus.js`) already proves the *product* — restaurants can add sections, items, prices, and availability, and see it reflected on the public template pages. M4 is where that becomes real, multi-tenant, database-backed data instead of one browser's `localStorage`.

## What I need to learn

Modeling ordered, nested data (sections containing items) in a relational database; multilingual content storage per [DECISIONS/LOCALIZATION.md](../DECISIONS/LOCALIZATION.md); and image upload/association, since menu items carry photos.

## What we will build

- Location CRUD, scoped to an Organization.
- Menu CRUD, scoped to a Location.
- Section and Item CRUD, with ordering, availability, pricing, dietary/allergen metadata, and featured flags.
- Multilingual content using the translation-table model locked in `LOCALIZATION.md` — not per-language columns.
- Image upload and association for menu items, per the media pipeline described in `PRODUCTION_ARCHITECTURE.md` and `DECISIONS/INFRASTRUCTURE.md`.

## Technical scope

- Builds on the authenticated, authorized API from M2/M3.
- Implements the `Location`, `Menu`, `MenuSection`, `MenuItem`, and `MenuItemImage` entities from [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md).
- Enforces the role-based edit/availability distinctions already defined in `AUTH_RBAC.md` (e.g., Staff may get availability-only access without content-editing rights).
- Does **not** include publishing, versioning, or the public-facing route — that's M5. M4 produces draft/editable data only.

## Tasks

- Complete scoped location update/archive and draft menu CRUD.
- Add explicit menu, section, item and image-alt translation rows; canonical
  BCP 47 tags and versioned completeness reporting for enabled languages.
- Add sections/items, ordering, move, price precision, allergens/dietary tags,
  featured/visibility flags and a separate availability-only mutation.
- Serialize edits with organization/menu locks and reject stale draft revisions.
- Add bounded validated image upload, metadata stripping, immutable private
  objects, authenticated reads and detachment. Use local storage for development
  and an S3-compatible adapter for a subsequently selected production provider.
- Replace the Menus placeholder with persisted listing and editing, accessible
  English/Arabic fields, visible save failures/conflicts and mobile layouts.
- Extend API contracts and verify isolation, permissions, localization, media,
  concurrency and complete browser journeys before marking implementation done.

## Deliverables

- Working Location, Menu, Section, and Item CRUD through the API.
- Multilingual field storage and completeness reporting per `LOCALIZATION.md`.
- Menu item image upload, validation, and association.
- Dashboard pages (migrated from the prototype's `menus.html`/`menu-builder.html`) reading and writing through the real API instead of `localStorage`.

## Acceptance Criteria

- A menu created through the API is scoped correctly to its Location and Organization, with tenant scope derived from the parent chain, never trusted from client input.
- Bilingual and single-language menus (English-only, Arabic-only, and bilingual) all validate and save correctly per the rules in `LOCALIZATION.md`.
- Staff-role users can change item availability but not edit content, matching the permission matrix from M3.
- Uploaded images pass validation (MIME/signature/size) before being associated with an item.

## Tests

API tests for CRUD boundaries and tenant scoping; tests specifically covering the localization completeness rules (missing-translation handling for required vs. optional fields) and the availability-only permission case.

## Dependencies

- M3 (needs real organizations, locations under them, and enforced permissions).
- Uses [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) and [DECISIONS/LOCALIZATION.md](../DECISIONS/LOCALIZATION.md) as locked inputs.

## Risks / Notes

- It's tempting to fold publishing/versioning into this milestone since the prototype's menu editor doesn't visibly separate them — resist that. M4 is draft data only; M5 owns everything about what becomes public.
- Image pipeline complexity (responsive variants, orphan cleanup) can expand scope quickly — the minimum for M4 is validated upload and association, not the full optimization pipeline described in `PRODUCTION_ARCHITECTURE.md`.

## Completion Checklist

- [x] Location and draft menu CRUD, with tenant and location scopes.
- [x] Section/item CRUD, ordering and availability-only authorization.
- [x] Translation rows and completeness reporting.
- [x] Validated image storage, private retrieval and detachment.
- [x] Dashboard listing/editor with persistent saves and mobile/RTL behavior.
- [x] API contracts, real-database tests and browser evidence.
- [ ] Real object-store/provider operational validation (provider not yet selected).
