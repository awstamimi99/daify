# Milestone 3 — Auth / Organizations / RBAC

## Status

NOT STARTED. Detailed task breakdown will be written when M2 is complete and this milestone is about to start.

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
- Authentication provider, session duration, and MFA recovery mechanics are explicitly deferred in `AUTH_RBAC.md` — this milestone is where those get decided, not before.

## Tasks

Detailed task breakdown deferred until M2 is complete and this milestone starts.

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
- Authentication provider choice (build vs. a hosted provider) is still open; resolve it early in this milestone since most other tasks depend on it.

## Completion Checklist

Not applicable yet — a real checklist will be written from the detailed task breakdown when this milestone starts.
