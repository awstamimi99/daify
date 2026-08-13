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

