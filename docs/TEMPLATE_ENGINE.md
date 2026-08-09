# MenuFlow restaurant template engine

## Architecture

Every restaurant template consumes the same normalized object from `assets/js/menu/menu-data.js`. Rendering is handled by `menu-renderer.js`; template HTML contains no restaurant-specific markup.

- `menu-data.js` — restaurant, sections, localized content, and 24 menu items
- `templates-config.js` — defaults, presets, and capability definitions
- `theme-controller.js` — maps approved theme values to CSS custom properties
- `menu-renderer.js` — semantic shared menu markup
- `template-controller.js` — search, sticky section state, preview toolbar, language, and editor messaging
- `customizer.js` — live editor controls and capability-aware options
- `base-menu.css` — normalized menu components and layout modes
- `[template].css` — the art direction unique to one template

## Adding a ninth template

1. Add an entry to `MenuFlowTemplateConfigs` with controlled defaults, presets, and supported options.
2. Add a CSS file in `assets/css/templates/` that changes presentation without duplicating menu data.
3. Copy one minimal HTML shell in `templates/`, change `data-template`, title, and its template CSS link.
4. Add the template metadata to `assets/js/templates.js` so it appears in the marketing gallery.
5. Test desktop, 430px, 390px, 375px, search, unavailable items, and supported customizer controls.

## Menu item media

`menu-renderer.js` always renders a `.menu-item-media` figure, even when an item has no `image`, so grid and image-focus layouts keep equal card heights. A missing photo falls back to a `.menu-item-media-placeholder` showing the dish's first initial. Unavailable items (`available: false`) get a `.sold-out-flag` badge rendered on top of the media (solid ink background, always legible regardless of the photo or template palette) in addition to the existing text tag — don't rely on opacity/grayscale alone to signal unavailability, since pale dishes on light templates lose contrast almost entirely.

## Drupal migration

Drupal can serialize Restaurant, Menu Section, and Menu Item entities into the same JSON shape currently exposed as `window.MenuFlowMenuData`. A Twig template can provide the empty `#menu-root` shell and attach the shared renderer/library. No template-specific content markup needs to be generated.

Theme configuration can come from validated Drupal fields or configuration entities. Drupal should emit only supported values from the selected template's capability definition. Those values can be serialized into the page and passed to `MenuFlowTheme.apply()`, producing scoped CSS custom properties such as `--restaurant-bg`, `--restaurant-accent`, and `--restaurant-radius-card`.

The customizer already sends this same theme object to its preview iframe through `postMessage`, demonstrating the future dashboard-to-preview boundary without coupling the public menu to dashboard code.
