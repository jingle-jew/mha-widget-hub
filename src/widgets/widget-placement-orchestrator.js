import { createWidgetManager } from "../widget-manager/widget-manager.js";
import { buildWidgetManagerState } from "../widget-manager/widget-manager-props.js";
import { createWidgetConfigPopup } from "../widget-config/widget-config-popup.js";
import { buildWidgetConfigPopupState } from "../widget-config/widget-config-props.js";
import {
  createPageCreatorPanel as createPageCreatorDomPanel,
  syncPageCreatorPanel as syncPageCreatorDomPanel,
} from "../pages/page-creator.js";
import { buildPageCreatorState } from "../pages/page-creator-props.js";
import {
  applyWidgetSurfaceHostLayoutState,
  hasOpenWidgetSurface,
  syncWidgetSurfaceOpenState,
} from "../panels/widget-surface-state.js";

export {
  applyWidgetSurfaceHostLayoutState,
  hasOpenWidgetSurface,
  syncWidgetSurfaceOpenState,
} from "../panels/widget-surface-state.js";

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
  if (!root) return null;
  const existing = root?.querySelector?.(".mha-widget-manager-panel");
  if (!props.open) {
    existing?.remove?.();
    syncWidgetSurfaceOpenState(root);
    return null;
  }
  if (existing) existing.remove();
  const panel = applyWidgetSurfaceHostLayoutState(root, createWidgetManagerPanel(props));
  root?.append?.(panel);
  syncWidgetSurfaceOpenState(root);
  return panel;
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
  if (!root) return null;
  const existing = root?.querySelector?.(".mha-widget-config-popup");
  if (!props.session) {
    existing?.remove?.();
    syncWidgetSurfaceOpenState(root);
    return null;
  }
  if (existing) existing.remove();
  const panel = applyWidgetSurfaceHostLayoutState(root, createWidgetConfigPanel(props));
  root?.append?.(panel);
  syncWidgetSurfaceOpenState(root);
  return panel;
}

export function buildPageCreatorPanelProps({
  open = false,
  themeStyle = "oneui",
  selectedPageType = "grid",
  pageName = "",
  pageIcon = "grid",
  onClose = () => {},
  onSelectPageType = () => {},
  onPageNameChange = () => {},
  onPageIconChange = () => {},
  onCreate = () => {},
} = {}) {
  return {
    themeStyle,
    ...buildPageCreatorState({
      open,
      themeStyle,
      selectedPageType,
      pageName,
      pageIcon,
    }),
    onClose,
    onSelectPageType,
    onPageNameChange,
    onPageIconChange,
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
