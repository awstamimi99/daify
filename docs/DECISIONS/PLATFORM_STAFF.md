# DAIFY employees and permissions

Owner decisions recorded 2026-10-15. These are platform employees, separate
from restaurant owners, managers and memberships.

## Implemented locally

The employee page is `/admin/employees`; customer menu assistance is
`/admin/assistance`. English and Arabic permission labels are provided.
An invitation chooses a role preset, individual permissions and either all
customers or selected customers. Changes require a reason and review before save.

| Role | Employee administration | Menu assistance preset |
| --- | --- | --- |
| Owner | Appoints Managers and manages all employee grants | Edit and publish for all customers |
| Manager | With `staff.manage`, appoints Supervisors, Support and Sales within own permissions/scope | Edit and publish for assigned customers |
| Supervisor | With explicitly granted `staff.manage`, manages Support and Sales within own permissions/scope | Edit and publish for assigned customers |
| Technical Support | No employee administration | Edit and publish for assigned customers |
| Sales | No employee administration | Cannot read, edit or publish client menus through platform assistance |

The Owner explicitly approved editing **and publishing** for Managers,
Supervisors and Technical Support. Presets include both; an authorized grantor
can customize them, including removing publishing. Publishing permission also
covers unpublishing and rollback. Sales restrictions cannot be bypassed with
custom checkboxes or direct API requests.

Roles are fixed presets with custom grants, not arbitrary user-created role
definitions. Nobody can change their own access, manage a peer/higher role,
or delegate permissions/customer scope beyond their own. Only the Owner can
appoint or modify Managers. Supervisors do not receive employee administration
by default. Global user-directory and audit permissions require all-customer
scope. Customer account controls cannot be used to disable employee/Owner users.

Invitations expire after seven days and are bound to the verified email account.
Acceptance requires configured MFA and an AAL2 session; the inviter's current
authority is rechecked. Saving a pending invitation renews it and resends mail.
Invitation mail uses the existing delivery service and is sent after commit;
delivery failure can leave a saved invitation that needs resending.
Changing existing employee access or suspending the employee revokes sessions.
Version checks reject stale updates. Grants, acceptance and suspension serialize
in a database transaction, and changes are audited.

Assistance uses the employee's identity, current permission checks and customer
scope. A required support reason accompanies menu requests, preview images and
QR generation through a 15-minute, HTTP-only cookie limited to the selected
customer's menu paths. The cookie grants no authority. Ending assistance clears
it. Existing draft/design/publish services and entitlement checks remain in use;
reads and mutations leave employee-attributed audit records.

## Data model and rollout

The additive migration `20261015100000_platform_staff` creates `platform_staff`
with optional unique `userId`, normalized unique email, role, invitation/active/
suspended status, permission list, all-customer flag or selected organization
IDs, invitation issuer/expiry, version and timestamps. The optional user link
is populated only on acceptance. Application validation checks customer IDs and
permission dependencies. Database checks enforce normalized email, linked users
for active staff and the Sales permission ceiling.

Existing `User.platformAdmin` accounts retain Owner-level authority. Review
these accounts before rollout; this change does not automatically select one
Owner or demote old administrators. The employee UI cannot grant Owner status.
Ownership transfer remains a separate owner-controlled operator process, not a
self-service feature implemented here. No credentials or secrets are exposed
by Owner access.

The migration has been tested only against an isolated local database. Hosted
Supabase migrations, runtime-role privileges, real invitation delivery and
hosted browser acceptance remain open. Existing custom authentication remains
in place; this feature does not adopt Supabase Auth or depend on its Data API.

## Commercial rules agreed, implementation still pending

- Owner and Manager may grant discounts and custom pricing, with permissions
  controlled by the Owner.
- Managers may create discount coupons up to **50% off for at most six months**.
- Owner/Admin may create discount coupons up to **100% off (free) for at most
  twelve months**. Admin here means the platform Owner, not every employee
  who can open the administration workspace.
- The Owner or a Manager can configure Sales discount limits within their own
  authority. The Sales allowance below remains the starting policy; the new
  Manager/Owner coupon ceilings do not automatically increase Sales access.
- Sales may offer one free month **or** up to 25% off for the first three months.
- Sales may propose custom pricing, but a Manager or Owner must approve it
  before it takes effect.
- Discount stacking, repeat offers and approval expiry need explicit rules.
  Coupon discount duration is distinct from the deadline for redeeming a code.
  Until implemented, no new discounts or prices
  are applied by this employee feature.

The current `billing.manage` checkbox controls existing subscription **usage
limits**, not prices or discounts. Quotes, promotion redemption, approval
records and payment-provider application still need implementation and tests.
Hosted billing remains disabled under the staging plan.

See [auth/RBAC](AUTH_RBAC.md), [billing](BILLING.md),
[staging setup](../QA/M8_STAGING.md) and [employee QA](../QA/PLATFORM_STAFF_2026-10-15.md).
