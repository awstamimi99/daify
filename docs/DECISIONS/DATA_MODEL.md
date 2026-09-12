# Data Model Decision

Status: Accepted for planning
Decision date: 2026-08-13
Implementation milestone: M2–M4

## Context

DAIFY must support one account participating in multiple organizations, organizations owning multiple restaurant locations, and each location owning independent menus. The production database has not been implemented; this document fixes the conceptual ownership model before Prisma design begins.

## Decision

```text
User ──< OrganizationMember >── Organization
                                  ├── Subscription ── Plan
                                  ├── Entitlements
                                  ├── Locations
                                  │   └── Menus
                                  │       ├── Sections ── Items ── Images
                                  │       ├── Theme
                                  │       ├── Versions
                                  │       └── QR Codes
                                  ├── Analytics Events
                                  └── Audit Logs
```

Organization is the tenant and billing boundary. Location is the operational restaurant/branch boundary. Menu is the content, design, publication, and QR boundary.

## Entities and ownership

| Entity | Purpose and important fields | Ownership and relationships | Deletion and access expectation |
| --- | --- | --- | --- |
| `User` | Global identity: id, email, verification, profile, status, provider references, last login | Has many memberships; not owned by a tenant | Disable before erasure; retain necessary audit references. Self-service plus audited Platform Admin operations. |
| `Organization` | Tenant: name, slug, status, locale, timezone, shared brand settings | Owns memberships, locations, subscription, entitlements, and audit scope | Archive first; do not immediately erase billing or audit history. Owner controlled. |
| `OrganizationMember` | Connects a User to an Organization with role, status, invitation data, and scope | Belongs to one User and one Organization; may have all-location or explicit location grants | Revocation removes access immediately without deleting authored records. |
| `Location` | Restaurant, branch, or venue: name, slug, status, address, contact, timezone, currency, language defaults | Belongs to Organization; owns menus and location analytics | Archive before purge. Access requires matching organization membership and location scope. |
| `Menu` | Editable menu identity: name, slug, status, languages, draft revision, current published version | Belongs to Location; owns sections, theme, versions, and QR codes | Archive stops serving; immutable versions remain according to retention policy. |
| `MenuSection` | Ordered menu group with stable key, visibility, schedule, and translated fields | Belongs to Menu; owns items | Soft-delete from draft so historical versions remain reproducible. |
| `MenuItem` | Dish/product with stable key, price, currency, availability, order, allergens/dietary data, translated fields | Belongs to MenuSection and therefore Menu/Location/Organization | Archive or soft-delete; Staff may receive availability-only access. |
| `MenuItemImage` | Item media metadata: object keys, dimensions, MIME, bytes, hash, alt translations, processing state, order | Belongs to MenuItem; bytes live in object storage | Detach first; delayed orphan cleanup provides a recovery window. |
| `Theme` | Selected template, validated design tokens, layout options, schema version | One editable theme per Menu; copied into published snapshot | Controlled by menu design permission and template capability schema. |
| `MenuVersion` | Immutable published snapshot: version number, schema version, payload, timestamp, publisher, source draft, rollback source | Belongs to Menu and references publishing User | Never mutated during normal operation. Rollback creates a new version. |
| `Plan` | Commercial product definition: code, name, prices/provider references, status, feature description | Referenced by subscriptions and entitlement generation | Platform Admin only; preserve historical commercial meaning. |
| `Subscription` | Organization billing state: provider IDs, plan, status, period, trial, cancellation | Belongs to Organization and references Plan | Webhook-driven, idempotent transitions; retained as billing history. |
| `Entitlement` | Runtime capability/limit: key, value, source, effective dates | Belongs to Organization; may derive from Subscription or override it | API enforced; system/billing process or audited Platform Admin updates only. |
| `QrCode` | Stable scan identity and presentation metadata | Belongs to Menu and targets its stable public route, never a version/template file | Revocable/regenerable without changing menu version history. |
| `AnalyticsEvent` | Append-only usage event with organization, location, menu/version/QR attribution and privacy-safe dimensions | Tenant scoped; aggregated asynchronously | No ordinary mutation; governed by privacy and retention rules. |
| `AuditLog` | Append-only actor/action/target/result record with scope and request correlation | Organization scoped where applicable; may record platform operations | Tamper-resistant and not deletable from tenant UI. Restricted read access. |

## Invariants

- A child resource's organization is derived from its parent chain, never trusted from client input.
- Every protected query includes tenant and resource scope in its database predicate.
- Moving a menu across organizations requires a dedicated audited transfer or export/import flow.
- Published menu versions remain readable independently of later draft edits.
- PostgreSQL is the source of truth; caches, queues, and search projections are rebuildable.
- Final IDs, indexes, constraints, translation table shape, and deletion retention become explicit during Prisma design; no Prisma schema is approved by this document.

## Consequences

### M4 implementation — 2026-09-12

Use explicit translation tables for menu, section, item and image alt text.
Keep existing stable keys and soft-delete draft content. Every draft mutation
requires the last observed revision and increments it under a menu row lock;
membership mutations and edits acquire the organization lock first. Staff use
a dedicated availability endpoint. Prices are decimal strings, validated to the
location currency's fractional precision, with currency derived server-side.
Location currency changes are rejected once active menus exist.

Draft completeness version 1 reports missing required names and optional
descriptions/alt text per enabled language. Incomplete secondary translations
can be saved; M5 will consume this report to enforce publication requirements.
The default-language name is required for each created/updated content entity.
No public menu or publication mutation is introduced in M4.

This model supports multi-location organizations and scoped membership without duplicating users. It adds joins and explicit authorization rules, but prevents the prototype's restaurant-as-tenant shortcuts from becoming production constraints.

## Related references

- [Production architecture](../PRODUCTION_ARCHITECTURE.md)
- [Auth and RBAC](AUTH_RBAC.md)
- [Localization](LOCALIZATION.md)
- [Publishing](PUBLISHING.md)
