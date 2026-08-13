# DAIFY Production Architecture

Status: pre-Milestone 0 reference architecture  
Last reviewed: 2026-08-13

This document defines the intended production boundaries for DAIFY. It does not claim that the current static prototype already provides a backend, database, durable authentication, billing, uploads, queues, or production analytics. Those systems are deliberately deferred until implementation begins.

## 1. Planned platform shape

| Layer | Planned technology | Responsibility |
| --- | --- | --- |
| Web application | Next.js, React, TypeScript | Marketing pages, authenticated dashboard, menu editor, admin console, and public menu routes |
| API | NestJS, TypeScript | Authentication, authorization, tenancy, menu lifecycle, billing orchestration, analytics queries, and audit logging |
| Database | PostgreSQL with Prisma | Transactional source of truth and tenant-scoped application data |
| Object storage | S3-compatible storage, initially Cloudflare R2 | Original images and generated image variants |
| Cache and jobs | Redis with BullMQ | Rate limiting, cache coordination, image processing, analytics aggregation, notifications, and scheduled work |
| Tests | Playwright plus unit and API test suites | Browser journeys, domain behavior, authorization boundaries, and API contracts |
| Delivery | Cloudflare, Vercel, dedicated API/worker hosting, managed PostgreSQL | Edge delivery, web hosting, API and worker runtime, database operations |
| Later client | Flutter | Native mobile operations after web and API contracts stabilize |

The web application must never be trusted to enforce access on its own. Every API mutation and protected read is authorized against organization membership and resource scope in the API.

### Service boundaries

- `web`: browser UI, server-rendered public menus, and authenticated product screens.
- `api`: the only authority for business rules and database writes.
- `worker`: asynchronous image, analytics, notification, and scheduled-publish jobs.
- PostgreSQL: canonical relational data and immutable published-menu metadata.
- R2/CDN: media bytes only; the database stores object keys, metadata, and ownership.
- Redis: disposable coordination and derived cache data, never the sole system of record.

Begin as a modular monolith with one API and one worker deployment. Keep module boundaries explicit, but do not introduce microservices before scale or ownership makes them necessary.

## 2. Tenant hierarchy and scope

The production ownership hierarchy is:

```text
Organization
├── members and subscription
├── shared brand defaults
└── Locations
    ├── location-scoped team access
    ├── Menus
    │   ├── sections and items
    │   ├── theme and template selection
    │   ├── published versions
    │   └── QR codes
    └── analytics
```

- Organization is the billing and top-level security boundary.
- Location represents one restaurant, branch, venue, or concept endpoint.
- Menu belongs to exactly one location. A location can own multiple menus.
- Organization members may receive all-location access or a restricted set of locations.
- Menu-scoped permissions can further constrain publishing or editing where required.
- Cross-organization reads are denied by default, including platform data exports.

## 3. Core data model

The field lists below are design guidance, not a generated Prisma schema. IDs should use sortable opaque identifiers such as UUIDv7 or CUID2. All mutable records should have `createdAt` and `updatedAt`; user-facing destructive operations should normally soft-delete or archive first.

