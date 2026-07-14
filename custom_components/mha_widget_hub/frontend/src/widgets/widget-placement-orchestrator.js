import { createWidgetManager } from "../widget-manager/widget-manager.js";
import { buildWidgetManagerState } from "../widget-manager/widget-manager-props.js";
import { createWidgetConfigPopup } from "../widget-config/widget-config-popup.js";
import { buildWidgetConfigPopupState } from "../widget-config/widget-config-props.js";
import {
  createPageCreatorPanel as createPageCreatorDomPanel,
  syncPageCreatorPanel as syncPageCreatorDomPanel,
} from "../pages/page-creator.js";
import { buildPageCreatorState } from "../pages/page-creator-props.js";

const OPEN_WIDGET_SURFACE_SELECTOR = [
  '.mha-widget-manager-panel[data-open="true"]:not([hidden])',
  'section.mha-page-creator:not(.mha-widget-config-popup)[data-open="true"]:not([hidden])',
  '.mha-widget-config-popup[data-open="true"]:not([hidden])',
  '.mha-media-page-settings-panel[data-open="true"]:not([hidden])',
].join(",");

const WIDGET_SURFACE_SELECTOR = [
  ".mha-widget-manager-panel",
  "section.mha-page-creator:not(.mha-widget-config-popup)",
  ".mha-widget-config-popup",
  ".mha-media-page-settings-panel",
].join(",");

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
  if (!host) return;
  const open = Boolean(root?.querySelector?.(OPEN_WIDGET_SURFACE_SELECTOR))
    || [...root?.querySelectorAll?.(WIDGET_SURFACE_SELECTOR) || []].some(panel => (
      panel?._mhaDesiredOpenState === true && !panel.hidden
    ));
  host.classList.toggle("is-widget-surface-open", open);
  host.dataset.widgetSurfaceOpen = String(open);
}

export function buildWidgetManagerPanelProps({
  open = false,
  activeCategory = "",
  categories = [],
  singleCategory = false,
  emptyLabel = "",
  onClose = () => {},
  onBack = () => {},
  onSelectCategory = () => {},
  onSelectWidget = () => {},
} = {}) {
  return {
    ...buildWidgetManagerState({
      open,
      activeCategory,
      categories,
    }),
    singleCategory,
    emptyLabel,
    onClose,
    onBack,
    onSelectCategory,
    onSelectWidget,
  };
}

export function createWidgetManagerPanel(props = {}) {
  return createWidgetManager(buildWidgetManagerPanelProps(props));
}

export function syncWidgetManagerPanel(root, props = {}) {
  const existing = root?.querySelector?.(".mha-widget-manager-panel");
  if (existing) existing.remove();
  root?.append?.(applyWidgetSurfaceHostLayoutState(root, createWidgetManagerPanel(props)));
  syncWidgetSurfaceOpenState(root);
}

export function buildWidgetConfigPanelProps({
  session = null,
  hass = null,
  visibilityConfig = null,
  onCancel = () => {},
  onSave = () => {},
  onChange,
  onRerender = () => {},
} = {}) {
  return {
    ...buildWidgetConfigPopupState({
      session,
      hass,
      visibilityConfig,
    }),
    onCancel,
    onSave,
    onChange: onChange || ((change) => {
      if (change?.rerender) onRerender();
    }),
  };
}

export function createWidgetConfigPanel(props = {}) {
  return createWidgetConfigPopup(buildWidgetConfigPanelProps(props));
}

export function syncWidgetConfigPanel(root, props = {}) {
  const existing = root?.querySelector?.(".mha-widget-config-popup");
  if (existing) existing.remove();
  root?.append?.(applyWidgetSurfaceHostLayoutState(root, createWidgetConfigPanel(props)));
  syncWidgetSurfaceOpenState(root);
}

export function buildPageCreatorPanelProps({
  open = false,
  themeStyle = "oneui",
  selectedPageType = "grid",
  onClose = () => {},
  onSelectPageType = () => {},
  onCreate = () => {},
} = {}) {
  return {
    themeStyle,
    ...buildPageCreatorState({
      open,
      themeStyle,
      selectedPageType,
    }),
    onClose,
    onSelectPageType,
    onCreate,
  };
}

export function createPageCreatorPanel(props = {}) {
  return createPageCreatorDomPanel(buildPageCreatorPanelProps(props));
}

export function syncPageCreatorPanel(root, props = {}) {
  const result = syncPageCreatorDomPanel(root, buildPageCreatorPanelProps(props));
  applyWidgetSurfaceHostLayoutState(root, result);
  syncWidgetSurfaceOpenState(root);
  return result;
}
