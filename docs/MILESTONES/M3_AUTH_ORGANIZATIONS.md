# Milestone 3 — Auth / Organizations / RBAC

## Status

**IN PROGRESS.** Explicitly started by the owner on 2026-08-13 after M2 completion and audit remediation.

## Goal

Replace the prototype's simulated sessions and UI-only permission checks with real user accounts, real sessions, real organizations and membership, and API-enforced role-based authorization.

## Why this milestone exists

The prototype's `assets/js/dashboard/permissions.js` says this outright in its own header comment: it is UI-layer authorization only, and the real backend must re-check every one of those permissions server-side. M3 is that re-check becoming real. It's also where "one restaurant equals one account" (the prototype's shortcut) becomes "one user can belong to multiple organizations," per [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md).

## What I need to learn

Session/token-based authentication, password handling (or provider-based auth), email verification flows, and — the core of this milestone — how to implement a permission matrix as real server-side checks rather than conditional rendering. The prototype's five-role model (Platform Admin, Owner, Manager, Staff, Viewer) already exists conceptually in [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md); this milestone is learning to enforce it, not redesign it.

## What we will build

- User accounts: signup, login, logout, password reset, email verification.
- Sessions or tokens, chosen and implemented per the requirements in `AUTH_RBAC.md`.
- Organizations and `OrganizationMember` records, with invite/accept flow.
- Server-side authorization for every protected API route, evaluated against membership, role, resource scope, and status — not just role name.
- Platform Admin authentication, kept separate from tenant membership as `AUTH_RBAC.md` requires, including the stronger authentication and audit trail it specifies.

## Technical scope

- Builds on the NestJS API and PostgreSQL schema from M2.
- Implements the full permission matrix from [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md), including the four enforcement rules called out there (last-owner protection, managers can't grant scope broader than their own, availability access doesn't imply editing, suspension revokes access promptly).
- MFA/step-up authentication for Platform Admin and sensitive actions, per the same document.
- Authentication provider, session duration, and MFA recovery mechanics are now recorded in `AUTH_RBAC.md`; production recovery operations still require validation.

## Tasks and execution status — 2026-09-12

- Implemented identity with Argon2id, revocable opaque sessions, verification,
  verification resend, password reset and TOTP enforcement for existing platform admins.
- Implemented SMTP delivery with local SMTP integration tests, failure reporting,
  timeouts and production TLS requirements. External provider delivery is not yet validated.
- Fixed Origin validation at the Next proxy, one-time token consumption races,
  last-owner invitation bypass/concurrent demotion, malformed cookies, duplicate
  location conflicts, and organization/location input validation.
- Organization and membership mutations serialize on a PostgreSQL organization
  row lock; token claims and password/session changes are transactional.
- Implemented actual workspace identity, first organization/location setup,
  scoped navigation, team invitation acceptance, member role/status management,
  and member listing limited to the actor's grant authority.
- Fixed desktop logout, logout failure reporting, return-to paths, verification
  effects, field labels and mobile sidebar keyboard/focus behavior.
- Implemented password-confirmed, session-bound MFA enrollment/replacement,
  encrypted authenticator secrets, one-use recovery codes, replay/concurrency
  protection, session revocation/rotation, and operator-only admin promotion.
  Enrollment never grants a platform role. MFA API schemas are documented.
- Implemented signed proxy client identity, shared PostgreSQL throttle counters,
  complete current API schemas with route/live-response checks, durable MFA
  alerts/retries, SMTP preflight and MFA key inspection/rotation. Local tests pass.
- Remaining: provider selection and actual SMTP/ingress smoke tests, production
  key backup/restore rehearsal, dependency-audit disposition and final milestone
  review. The owner authorized M4 after M3 closes; menu CRUD remains M4.

## Deliverables

- Working signup/login/logout/password-reset/email-verification flows.
- Organization creation and member invitation.
- Server-enforced authorization matching the `AUTH_RBAC.md` permission table, for every existing prototype role.
- Platform Admin authentication path, separate from tenant login.

## Acceptance Criteria

- No API route trusts a client-supplied role or organization ID without independently verifying current membership and status.
- The last active Organization Owner cannot remove or demote themselves without a completed ownership transfer.
- A Manager cannot grant a role or location scope broader than their own, even by direct API call.
- Platform Admin access produces an audit log entry with reason and request correlation, per `AUTH_RBAC.md`.

## Tests

API tests asserting the permission matrix directly — for each role, which endpoints succeed and which are correctly rejected — plus the specific enforcement rules (last-owner protection, scope-narrowing) as their own explicit test cases, not incidental coverage.

## Dependencies

- M2 (needs a real API and database to attach authentication and membership to).
- Uses [DECISIONS/AUTH_RBAC.md](../DECISIONS/AUTH_RBAC.md) and [DECISIONS/DATA_MODEL.md](../DECISIONS/DATA_MODEL.md) as locked inputs.

## Risks / Notes

- This is the first milestone where getting something wrong has real security consequences — treat the permission-matrix tests as a gate, not an afterthought.
- The identity decision is recorded in `AUTH_RBAC.md`: first-party email/password
  sessions. SMTP delivery is implemented; deployment credentials remain external.

## Completion Checklist

- [x] Real account/session and organization membership API.
- [x] Tenant/location isolation and last-owner/manager grant regression tests.
- [x] Native PostgreSQL 17 migration and concurrency verification.
- [x] Local SMTP transport success and rejection tests.
- [x] Browser journey for verification, login, workspace/first branch creation,
  invitation, acceptance, scoped navigation, suspension and logout.
- [ ] Provider delivery/retry operational validation using deployment settings.
- [x] Recoverable MFA enrollment and gated operator promotion, verified on test accounts.
- [x] Durable owner notifications, retry/exhaustion and key-rotation tooling tested locally.
- [ ] Production MFA key backup/rotation, owner notifications and recovery operations validated before real administrator rollout.
- [x] Proxy-aware per-client rate limiting verified locally across clients and API instances.
- [ ] Selected production ingress verified to overwrite trusted IP headers and prevent bypass.
- [x] Complete current OpenAPI request/response schemas, route coverage and live-response validation.
- [ ] Remaining dependency-audit findings disposition and final M3 acceptance review.

Evidence and remaining QA findings: [remediation record](../QA/REMEDIATION_2026-09-12.md).
MFA implementation, test evidence and operator instructions: [MFA record](../QA/MFA_2026-09-12.md).
Latest continuation and deployment gates: [operations record](../QA/M3_OPERATIONS_2026-09-12.md).
