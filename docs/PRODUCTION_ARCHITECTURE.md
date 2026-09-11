# DAIFY Production Architecture

Status: Architecture direction accepted; M1 web and M2 API/database foundations implemented
Last reviewed: 2026-08-13

This is the main answer to: **How is DAIFY designed technically?**

It summarizes the target production system and links to the decision documents that own detailed rules. The repository now includes the preserved static prototype, a Next.js production frontend foundation, and a NestJS/PostgreSQL/Prisma backend foundation. It does not yet include durable authentication, live billing, production storage, queues, or production analytics.

## Sources of truth

- Progress and milestone state: [ROADMAP.md](ROADMAP.md)
- Latest completed execution plan: [M2 Core Backend](MILESTONES/M2_CORE_BACKEND.md)
- Data ownership: [Data model decision](DECISIONS/DATA_MODEL.md)
- Authentication and permissions: [Auth/RBAC decision](DECISIONS/AUTH_RBAC.md)
- Draft, publication, public routes, and QR: [Publishing decision](DECISIONS/PUBLISHING.md)
- Languages and RTL: [Localization decision](DECISIONS/LOCALIZATION.md)
- Runtime and deployment direction: [Infrastructure decision](DECISIONS/INFRASTRUCTURE.md)
- Existing prototype renderer contract: [Template engine](TEMPLATE_ENGINE.md)

Architecture changes must update the relevant decision document before implementation. This file should then be updated if the high-level system shape changes.

## Planned stack

| Layer | Planned technology | Responsibility |
| --- | --- | --- |
| Frontend | Next.js, React, TypeScript | Marketing, authenticated dashboard/admin UI, public menu routes |
| Backend | NestJS, TypeScript | Business rules, API, authorization, publishing, billing orchestration, analytics queries |
| Database | PostgreSQL, Prisma | Transactional tenant data and immutable publication metadata |
| Object storage | Cloudflare R2 or equivalent S3-compatible storage | Originals and processed menu/brand media |
| Cache and queues | Redis, BullMQ | Cache coordination, rate limits, media jobs, analytics aggregation, notifications |
| Testing | Playwright, unit tests, API/integration tests | Browser journeys, domain behavior, permissions, and contracts |
| Deployment | Cloudflare, Vercel, backend hosting, managed PostgreSQL | DNS/CDN, web delivery, API/workers, persistence |
| Observability | Sentry plus structured logs and metrics | Errors, performance, job and operational visibility |
| Later | Flutter | Owner/Manager mobile client after the API stabilizes |

The exact backend, PostgreSQL, and Redis hosting providers remain deferred. See [Infrastructure](DECISIONS/INFRASTRUCTURE.md).

## System boundaries

```text
Browser / Flutter later
        │
        ├── Next.js web
        │     ├── marketing and authenticated UI
        │     └── server-rendered public menus
        │
        └── NestJS API ── PostgreSQL
                 │       ├── tenant/product data
                 │       └── immutable menu versions
                 ├── Redis / BullMQ ── worker jobs
                 └── R2 / CDN ─────── media
```

- `web` owns presentation and server rendering, not business authorization.
- `api` is the security and business-rule boundary and the only normal database writer.
- `worker` executes idempotent asynchronous work.
- PostgreSQL is authoritative; Redis and caches are rebuildable.
- Object storage holds bytes; the database holds ownership and metadata.
- Begin with a modular monolith and one worker, not premature microservices.

## Product ownership model

```text
Organization
├── Members
├── Subscription and entitlements
├── Shared Brand Settings
└── Locations
    ├── Menus
    ├── Team Permissions
    └── Analytics
```

```text
Menu
├── Sections
│   └── Items and Images
├── Theme and Template
├── Languages
├── Draft
├── Published Versions
└── QR Codes
```

Organization is the tenant and billing boundary. Location is an operational restaurant/branch. Menu is the content, design, publishing, and QR boundary. Full entity ownership is defined in [DATA_MODEL.md](DECISIONS/DATA_MODEL.md).

## Authentication, authorization, and admin

Production roles are Platform Admin, Organization Owner, Manager, Staff, and Viewer. Permissions are narrowed by membership and location/menu scope.

Frontend guards exist for understandable UX. Every protected API read and mutation must independently enforce current membership, role, resource scope, resource status, and entitlements. Platform Admin access is separate, strongly authenticated, reasoned, and audited. The complete matrix is in [AUTH_RBAC.md](DECISIONS/AUTH_RBAC.md).

The platform-admin application covers organizations/restaurants, users, subscriptions, plans, templates, analytics, support, notifications, security, and audit logs. Production operations must call the same authorized application services as other clients; the admin UI is not a database bypass.

## Menu platform and templates

The API exposes a normalized menu model independent of visual template markup. The production migration preserves:

