# Milestone 9 — Flutter App

## Status

**NOT STARTED** — begins only after the production API is stable.

## Goal

Deliver a focused Flutter application for Owner and Manager operations using the same NestJS API as the web application.

## Why this milestone exists

Mobile can improve day-to-day restaurant operations, especially availability and quick analytics, but starting before API stability would duplicate/churn contracts and security logic.

## What I need to learn

- Dart/Flutter fundamentals, navigation, state management, forms, accessibility, localization/RTL, secure storage, networking, uploads, push notifications, and release workflows.
- Mobile auth/session risks, offline/error handling, API versioning, and store compliance.

## What we will build

Owner/Manager login, dashboard, analytics, menu management, item availability, image upload, locations, and notifications. Scope may be reduced to the highest-value journeys after user research.

## Technical scope

Flutter architecture, generated/typed API client, secure credentials, role-aware navigation, localization/RTL, media upload, notification integration, observability, testing, and release delivery. The NestJS API remains the only backend.

## Tasks

- [ ] Validate mobile user journeys, supported roles, platforms, offline needs, and notification requirements.
- [ ] Lock Flutter architecture/state/navigation/API-client conventions.
- [ ] Implement secure login/session and role/location switching.
- [ ] Implement selected dashboard/analytics/menu/availability/location journeys.
- [ ] Implement signed image upload and resilient progress/error handling.
- [ ] Implement localization, RTL, accessibility, and notifications.
- [ ] Add unit/widget/integration tests and Sentry/telemetry within privacy policy.
- [ ] Complete release signing, store/privacy requirements, beta, and rollout plan.

## Deliverables

Flutter Owner/Manager application, shared API contract/client, secure auth, selected operational features, tests, monitoring, and release documentation.

## Acceptance Criteria

- App uses the same authorized NestJS API and does not duplicate business rules locally.
- Role/location/menu scope matches server behavior.
- Critical journeys handle slow/offline/failure states safely.
- English/Arabic and RTL, accessibility, uploads, notifications, and secure storage meet agreed requirements.

## Tests

Dart unit tests, Flutter widget tests, API contract tests, integration journeys on supported devices, accessibility/RTL tests, upload/network-failure tests, beta release QA.

## Dependencies

Stable production API/auth contracts, M8 operations, mobile scope research, notification and store-account decisions.

## Risks / Notes

Do not promise full web parity by default. Availability and operational speed may provide more value than reproducing every administrative screen.

## Completion Checklist

- [ ] Mobile scope/research accepted.
- [ ] Architecture/API client accepted.
- [ ] Auth and selected journeys pass.
- [ ] Localization/accessibility/resilience pass.
- [ ] Release/monitoring/privacy requirements pass.
- [ ] Documentation and ROADMAP updated.