| Entity | Purpose and important fields | Relationships and scope | Deletion and permissions |
| --- | --- | --- | --- |
| `User` | Human identity: `id`, `email`, `emailVerifiedAt`, `name`, `avatarUrl`, `status`, authentication-provider references, `lastLoginAt` | Has many `OrganizationMember` records; global identity, not tenant-owned | Disable before deletion; retain security/audit references. User manages self; platform admins manage account state under audited procedures. |
| `Organization` | Tenant and billing owner: `id`, `name`, `slug`, `status`, `defaultLocale`, `timezone`, shared brand settings | Owns members, locations, subscription, and audit records | Archive cascades product access but does not immediately erase billing/audit history. Owner controls settings; platform admin has break-glass access. |
| `OrganizationMember` | Membership and role assignment: `id`, `organizationId`, `userId`, `role`, `status`, `invitedBy`, `acceptedAt`, optional all-location flag | Joins User to Organization; may have explicit location grants | Revoking membership removes access immediately without deleting authored records. Owner/authorized manager manages members within role limits. |
| `Location` | Restaurant/branch: `id`, `organizationId`, `name`, `slug`, `status`, address, contact details, timezone, currency, default language, supported languages, brand overrides | Belongs to Organization; owns menus and location analytics | Archive before purge. Access requires organization membership plus location scope unless organization-wide. |
| `Menu` | Editable menu identity: `id`, `locationId`, `name`, `slug`, `status`, `defaultLanguage`, `supportedLanguages`, `currentDraftRevision`, `currentPublishedVersionId` | Belongs to Location; owns sections, theme, versions, and QR codes | Archive menu and stop public serving; published versions/audit history retained per policy. Editing and publishing are distinct permissions. |
| `MenuSection` | Ordered group: `id`, `menuId`, stable key, localized title/description, `position`, `isVisible`, optional schedule | Belongs to Menu; owns ordered items | Soft-delete in draft so history remains reproducible. Menu editors can mutate; viewers cannot. |
| `MenuItem` | Product entry: `id`, `sectionId`, stable key, localized name/description, price, currency, dietary/allergen metadata, `availability`, `position`, `isFeatured` | Belongs to MenuSection and indirectly Menu/Location/Organization | Soft-delete or archive; published snapshots remain immutable. Staff may change availability only; editors may change content. |
| `MenuItemImage` | Media association: `id`, `menuItemId`, object keys, alt text translations, dimensions, mime type, byte size, blur placeholder, processing status, `position` | Belongs to MenuItem; bytes live in object storage | Removing association schedules orphan cleanup after a recovery window. Upload requires menu edit permission. |
| `Theme` | Template-independent design choices: `id`, `menuId`, `templateSlug`, token values, layout options, schema version | One active draft theme per Menu; serialized into each published version | Theme changes follow menu draft permissions. Template registry validates allowed tokens and options. |
| `MenuVersion` | Immutable publication artifact: `id`, `menuId`, monotonically increasing `versionNumber`, normalized snapshot, schema version, `publishedAt`, `publishedById`, source draft revision, optional rollback source | Belongs to Menu and publishing User; public route resolves current version | Never edited or hard-deleted during normal operation. Publish permission required; rollback creates another version. |
| `Plan` | Sellable product definition: `id`, `code`, `name`, billing interval options, price references, status, feature summary | Referenced by subscriptions and entitlements | Platform-admin managed and versioned; do not rewrite historical commercial meaning. |
| `Subscription` | Organization billing state: `id`, `organizationId`, `planId`, provider/customer/subscription refs, status, period dates, cancel state, trial dates | One active commercial subscription per Organization, with history | Provider webhooks drive state through idempotent handlers. Owners manage billing; sensitive mutations are audited. |
| `Entitlement` | Machine-readable limit or capability: `id`, `organizationId`, optional `subscriptionId`, key, value/limit, source, effective dates | Evaluated for Organization and sometimes Location/Menu usage | Derived from plan plus explicit overrides. Only billing/system or platform admins change it; API enforces it. |
| `QrCode` | Stable scan identity: `id`, `menuId`, public token or slug, target kind, style metadata, status, scan attribution code | Belongs to Menu; points to the stable public route, not a version or template file | Revocable and regenerable. Publishing managers create/download; public scanner needs no account. |
| `AnalyticsEvent` | Append-only event: `id`, `organizationId`, `locationId`, optional `menuId`/`menuVersionId`/`qrCodeId`, type, timestamp, privacy-safe session fields, country/device/referrer dimensions | Tenant-scoped and partitionable; aggregated asynchronously | No ordinary UI mutation. Apply retention and privacy policy; restrict raw event access more than aggregate access. |
| `AuditLog` | Security and operational trail: `id`, organization/location/resource scope, actor type/id, action, target, before/after summary, request id, IP/user-agent metadata, timestamp | References actors and resources without depending on their continued existence | Append-only and tamper-resistant; no tenant deletion through normal UI. Read limited to owners/platform admins and authorized compliance workflows. |

### Ownership invariants

- A child resource's organization is derived through its parent chain and cannot be supplied independently by the client.
- API queries include tenant scope in the database predicate; fetching globally and filtering afterward is forbidden.
- Moving a menu between organizations is not a normal update. It requires a dedicated, audited transfer workflow or an export/import.
- Every background job carries organization and resource identifiers and rechecks current authorization/state before a destructive outcome.

## 4. Roles and permission matrix

Roles are presets over granular permissions. Location assignments narrow a role; they never broaden it.

