# Template migration boundary

M1 proves the migration contract with Atelier only. The preserved prototype remains the behavioral and visual reference until M5 migrates all nine templates.

- `sample-menu.ts` supplies a renderer-independent `MenuViewModel`.
- `renderer-registry.tsx` maps stable family IDs to typed React renderers.
- `renderers/classic-renderer.tsx` proves the Classic family without changing its stable `atelier` slug.
- `AtelierPreview` owns preview-only locale state; its Arabic state sets `lang="ar"` and `dir="rtl"` on the rendered menu.
- Shared types in `@daify/types` define capabilities, theme/layout, renderer props, and versioned `daify.preview.*` messages.

The Feast renderer, iframe transport, runtime payload validation, all remaining templates, publishing snapshots, and public `/r/{slug}` route remain M5 work. New React code does not import or rename the legacy `window.MenuFlow*` globals, so the original renderer keeps working unchanged.
