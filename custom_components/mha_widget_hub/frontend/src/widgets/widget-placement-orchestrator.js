import { createWidgetManager } from "../widget-manager/widget-manager.js";
import { buildWidgetManagerState } from "../widget-manager/widget-manager-props.js";
import { createWidgetConfigPopup } from "../widget-config/widget-config-popup.js";
import { buildWidgetConfigPopupState } from "../widget-config/widget-config-props.js";
import {
  createPageCreatorPanel as createPageCreatorDomPanel,
  syncPageCreatorPanel as syncPageCreatorDomPanel,
} from "../pages/page-creator.js";
import { buildPageCreatorState } from "../pages/page-creator-props.js";

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
}

export function buildPageCreatorPanelProps({
  open = false,
  selectedIcon = "grid",
  onClose = () => {},
  onSelectIcon = () => {},
  onCreate = () => {},
} = {}) {
  return {
    ...buildPageCreatorState({
      open,
      selectedIcon,
    }),
    onClose,
    onSelectIcon,
    onCreate,
  };
}

export function createPageCreatorPanel(props = {}) {
  return createPageCreatorDomPanel(buildPageCreatorPanelProps(props));
}

export function syncPageCreatorPanel(root, props = {}) {
  return syncPageCreatorDomPanel(root, buildPageCreatorPanelProps(props));
}
