import { getWidgetPreviewRenderer, resolveWidgetKind } from "./widget-registry.js";
import { createRegisteredWidgetContent, decorateWidgetShell } from "./widget-renderers.js";
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

function applyVirtualWidgetSize(shell, layout = {}) {
  const inlineSize = `${layout.virtualInlineSize || PREVIEW_VIRTUAL_UNIT * 2}px`;
  const blockSize = `${layout.virtualBlockSize || PREVIEW_VIRTUAL_UNIT * 2}px`;

  // The real widget shell keeps its production class (`.mha-widget`) so widget
  // CSS and container queries behave exactly like they do on the dashboard.
  // Its virtual preview size must therefore be written inline; otherwise later
  // widget-shell CSS such as `.mha-widget { height: auto; }` can collapse the
  // preview and make the scaled widget appear empty or 1px tall.
  shell.style.inlineSize = inlineSize;
  shell.style.blockSize = blockSize;
  shell.style.width = inlineSize;
  shell.style.height = blockSize;
  shell.style.minInlineSize = inlineSize;
  shell.style.minBlockSize = blockSize;
  shell.style.maxInlineSize = "none";
  shell.style.maxBlockSize = "none";
  shell.style.gridColumn = "auto";
  shell.style.gridRow = "auto";
}

function createPreviewWidgetShell(widget = {}, layout = {}, context = {}) {
  const kind = resolveWidgetKind(widget);
  const shell = document.createElement("article");
  shell.className = "mha-widget mha-widget-manager-live-widget-shell";
  shell.dataset.widgetKind = kind;
  shell.dataset.widgetId = widget.id || `preview-${kind}`;
  shell.dataset.widgetConfiguredW = String(layout.w || widget.w || 2);
  shell.dataset.widgetW = String(layout.w || widget.w || 2);
  shell.dataset.widgetH = String(layout.h || widget.h || 2);
  shell.dataset.widgetSize = layout.sizeKey || `${layout.w || widget.w || 2}x${layout.h || widget.h || 2}`;
  shell.dataset.preview = "true";
  shell.style.setProperty("--mha-widget-w", String(layout.w || widget.w || 2));
  shell.style.setProperty("--mha-widget-configured-w", String(layout.w || widget.w || 2));
  shell.style.setProperty("--mha-widget-h", String(layout.h || widget.h || 2));
  applyVirtualWidgetSize(shell, layout);
  decorateWidgetShell(shell, widget, context);
  return shell;
}

const PREVIEW_VIRTUAL_UNIT = 112;

export function getWidgetPreviewLayout(size = {}) {
  const w = Math.max(1, Number(size.w) || 2);
  const h = Math.max(1, Number(size.h) || 2);
  const aspectRatio = `${w} / ${h}`;
  const orientation = h > w ? "vertical" : w > h ? "horizontal" : "square";
  const layout = {
    w,
    h,
    aspectRatio,
    orientation,
    sizeKey: `${w}x${h}`,
  };

  Object.defineProperties(layout, {
    virtualInlineSize: { value: w * PREVIEW_VIRTUAL_UNIT },
    virtualBlockSize: { value: h * PREVIEW_VIRTUAL_UNIT },
  });

  return Object.freeze(layout);
}

function applyPreviewLayout(frame, size = {}) {
  const layout = getWidgetPreviewLayout(size);
  frame.dataset.size = layout.sizeKey;
  frame.dataset.orientation = layout.orientation;
  frame.style.setProperty("--mha-widget-preview-w", String(layout.w));
  frame.style.setProperty("--mha-widget-preview-h", String(layout.h));
  frame.style.setProperty("--mha-widget-preview-aspect", layout.aspectRatio);
  frame.style.setProperty("--mha-widget-preview-virtual-inline-size", `${layout.virtualInlineSize}px`);
  frame.style.setProperty("--mha-widget-preview-virtual-block-size", `${layout.virtualBlockSize}px`);
  frame.style.setProperty("--mha-widget-preview-scale", "1");
  frame.style.setProperty("--mha-widget-w", String(layout.w));
  frame.style.setProperty("--mha-widget-configured-w", String(layout.w));
  frame.style.setProperty("--mha-widget-h", String(layout.h));
  return layout;
}

function createLivePreviewStage(layout) {
  const stage = document.createElement("div");
  stage.className = "mha-widget-manager-live-preview-stage";
  stage.style.setProperty("--mha-widget-preview-virtual-inline-size", `${layout.virtualInlineSize}px`);
  stage.style.setProperty("--mha-widget-preview-virtual-block-size", `${layout.virtualBlockSize}px`);
  return stage;
}

function bindPreviewScale(frame, layout) {
  const update = () => {
    if (!frame.isConnected) return false;
    const rect = frame.getBoundingClientRect?.();
    const availableInline = Number(rect?.width) || frame.clientWidth || 0;
    const availableBlock = Number(rect?.height) || frame.clientHeight || 0;

    // The live preview frame is laid out inside a CSS grid and can briefly
    // report a tiny block size while the manager sheet is still settling.
    // Never convert that transient value into a near-zero scale, otherwise the
    // real widget is rendered correctly but appears as a 1px line. Wait for a
    // usable frame instead and keep the safe default scale until then.
    if (availableInline < 48 || availableBlock < 48) return false;

    // Keep a small safety inset so very wide previews (notably 4×1 weather on
    // narrow/mobile manager cards) fit inside the frame instead of touching the
    // clipped edges. The scale must be allowed to go below the old visual floor;
    // otherwise width-constrained previews crop on both sides.
    const isVeryWide = layout.w / layout.h >= 4;
    const safeInlineInset = isVeryWide ? 8 : 12;
    const safeBlockInset = isVeryWide ? 0 : 8;
    const safeInline = Math.max(1, availableInline - safeInlineInset);
    const safeBlock = Math.max(1, availableBlock - safeBlockInset);
    const scale = Math.min(
      safeInline / layout.virtualInlineSize,
      safeBlock / layout.virtualBlockSize,
      1,
    );

    // Very wide widgets such as 4×1 weather are width-constrained in the
    // mobile widget manager. Do not apply the normal visual floor there, since
    // even a small forced minimum can make both horizontal edges clip.
    const minScale = isVeryWide ? 0.01 : 0.08;
    frame.style.setProperty("--mha-widget-preview-scale", String(Math.max(minScale, scale)));
    return true;
  };

  const scheduleFrame = typeof requestAnimationFrame === "function"
    ? requestAnimationFrame
    : (callback) => setTimeout(callback, 0);

  const retryUpdate = (attempt = 0) => {
    if (update() || attempt >= 8) return;
    scheduleFrame(() => retryUpdate(attempt + 1));
  };
  scheduleFrame(() => retryUpdate());

  if (typeof ResizeObserver !== "function") return;
  const observer = new ResizeObserver(() => {
    if (!frame.isConnected) {
      observer.disconnect();
      return;
    }
    retryUpdate();
  });
  observer.observe(frame);
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
  const layout = applyPreviewLayout(frame, previewContext.size);

  const rendered = previewRenderer.render
    ? previewRenderer.render({ widget: previewWidget, ...previewContext })
    : createRegisteredWidgetContent(previewWidget, previewContext);

  const shell = createPreviewWidgetShell(previewWidget, layout, previewContext);
  if (!appendPreviewContent(shell, rendered)) return null;
  const stage = createLivePreviewStage(layout);
  stage.append(shell);
  frame.append(stage);
  bindPreviewScale(frame, layout);
  return frame;
}

export function hasLiveWidgetPreview(item = {}) {
  return getWidgetPreviewRenderer(item).mode === "live";
}
