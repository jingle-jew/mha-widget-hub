import {
  extractAccentFromWallpaper,
  resolveAccentFromColorValue,
} from "./wallpaper-accent.js";

function clearAutoAccentVars(host) {
  host?.style?.removeProperty?.("--mha-accent-auto");
  host?.style?.removeProperty?.("--mha-accent-auto-contrast");
}

const THEME_STYLE_CROSSFADE_MS = 1400;

export class AppearanceCoordinator {
  constructor({
    host = null,
    getRoot = () => null,
    isConnected = () => false,
    getCustomWallpapers = () => ({ light: null, dark: null }),
    setCustomWallpapers = () => {},
    readThemeState = () => ({}),
    syncTheme = () => ({}),
    setTheme = () => ({}),
    setThemeStyle = () => ({}),
    setIosGlass = () => ({}),
    setAccent = () => ({}),
    setAccentMode = () => ({}),
    setIconShape = () => ({}),
    setOneUiPrimarySurfaceOpacity = () => ({}),
    migrateLegacyWallpaper = () => {},
    readWallpapers = () => ({ light: null, dark: null }),
    applyWallpaperState = () => ({ light: null, dark: null }),
    saveWallpaper = () => ({ light: null, dark: null }),
    resetWallpaper = () => ({ light: null, dark: null }),
    getActiveAccentSource = () => ({ source: "theme", kind: "none", value: "" }),
    syncSettingsDom = () => {},
    syncScreensaverSettingsDom = () => {},
    syncDocksDom = () => {},
    refreshActiveGridOnly = () => {},
    scheduleIconSymbolRefresh = () => {},
    extractAccentFromWallpaperFn = extractAccentFromWallpaper,
    resolveAccentFromColorValueFn = resolveAccentFromColorValue,
    requestAnimationFrameFn = requestAnimationFrame,
    cancelAnimationFrameFn = cancelAnimationFrame,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
    createElement = (tag) => document.createElement(tag),
    getComputedStyleFn = getComputedStyle,
    matchMediaFn = (query) => window.matchMedia?.(query),
    warn = (...args) => console.warn(...args),
  } = {}) {
    this.host = host;
    this.getRoot = (...args) => getRoot(...args);
    this.isConnected = (...args) => isConnected(...args);
    this.getCustomWallpapers = (...args) => getCustomWallpapers(...args);
    this.setCustomWallpapers = (...args) => setCustomWallpapers(...args);
    this.readThemeState = (...args) => readThemeState(...args);
    this.syncTheme = (...args) => syncTheme(...args);
    this.setTheme = (...args) => setTheme(...args);
    this.setThemeStyle = (...args) => setThemeStyle(...args);
    this.setIosGlass = (...args) => setIosGlass(...args);
    this.setAccent = (...args) => setAccent(...args);
    this.setAccentMode = (...args) => setAccentMode(...args);
    this.setIconShape = (...args) => setIconShape(...args);
    this.setOneUiPrimarySurfaceOpacity = (...args) => setOneUiPrimarySurfaceOpacity(...args);
    this.migrateLegacyWallpaper = (...args) => migrateLegacyWallpaper(...args);
    this.readWallpapers = (...args) => readWallpapers(...args);
    this.applyWallpaperState = (...args) => applyWallpaperState(...args);
    this.saveWallpaper = (...args) => saveWallpaper(...args);
    this.resetWallpaper = (...args) => resetWallpaper(...args);
    this.getActiveAccentSource = (...args) => getActiveAccentSource(...args);
    this.syncSettingsDom = (...args) => syncSettingsDom(...args);
    this.syncScreensaverSettingsDom = (...args) => syncScreensaverSettingsDom(...args);
    this.syncDocksDom = (...args) => syncDocksDom(...args);
    this.refreshActiveGridOnly = (...args) => refreshActiveGridOnly(...args);
    this.scheduleIconSymbolRefresh = (...args) => scheduleIconSymbolRefresh(...args);
    this.extractAccentFromWallpaperFn = (...args) => extractAccentFromWallpaperFn(...args);
    this.resolveAccentFromColorValueFn = (...args) => resolveAccentFromColorValueFn(...args);
    this.requestAnimationFrameFn = (...args) => requestAnimationFrameFn(...args);
    this.cancelAnimationFrameFn = (...args) => cancelAnimationFrameFn(...args);
    this.setTimeoutFn = (...args) => setTimeoutFn(...args);
    this.clearTimeoutFn = (...args) => clearTimeoutFn(...args);
    this.createElement = (...args) => createElement(...args);
    this.getComputedStyleFn = (...args) => getComputedStyleFn(...args);
    this.matchMediaFn = (...args) => matchMediaFn(...args);
    this.warn = (...args) => warn(...args);
    this.autoAccentRequestId = 0;
    this.appearanceRefreshFrame = 0;
    this.themeTransitionFrame = 0;
    this.themeTransitionTimer = 0;
    this.themeSettingsSurfaceSnapshot = null;
  }

