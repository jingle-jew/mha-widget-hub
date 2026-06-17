import { getWidgetPreviewRenderer, resolveWidgetKind } from "./widget-registry.js";
import { createRegisteredWidgetContent } from "./widget-renderers.js";
import { createWidgetPreviewRenderContext } from "./widget-preview-context.js";

function createPreviewWidgetFromItem(item = {}, context = {}) {
  const size = item.size || { w: item.w, h: item.h };
  return {
    ...item,
    kind: resolveWidgetKind(item),
    type: resolveWidgetKind(item),
    component: item.component || item.kind || item.type || resolveWidgetKind(item),
    category: item.category || context.category || "",
    variant: item.variant || "",
    label: item.label || item.title || "",
    title: item.title || item.label || "",
    w: size?.w || 2,
    h: size?.h || 2,
  };
}

function appendPreviewContent(frame, content) {
  if (!content) return false;
  if (content instanceof Node) {
    frame.append(content);
    return true;
  }
  if (Array.isArray(content)) {
    content.filter((node) => node instanceof Node).forEach((node) => frame.append(node));
    return frame.childNodes.length > 0;
  }
  return false;
}

export function createLiveWidgetPreview(item = {}, context = {}) {
  const previewRenderer = getWidgetPreviewRenderer(item);
  if (previewRenderer.mode !== "live") return null;

  const previewContext = createWidgetPreviewRenderContext(item, context);
  const previewWidget = previewRenderer.createWidget?.(item, previewContext)
    || createPreviewWidgetFromItem(item, context);

  const frame = document.createElement("div");
  frame.className = "mha-widget-manager-live-preview";
  frame.dataset.kind = resolveWidgetKind(previewWidget);
  frame.dataset.variant = previewWidget.variant || "";
  frame.dataset.size = `${previewContext.size.w}x${previewContext.size.h}`;
  frame.style.setProperty("--mha-widget-preview-w", String(previewContext.size.w));
  frame.style.setProperty("--mha-widget-preview-h", String(previewContext.size.h));

  const rendered = previewRenderer.render
    ? previewRenderer.render({ widget: previewWidget, ...previewContext })
    : createRegisteredWidgetContent(previewWidget, previewContext);

  return appendPreviewContent(frame, rendered) ? frame : null;
}

export function hasLiveWidgetPreview(item = {}) {
  return getWidgetPreviewRenderer(item).mode === "live";
}
