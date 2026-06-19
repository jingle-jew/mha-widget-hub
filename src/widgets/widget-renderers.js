import { getWidgetRendererName } from "./widget-registry.js";
import { createWidgetRenderContext } from "./widget-preview-context.js";
import { WIDGET_CONTENT_RENDERERS } from "./widget-renderer-registry.js";

function getRenderer(widget) {
  const rendererName = getWidgetRendererName(widget);
  return WIDGET_CONTENT_RENDERERS[rendererName] || WIDGET_CONTENT_RENDERERS.empty;
}

export function hasWidgetContentRenderer(rendererName) {
  return Object.hasOwn(WIDGET_CONTENT_RENDERERS, rendererName);
}

export function decorateWidgetShell(shell, widget, context = {}) {
  const renderContext = createWidgetRenderContext(context);
  getRenderer(widget).decorateShell?.({ shell, widget, ...renderContext });
}

export function createRegisteredWidgetContent(widget, context = {}) {
  const renderContext = createWidgetRenderContext(context);
  return getRenderer(widget).render({ widget, ...renderContext });
}
