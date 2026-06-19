import { buildSettingsCoordinatorProps, syncSettingsPanels } from "../settings/settings-panel-coordinator.js";

export function createScreensaverSettingsBridge(host) {
  function getSettingsPanelsProps() {
    const themeState = host._themeController.read();
    const screensaverState = host._screensaverController.read();
    return buildSettingsCoordinatorProps({
      settingsOpen: host._settingsOpen,
      screensaverSettingsOpen: host._screensaverSettingsOpen,
      language: host._language,
      hideHaSidebar: host._hideHaSidebar,
      accentPaletteExpanded: host._accentPaletteExpanded,
      settingsPage: host._settingsPage,
      dockPages: host._pages,
      activeDockPageId: host._activePageId,
      selectedDockPageId: host._dockSettingsPageId,
      dockPosition: host._dockPosition,
      customWallpapers: host._customWallpapers,
      hass: host._hass,
      entityVisibilityConfig: host._entityVisibilityConfig,
      themeState,
      screensaverState,
      hostIconShape: host.dataset.iconShape,
      documentIconShape: document.documentElement.dataset.iconShape,
      callbacks: {
        onClose: () => host._closeSettings(),
        onCloseScreensaver: () => closeScreensaverSettings(),
        onLanguageChange: (value) => host._applyLanguageFromSettings(value),
        onThemeChange: (value) => host._applyThemeFromSettings(value),
        onThemeStyleChange: (value) => host._applyThemeStyleFromSettings(value),
        onIosGlassChange: (value) => host._applyIosGlassFromSettings(value),
        onAccentChange: (value) => host._applyAccentFromSettings(value),
        onAccentModeChange: (value) => host._applyAccentModeFromSettings(value),
        onAccentPaletteExpandedChange: (value) => host._setAccentPaletteExpanded(value),
        onIconShapeChange: (value) => host._applyIconShapeFromSettings(value),
        onHideHaSidebarChange: (value) => host._applyHideHaSidebarFromSettings(value),
        onScreensaverEnabledChange: (value) => applyEnabledFromSettings(value),
        onScreensaverDelayChange: (value) => applyDelayFromSettings(value),
        onScreensaverPreviewChange: (value) => applyPreviewFromSettings(value),
        onScreensaverNowBarChange: (value) => applyNowBarFromSettings(value),
        onScreensaverNowBarItemChange: (item, enabled) => applyNowBarItemFromSettings(item, enabled),
        onScreensaverNowBarTileEnabledChange: (tile, enabled) => applyNowBarTileEnabledFromSettings(tile, enabled),
        onScreensaverNowBarEntitySelectionChange: (section, entityId, selected) => (
          applyNowBarEntitySelectionFromSettings(section, entityId, selected)
        ),
        onScreensaverNowBarNowItemChange: (item, selected) => applyNowBarNowItemFromSettings(item, selected),
        onScreensaverClockVariantChange: (value) => applyClockVariantFromSettings(value),
        onResetGrid: () => host.resetGrid(),
        onOpenWallpaperSettings: () => host._openWallpaperSettings(),
        onOpenNowBarSettings: () => host._openNowBarSettings(),
        onWallpaperMainBack: () => host._openSettings(),
        onOpenDockSettings: () => host._openDockSettings(),
        onDockBack: () => host._openDockSettings(),
        onDockPageSelect: (id) => host._openDockPageSettings(id),
        onDockMovePage: (id, direction) => host._moveDockPage(id, direction),
        onDockDeletePage: (id) => host._deleteDockPage(id),
        onDockMainBack: () => host._openSettings(),
        onDockRenamePage: (id, name) => host._renameDockPage(id, name),
        onDockIconChange: (id, icon) => host._changeDockPageIcon(id, icon),
        onDockPositionChange: (value) => host._applyDockPositionFromSettings(value),
        onWallpaperImport: (mode, payload) => host._saveCustomWallpaper(mode, payload),
        onWallpaperReset: (mode) => host._resetCustomWallpaper(mode),
      },
    });
  }

  function openScreensaverSettings() {
    host._screensaverSettingsOpen = true;
    syncScreensaverSettingsDom();
  }

  function closeScreensaverSettings() {
    host._screensaverSettingsOpen = false;
    syncScreensaverSettingsDom();
  }

  function syncScreensaverSettingsDom() {
    host.classList.toggle("is-screensaver-settings-open", host._screensaverSettingsOpen);
    host.dataset.screensaverSettingsOpen = String(host._screensaverSettingsOpen);
    const syncPanels = typeof host._syncSettingsPanels === "function"
      ? host._syncSettingsPanels
      : syncSettingsPanels;
    syncPanels({
      root: host.shadowRoot,
      props: getSettingsPanelsProps(),
    });
  }

  function isBlocked() {
    return host._settingsOpen || host._isEditing;
  }

  function getVisible() {
    return host._screensaverController.isVisible();
  }

  function setActive(active = false) {
    host._screensaverController.setActive(active);
    syncDom();
  }

  function scheduleIdleTimer() {
    host._screensaverController.scheduleIdleTimer();
  }

  function handleUserActivity() {
    const deactivated = host._screensaverController.handleActivity({
      settingsOpen: host._screensaverSettingsOpen,
    });
    if (deactivated) syncDom();
  }

  function syncSettingsSurfaces() {
    host._syncSettingsDom();
    syncScreensaverSettingsDom();
  }

  function syncNowBarCalendarEvents({ force = false } = {}) {
    host._screensaverCoordinator.requestNowBarCalendarEvents({ force });
  }

  function applyEnabledFromSettings(enabled = false) {
    host._recordPersistenceResult(host._screensaverController.setEnabled(enabled));
    syncDom();
    syncSettingsSurfaces();
  }

  function applyDelayFromSettings(delay = 30000) {
    host._recordPersistenceResult(host._screensaverController.setDelay(delay));
    syncSettingsSurfaces();
  }

  function applyPreviewFromSettings(enabled = false) {
    host._screensaverController.setPreview(enabled);
    syncDom();
    syncSettingsSurfaces();
  }

  function applyNowBarFromSettings(enabled = true) {
    host._recordPersistenceResult(host._screensaverController.setNowBar(enabled));
    syncDom();
    syncSettingsSurfaces();
  }

  function applyNowBarItemFromSettings(item = "", enabled = true) {
    host._recordPersistenceResult(host._screensaverController.setNowBarItem(item, enabled));
    syncNowBarCalendarEvents();
    syncDom();
    syncSettingsSurfaces();
  }

  function applyNowBarTileEnabledFromSettings(tile = "", enabled = true) {
    host._recordPersistenceResult(host._screensaverController.setNowBarTileEnabled(tile, enabled));
    syncNowBarCalendarEvents();
    syncDom();
    syncSettingsSurfaces();
  }

  function applyNowBarEntitySelectionFromSettings(section = "", entityId = "", selected = true) {
    host._recordPersistenceResult(
      host._screensaverController.setNowBarEntitySelection(section, entityId, selected),
    );
    syncNowBarCalendarEvents({ force: section === "calendar" });
    syncDom();
    syncSettingsSurfaces();
  }

  function applyNowBarNowItemFromSettings(item = "", selected = true) {
    host._recordPersistenceResult(host._screensaverController.setNowBarNowItem(item, selected));
    syncDom();
    syncSettingsSurfaces();
  }

  function applyClockVariantFromSettings(variant = "digital") {
    host._recordPersistenceResult(host._screensaverController.setClockVariant(variant));
    syncDom();
    syncSettingsSurfaces();
  }

  function syncVisibilityState() {
    const visible = getVisible();
    host.classList.toggle("is-screensaver-visible", visible);
    host.dataset.screensaverVisible = String(visible);
  }

  function syncDom({ force = false } = {}) {
    host._screensaverCoordinator.syncDom(host.shadowRoot, { force });
  }

  return {
    getSettingsPanelsProps,
    openScreensaverSettings,
    closeScreensaverSettings,
    syncScreensaverSettingsDom,
    isBlocked,
    getVisible,
    setActive,
    scheduleIdleTimer,
    handleUserActivity,
    applyEnabledFromSettings,
    applyDelayFromSettings,
    applyPreviewFromSettings,
    applyNowBarFromSettings,
    applyNowBarItemFromSettings,
    applyNowBarTileEnabledFromSettings,
    applyNowBarEntitySelectionFromSettings,
    applyNowBarNowItemFromSettings,
    applyClockVariantFromSettings,
    syncVisibilityState,
    syncDom,
  };
}