  migrateLegacyCustomWallpaper() {
    return this.migrateLegacyWallpaper();
  }

  readCustomWallpapers() {
    return this.readWallpapers();
  }

  applyCustomWallpaperState(themeState = this.readThemeState()) {
    const wallpapers = this.applyWallpaperState(themeState);
    this.setCustomWallpapers(wallpapers);
    return wallpapers;
  }

  saveCustomWallpaper(mode, payload) {
    const wallpapers = this.saveWallpaper(mode, payload);
    this.setCustomWallpapers(wallpapers);
    this.syncAutoAccentFromWallpaper();
    this.syncSettingsDom();
    this.scheduleIconSymbolRefresh();
    return wallpapers;
  }

  resetCustomWallpaper(mode) {
    const wallpapers = this.resetWallpaper(mode);
    this.setCustomWallpapers(wallpapers);
    this.syncAutoAccentFromWallpaper();
    this.syncSettingsDom();
    return wallpapers;
  }

  async syncAutoAccentFromWallpaper({ syncSettings = true } = {}) {
    const requestId = ++this.autoAccentRequestId;
    const themeState = this.readThemeState();
    const accentSource = this.getActiveAccentSource(
      themeState,
      this.getCustomWallpapers(),
    );

    if (!accentSource?.value) {
      clearAutoAccentVars(this.host);
    } else {
      try {
        const accent = accentSource.kind === "image"
          ? await this.extractAccentFromWallpaperFn(accentSource.value, themeState.themeStyle)
          : this.resolveAccentFromColorValueFn(accentSource.value);
        if (requestId !== this.autoAccentRequestId) return false;
        if (accent?.color) {
          this.host?.style?.setProperty?.("--mha-accent-auto", accent.color);
          this.host?.style?.setProperty?.(
            "--mha-accent-auto-contrast",
            accent.contrast || "#fff",
          );
        } else {
          clearAutoAccentVars(this.host);
        }
      } catch (error) {
        this.warn(
          `[MHA] Auto accent could not be extracted for ${themeState.themeStyle}.`,
          error,
        );
        if (requestId === this.autoAccentRequestId) {
          clearAutoAccentVars(this.host);
        }
      }
    }

    if (requestId === this.autoAccentRequestId) {
      this.syncTheme();
      if (syncSettings) this.syncSettingsDom();
      this.scheduleAppearanceDomRefresh();
      return true;
    }

    return false;
  }

  refreshAppearanceDom() {
    if (!this.isConnected() || !this.getRoot()) return false;
    this.syncDocksDom();
    this.refreshActiveGridOnly();
    this.host?._pageUiCoordinator?.syncPageCreator?.();
    this.scheduleIconSymbolRefresh();
    return true;
  }

  scheduleAppearanceDomRefresh() {
    this.cancelAnimationFrameFn(this.appearanceRefreshFrame);
    this.appearanceRefreshFrame = this.requestAnimationFrameFn(() => {
      this.appearanceRefreshFrame = 0;
      this.refreshAppearanceDom();
    });
  }

  applyThemeFromSettings(value = "auto") {
    const themeState = this.setTheme(value);
    this.applyCustomWallpaperState(themeState);
    this.syncAutoAccentFromWallpaper();
    this.syncSettingsDom();
    this.syncScreensaverSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return themeState;
  }

