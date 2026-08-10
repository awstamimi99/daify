# MenuFlow marketing prototype

A framework-free static prototype for a premium restaurant-menu SaaS product.

## Run locally

From the project directory:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Structure

- `index.html` — conversion-focused homepage
- `features.html`, `templates.html`, `pricing.html` — product pages
- `about.html`, `contact.html` — company pages
- `login.html`, `signup.html` — full onboarding flow with client-side validation, simulated failure/success states (`assets/js/auth.js`)
- `dashboard/` — logged-in app shell (Overview, Menu editor, Design, QR & Publish); fully interactive, persisted to `localStorage` (`assets/js/dashboard/`), no backend
- `assets/css/variables.css` — brand tokens
- `assets/css/brand.css` — official logo sizing and brand-specific overrides
- `assets/css/reset.css` — browser normalization
- `assets/css/style.css` — shared components and responsive layouts
- `assets/css/dashboard.css` — dashboard app-shell components
- `assets/js/templates.js` — template gallery data
- `assets/js/main.js` — navigation, demo, filters, pricing, forms, and motion
- `assets/js/vendor/qrcode.min.js` — vendored `qrcode` (MIT) build for real client-side QR generation, no network dependency
- `assets/images/` — original generated editorial photography
- `assets/icons/` — official MenuFlow light, dark, icon, and favicon SVGs
- `docs/` — supplied brand guide and raw brand-token reference

No framework or runtime dependency is required. Google Fonts are the only external network request; the site falls back to system fonts when offline.

## Dashboard

The dashboard (`dashboard/index.html`) is reached after signup/login and stores its state under the `menuflow_dashboard_v1` localStorage key, seeded from `assets/js/menu/menu-data.js` on first visit. Editing menu sections/items there is immediately reflected on the public template pages (`templates/*.html`) in the same browser, since `menu-data.js` checks that same key before falling back to the built-in Oliva demo data. Template/theme choices from the Design page flow into the "live menu" link and QR code as a `?theme=` query param, the same mechanism `template-customizer.html` already used. There is no backend — data lives only in the visitor's browser, and "Reset demo data" in the sidebar clears it.
