# Authentication and RBAC Decision

Status: Role model accepted; authentication provider deferred
Decision date: 2026-08-13
Implementation milestone: M3

## Context

The prototype simulates sessions and hides UI by permission. Production DAIFY needs durable identity and server-enforced authorization across organization, location, and menu scopes.

## Decision

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

## Related references

- [Data model](DATA_MODEL.md)
- [Production architecture](../PRODUCTION_ARCHITECTURE.md)
- [M3 execution plan](../MILESTONES/M3_AUTH_ORGANIZATIONS.md)