  transitionSystemThemeChange({
    applyThemeChange = () => this.syncTheme(),
    syncSettings = false,
    syncScreensaverSettings = false,
  } = {}) {
    if (!this.isConnected()) return false;

    const root = this.getRoot();
    if (!root) return false;

    const reducedMotion = this.matchMediaFn("(prefers-reduced-motion: reduce)")?.matches;
    const backdropTarget = root.querySelector?.(".mha-background") || this.host;
    const backdropStyle = this.getComputedStyleFn(backdropTarget);
    const backdropSnapshot = [
      backdropStyle?.background,
      backdropStyle?.backgroundImage,
      backdropStyle?.backgroundColor,
    ].map(value => String(value || "").trim())
      .find(value => value && value !== "none") || "transparent";

    const settingsSheet = root.querySelector?.(
      '.mha-settings-panel[data-open="true"] .mha-settings-sheet',
    );
    const settingsSheetStyle = settingsSheet
      ? this.getComputedStyleFn(settingsSheet)
      : null;

    this.clearTimeoutFn(this.themeTransitionTimer);
    this.cancelAnimationFrameFn(this.themeTransitionFrame);
    this.themeTransitionFrame = 0;
    this.themeSettingsSurfaceSnapshot?.remove?.();
    this.themeSettingsSurfaceSnapshot = null;
    root.querySelectorAll?.(".mha-theme-settings-surface-snapshot")
      ?.forEach?.((snapshot) => snapshot.remove?.());

    if (settingsSheet && settingsSheetStyle) {
      const snapshot = this.createElement("div");
      snapshot.className = "mha-theme-settings-surface-snapshot";
      const setSnapshotStyle = (name, value) => {
        const normalized = String(value || "").trim();
        if (!normalized || normalized === "none") return;
        snapshot.style?.setProperty?.(name, normalized);
      };
      setSnapshotStyle("background", settingsSheetStyle.background);
      setSnapshotStyle("border-color", settingsSheetStyle.borderColor);
      setSnapshotStyle("border-style", settingsSheetStyle.borderStyle);
      setSnapshotStyle("border-width", settingsSheetStyle.borderWidth);
      setSnapshotStyle("border-radius", settingsSheetStyle.borderRadius);
      setSnapshotStyle("box-shadow", settingsSheetStyle.boxShadow);
      setSnapshotStyle("backdrop-filter", settingsSheetStyle.backdropFilter);
      setSnapshotStyle("-webkit-backdrop-filter", settingsSheetStyle.webkitBackdropFilter);
      settingsSheet.prepend?.(snapshot);
      this.themeSettingsSurfaceSnapshot = snapshot;
    }

    this.host?.classList?.remove?.("is-theme-backdrop-crossfading");
    this.host?.style?.setProperty?.("--mha-theme-crossfade-from", backdropSnapshot);
    this.host?.classList?.add?.("is-theme-transitioning");
    if (this.host?.dataset) this.host.dataset.themeTransitionPhase = "crossfade";
    void this.host?.offsetWidth;

    const themeState = applyThemeChange();
    this.applyCustomWallpaperState(themeState);
    this.syncAutoAccentFromWallpaper({ syncSettings: false });
    if (syncSettings) this.syncSettingsDom();
    if (syncScreensaverSettings) this.syncScreensaverSettingsDom();
    this.scheduleAppearanceDomRefresh();

    this.host?.classList?.add?.("is-theme-backdrop-crossfading");
    if (this.themeSettingsSurfaceSnapshot?.dataset) {
      this.themeSettingsSurfaceSnapshot.dataset.state = "leaving";
    }

    const cleanup = () => {
      this.themeTransitionTimer = 0;
      this.host?.classList?.remove?.("is-theme-backdrop-crossfading");
      this.host?.classList?.remove?.("is-theme-transitioning");
      if (this.host?.dataset) delete this.host.dataset.themeTransitionPhase;
      this.host?.style?.removeProperty?.("--mha-theme-crossfade-from");
      this.themeSettingsSurfaceSnapshot?.remove?.();
      this.themeSettingsSurfaceSnapshot = null;
    };

    if (reducedMotion) {
      cleanup();
      return true;
    }

    this.themeTransitionTimer = this.setTimeoutFn(cleanup, THEME_STYLE_CROSSFADE_MS);
    return true;
  }

  applyThemeStyleFromSettings(value = "oneui") {
    let themeState = null;
    this.transitionSystemThemeChange({
      applyThemeChange: () => {
        themeState = this.setThemeStyle(value);
        return themeState;
      },
      syncSettings: true,
    });
    return themeState || { ...this.readThemeState(), themeStyle: value };
  }

  applyIosGlassFromSettings(value = "liquid") {
    this.setIosGlass(value);
    this.syncSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return true;
  }

  applyAccentFromSettings(value = "") {
    this.setAccent(value);
    this.syncSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return true;
  }

  applyAccentModeFromSettings(value = "manual") {
    this.setAccentMode(value);
    if (value === "auto") this.syncAutoAccentFromWallpaper();
    this.syncSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return true;
  }

  applyIconShapeFromSettings(value = "auto") {
    this.setIconShape(value);
    this.syncSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return true;
  }

  applyOneUiPrimarySurfaceOpacityFromSettings(value = 88) {
    return this.setOneUiPrimarySurfaceOpacity(value);
  }

  destroy() {
    this.autoAccentRequestId += 1;
    this.cancelAnimationFrameFn(this.appearanceRefreshFrame);
    this.appearanceRefreshFrame = 0;
    this.cancelAnimationFrameFn(this.themeTransitionFrame);
    this.themeTransitionFrame = 0;
    this.clearTimeoutFn(this.themeTransitionTimer);
    this.themeTransitionTimer = 0;
    this.themeSettingsSurfaceSnapshot?.remove?.();
    this.themeSettingsSurfaceSnapshot = null;
  }
}

export function createAppearanceCoordinator(options = {}) {
  return new AppearanceCoordinator(options);
}
