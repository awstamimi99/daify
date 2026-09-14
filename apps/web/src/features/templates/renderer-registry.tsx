// The M1 renderer contract now lives in the shared, server/browser-safe engine.
// This adapter preserves the web import boundary while both API snapshots and
// iframe previews use the same typed families.
export { rendererFor, renderers } from '@daify/menu-engine';
export type { RenderModel, MenuSnapshot, Design } from '@daify/menu-engine';
export const migratedRendererFamilies = ['classic', 'feast'] as const;
