const OPEN_WIDGET_SURFACE_SELECTOR = [
  '.mha-widget-manager-panel[data-open="true"]:not([hidden])',
  'section.mha-page-creator:not(.mha-widget-config-popup)[data-open="true"]:not([hidden])',
  '.mha-widget-config-popup[data-open="true"]:not([hidden])',
  '.mha-media-page-settings-panel[data-open="true"]:not([hidden])',
  '.mha-light-control-popup[data-open="true"]:not([hidden])',
  '.mha-camera-control-popup[data-open="true"]:not([hidden])',
].join(",");

const WIDGET_SURFACE_SELECTOR = [
  ".mha-widget-manager-panel",
  "section.mha-page-creator:not(.mha-widget-config-popup)",
  ".mha-widget-config-popup",
  ".mha-media-page-settings-panel",
  ".mha-light-control-popup",
  ".mha-camera-control-popup",
].join(",");

export function hasOpenWidgetSurface(root) {
  return Boolean(root?.querySelector?.(OPEN_WIDGET_SURFACE_SELECTOR))
    || [...root?.querySelectorAll?.(WIDGET_SURFACE_SELECTOR) || []].some(panel => (
      panel?._mhaDesiredOpenState === true && !panel.hidden
    ));
}

export function applyWidgetSurfaceHostLayoutState(root, panel) {
  const host = root?.host;
  if (!host || !panel?.dataset) return panel;

  const layout = String(host.dataset?.layout || host._layout || "");
  const layoutVariant = String(host.dataset?.layoutVariant || "");
  const isMobileLandscape = layoutVariant === "mobile-landscape"
    || host._isMobileLandscapeLayout?.() === true;

  panel.dataset.layout = layout;
  panel.dataset.mobileLayout = String(layout === "mobile");
  panel.dataset.mobileLandscape = String(isMobileLandscape);

  if (layoutVariant) panel.dataset.layoutVariant = layoutVariant;
  else delete panel.dataset.layoutVariant;

  const surfaceRole = String(panel.dataset.surfaceRole || "");
  const resolvedSurfaceRole = layout === "mobile" && surfaceRole === "panel"
    ? "popup"
    : surfaceRole;
  if (resolvedSurfaceRole) {
    panel.dataset.surfaceRole = resolvedSurfaceRole;
    const dialog = panel.querySelector?.("[role='dialog']");
    if (dialog?.dataset) dialog.dataset.surfaceRole = resolvedSurfaceRole;
  }

  return panel;
}

export function syncWidgetSurfaceOpenState(root) {
  const host = root?.host;
  if (!host) return false;
  const open = hasOpenWidgetSurface(root);
  host._widgetSurfaceOpen = open;
  host.classList?.toggle?.("is-widget-surface-open", open);
  if (host.dataset) host.dataset.widgetSurfaceOpen = String(open);
  host._syncRuntimeActivity?.();
  return open;
}