- stable template and family identifiers;
- Classic and Feast renderer families;
- the template registry and capability validation;
- content/design separation;
- `--restaurant-*` theme variables;
- Design Studio and Dashboard Design behavior;
- iframe preview, upgraded to typed/versioned and origin-checked messages;
- English/Arabic, future languages, and RTL;
- search, section, availability, and item-detail interactions.

The current implementation is described in [TEMPLATE_ENGINE.md](TEMPLATE_ENGINE.md). M1 defines the migration strategy; M5 completes production publication integration.

## Localization

Translations use dedicated records/tables rather than language-specific columns. Menus declare their supported and default language, publishing reports completeness, and direction derives from locale metadata. Structured values such as price and availability are not translated strings. See [LOCALIZATION.md](DECISIONS/LOCALIZATION.md).

## Draft, preview, and publishing

```text
Draft → Preview → Publish → Immutable Published Version
  ↑                                  │
  └────────── edit or rollback ──────┘
```

The draft is editable. Publishing validates and creates a numbered immutable snapshot with timestamp and publisher. Rollback publishes an old snapshot as a new version. Unpublish removes the public pointer without deleting versions or invalidating the QR identity. See [PUBLISHING.md](DECISIONS/PUBLISHING.md).

## Public menus and QR

The default route is `https://daify.net/r/{slug}`. It resolves the current published version. A QR points to this stable identity, so content, template, publish, and rollback changes do not require reprinting it. Managed slug redirects, private/noindex menus, and verified custom domains are future production capabilities documented in [PUBLISHING.md](DECISIONS/PUBLISHING.md).

## Billing and entitlements

- Organization owns the subscription.
- Plan describes the commercial offer; entitlements provide machine-readable features and limits.
- Verified, idempotent provider webhooks update subscription state.
- The API enforces entitlements; hiding UI controls is insufficient.
- Cancellation, grace period, downgrade, failed payment, and restoration are explicit state transitions that do not immediately destroy data.
- Provider, final pricing/tax policy, grace period, and downgrade rules are deferred until M6 planning.

## Analytics and audit logs

Analytics events are append-only and carry organization/location/menu/version/QR attribution. Workers aggregate them into query-friendly time buckets. Raw event access is more restricted than aggregate access, and privacy, consent, bot filtering, and retention must be decided before production collection.

Audit logs record identity/security changes, membership and scope changes, publishing/rollback/unpublish, billing changes, support access, suspension, exports, and destructive actions. They are append-only, minimized, request-correlated, and unavailable for ordinary tenant deletion.

## Media and storage

```text
Browser → signed upload → object storage → validation/processing
                                      → optimized responsive variants → CDN
```

The API authorizes and signs uploads. Workers validate MIME signature, dimensions, and size; strip metadata; and create WebP/AVIF, thumbnail, and responsive variants. The database stores metadata and object keys only. Failed and orphaned files are cleaned through idempotent delayed jobs.

Several prototype PNGs are around 1–2 MB, including `guest-scan-evening.png`, `qr-table.png`, `restaurant-interior.png`, `qr-table-cinematic.png`, `oliva-seabass.png`, and template covers. Replace these with measured production derivatives during the relevant migration, not as a broad prototype rewrite.

## Security baseline

- Secure verified identity, HTTP-only sessions where applicable, CSRF protection, MFA/step-up for sensitive operations.
- API and domain validation, tenant-scoped database predicates, rate limits, strict media validation, CSP/security headers.
- Environment isolation, secret rotation, encryption, backups, tested restore, incident response, and monitored jobs.
- No production credentials, durable auth tokens, or authorization source of truth in localStorage.

## Legacy prototype contract

The existing `window.MenuFlow*` globals, `menuflow_*` local-storage keys, `menuflow-*` messages, `--mf-*` aliases, and unused legacy icon filenames are intentional internal compatibility identifiers. They are not customer-facing branding.

M1 should map their useful concepts into typed DAIFY modules and adapters rather than rename the old prototype in place. New production code must not introduce new MenuFlow-named APIs. Removal requires migration tests and confirmation that no prototype consumer or saved state still depends on them.

## Locked and deferred decisions

Locked:

- Organization → Location → Menu multi-tenancy.
- Backend authorization and API-enforced entitlements.
- Stable public route/QR and immutable published versions.
- Translation records and RTL support.
- Existing template concepts and stable family identities.
- PostgreSQL authority with rebuildable cache/job state.
- Modular monolith first.

Deferred until their milestone:

- Authentication, billing, backend hosting, PostgreSQL, and Redis providers.
- Commercial policy, tax, data residency, retention, consent, and backup targets.
- Custom-domain launch scope and certificate workflow.
- Collaborative editing conflict strategy and scheduled publishing details.
- Image limits/moderation and analytics definitions/legal basis.
- Flutter offline and device-specific scope.

These deferred choices do not block M1 foundation work. They must be documented before implementation in the milestone that depends on them.
