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
- `login.html`, `signup.html` — prototype auth interfaces
- `assets/css/variables.css` — brand tokens
- `assets/css/brand.css` — official logo sizing and brand-specific overrides
- `assets/css/reset.css` — browser normalization
- `assets/css/style.css` — shared components and responsive layouts
- `assets/js/templates.js` — template gallery data
- `assets/js/main.js` — navigation, demo, filters, pricing, forms, and motion
- `assets/images/` — original generated editorial photography
- `assets/icons/` — official MenuFlow light, dark, icon, and favicon SVGs
- `docs/` — supplied brand guide and raw brand-token reference

No framework or runtime dependency is required. Google Fonts are the only external asset request; the site falls back to system fonts when offline.
