import { writeStorageValue } from "../core/storage.js";
import { LANGUAGE, normalizeLanguageSetting } from "../core/mha-persistence.js";
import { configureI18n, normalizeLanguage } from "../i18n/index.js";
import { syncSettingsPanels } from "./settings-panel-coordinator.js";

export function createI18nSettingsSync(host) {
  function configure() {
    const language = host._language && host._language !== "auto"
      ? normalizeLanguage(host._language)
      : "";
    configureI18n({
      config: language ? { language } : undefined,
      hass: host._hass,
    });
  }

  function syncSettingsModalState() {
    host.classList.toggle("is-settings-open", host._settingsOpen);
    host.dataset.settingsOpen = String(host._settingsOpen);
  }

  function syncSettingsDom() {
    syncSettingsModalState();
    const syncPanels = typeof host._syncSettingsPanels === "function"
      ? host._syncSettingsPanels
      : syncSettingsPanels;
    syncPanels({
      root: host.shadowRoot,
      props: host._getSettingsPanelsProps(),
    });
  }

  function openSettings(page = "main") {
    host._settingsOpen = true;
    host._settingsPage = page || "main";
    if (host._settingsPage !== "dock-detail") host._dockSettingsPageId = "";
    host._setScreensaverActive(false);
    host._screensaverController.clearIdleTimer();
    syncSettingsModalState();
    syncSettingsDom();
  }

  function closeSettings() {
    host._settingsOpen = false;
    host._settingsPage = "main";
    host._dockSettingsPageId = "";
    syncSettingsModalState();
    syncSettingsDom();
    host._scheduleScreensaverIdleTimer();
  }

  function applyLanguageFromSettings(value = "auto") {
    const language = normalizeLanguageSetting(value);
    host._language = language;
    if (language === "auto") localStorage.removeItem(LANGUAGE);
    else writeStorageValue(LANGUAGE, language);
    configure();
    syncSettingsDom();
    host._syncScreensaverSettingsDom();
    host._syncDocksDom();
    host._syncWidgetManagerDom();
    if (host._widgetConfigSession) host._syncWidgetConfigDom();
    host._syncScreensaverDom({ force: true });
    host._refreshActiveGridOnly();
  }

  return {
    configure,
    syncSettingsModalState,
    syncSettingsDom,
    openSettings,
    closeSettings,
    applyLanguageFromSettings,
  };
}
