# M7 local operator handoff

This runbook covers the implemented local M7 workflows. It does not enable
production analytics, live billing, or deployment. Payment-account acceptance
remains deferred to M8 by owner instruction.

## Operator workspace

Use the existing `admin:promote` operator CLI and MFA enrollment procedure in
[MFA verification](MFA_2026-09-12.md). `/admin` requires a current platform-admin
session at AAL2. Platform privileges are never granted by the web interface.
Every directory read requires a 10–500 character operational/support reason;
changes also record their reason and request correlation. Unicode header reasons
are sent with `uri:` encoding. Audit records expose neither raw IPs nor arbitrary
historical metadata to the web viewer.

- Organizations: search, paginate, suspend and restore. Suspension blocks tenant
  access and public menus; content and publication history remain saved.
- Users: search, paginate, disable and restore verified non-admin accounts.
  Both status transitions revoke sessions. Admin accounts use the operator
  recovery process; archived organizations and unverified users cannot be
  restored through these controls.
- Billing: inspect sandbox subscriptions and current expiring overrides; create
  immutable plan versions, retire/reactivate their availability, or grant a
  workspace an override lasting no more than one year. Changes use the existing
  M6 commands and atomic billing audit. Existing subscribers retain their plan
  version. Entitlement overrides do not establish that a payment occurred.
- Templates: inspect and preview the nine actual renderer definitions. Edit
  template access through plan-version limits or an expiring workspace override.
  Renderer definitions remain version-controlled; this interface is not a
  template code editor or a global template deletion control.
- Audit: inspect bounded, filtered history, including support and billing access.
  There are no audit update/delete endpoints.

## Support and in-app notifications

Restaurant owners open `/dashboard/support`. `support.manage` grants
organization-wide ticket access: owners receive it by default; other roles need
an explicit grant. Location-scoped managers do not receive it by default. Active
user, membership and organization checks apply on each request.

Create a ticket with a subject and plain-text description, open the conversation,
reply, close it, or reopen it. Text is bounded and rendered as text, including
HTML-looking input. Message history is append-only through the application;
closed tickets must be reopened before replying. Ticket and message pagination
is bounded (25 by default, 100 maximum through the API).

Operators use the Support tab in `/admin` with a support reason. Reads are
audited. Replies/status changes serialize on the ticket and persist the
associated audit and notification in the same transaction. Audit metadata
contains identifiers and status transitions, not conversation text.

An operator reply/status change creates an in-app notification for the ticket
creator, unless the operator is also the creator. Notification access is scoped
to both current user and organization; another owner cannot read or acknowledge
someone else's notifications. Use **Load tickets** to refresh notifications,
**View conversation** to read, and **Mark as read** to acknowledge. Notifications
are not email, push, or a realtime delivery service. At most 25 unread entries
appear at once; acknowledging entries exposes the remaining entries.

The additive thirteenth migration introduces tickets, messages and inbox
notifications. Apply repository migrations before running this version. Support
content stays in PostgreSQL until an explicitly approved retention/deletion
process is introduced; account/organization deletion is restricted by foreign
keys. Include this data in the M8 privacy and backup review.

## Local analytics

Use `NODE_ENV=development` or `test`, `ANALYTICS_MODE=local`, and an isolated
`ANALYTICS_REDIS_URL`. `docker compose up -d postgres redis` starts the provided
local services. The API hosts a BullMQ worker on `daify-analytics`, waking once
per minute. PostgreSQL facts, receipts and rollups remain authoritative; Redis
jobs can safely retry. Logs include aggregation counts and queue retry events,
without conversation text or analytics visitor identifiers.

For a bounded manual pass, run:

```sh
NODE_ENV=development ANALYTICS_MODE=local npm run analytics:aggregate --workspace @daify/api
```

Provide the intended local `DATABASE_URL` through your environment. A pass
processes at most 2,500 facts; repeat when a larger backlog remains. Raw-event
and rollup retention is bounded per batch. Validate totals at
`/dashboard/analytics`; it queries daily rollups and never starts aggregation.
Signed-in/editor, preview, known bot, prefetch, DNT and GPC traffic is excluded.

New QR downloads encode `/q/:slug`, then redirect to the current menu route.
Previously printed `/r/:slug` codes continue to work. QR route visits are event
counts, not proof of a physical camera scan or unique guest.

Production collection remains disabled. The defaults and unresolved approval
are in [the analytics decision](../DECISIONS/ANALYTICS.md).

## Verification and launch boundaries

See [M7 QA](M7_2026-09-29.md) for commands, results and screenshots. Use an
explicitly disposable `TEST_DATABASE_URL`; integration cleanup is destructive.
The local queue test additionally uses `ANALYTICS_TEST_REDIS_URL` with an isolated
Redis database. Tests do not provide production acceptance for hosting, ingress,
email delivery, object storage, backups, payment accounts, privacy or retention.
