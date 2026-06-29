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
].join(",");

export function syncWidgetSurfaceOpenState(root) {
  const host = root?.host;
  if (!host) return;
  const open = Boolean(root?.querySelector?.(OPEN_WIDGET_SURFACE_SELECTOR));
  host.classList.toggle("is-widget-surface-open", open);
  host.dataset.widgetSurfaceOpen = String(open);
}

export function buildWidgetManagerPanelProps({
  open = false,
  activeCategory = "",
  categories = [],
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
  root?.append?.(createWidgetManagerPanel(props));
  syncWidgetSurfaceOpenState(root);
}

export function buildWidgetConfigPanelProps({
  session = null,
  hass = null,
  visibilityConfig = null,
  onCancel = () => {},
  onSave = () => {},
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
    onChange: (change) => {
      if (change?.rerender) onRerender();
    },
  };
}

export function createWidgetConfigPanel(props = {}) {
  return createWidgetConfigPopup(buildWidgetConfigPanelProps(props));
}

export function syncWidgetConfigPanel(root, props = {}) {
  const existing = root?.querySelector?.(".mha-widget-config-popup");
  if (existing) existing.remove();
  root?.append?.(createWidgetConfigPanel(props));
  syncWidgetSurfaceOpenState(root);
}

export function buildPageCreatorPanelProps({
  open = false,
  selectedPageType = "grid",
  selectedIcon = "grid",
  onClose = () => {},
  onSelectPageType = () => {},
  onSelectIcon = () => {},
  onCreate = () => {},
} = {}) {
  return {
    ...buildPageCreatorState({
      open,
      selectedPageType,
      selectedIcon,
    }),
    onClose,
    onSelectPageType,
    onSelectIcon,
    onCreate,
  };
}

export function createPageCreatorPanel(props = {}) {
  return createPageCreatorDomPanel(buildPageCreatorPanelProps(props));
}

export function syncPageCreatorPanel(root, props = {}) {
  const result = syncPageCreatorDomPanel(root, buildPageCreatorPanelProps(props));
  syncWidgetSurfaceOpenState(root);
  return result;
}
