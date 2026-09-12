# Authentication and RBAC Decision

Status: Accepted; M3 authentication/session strategy locked
Decision date: 2026-08-13
Implementation milestone: M3

## Context

The prototype simulates sessions and hides UI by permission. Production DAIFY needs durable identity and server-enforced authorization across organization, location, and menu scopes.

## Decision

### M3 proxy and throttling continuation — 2026-09-12

The web server signs a validated client IP, timestamp, HTTP method and API path
with a dedicated shared secret. The API accepts forwarded client identity only
with this proof; arbitrary `X-Forwarded-For` headers never establish trust.
Production requires the signing key and an explicitly configured web ingress
header that the hosting edge overwrites. Until a provider is selected, this
deployment trust boundary cannot be operationally accepted. Local development
can use socket identity without a proxy key. Signed proof never replaces user
authentication, Origin checks or object authorization.

Throttling uses atomic PostgreSQL counters shared by API instances, with bounded
expiry cleanup. This extends the existing persistence boundary without requiring
Redis during M3; the future Redis decision remains available when load warrants
it. Liveness and the public API contract do not depend on the throttle database.
MFA change/recovery notifications must be durably queued in the transaction and
delivered after commit, with bounded retries and visible failures.

Authentication establishes identity. Organization membership, role, explicit scope, and entitlements determine authorization. Frontend controls improve UX; only the NestJS API is the security boundary.

### Roles

- **Platform Admin**: DAIFY operator. Separate from tenant membership, strongly authenticated, and fully audited.
- **Organization Owner**: full organization, location, team, publishing, and billing authority.
- **Manager**: operational access to assigned/all granted locations, with optional elevated permissions.
- **Staff**: narrow operational access, normally menu content or item availability for assigned menus.
- **Viewer**: read-only access to explicitly granted areas.

Roles are presets over granular permissions. Resource assignments can narrow a role but cannot broaden it.

## Permission matrix

| Capability | Platform Admin | Organization Owner | Manager | Staff | Viewer |
| --- | --- | --- | --- | --- | --- |
| Platform admin access | Full, audited | No | No | No | No |
| Organization settings | Support/break-glass | Full | Read; limited edits if granted | No | Basic read |
| Location access | Explicit support action | All | Assigned or all granted | Assigned | Assigned |
| Create/archive locations | Support only | Yes | If granted | No | No |
| Create menus | Support only | Yes | Assigned locations if granted | No by default | No |
| Edit menu content | Support only | Yes | Assigned locations | If granted | No |
| Change item availability | Support only | Yes | Yes | Assigned menus if granted | No |
| Select template/edit theme | Support only | Yes | If granted | No by default | No |
| Preview drafts | Support only | Yes | Yes | Assigned menus if granted | Optional read-only |
| Publish/unpublish/rollback | Support only | Yes | With `menu.publish` | No | No |
| View analytics | Support only | All | Assigned locations | Optional summary | Optional read-only |
| Manage team/scopes | Support only | Full | Staff/Viewer only if granted | No | No |
| Billing/subscriptions | Support only | Full | Optional view | No | No |
| QR create/style/download | Support only | Yes | If granted | Optional download | Optional view/download |
| Audit logs | Policy-controlled | Organization logs | Limited operational entries | Own actions if exposed | No |

## Enforcement rules

- Every protected API command and query derives the current User from a verified server session/token.
- Authorization evaluates organization membership, membership status, role permissions, resource scope, resource status, and entitlement.
- The last active Organization Owner cannot remove or demote themself without ownership transfer.
- A Manager cannot grant a role, permission, or location scope broader than their own.
- Item availability permission does not imply menu editing or publishing.
- Suspending a user, membership, organization, or location invalidates effective access promptly.
- Platform Admin support access requires a reason, stronger authentication, request correlation, and an AuditLog entry.
- UI guards may mirror API policy for clarity but cannot substitute for it.

## Authentication requirements

- Email verification before normal tenant access.
- Secure HTTP-only, same-site cookies if using browser sessions; CSRF protection for state changes.
- MFA and step-up authentication for Platform Admin and sensitive security/billing actions.
- Modern password hashing only if DAIFY stores passwords; auth secrets never live in localStorage.
- Rate limiting for login, signup, password reset, verification, invitation, and token refresh.
- Account linking, session duration, MFA recovery, and exact provider remain deferred until the M3 decision review.

## M3 authentication implementation decision

Decision date: 2026-08-13

