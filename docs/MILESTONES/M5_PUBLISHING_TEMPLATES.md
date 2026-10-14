# Milestone 5 — Templates / Publishing / QR

## Status

**COMPLETE — local implementation and acceptance verified 2026-09-14.**
Explicit owner kickoff on 2026-09-13: “go to the next”. Prior M1 visual and M3/M4
provider acceptance remains open under this sequencing exception. Remote CI for
the final change has not been verified. See [verification and handoff](../QA/M5_2026-09-13.md).

## Goal

Complete the template-engine migration strategy defined in M1.8, and build the real draft → preview → publish → version → rollback lifecycle with a stable public menu route and QR codes.

## Why this milestone exists

Two things converge here. First, the prototype's template engine — nine templates across two renderer families (Classic and Feast) — is real product IP that must migrate deliberately, per [TEMPLATE_ENGINE.md](../TEMPLATE_ENGINE.md) and the "Menu platform and templates" section of `PRODUCTION_ARCHITECTURE.md`. Second, the prototype's `publishedSnapshot` concept must become the real, immutable, rollback-capable versioning system defined in [DECISIONS/PUBLISHING.md](../DECISIONS/PUBLISHING.md), with QR codes that never need reprinting.

## What I need to learn

Immutable versioning patterns (append, never mutate), the stable-identifier problem (why a QR code must point at a route, never a version or template file), and how to finish migrating a rendering system without breaking template identities that already exist in the product (Atelier, Verde, Noir, Amalfi, Sora, Ember, Souk, Mellow, Feast).

## What we will build

- The remaining eight templates migrated behind the interface proven in M1.8's Atelier proof-of-concept — both the Classic family (via the shared `menu-renderer.js` equivalent) and the independently-structured Feast family.
- Draft, Preview, Publish, and Rollback, matching the lifecycle in `PUBLISHING.md` exactly: publish creates an immutable, sequentially numbered `MenuVersion`; rollback publishes an old snapshot as a *new* version, never rewriting history.
- The stable public route `https://daify.net/r/{slug}`, server-resolving the current published version.
- QR code generation targeting that stable route.
- Managed slug-change redirects.

## Technical scope

- Implements [DECISIONS/PUBLISHING.md](../DECISIONS/PUBLISHING.md) in full, including its explicit non-goals for this phase: scheduled publishing and custom domains are both named as *future* capabilities in that document, not part of this milestone's baseline scope.
- Preserves everything `PUBLISHING.md`'s "Template contract" section lists: the normalized menu model, stable template/family identifiers, both renderer families, capability validation, `--restaurant-*` tokens, and the iframe preview mechanism (upgraded to typed, origin-checked `postMessage`).
- Builds on M4's draft data as the input to publishing.

## Tasks

1. Add immutable versions, public route reservations and a transactional publication outbox.
2. Validate draft revisions, scoped publication/design permissions, entitlements, translations and media.
3. Implement preview, publish, history, rollback, unpublish and collision-safe slug changes.
4. Port both renderer families and all nine template configurations into typed modules, retaining prototype styles and interactions.
5. Build authenticated iframe preview/customization, public server-rendered menus and downloadable stable QR codes.
6. Verify lifecycle/concurrency/isolation, template parity, English/Arabic, capabilities, messaging and real browser journeys.

## Deliverables

- All nine templates rendering through the new stack via the M1.8 interface, visually matching their prototype equivalents.
- Working draft/preview/publish/rollback for real menus.
- Public `/r/{slug}` route serving the current published version, with correct handling for private/suspended/unpublished states.
- QR code generation and download.

## Acceptance Criteria

- Publishing never mutates an existing `MenuVersion`; rollback always creates a new version referencing its source.
- A QR code printed before a template change, republish, or rollback still resolves correctly afterward — the stable route is what makes this true, and it must be tested, not assumed.
- Every template preserves its existing capability set (per `TEMPLATE_ENGINE.md`'s per-template `supports` definitions) — no template silently loses an option it had in the prototype.
- Slug changes redirect from the old slug without breaking existing links or QR codes.

## Tests

Visual/structural parity tests for each migrated template against its prototype equivalent (extending the pattern in `tests/feast-template.spec.js`); lifecycle tests for publish/rollback/unpublish state transitions; a QR-stability test that changes template/republishes/rolls back and confirms the same public URL still resolves.

## Dependencies

- M4 (needs real menu draft data to publish).
- Uses [DECISIONS/PUBLISHING.md](../DECISIONS/PUBLISHING.md) and [TEMPLATE_ENGINE.md](../TEMPLATE_ENGINE.md) as locked inputs, and the interface proven in M1.8.

## Risks / Notes

- The highest-risk failure mode here is silently changing a template's stable slug or capability set during migration — `PUBLISHING.md` and `TEMPLATE_ENGINE.md` are both explicit that this is not allowed. Treat any template behavior difference as a bug, not a simplification.
- Custom domains and scheduled publishing are explicitly out of scope for this milestone per `PUBLISHING.md` — do not pull them in early.

## Completion Checklist

- [x] Immutable versioning and transactional publication lifecycle.
- [x] Stable public routes, managed redirects and private/suspended/unpublished behavior.
- [x] Scoped design/preview/publishing UI and QR downloads.
- [x] Both typed renderer families, all nine templates and supported controls.
- [x] Origin/source-checked, versioned iframe messages.
- [x] API, browser, parity, accessibility and regression verification.
- [x] Operational limitations and handoff documented.
