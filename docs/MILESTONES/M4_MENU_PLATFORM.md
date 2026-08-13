# Milestone 4 — Menu Platform

## Status

NOT STARTED. Detailed task breakdown will be written when M3 is complete and this milestone is about to start.

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

Detailed task breakdown deferred until M3 is complete and this milestone starts.

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

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
