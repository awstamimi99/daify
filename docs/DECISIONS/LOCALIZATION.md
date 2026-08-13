# Localization Decision

Status: Accepted for planning
Decision date: 2026-08-13
Implementation milestone: M4–M5

## Context

DAIFY currently demonstrates English and Arabic with RTL rendering. Production must support English-only, Arabic-only, bilingual, and future multilingual restaurants without database migrations for each language.

## Options considered

| Option | Benefit | Cost | Decision |
| --- | --- | --- | --- |
| Columns such as `name_en`, `name_ar` | Simple for two fixed languages | Schema change per language, sparse records, repeated validation, poor scalability | Rejected |
| Translation entities/rows | Arbitrary languages, consistent fallback and completeness rules | Additional joins and translation-aware queries | Selected |

## Decision

Use translation records. A conceptual localized value contains `entityType`, `entityId`, `field`, `languageTag`, `value`, and timestamps, unique per entity/field/language. During Prisma design this may become explicit translation models per aggregate if that improves relations and query safety.

## Rules

- Store canonical BCP 47 language tags such as `en`, `ar`, and `fr-CA`.
- Location defines a default language; Menu can override it and declares supported languages.
- English-only and Arabic-only menus publish without requiring the unused language.
- Bilingual menus validate the required fields in both configured languages.
- Public rendering falls back only to the configured default language and exposes missing-translation state to editors.
- Direction is locale metadata: RTL locales set document `dir="rtl"`; mixed user content can use `dir="auto"`.
- Prices, currencies, availability, allergens, and identifiers remain structured data and are locale-formatted, not embedded into translations.
- Slugs and stable keys are not translated unless a later routing decision explicitly adds localized aliases.

## Completeness

The editor calculates completeness per language and entity. Required fields block publication when missing; optional fields produce warnings. Completeness rules must be versioned with the publication validator so an older published version stays reproducible.

## Related references

- [Data model](DATA_MODEL.md)
- [Publishing](PUBLISHING.md)
- [Template engine](../TEMPLATE_ENGINE.md)

