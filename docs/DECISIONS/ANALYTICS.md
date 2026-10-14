# Analytics — M7 local implementation

Status: local development defaults; production privacy approval remains open.
Kickoff: 2026-09-29.

The initial implementation counts events, not people: menu views, QR redirects,
language changes, section views and item interactions. No cookies, visitor IDs,
stored IPs, full user agents, referrers or unique-visitor claims are introduced
by analytics. Existing security/rate-limit processing remains separate.

Proposed defaults are 30 days of raw events and 12 months of daily totals.
These are local development defaults pending the owner's response and production
privacy review. `ANALYTICS_MODE=local` is rejected in production; production
collection cannot be enabled by this milestone's configuration.

Attribution is resolved from the published menu on the server: organization,
location, menu, published version, requested route, language and optional
section/item. Clients cannot choose tenant ownership or event time. Stale
versions, invalid targets, known bots/prefetch, opt-out signals and signed-in
editor traffic are excluded. Anonymous counters remain susceptible to automated
traffic that disguises itself as a guest; do not present them as verified people.

PostgreSQL holds immutable event facts and separate aggregation receipts.
BullMQ/Redis wakes a bounded aggregation worker. Rollups and receipts commit
atomically so retries or Redis loss cannot double count; PostgreSQL remains
authoritative. Retention removes expired raw events and their receipts, and
daily totals older than twelve calendar months. Reports read daily totals only.

Existing printed QR codes use `/r/:slug` and remain valid. Their traffic cannot
be distinguished from direct links. Newly downloaded codes use `/q/:slug`, which
counts a QR redirect then redirects to the published menu. This metric measures
visits through a QR route, not proof of a physical camera scan. Alias redirects
continue to resolve after a menu's public slug changes.

Production legal basis/consent notices, policy wording and operational retention
review remain M8 launch gates. This document makes no legal compliance claim.
