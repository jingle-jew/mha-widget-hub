import {
  buildConfiguredWidget,
  createWidgetConfigSession,
  supportsWidgetConfiguration,
} from "../widget-config/widget-config-popup.js";
import { t } from "../i18n/index.js";
import { getScenesDefaultButtonIndex } from "../widget-config/widget-config-props.js";
import { WIDGET_MANAGER_CATEGORIES } from "../widget-manager/widget-manager.js";
import { isWeatherPage } from "../pages/page-types.js";
import {
  buildWeatherPageWidgetManagerCategory,
  discoverWeatherPageWidgetManagerCategory,
  WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID,
} from "../pages/weather-page-widget-catalog.js";
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
  getActivePage = () => null,
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
  let weatherManagerDiscoveryKey = "";
  let weatherManagerDiscoveryRequestId = 0;
  let weatherManagerDiscoveredCategory = null;

  function getWeatherManagerContext() {
    const activePage = getActivePage();
    if (!isWeatherPage(activePage)) return null;
    const weatherEntityId = activePage?.config?.weatherEntityId || "";
    return {
      activePage,
      weatherEntityId,
      key: `${activePage?.id || "weather"}:${weatherEntityId}`,
    };
  }

  function getWidgetManagerCategories() {
    const weatherContext = getWeatherManagerContext();
    if (weatherContext) {
      if (
        weatherManagerDiscoveredCategory
        && weatherManagerDiscoveryKey === weatherContext.key
      ) {
        return [weatherManagerDiscoveredCategory];
      }
      return [buildWeatherPageWidgetManagerCategory({
        hass: getHass(),
        visibilityConfig: getEntityVisibilityConfig(),
        weatherEntityId: weatherContext.weatherEntityId,
      })];
    }
    return WIDGET_MANAGER_CATEGORIES;
  }

  function isWeatherWidgetManagerActive() {
    return Boolean(getWeatherManagerContext());
  }

  function refreshWeatherWidgetManagerCategory() {
    const weatherContext = getWeatherManagerContext();
    const hass = getHass();
    if (!weatherContext || !hass) return;
    const requestId = ++weatherManagerDiscoveryRequestId;
    weatherManagerDiscoveryKey = weatherContext.key;
    discoverWeatherPageWidgetManagerCategory({
      hass,
      visibilityConfig: getEntityVisibilityConfig(),
      weatherEntityId: weatherContext.weatherEntityId,
    }).then((category) => {
      if (requestId !== weatherManagerDiscoveryRequestId) return;
      if (!isWeatherWidgetManagerActive() || !getWidgetManagerOpen()) return;
      const currentContext = getWeatherManagerContext();
      if (!currentContext || currentContext.key !== weatherContext.key) return;
      weatherManagerDiscoveredCategory = category;
      syncWidgetManagerDom();
    }).catch((error) => {
      console.warn("[mha-widget-hub] Weather widget manager discovery failed.", error);
    });
  }

  function buildWidgetManagerProps() {
    const weatherManager = isWeatherWidgetManagerActive();
    return buildWidgetManagerPanelProps({
      open: getWidgetManagerOpen(),
      activeCategory: getWidgetManagerCategory(),
      categories: getWidgetManagerCategories(),
      singleCategory: weatherManager,
      emptyLabel: weatherManager ? t("widgets.weatherManager.empty", "No weather widgets available for this integration.") : "",
      onClose: () => closeWidgetManager(),
      onBack: () => showWidgetManagerCategories(),
      onSelectCategory: (id) => selectWidgetManagerCategory(id),
      onSelectWidget: (item) => beginWidgetPlacement(item),
    });
  }

  function syncWidgetManagerDom() {
    syncWidgetManagerPanel(getRoot(), buildWidgetManagerProps());
  }

  function openWidgetManager(initialCategory = "") {
    if (!getIsEditing()) return;
    const category = initialCategory || (isWeatherWidgetManagerActive() ? WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID : "");
    setPendingWidgetPlacement(null);
    setActiveMoveWidgetId("");
    setWidgetManagerOpen(true);
    setWidgetManagerCategory(category);
    syncEditModeDom();
    syncWidgetDropSlots();
    syncWidgetManagerDom();
    if (category === WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID) {
      refreshWeatherWidgetManagerCategory();
    }
  }

  function closeWidgetManager() {
    setWidgetManagerOpen(false);
    setWidgetManagerCategory("");
    syncWidgetManagerDom();
  }

  function showWidgetManagerCategories() {
    if (isWeatherWidgetManagerActive()) {
      setWidgetManagerCategory(WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID);
      syncWidgetManagerDom();
      return;
    }
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
      themeStyle: getRoot()?.host?.dataset?.themeStyle
        || globalThis.document?.documentElement?.dataset?.themeStyle
        || "",
      ...options,
    });
  }

  function hasPreconfiguredWeatherForecastIntent(widget = {}) {
    return widget.kind === "weather"
      && widget.displayMode === "forecast"
      && ["daily", "hourly"].includes(widget.forecastType);
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
    if (!getIsEditing()) return;
    const widget = createWidgetFromCatalogItem(item);
    if (isWeatherWidgetManagerActive() && hasPreconfiguredWeatherForecastIntent(widget)) {
      startWidgetPlacement(widget);
      return;
    }
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
    if (!getIsEditing()) return;
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