| Capability | Platform Admin | Organization Owner | Manager | Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Platform operations | Full, audited | None | None | None | None |
| Organization settings | Support/break-glass | Full | Read; limited brand fields if granted | None | Read basic profile |
| Location access | All when explicitly acting | All | Assigned or all granted locations | Assigned locations | Assigned locations |
| Create/archive locations | Support only | Yes | If granted | No | No |
| Create/edit menus | Support only | Yes | Assigned locations | Content only if granted | Read only |
| Change item availability | Support only | Yes | Yes | Yes for assigned menus | No |
| Select template/edit theme | Support only | Yes | Yes if granted | No by default | No |
| Preview drafts | Support only | Yes | Yes | Yes for assigned menus | Optional read-only grant |
| Publish/unpublish/rollback | Support only | Yes | If `menu.publish` granted | No | No |
| View analytics | Support only | All | Assigned locations | Optional summary | Optional summary/read only |
| Manage team and scopes | Support only | Yes | Invite staff/viewers if granted | No | No |
| Billing and subscription | Support only | Full | View only if granted | No | No |
| QR create/style/download | Support only | Yes | Yes if granted | Download only if granted | View/download if granted |
| Audit log | Full under policy | Organization log | Limited operational entries | Own actions only if exposed | No |

Rules that must be enforced server-side:

- The last active Organization Owner cannot remove or demote themself without transferring ownership.
- Managers cannot grant a role or location scope broader than their own.
- Staff availability access does not imply content editing or publishing.
- Platform Admin access is separate from tenant membership, requires stronger authentication, and creates an audit event with reason and request correlation.

## 5. Menu lifecycle and versioning

The canonical lifecycle is:

```text
Draft → Preview → Publish → Published Version
  ↑                                │
  └──────── edit or rollback ──────┘
```

### Draft

- A mutable working tree containing sections, items, images, availability, theme, layout, and localization.
- Autosave writes revision-aware mutations so two editors do not silently overwrite one another.
- Draft validation reports missing required translations, invalid pricing, unsupported template fields, and broken media before publish.

### Preview

- Renders the current draft through the same template renderer used for a published snapshot.
- Uses an authenticated, expiring preview URL when shared outside the editor.
- Never replaces the current public version.

### Publish

- Runs validation and entitlement checks inside a transaction.
- Creates an immutable normalized snapshot in `MenuVersion` with a sequential version number, schema version, `publishedAt`, and `publishedById`.
- Atomically points `Menu.currentPublishedVersionId` to the new version, then invalidates the public cache.
- Emits an audit entry and asynchronous work for cache warming, search/image checks, and notifications.

### Published version and rollback

- Public requests read the currently selected immutable version; draft edits remain invisible until the next publish.
- Unpublish clears the public pointer without deleting versions or invalidating the stable QR identity.
- Rollback selects an older snapshot as input, validates it against current rules, and publishes it as a new version. It never edits or reuses the old version number.
- The audit record links a rollback version to its source version and actor.
- Scheduled publishing is deferred until the immediate publish path, timezone rules, job idempotency, and cancellation behavior are proven.

## 6. Localization model

Use translation rows rather than adding language columns such as `nameEn`, `nameAr`, and `nameFr`.

| Approach | Strength | Weakness | Decision |
| --- | --- | --- | --- |
| Language-specific columns | Simple for exactly two fixed languages | Schema migrations per language; sparse columns; difficult reusable validation | Rejected |
| Translation table/records | Supports arbitrary BCP 47 language tags, common APIs, fallback, completeness checks | Requires joins or aggregation | Selected |

A localized record should contain `entityType`, `entityId`, `field`, `languageTag`, `value`, and timestamps, with a unique constraint across entity, field, and language. In Prisma this can become explicit translation models per aggregate if stronger relations and query ergonomics justify them.

- Store canonical BCP 47 tags such as `en`, `ar`, and `fr-CA`.
- Location defines a default language; Menu may override it and lists supported languages.
- Public rendering falls back to the menu default language, never to an unrelated arbitrary language.
- Publish validation defines which fields must be complete for every supported language.
- Direction derives from locale metadata. Arabic and other RTL locales must set document `dir="rtl"`; individual mixed-direction fields may use `dir="auto"`.
- Prices and currency are structured data and formatted by locale; they are not embedded in translated text.

## 7. Public routes, QR stability, and custom domains

The default public contract is:

```text
https://daify.net/r/{slug}
```

- The route resolves an active menu and its current published version on the server.
- QR codes always target this stable route (or a stable opaque QR redirect), never `/templates/*.html`, a version number, CDN object, or theme-specific URL.
- Changing templates, republishing, or rolling back does not require replacing printed QR codes.
- Slug changes create a managed redirect from the old slug; ownership and collision checks are transactional.
- Private, suspended, deleted, or unpublished menus return an intentional branded state and appropriate HTTP status/cache behavior.