- DAIFY owns email/password identity in the NestJS modular monolith for M3. Passwords use Argon2id; plaintext credentials and tokens are never persisted.
- Browser authentication uses an opaque random session token in an `HttpOnly`, `SameSite=Lax`, path-wide cookie. PostgreSQL stores only its SHA-256 digest, expiry, revocation, authentication assurance level, and minimal device/request metadata. No durable credential is stored in browser JavaScript or `localStorage`.
- Sessions have a seven-day idle/rolling lifetime and a thirty-day absolute lifetime. Rotation/revocation happens server-side; logout and security-state changes revoke immediately. A separate JWT/refresh-token pair is intentionally unnecessary for the browser architecture.
- Unsafe cookie-authenticated requests must pass an allowed-origin CSRF check in addition to SameSite cookie behavior. Next.js may proxy requests for same-origin UX, but it is not the authorization boundary.
- Email verification, password reset, and invitations use separate single-use random tokens. PostgreSQL stores token digests, purpose, expiry, consumption, and subject metadata; delivery is behind an email-delivery port so a provider can be selected without changing domain behavior. Test-only token exposure is fail-closed outside `NODE_ENV=test`.
- Platform Admin is a global user capability, never an Organization membership role. Platform routes require an active AAL2 session established with TOTP MFA, a support reason, request correlation, and an append-only security/audit event.
- Rate limiting is applied to signup, login, verification, password reset, invitation, and MFA boundaries. M3 uses Nest's in-process throttler for the single API instance; distributed Redis-backed limiting is required before horizontal production scale in M8.
- External identity linking and managed auth-provider migration remain deferred. Enabling a Platform Admin without a recoverable MFA enrollment is not permitted.

## Recoverable MFA — 2026-09-12

- Any verified user can enroll TOTP from account security. Enrollment does not grant
  platform privileges. A separate operator command can promote an already enrolled,
  verified user with unused recovery codes; no public promotion endpoint exists.
- Starting enrollment requires the current password and, when already enrolled,
  a fresh authenticator code or unused recovery code. Pending setup is bound to the
  current session, expires in ten minutes, and leaves the existing factor active.
- Confirmation requires a valid code from the new authenticator and the current
  password. It creates ten random 128-bit, single-use recovery codes, shown once.
  Only their SHA-256 digests are retained. Password plus a recovery code is an
  alternative login factor; recovery does not disable MFA.
- TOTP secrets, including pending secrets, are encrypted with AES-256-GCM using
  an external 32-byte MFA_ENCRYPTION_KEY and user-bound authenticated data.
  Existing plaintext test-era secrets are encrypted on their next successful login;
  new platform promotion refuses plaintext secrets.
- Enrolled tenant users also require MFA at login. TOTP counters and recovery-code
  claims are consumed inside a user-locked transaction. Enrollment replacement
  revokes existing sessions and rotates the session cookie. Password resets cancel
  pending enrollment but do not remove an enrolled factor.
- MFA changes and recovery use create security events. Production operational
  review must cover encryption-key backup/rotation and account-owner notification.

## 2026-09-12 implementation hardening

- Next.js validates the incoming exact Origin and JSON media type before
  forwarding unsafe requests. NestJS independently applies origin and membership
  checks. A trusted origin must never be substituted before checking the caller.
- Token consumption uses a conditional, unexpired, unconsumed update in the
  same transaction as its effect. User locks serialize login, password reset,
  verification and replacement-token issuance. Organization locks serialize
  invitations and membership changes, including concurrent owner demotions.
- Invitations add/reactivate membership; they cannot alter an active or suspended
  member. Owners must use the membership endpoint for those changes. Member
  changes invalidate outstanding invitations for the recipient.
- Organization lists and detail responses filter locations by current membership
  scope and active resource status. The frontend receives effective permissions;
  hidden links are a UX aid, while API authorization remains authoritative.
- SMTP delivery is awaited after the transaction commits, uses finite timeouts,
  and enforces TLS in production. Failure returns 503 without leaking message
  tokens into logs. Verification resend and repeated reset/invite requests replace
  old links. This is direct SMTP, not a durable queue; queued retries and actual
  provider deliverability are not established by the local tests.
- Test-only no-delivery transport is rejected outside `NODE_ENV=test`. SMTP
  credentials belong in deployment configuration, never in committed files.

## Related references

- [Data model](DATA_MODEL.md)
- [Production architecture](../PRODUCTION_ARCHITECTURE.md)
- [M3 execution plan](../MILESTONES/M3_AUTH_ORGANIZATIONS.md)
