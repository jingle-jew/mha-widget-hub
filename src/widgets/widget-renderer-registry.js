import { WIDGET_MODULES } from "./widget-module-registry.js";

export const WIDGET_CONTENT_RENDERERS = Object.freeze(
  Object.fromEntries(
    WIDGET_MODULES
      .filter((module) => module?.kind && module?.renderer)
      .map((module) => [module.kind, module.renderer]),
  ),
);

export function getWidgetContentRenderers() {
  return WIDGET_CONTENT_RENDERERS;
}
