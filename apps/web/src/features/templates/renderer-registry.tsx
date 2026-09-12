import type { ComponentType } from "react";
import type { TemplateFamily, TemplateRendererProps } from "@daify/types";
import { ClassicRenderer } from "./renderers/classic-renderer";

export type TemplateRenderer = ComponentType<TemplateRendererProps>;

const rendererRegistry: Readonly<Partial<Record<TemplateFamily, TemplateRenderer>>> = {
  classic: ClassicRenderer,
};

export function rendererFor(family: TemplateFamily): TemplateRenderer {
  const renderer = rendererRegistry[family];
  if (!renderer) throw new Error(`Renderer family "${family}" has not migrated yet.`);
  return renderer;
}

export const migratedRendererFamilies = Object.freeze(Object.keys(rendererRegistry) as TemplateFamily[]);
