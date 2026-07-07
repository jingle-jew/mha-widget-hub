import { destroyDomSubtree } from "../core/dom-lifecycle.js";
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

export function rerenderRegisteredWidgetContent(
  shell,
  widget,
  context = {},
  {
    destroyDomSubtreeFn = destroyDomSubtree,
  } = {},
) {
  if (!shell || !widget) return false;

  const renderContext = createWidgetRenderContext(context);
  const renderer = getRenderer(widget);
  renderer.decorateShell?.({ shell, widget, ...renderContext });

  const current = shell.querySelector?.("[data-widget-component]") || null;
  const next = renderer.render({ widget, ...renderContext });

  if (!current) {
    if (!next) return false;
    const tools = shell.querySelector?.(".mha-widget-tools") || null;
    if (tools && typeof shell.insertBefore === "function") {
      shell.insertBefore(next, tools);
    } else if (typeof shell.prepend === "function") {
      shell.prepend(next);
    } else if (typeof shell.append === "function") {
      shell.append(next);
    }
    return true;
  }

  if (!next) {
    destroyDomSubtreeFn(current);
    current.remove?.();
    return true;
  }

  destroyDomSubtreeFn(current);
  current.replaceWith?.(next);
  return true;
}
