# DAIFY Beta scope

## Required for Beta

- Secure signup, email verification, login, logout and password reset.
- Owner onboarding into an organization and first restaurant location.
- Tenant-scoped restaurant settings, members and basic employee access.
- English and Arabic draft menus with categories, products, prices, availability and images.
- Template selection, authenticated preview, publish/unpublish and stable QR access.
- Public mobile menu without customer authentication, with correct RTL/LTR behavior.
- Persistent PostgreSQL storage, private object storage, least-privilege runtime access and verified TLS.
- Staging deployment on the selected free providers with HTTPS, exact-origin CORS/cookies, health checks and an end-to-end browser journey.

## Optional for Beta

- MFA enrollment and recovery, support tickets, platform assistance, basic analytics and sandbox plan enrollment. These may remain available when configured but do not block the owner-to-public-menu journey.
- Manager and supervisor presets beyond the minimum owner invitation workflow.
- Multiple locations and publication rollback, which are implemented but need only regression coverage for Beta.

## Post-Beta

- Live payments, recurring billing, refunds/disputes and commercial activation of accepted quotes.
- Production analytics/retention operations, scheduled publishing, custom domains and mobile applications.
- Production DNS, paid availability, formal monitoring/on-call, production restore acceptance and public launch.
- Advanced sales coupons, custom pricing, platform employee workflows and broad administrative reporting do not delay Beta.

## Beta access policy

Beta must not charge customers. Use the existing disabled/sandbox subscription architecture and explicitly grant invited Beta organizations access. Do not enable live payment credentials or automatic billing.