Custom domains are a later production capability. Store a normalized host, verification token, verification status, certificate status, and primary-domain flag. Require DNS verification before activation, provision TLS automatically, block domain takeover, and preserve the DAIFY route as a recovery path. Canonical URLs and sitemap inclusion must follow the selected primary domain.

## 8. Image upload and optimization pipeline

```text
Browser → signed upload → R2 originals → validation job → optimized variants → CDN
                           │                                  │
                           └──────── PostgreSQL metadata ─────┘
```

1. The API checks organization entitlement and menu edit permission, then issues a short-lived, size-limited signed upload.
2. The browser uploads directly to an organization-prefixed object key; clients never choose unrestricted bucket paths.
3. A worker verifies file signatures, dimensions, decode safety, size limits, and allowed MIME types. It strips metadata and rejects malformed or oversized files.
4. The worker corrects orientation and creates responsive AVIF/WebP variants, a safe fallback, thumbnails, and a blur placeholder. Originals are private unless a specific recovery policy requires delivery.
5. PostgreSQL stores ownership, object keys, dimensions, byte sizes, processing state, alt text, and content hash—not image bytes.
6. Public URLs use immutable content-addressed keys and long CDN caching. Replacements create new keys.
7. Failed uploads and unreferenced variants are cleaned by idempotent scheduled jobs after a recovery window.

The current prototype ships several unusually large PNGs (roughly 1–2 MB each), including `guest-scan-evening.png`, `qr-table.png`, `restaurant-interior.png`, `qr-table-cinematic.png`, `oliva-seabass.png`, and template cover images. Before production migration, generate appropriately sized WebP/AVIF derivatives, preserve accessible alt text, lazy-load below-the-fold media, and measure LCP rather than indiscriminately recompressing originals.

## 9. Template-engine preservation

The prototype's template work is product IP and should migrate as a stable rendering contract, not be rewritten as unrelated one-off pages.

Preserve:

- the shared normalized menu-data model;
- the template registry and stable slugs;
- both renderer families: the shared Classic renderer and Feast's specialized renderer;
- each template's layout capabilities and option constraints;
- the `--restaurant-*` design-token namespace;
- bilingual and RTL behavior;
- iframe preview messaging semantics, upgraded to typed and origin-checked messages.

During migration, wrap existing renderers behind typed React interfaces and visual-regression fixtures. Do not silently merge template identities, rename stable public slugs, or discard their valid configuration options. Add a schema version to template configuration and published snapshots so migrations are explicit.

## 10. Billing and entitlements

- Treat the billing provider as the payment-event source and DAIFY's database as the access-decision source after verified webhook processing.
- Store provider IDs and event IDs; webhook handlers verify signatures and are idempotent.
- Plans describe products; Entitlements answer runtime questions such as location count, menu count, member count, custom domains, analytics retention, and advanced templates.
- Check entitlements in API commands, not only by hiding controls in the web UI.
- Subscription cancellation, failed payment, grace period, downgrade, and restoration require explicit state transitions. Do not immediately destroy customer data.
- All plan overrides and billing-affecting admin actions create AuditLog entries.
- Final provider, prices, taxes, invoicing regions, refund rules, grace periods, and downgrade behavior remain product/legal decisions before implementation.

## 11. Analytics

- Capture a small, documented event vocabulary: menu view, QR scan/redirect, language change, section view, item interaction, and conversion proxy only where lawful.
- Include menu-version and QR attribution so changes can be compared without rewriting historical data.
- Avoid raw personal data where aggregate product metrics suffice. Hash or rotate privacy-safe session identifiers and define retention before launch.
- Ingestion is append-only and fast; BullMQ aggregates into query-friendly hourly/daily tables.
- Dashboards query aggregates, with tenant/location/menu scope enforced in SQL and API policy.
- Filter bots and known preview/editor traffic; distinguish estimated metrics from exact billing facts.
- Consent requirements, IP geolocation, cookie use, export, erasure, and retention need legal review for launch regions.

## 12. Security and audit

