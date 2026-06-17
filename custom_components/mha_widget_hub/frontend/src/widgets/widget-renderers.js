import { getWidgetDefinition } from "./widget-registry.js";
import { WIDGET_CONTENT_RENDERERS } from "./widget-renderer-registry.js";

function getRenderer(widget) {
  const rendererName = getWidgetDefinition(widget)?.renderer || "empty";
  return WIDGET_CONTENT_RENDERERS[rendererName] || WIDGET_CONTENT_RENDERERS.empty;
}

export function hasWidgetContentRenderer(rendererName) {
  return Object.hasOwn(WIDGET_CONTENT_RENDERERS, rendererName);
}

export function decorateWidgetShell(shell, widget, context = {}) {
  getRenderer(widget).decorateShell?.({ shell, widget, ...context });
}

export function createRegisteredWidgetContent(widget, context = {}) {
  return getRenderer(widget).render({ widget, ...context });
}
