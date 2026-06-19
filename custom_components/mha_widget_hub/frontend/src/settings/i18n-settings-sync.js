import { writeStorageValue } from "../core/storage.js";
import { LANGUAGE, normalizeLanguageSetting } from "../core/mha-persistence.js";
import { configureI18n, normalizeLanguage } from "../i18n/index.js";

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

  function getSettingsSurface() {
    return host._settingsSurfaceCoordinator;
  }

  function syncSettingsModalState() {
    return getSettingsSurface().syncSettingsOpenState();
  }

  function syncSettingsDom() {
    return getSettingsSurface().sync();
  }

  function openSettingsPage(page = "main", { dockPageId = "" } = {}) {
    host._settingsOpen = true;
    host._settingsPage = page || "main";
    host._dockSettingsPageId = host._settingsPage === "dock-detail" ? dockPageId : "";
    host._setScreensaverActive(false);
    host._screensaverController.clearIdleTimer();
    syncSettingsDom();
  }

  function openSettings(page = "main") {
    openSettingsPage(page);
  }

  function closeSettings() {
    host._settingsOpen = false;
    host._settingsPage = "main";
    host._dockSettingsPageId = "";
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
    openSettingsPage,
    openSettings,
    closeSettings,
    applyLanguageFromSettings,
  };
}
