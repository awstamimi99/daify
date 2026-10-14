# Production template boundary

The M1 Atelier proof now embeds `/templates/atelier/preview`; the gallery exposes
all nine `/templates/{template}/preview` routes. The abbreviated React renderer
and four-dish fixture have been retired.

`@daify/menu-engine` owns the versioned `MenuSnapshot`, `Design`, normalization,
capability validation and typed Classic/Feast renderer registry. The production
renderer returns escaped HTML with the original CSS hooks, shared by server-side
public routes and the authenticated iframe. This refines the M1 React-only
component proof into a framework-neutral contract usable by Nest, Next and the
small browser preview bundle without duplicating renderer logic.

The original CSS is copied at build time; fonts are self-hosted. A small production
stylesheet adds keyboard focus, no-image handling and contrast corrections. Only
`demo.json` is sample data; public menus always render immutable database snapshots.
