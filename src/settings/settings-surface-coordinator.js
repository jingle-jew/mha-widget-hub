import {
  buildSettingsCoordinatorProps,
  syncSettingsPanels,
} from "./settings-panel-coordinator.js";

const SETTINGS_BACKDROP_SELECTOR = ".mha-settings-backdrop";

export function createSettingsSurfaceCoordinator(host) {
  function ensureSettingsBackdrop(root) {
    const existing = root?.querySelector?.(SETTINGS_BACKDROP_SELECTOR);
    if (existing) return existing;
    const backdrop = document.createElement("div");
    backdrop.className = "mha-settings-backdrop";
    backdrop.setAttribute("aria-hidden", "true");
    root?.append?.(backdrop);
    return backdrop;
  }

  function syncSettingsBackdrop() {
    const backdrop = ensureSettingsBackdrop(host.shadowRoot);
    const active = Boolean(host._settingsOpen || host._screensaverSettingsOpen);
    backdrop.hidden = !active;
    backdrop.dataset.active = String(active);
  }

  function getProps() {
    const themeState = host._themeController.read();
    const screensaverState = host._screensaverController.read();
    const responsiveState = host._getResponsiveState?.() || {};
    const settingsCapabilities = responsiveState.settingsCapabilities || {};
    return buildSettingsCoordinatorProps({
      settingsOpen: host._settingsOpen,
      screensaverSettingsOpen: host._screensaverSettingsOpen,
      language: host._language,
      hideHaSidebar: host._hideHaSidebar,
      showDockLabels: host._showDockLabels,
      statusBarMode: host._statusBarMode,
      accentPaletteExpanded: host._accentPaletteExpanded,
      settingsPage: host._settingsPage,
      dockPages: host._pages,
      activeDockPageId: host._activePageId,
      selectedDockPageId: host._dockSettingsPageId,
      dockPosition: host._dockPosition,
      isMobileLayout: Boolean(responsiveState.isMobileLayout ?? host._isMobileLauncherLayout?.()),
      isMobileLandscape: Boolean(settingsCapabilities.isMobileLandscape),
      customWallpapers: host._customWallpapers,
      hass: host._hass,
      entityVisibilityConfig: host._entityVisibilityConfig,
      themeState,
      screensaverState,
      hostIconShape: host.dataset.iconShape,
      documentIconShape: document.documentElement.dataset.iconShape,
      supportsScreensaver: settingsCapabilities.supportsScreensaver ?? !host._isMobileLauncherLayout?.(),
      supportsDockPosition: settingsCapabilities.supportsDockPosition ?? !(responsiveState.isMobileLayout ?? host._isMobileLauncherLayout?.()),
      supportsSidebarToggle: settingsCapabilities.supportsSidebarToggle ?? !(responsiveState.isMobileLayout ?? host._isMobileLauncherLayout?.()),
      showsStatusBarOptions: settingsCapabilities.showsStatusBarOptions ?? !(responsiveState.isMobileLayout ?? host._isMobileLauncherLayout?.()),
      callbacks: {
        onClose: () => host._closeSettings(),
        onCloseScreensaver: () => host._closeScreensaverSettings(),
        onLanguageChange: (value) => host._applyLanguageFromSettings(value),
        onThemeChange: (value) => host._applyThemeFromSettings(value),
        onThemeStyleChange: (value) => host._applyThemeStyleFromSettings(value),
        onIosGlassChange: (value) => host._applyIosGlassFromSettings(value),
        onAccentChange: (value) => host._applyAccentFromSettings(value),
        onAccentModeChange: (value) => host._applyAccentModeFromSettings(value),
        onAccentPaletteExpandedChange: (value) => host._setAccentPaletteExpanded(value),
        onIconShapeChange: (value) => host._applyIconShapeFromSettings(value),
        onHideHaSidebarChange: (value) => host._applyHideHaSidebarFromSettings(value),
        onShowDockLabelsChange: (value) => host._applyDockLabelsFromSettings(value),
        onStatusBarModeChange: (value) => host._applyStatusBarModeFromSettings(value),
        onScreensaverEnabledChange: (value) => host._applyScreensaverEnabledFromSettings(value),
        onScreensaverDelayChange: (value) => host._applyScreensaverDelayFromSettings(value),
        onScreensaverPreviewChange: (value) => host._applyScreensaverPreviewFromSettings(value),
        onScreensaverNowBarChange: (value) => host._applyScreensaverNowBarFromSettings(value),
        onScreensaverNowBarItemChange: (item, enabled) => host._applyScreensaverNowBarItemFromSettings(item, enabled),
        onScreensaverNowBarTileEnabledChange: (tile, enabled) => host._applyScreensaverNowBarTileEnabledFromSettings(tile, enabled),
        onScreensaverNowBarEntitySelectionChange: (section, entityId, selected) => (
          host._applyScreensaverNowBarEntitySelectionFromSettings(section, entityId, selected)
        ),
        onScreensaverNowBarNowItemChange: (item, selected) => host._applyScreensaverNowBarNowItemFromSettings(item, selected),
        onScreensaverClockVariantChange: (value) => host._applyScreensaverClockVariantFromSettings(value),
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

  function syncSettingsOpenState() {
    host.classList.toggle("is-settings-open", host._settingsOpen);
    host.dataset.settingsOpen = String(host._settingsOpen);
  }

  function syncScreensaverOpenState() {
    host.classList.toggle("is-screensaver-settings-open", host._screensaverSettingsOpen);
    host.dataset.screensaverSettingsOpen = String(host._screensaverSettingsOpen);
  }

  function sync() {
    syncSettingsOpenState();
    syncScreensaverOpenState();
    syncSettingsBackdrop();
    const syncPanels = typeof host._syncSettingsPanels === "function"
      ? host._syncSettingsPanels
      : syncSettingsPanels;
    syncPanels({
      root: host.shadowRoot,
      props: getProps(),
    });
  }

  return {
    getProps,
      sync,
      syncSettingsOpenState,
      syncScreensaverOpenState,
      syncSettingsBackdrop,
    };
}
