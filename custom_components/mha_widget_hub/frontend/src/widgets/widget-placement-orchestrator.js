import { createWidgetManager } from "../widget-manager/widget-manager.js";
import { buildWidgetManagerState } from "../widget-manager/widget-manager-props.js";
import { createWidgetConfigPopup } from "../widget-config/widget-config-popup.js";
import { buildWidgetConfigPopupState } from "../widget-config/widget-config-props.js";
import { createPageCreatorPanel as createPageCreatorDomPanel } from "../pages/page-creator.js";
import { buildPageCreatorState } from "../pages/page-creator-props.js";

const PANEL_EXIT_ANIMATION_MS = 420;
const PANEL_EXIT_TIMEOUT = "__mhaPanelExitTimeout";
const PANEL_OPEN_FRAME = "__mhaPanelOpenFrame";

function setPanelOpenState(panel, open) {
  if (!panel) return;
  panel.dataset.open = String(open);
  panel.setAttribute("aria-hidden", String(!open));
}

function findPanel(root, selector) {
  if (!root) return null;
  if (typeof root.querySelector === "function") {
    return root.querySelector(selector);
  }
  if (typeof root.querySelectorAll === "function") {
    return root.querySelectorAll(selector)?.[0] || null;
  }
  return null;
}

function clearPanelAnimationHandles(panel) {
  if (!panel) return;
  if (panel[PANEL_EXIT_TIMEOUT]) {
    clearTimeout(panel[PANEL_EXIT_TIMEOUT]);
    panel[PANEL_EXIT_TIMEOUT] = null;
  }
  if (panel[PANEL_OPEN_FRAME]) {
    cancelAnimationFrame(panel[PANEL_OPEN_FRAME]);
    panel[PANEL_OPEN_FRAME] = null;
  }
}

function schedulePanelOpen(panel) {
  if (!panel) return;
  if (typeof requestAnimationFrame !== "function") {
    setPanelOpenState(panel, true);
    return;
  }
  panel[PANEL_OPEN_FRAME] = requestAnimationFrame(() => {
    panel[PANEL_OPEN_FRAME] = null;
    setPanelOpenState(panel, true);
  });
}

function appendPanelWithEntry(root, panel) {
  if (!root || !panel) return;
  setPanelOpenState(panel, false);
  root.append(panel);
  schedulePanelOpen(panel);
}

function closePanelWithExit(panel) {
  if (!panel) return;
  clearPanelAnimationHandles(panel);
  setPanelOpenState(panel, false);
  panel[PANEL_EXIT_TIMEOUT] = setTimeout(() => {
    panel[PANEL_EXIT_TIMEOUT] = null;
    panel.remove();
  }, PANEL_EXIT_ANIMATION_MS);
}

function syncAnimatedPanel(root, selector, createPanel, props, shouldOpen) {
  if (!root) return;
  const existing = findPanel(root, selector);

  if (!shouldOpen) {
    if (existing) closePanelWithExit(existing);
    return;
  }

  const nextPanel = createPanel(props);
  if (!nextPanel) return;

  if (existing?.dataset?.open === "true") {
    clearPanelAnimationHandles(existing);
    if (typeof existing.replaceWith === "function") {
      existing.replaceWith(nextPanel);
    } else {
      existing.remove?.();
      root.append?.(nextPanel);
    }
    setPanelOpenState(nextPanel, true);
    return;
  }

  if (existing) existing.remove();
  appendPanelWithEntry(root, nextPanel);
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
  syncAnimatedPanel(
    root,
    ".mha-widget-manager-panel",
    createWidgetManagerPanel,
    props,
    Boolean(props.open),
  );
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
  syncAnimatedPanel(
    root,
    ".mha-widget-config-popup",
    createWidgetConfigPanel,
    props,
    Boolean(props.session),
  );
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
  syncAnimatedPanel(
    root,
    "section.mha-page-creator:not(.mha-widget-config-popup)",
    createPageCreatorPanel,
    props,
    Boolean(props.open),
  );
}
