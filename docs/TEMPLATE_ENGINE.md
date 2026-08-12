# DAIFY restaurant template engine

## Architecture

Every restaurant template consumes the same normalized object from `assets/js/menu/menu-data.js` — content and design are strictly separate. What differs per **template family** is how that data gets rendered: DAIFY has more than one renderer function now, not one renderer with eight CSS skins.

- `menu-data.js` — restaurant, sections, localized content, and 24 menu items (shared by every template, every family)
- `templates-config.js` — per-template defaults, presets, capability definitions, and a `family` id (`'classic'` or `'feast'` today)
- `theme-controller.js` — maps approved theme values to CSS custom properties (family-agnostic)
- `template-controller.js` — search, sticky section state, language, editor messaging, and item-detail-sheet binding. Family-agnostic: it drives whichever family rendered the page purely through shared `data-*` attribute hooks (see below), and never assumes a specific DOM shape.
- `customizer.js` — live editor controls; only renders the capability groups a template's `supports` object actually lists, so a reduced-capability family doesn't show irrelevant controls
- `base-menu.css` — shared tokens (`--restaurant-*`), reset, RTL base rules, `.is-embedded` support — loaded by every family
- `[template].css` — the art direction unique to one template
- `menu-renderer.js` — the **classic** family's renderer (Atelier, Verde, Noir, Amalfi, Sora, Ember, Souk, Mellow): one editorial DOM shape, eight palettes
- `feast-renderer.js` — the **Feast** family's renderer: an entirely different DOM (sticky category grid, image-forward cards, tap-to-open detail sheet)

### The renderer registry

Each renderer file self-registers into `window.MenuFlowRendererRegistry[familyId]` (see the last few lines of `menu-renderer.js`/`feast-renderer.js`). `template-controller.js` looks up `registry[config.family]` and calls `.render(root, data, options)` on it — that's the entire contract between the controller and a family. Nothing else about a family is assumed.

### The shared interaction contract

`template-controller.js`'s search/nav/messaging code works for *any* family whose renderer emits these hooks, regardless of visual structure:

- `[data-menu-search]` — the search input
- `[data-menu-item]` + `data-search="..."` — each orderable item; matched items stay visible, others get `hidden`
- `[data-menu-section]` + `[data-section-link]` — category sections and their nav links, driving scroll-spy
- `.menu-empty` — shown when a search matches nothing
- Optional: `[data-item-sheet]` (one `<dialog>`) + `[data-menu-item][data-detail-*]` — opt-in tap-to-open item detail. A family that doesn't render a `[data-item-sheet]` simply gets a no-op; nothing breaks.

This is why adding a new family never touches `template-controller.js` — a family earns the shared behavior by emitting the right attributes, not by matching a shape.

## Adding a new template

**To an existing family** (e.g. a ninth *classic* palette):
1. Add an entry to `MenuFlowTemplateConfigs` via `make(...)` with controlled defaults, presets, and supported options.
2. Add a CSS file in `assets/css/templates/` that changes presentation without duplicating menu data.
3. Copy one minimal HTML shell in `templates/`, change `data-template`, title, and its template CSS link.
4. Add the template metadata to `assets/js/templates.js` so it appears in the marketing gallery.
5. Test desktop, 430px, 390px, 375px, search, unavailable items, and supported customizer controls.

**A new family** (genuinely different layout logic, not a reskin):
1. Write a new `[family]-renderer.js` consuming the same `MenuFlowMenuData`/`layout` shape, emitting the shared interaction hooks above. Don't reuse `menu-renderer.js`'s internals — a clean, independent render function is the point.
2. Register it: `window.MenuFlowRendererRegistry.[family] = { render, escape }`.
3. Add a config via `makeFamily(family, id, name, category, description, defaults, supports)` — `supports` is **not** merged with the classic family's shared capability list; only list what your renderer actually implements.
4. Write `assets/css/templates/[family].css` — mobile-first (base rules = phone, `min-width` `@media`/`@container` pairs enhance up to tablet/desktop). Load `base-menu.css` first for tokens/reset, skip `polish.css` (classic-only).
5. New template HTML shell loads `templates-config.js`, `theme-controller.js`, your `[family]-renderer.js`, then `template-controller.js` — no need to load `menu-renderer.js` if nothing on the page uses the classic family.
6. Test everything in §"Adding a new template" above, plus: missing images, empty categories, very long names in both languages, and RTL specifically (long Arabic names wrapping, `<bdi>`-wrapped prices, logical `inset-inline-*` properties instead of `left`/`right` for badges).
7. Known trap: any CSS that conditionally hides/shows a capability control by class (like the marketing customizer's `.customizer-group`) needs an explicit `[hidden]{display:none}` rule — author CSS setting `display` on a class silently beats the browser's default `[hidden]` behavior at equal specificity. This bit Feast; fixed once in `customizer.css`, but watch for the same shape in new UI.

## Menu item media

`menu-renderer.js` always renders a `.menu-item-media` figure, even when an item has no `image`, so grid and image-focus layouts keep equal card heights. A missing photo falls back to a `.menu-item-media-placeholder` showing the dish's first initial. Unavailable items (`available: false`) get a `.sold-out-flag` badge rendered on top of the media (solid ink background, always legible regardless of the photo or template palette) in addition to the existing text tag — don't rely on opacity/grayscale alone to signal unavailability, since pale dishes on light templates lose contrast almost entirely.

## Drupal migration

Drupal can serialize Restaurant, Menu Section, and Menu Item entities into the same JSON shape currently exposed as `window.MenuFlowMenuData`. A Twig template can provide the empty `#menu-root` shell and attach the shared renderer/library. No template-specific content markup needs to be generated.

Theme configuration can come from validated Drupal fields or configuration entities. Drupal should emit only supported values from the selected template's capability definition. Those values can be serialized into the page and passed to `MenuFlowTheme.apply()`, producing scoped CSS custom properties such as `--restaurant-bg`, `--restaurant-accent`, and `--restaurant-radius-card`.

The customizer already sends this same theme object to its preview iframe through `postMessage`, demonstrating the future dashboard-to-preview boundary without coupling the public menu to dashboard code.
