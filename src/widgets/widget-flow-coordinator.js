import {
  buildConfiguredWidget,
  createWidgetConfigSession,
  supportsWidgetConfiguration,
} from "../widget-config/widget-config-popup.js";
import { getScenesDefaultButtonIndex } from "../widget-config/widget-config-props.js";
import { WIDGET_MANAGER_CATEGORIES } from "../widget-manager/widget-manager.js";
import {
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  syncWidgetConfigPanel,
  syncWidgetManagerPanel,
} from "./widget-placement-orchestrator.js";
import { createWidgetFromCatalogItem } from "./widget-factory.js";
import { getWidgetPlacementFlow } from "./widget-registry.js";
import { normalizeStoredWidgetContract } from "./widget-storage.js";

export function createWidgetFlowCoordinator({
  getRoot = () => null,
  getIsEditing = () => false,
  isMobileLandscapeLayout = () => false,
  getWidgetManagerOpen = () => false,
  setWidgetManagerOpen = () => {},
  getWidgetManagerCategory = () => "",
  setWidgetManagerCategory = () => {},
  getWidgetConfigSession = () => null,
  setWidgetConfigSession = () => {},
  getHass = () => null,
  getWidgetConfigHassReady = () => false,
  setWidgetConfigHassReady = () => {},
  getEntityVisibilityConfig = () => null,
  getPendingWidgetPlacement = () => null,
  setPendingWidgetPlacement = () => {},
  getActiveMoveWidgetId = () => "",
  setActiveMoveWidgetId = () => {},
  getWidgets = () => [],
  setWidgets = () => {},
  syncEditModeDom = () => {},
  syncWidgetDropSlots = () => {},
  replaceWidgetDom = () => {},
  saveWidgets = () => {},
} = {}) {
  function getWidgetManagerCategories() {
    return WIDGET_MANAGER_CATEGORIES;
  }

  function buildWidgetManagerProps() {
    return buildWidgetManagerPanelProps({
      open: getWidgetManagerOpen(),
      activeCategory: getWidgetManagerCategory(),
      categories: getWidgetManagerCategories(),
      onClose: () => closeWidgetManager(),
      onBack: () => showWidgetManagerCategories(),
      onSelectCategory: (id) => selectWidgetManagerCategory(id),
      onSelectWidget: (item) => beginWidgetPlacement(item),
    });
  }

  function syncWidgetManagerDom() {
    syncWidgetManagerPanel(getRoot(), buildWidgetManagerProps());
  }

  function openWidgetManager() {
    if (!getIsEditing() || isMobileLandscapeLayout()) return;
    setPendingWidgetPlacement(null);
    setActiveMoveWidgetId("");
    setWidgetManagerOpen(true);
    setWidgetManagerCategory("");
    syncEditModeDom();
    syncWidgetDropSlots();
    syncWidgetManagerDom();
  }

  function closeWidgetManager() {
    setWidgetManagerOpen(false);
    setWidgetManagerCategory("");
    syncWidgetManagerDom();
  }

  function showWidgetManagerCategories() {
    setWidgetManagerCategory("");
    syncWidgetManagerDom();
  }

  function selectWidgetManagerCategory(id) {
    setWidgetManagerCategory(id);
    syncWidgetManagerDom();
  }

  function startWidgetPlacement(widget) {
    setPendingWidgetPlacement(widget);
    setWidgetManagerOpen(false);
    setWidgetManagerCategory("");
    setActiveMoveWidgetId("");
    syncWidgetManagerDom();
    syncEditModeDom();
    syncWidgetDropSlots();
  }

  function createSession(widget, options = {}) {
    return createWidgetConfigSession(widget, getHass(), {
      visibilityConfig: getEntityVisibilityConfig(),
      ...options,
    });
  }

  function syncWidgetConfigDom() {
    syncWidgetConfigPanel(getRoot(), buildWidgetConfigPanelProps({
      session: getWidgetConfigSession(),
      hass: getHass(),
      visibilityConfig: getEntityVisibilityConfig(),
      onCancel: () => closeWidgetConfig(),
      onSave: () => saveWidgetConfig(),
      onRerender: () => syncWidgetConfigDom(),
    }));
  }

  function beginWidgetPlacement(item) {
    if (!getIsEditing() || isMobileLandscapeLayout()) return;
    const widget = createWidgetFromCatalogItem(item);
    const placementFlow = getWidgetPlacementFlow(widget);
    if (placementFlow === "direct") {
      startWidgetPlacement(widget);
      return;
    }
    if (placementFlow === "slot-config-first") {
      setWidgetManagerOpen(false);
      setWidgetManagerCategory("");
      setWidgetConfigSession(createSession(widget, { mode: "create" }));
      setWidgetConfigHassReady(Boolean(getHass()));
      syncWidgetManagerDom();
      syncWidgetConfigDom();
      return;
    }
    if (placementFlow === "configure-first" && supportsWidgetConfiguration(widget)) {
      setWidgetManagerOpen(false);
      setWidgetManagerCategory("");
      setWidgetConfigSession(createSession(widget, { mode: "create" }));
      setWidgetConfigHassReady(Boolean(getHass()));
      syncWidgetManagerDom();
      syncWidgetConfigDom();
      return;
    }
    startWidgetPlacement(widget);
  }

  function closeWidgetConfig() {
    setWidgetConfigSession(null);
    setWidgetConfigHassReady(false);
    syncWidgetConfigDom();
  }

  function saveWidgetConfig() {
    const session = getWidgetConfigSession();
    const configured = buildConfiguredWidget(
      session,
      getHass(),
      getEntityVisibilityConfig(),
    );
    if (!session || !configured) return;
    setWidgetConfigSession(null);
    setWidgetConfigHassReady(false);
    syncWidgetConfigDom();
    if (session.mode === "create") {
      startWidgetPlacement(configured);
      return;
    }
    const widgets = getWidgets();
    const index = widgets.findIndex((widget) => widget.id === configured.id);
    if (index < 0) return;
    setWidgets([
      ...widgets.slice(0, index),
      normalizeStoredWidgetContract(configured),
      ...widgets.slice(index + 1),
    ]);
    saveWidgets();
    replaceWidgetDom(configured.id);
  }

  function openWidgetConfig(id) {
    if (!getIsEditing() || isMobileLandscapeLayout()) return;
    const widget = getWidgets().find((item) => item.id === id);
    if (!supportsWidgetConfiguration(widget)) return;
    if (widget?.kind === "scenes") {
      openScenesButtonConfig(id);
      return;
    }
    setActiveMoveWidgetId("");
    setWidgetConfigSession(createSession(widget, { mode: "edit" }));
    setWidgetConfigHassReady(Boolean(getHass()));
    syncEditModeDom();
    syncWidgetConfigDom();
  }

  function getDefaultScenesButtonIndex(widget) {
    return getScenesDefaultButtonIndex(widget);
  }

  function openScenesButtonConfig(id, buttonIndex) {
    if (isMobileLandscapeLayout()) return;
    const widget = getWidgets().find((item) => item.id === id);
    if (!widget || widget.kind !== "scenes") return;
    const resolvedButtonIndex = Number.isInteger(buttonIndex)
      ? buttonIndex
      : getDefaultScenesButtonIndex(widget);
    setActiveMoveWidgetId("");
    setWidgetConfigSession(createSession(widget, {
      mode: "edit",
      buttonIndex: resolvedButtonIndex,
    }));
    setWidgetConfigHassReady(Boolean(getHass()));
    syncEditModeDom();
    syncWidgetConfigDom();
  }

  return {
    getWidgetManagerCategories,
    syncWidgetManagerDom,
    openWidgetManager,
    closeWidgetManager,
    showWidgetManagerCategories,
    selectWidgetManagerCategory,
    beginWidgetPlacement,
    startWidgetPlacement,
    syncWidgetConfigDom,
    closeWidgetConfig,
    saveWidgetConfig,
    openWidgetConfig,
    getDefaultScenesButtonIndex,
    openScenesButtonConfig,
  };
}
