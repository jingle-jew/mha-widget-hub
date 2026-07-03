import { createDeviceInsightsPublisher } from "../device-insights/device-insights-publisher.js";
import { readJson } from "./storage.js";
import {
  POSITIONS,
  getStoredDockLabels,
  getStoredDockPosition,
  getStoredHideHaSidebar,
  getStoredLanguageSetting,
  getStoredStatusBarMode,
} from "./mha-persistence.js";
import {
  getHubActivePage,
  migrateHubPageStorage,
  normalizeHubPage,
  readActivePageWidgets,
  readHubActivePageId,
  readHubPages,
  saveHubPages,
  syncActivePageWidgets,
} from "./mha-state.js";
import { loadEntityVisibilityConfig } from "../admin/entity-visibility-store.js";

function getDeviceInsightsPublisher(host) {
  if (!host._deviceInsightsPublisher) {
    host._deviceInsightsPublisher = createDeviceInsightsPublisher(host);
  }
  return host._deviceInsightsPublisher;
}

export function createHubStateIngressCoordinator(host, {
  defaultWidgets = [],
  normalizeWidget,
  normalizeWidgetForGrid,
} = {}) {
  function recordPersistenceResult(success) {
    host.dataset.persistenceState = success ? "saved" : "error";
    return success;
  }

  function scheduleDeviceInsightsPublish(delay = 0) {
    getDeviceInsightsPublisher(host).schedulePublish(delay);
  }

  function migrateStorageSchema() {
    const result = migrateHubPageStorage({
      defaultWidgets,
      normalizeWidget,
      normalizeWidgetForGrid,
    });
    if (result.migrated) recordPersistenceResult(result.success);
  }

  function normalizePage(page = {}, index = 0) {
    return normalizeHubPage(page, index, { normalizeWidget });
  }

  function readPages() {
    const result = readHubPages({ normalizeWidget });
    if (result.persistenceResult !== null) recordPersistenceResult(result.persistenceResult);
    return result.pages;
  }

  function readActivePageId() {
    const result = readHubActivePageId(host._pages);
    if (result.persistenceResult !== null) recordPersistenceResult(result.persistenceResult);
    return result.activePageId;
  }

  function getActivePage() {
    return getHubActivePage(host._pages, host._activePageId);
  }

  function savePages() {
    const success = recordPersistenceResult(saveHubPages(
      host._pages,
      host._activePageId,
      { normalizeWidget },
    ));
    if (success) scheduleDeviceInsightsPublish();
    return success;
  }

  function readWidgets() {
    return readActivePageWidgets({
      pages: host._pages,
      activePageId: host._activePageId,
      normalizeWidget,
      normalizeWidgetForGrid,
    });
  }

  function syncActivePageWidgetsToStorage() {
    const success = syncActivePageWidgets({
      pages: host._pages,
      activePageId: host._activePageId,
      widgets: host._widgets,
      normalizeWidget,
    });
    if (!success) return false;
    recordPersistenceResult(success);
    scheduleDeviceInsightsPublish();
    return success;
  }

  function initialize() {
    if (host._initialized) return;
    host._initialized = true;
    host.attachShadow({ mode: "open" });
    host.dataset.bootState = "booting";
    host.dataset.dataState = host._hass ? "ready" : "loading";
    host.dataset.widgetsState = "pending";
    host.dataset.ready = "false";
    host.shadowRoot.innerHTML = host._createCriticalBootStyle();
    getDeviceInsightsPublisher(host);
    migrateStorageSchema();
    host._widgetPositions = readJson(POSITIONS, {}) || {};
    host._screensaverController.load({
      enabledFallback: true,
    });
    host._dockPosition = getStoredDockPosition();
    host._hideHaSidebar = getStoredHideHaSidebar();
    host._showDockLabels = getStoredDockLabels();
    host._statusBarMode = getStoredStatusBarMode();
    host._language = getStoredLanguageSetting();
    host._configureI18n();
    host._applyHaSidebarMode(host._hideHaSidebar);
    host._migrateLegacyCustomWallpaper();
    host._customWallpapers = host._readCustomWallpapers();
    host._applyCustomWallpaperState();
    host._syncAutoAccentFromWallpaper();
    host._pages = readPages();
    host._activePageId = readActivePageId();
    host._widgets = readWidgets();
    host._upgradePredefinedProperty("hass");
    scheduleDeviceInsightsPublish(1000);
  }

  async function loadEntityVisibilityConfigForHass(hass) {
    const userId = String(hass?.user?.id || "");
    if (!userId || userId === host._entityVisibilityUserId) return;
    host._entityVisibilityUserId = userId;
    try {
      const config = await loadEntityVisibilityConfig(hass);
      if (host._entityVisibilityUserId !== userId) return;
      host._entityVisibilityConfig = config;
      if (host._widgetConfigSession) host._syncWidgetConfigDom();
      host._syncSettingsDom();
      if (host.isConnected) host._refreshActiveGridOnly();
    } catch (error) {
      console.warn("[MHA] Entity visibility configuration could not be loaded.", error);
    }
  }

  function setHass(hass) {
    host._hass = hass;
    host._configureI18n();
    loadEntityVisibilityConfigForHass(hass);
    host.dataset.dataState = hass ? "ready" : "loading";
    if (host._widgetConfigSession && hass && !host._widgetConfigHassReady) {
      host._widgetConfigHassReady = true;
      host._syncWidgetConfigDom();
    }
    if (hass) scheduleDeviceInsightsPublish(1000);
    host._ensureMounted({ reason: "hass update" });
    host._scheduleHassUpdate();
  }

  return {
    recordPersistenceResult,
    migrateStorageSchema,
    normalizePage,
    readPages,
    readActivePageId,
    getActivePage,
    savePages,
    readWidgets,
    syncActivePageWidgets: syncActivePageWidgetsToStorage,
    initialize,
    loadEntityVisibilityConfig: loadEntityVisibilityConfigForHass,
    setHass,
  };
}