- Use a proven authentication provider or carefully reviewed session implementation with secure, HTTP-only, same-site cookies and CSRF protection.
- Require email verification; require MFA and step-up authentication for Platform Admin and sensitive billing/security actions.
- Hash passwords only through a modern adaptive password algorithm if DAIFY stores them; never place secrets or auth state in localStorage.
- Validate every input at the API boundary and again at domain invariants; parameterize database access through Prisma.
- Apply rate limits to authentication, public analytics ingestion, preview links, QR redirects, uploads, and invitations.
- Restrict upload content, enforce object ownership, use signed URLs, and set a strict CSP and security headers.
- Log sign-in events, membership/role/scope changes, publishing, rollback, unpublish, subscription changes, exports, support access, suspensions, and destructive operations.
- Audit entries include actor, action, target, tenant scope, request correlation, outcome, and a minimized before/after summary; secrets and full sensitive payloads are excluded.
- Encrypt in transit and at rest, rotate secrets, separate environments, back up PostgreSQL, test restoration, and document incident response.

## 13. Caching and queues

- Cache published menu responses by host, slug, locale, and current version. Versioned media and snapshots can use long immutable caching; the stable route uses short or surrogate-controlled caching.
- Publishing commits the database state first, then emits an outbox event. Workers invalidate/warm cache idempotently so job retries cannot corrupt state.
- Redis may hold rate-limit buckets, short-lived sessions if chosen, and cache coordination; PostgreSQL remains authoritative.
- BullMQ queues should separate image processing, analytics aggregation, notifications, scheduled publishing, and cleanup with retry/backoff and dead-letter visibility.
- Every job has a deterministic idempotency key, bounded attempts, structured logs, metrics, and an operator-safe replay procedure.
- Avoid caching authorization decisions longer than membership or suspension changes can safely tolerate.

## 14. Legacy prototype migration inventory

The following are intentional compatibility identifiers in the current prototype, not product-facing branding:

- `window.MenuFlowStore`, `window.MenuFlowPermissions`, `window.MenuFlowShell`, template globals, and related browser events.
- Local-storage keys such as `menuflow_platform_v1`, `menuflow_admin_v1`, and `menuflow_plans_v1`.
- CSS custom-property aliases beginning with `--mf-`.
- Unused legacy icon filenames under `assets/icons/menuflow-*`.

Migration treatment:

- Keep them during prototype stabilization so saved sessions, tests, and cross-page scripts continue to work.
- Put new production code behind typed DAIFY modules and adapters; do not add new MenuFlow-named APIs.
- If browser state must be migrated, read old keys once, validate and transform them, then write a versioned DAIFY key. Track completion before eventually removing the fallback.
- Rename or remove unused icon files only when the asset pipeline and references are migrated; filenames alone are not a production schema.
- Remove compatibility aliases only after repository search, telemetry where applicable, regression tests, and a documented deprecation release confirm there are no consumers.

No public copy, metadata, canonical URL, sitemap entry, or customer-facing link should use the former brand.

## 15. Decisions locked for Milestone 1

- DAIFY is a multi-tenant platform with Organization → Location → Menu ownership.
- The API, not the client, enforces roles, scopes, and entitlements.
- Public menus use stable `/r/{slug}` routes and immutable published versions.
- Rollback creates a new published version; published history is never mutated.
- Translation records support arbitrary languages and RTL behavior.
- Template slugs, renderer families, capabilities, and `--restaurant-*` tokens are preserved.
- Media uses direct signed upload, asynchronous processing, object storage, and CDN delivery.
- PostgreSQL is authoritative; Redis and queues hold rebuildable or transient state.
- Start as a modular monolith with explicit web, API, and worker boundaries.

## 16. Deferred decisions and blockers before implementation

- Authentication provider, account-linking rules, session duration, and MFA recovery.
- Billing provider, final plans/prices, tax regions, trials, grace periods, and refund/downgrade policy.
- Production host for the NestJS API/workers and managed PostgreSQL provider/region.
- Data residency, backup retention, analytics/event retention, consent, deletion, and export requirements.
- Custom-domain launch scope and DNS/certificate provider.
- Exact conflict strategy for simultaneous editors and whether collaborative presence is required.
- Scheduled publishing requirements and timezone edge cases.
- Image limits, moderation policy, original-file retention, and CDN transformation vendor.
- Analytics definitions, bot filtering, legal basis, and success metrics.
- Support/break-glass approval workflow and audit-log retention/access.
- Mobile scope and offline needs; Flutter begins only after stable API contracts.

These choices should be converted into short architecture decision records before their respective implementation slices. None requires rebuilding the static prototype during this cleanup phase.
