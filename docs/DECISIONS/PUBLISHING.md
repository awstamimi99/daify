# Publishing and Public Menu Decision

Status: Accepted for planning
Decision date: 2026-08-13
Implementation milestone: M5

## Context

The prototype keeps editable menu data and a `publishedSnapshot`. Production needs immutable history, predictable rollback, stable QR codes, and a public route independent of template implementation.

## Decision

```text
Draft → Preview → Publish → Published Version
  ↑                                │
  └──────── edit or rollback ──────┘
```

### Draft

- Mutable sections, items, prices, availability, images, translations, theme, template, and layout.
- Revision-aware writes prevent silent concurrent overwrites.
- Validation reports missing required translations, invalid prices, media failures, and unsupported template options.

### Preview

- Renders the current draft using the same normalized model and renderer contract as publication.
- Does not change the public menu.
- External sharing, if supported, uses authenticated or expiring preview access.

### Publish

- Validates content, permissions, resource status, and entitlements.
- Creates an immutable `MenuVersion` with sequential version number, schema version, normalized snapshot, `publishedAt`, `publishedById`, and source draft revision.
- Atomically sets `Menu.currentPublishedVersionId` and emits audit/cache work through an idempotent outbox/job flow.

### Rollback and unpublish

- Rollback copies an older snapshot into the publication flow and creates a new version; it never mutates or reuses an old version.
- Unpublish clears the public version pointer but preserves versions, draft data, slug, and QR identity.
- Scheduled publishing remains a future capability after immediate publishing, timezone behavior, cancellation, and job idempotency are proven.

## Stable public route and QR

```text
https://daify.net/r/{slug}
```

- The stable route resolves the menu's current published version server-side.
- QR codes point to this route or a stable opaque redirect—not a template HTML file, CDN object, or version number.
- Editing content, changing template, publishing, unpublishing, and rolling back do not require reprinting the QR.
- Slug changes create a managed redirect from the previous slug with collision and ownership checks.
- Private/noindex, suspended, deleted, and unpublished states return intentional responses and cache headers.
- Custom domains are future scope: verified DNS ownership, automated TLS, takeover prevention, canonical URL selection, and DAIFY-route recovery.

## Template contract

Preserve the normalized menu model, stable template/family identifiers, Classic and Feast renderer families, capability validation, `--restaurant-*` tokens, iframe preview concept, typed/versioned `postMessage`, localization, and RTL. See [Template engine](../TEMPLATE_ENGINE.md).

## Related references

- [Data model](DATA_MODEL.md)
- [Localization](LOCALIZATION.md)
- [M5 execution plan](../MILESTONES/M5_PUBLISHING_TEMPLATES.md)

## M5 implementation refinements (2026-09-13)

- `@daify/menu-engine` is a compiled, framework-neutral TypeScript workspace.
  Its versioned snapshot/design contracts and independent Classic/Feast HTML
  renderers refine the M1 React component proof. Both Next SSR and the small
  preview browser bundle use the same escaped markup implementation. The full
  original CSS and photography replace the abbreviated M1 renderer; original
  prototype sources remain untouched. Production CSS corrects small-text
  contrast, focus and absent-media behavior. Fonts are served locally.
- `Menu.currentVersionId` is the implemented live pointer. A composite foreign
  key prevents a menu from pointing at another menu's version; database triggers
  reject updates to version content and retained image references. History is
  appended and menu deletion is an archive operation.
- Every publish/rollback/unpublish locks the organization and menu, rechecks
  active permissions/location scope, checks the expected draft revision, and
  commits the version/pointer, audit, idempotency result and outbox together.
  Idempotency is scoped to a menu, request body/action and actor; reusing a key
  with different input is a conflict. Media integrity is checked before commit.
- `Organization.publishingEnabled` is the explicit temporary M5 entitlement
  gate (default enabled for existing workspaces). It does not assert a paid
  subscription or plan. M6 must replace/extend this gate with authoritative
  billing entitlements. Disabling it blocks publish/rollback; unpublish remains
  available. Organization/location suspension also blocks public reads.
- Public HTML, JSON, images, previews, QR downloads, unavailable responses and
  slug redirects use `no-store`. There is no public cache requiring invalidation
  in this milestone. The durable `publication_events` outbox is drained with
  `FOR UPDATE SKIP LOCKED`; PostgreSQL NOTIFY and `processedAt` commit together.
  Notifications contain the durable event id for subscriber deduplication.
  NOTIFY is a wake-up signal, not durable delivery to offline subscribers;
  future cache consumers must reconcile the event table and define retention.
- Public slugs are permanently reserved in `menu_routes`. Every alias resolves
  directly to the menu's current canonical slug. Web redirects use 307/no-store
  so a browser does not retain a redirect past unpublication or suspension.
  A previously printed QR remains valid after a canonical slug change.
- Private, archived, suspended and unpublished menus return a uniform 404;
  unlisted menus remain readable but return `X-Robots-Tag: noindex, nofollow`.
  Operational failures return 503 instead of being misreported as missing menus.
- The authenticated preview accepts only version-1, origin- and source-checked
  `daify:design` messages with validated settings. It cannot accept replacement
  menu content or arbitrary image URLs. Uploaded image ids are scoped to the
  snapshot. A detached image remains available only through a live version that
  references it; obsolete version image URLs are not public.
- QR SVG/PNG downloads require `qr.manage` and encode the configured web origin
  plus `/r/{slug}`. The request Host header never controls the QR destination.
  Menu public content and configured BCP 47 language fallback are resolved on
  the server, including when JavaScript is disabled.
