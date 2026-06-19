export function createScreensaverSettingsBridge(host) {
  function getSettingsSurface() {
    return host._settingsSurfaceCoordinator;
  }

  function getSettingsPanelsProps() {
    return getSettingsSurface().getProps();
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
    getSettingsSurface().syncScreensaverOpenState();
    getSettingsSurface().sync();
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
