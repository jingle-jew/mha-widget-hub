import {
  extractAccentFromWallpaper,
  resolveAccentFromColorValue,
} from "./wallpaper-accent.js";

function clearAutoAccentVars(host) {
  host?.style?.removeProperty?.("--mha-accent-auto");
  host?.style?.removeProperty?.("--mha-accent-auto-contrast");
}

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

  async syncAutoAccentFromWallpaper() {
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
      this.syncSettingsDom();
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

  transitionSystemThemeChange() {
    if (!this.isConnected()) return false;

    const root = this.getRoot();
    if (!root) return false;

    const reducedMotion = this.matchMediaFn("(prefers-reduced-motion: reduce)")?.matches;
    const existingCover = root.querySelector?.(".mha-theme-transition-cover");
    const cover = existingCover || this.createElement("div");
    cover.className = "mha-theme-transition-cover";
    cover.dataset.state = "covering";
    cover.setAttribute("aria-hidden", "true");
    if (!cover.parentNode) root.append(cover);
    cover.style.background = this.getComputedStyleFn(cover).background;

    this.host?.classList?.add?.("is-theme-transitioning");
    this.clearTimeoutFn(this.themeTransitionTimer);
    this.cancelAnimationFrameFn(this.themeTransitionFrame);

    const themeState = this.syncTheme();
    this.applyCustomWallpaperState(themeState);
    this.syncAutoAccentFromWallpaper();
    this.scheduleAppearanceDomRefresh();

    const finish = () => {
      cover.dataset.state = "revealing";
      const duration = reducedMotion ? 0 : 260;
      this.themeTransitionTimer = this.setTimeoutFn(() => {
        cover.remove();
        this.host?.classList?.remove?.("is-theme-transitioning");
      }, duration);
    };

    if (reducedMotion) {
      finish();
      return true;
    }

    this.themeTransitionFrame = this.requestAnimationFrameFn(() => {
      this.themeTransitionFrame = this.requestAnimationFrameFn(finish);
    });
    return true;
  }

  applyThemeStyleFromSettings(value = "oneui") {
    const themeState = this.setThemeStyle(value);
    this.applyCustomWallpaperState(themeState);
    this.syncAutoAccentFromWallpaper();
    this.syncSettingsDom();
    this.scheduleAppearanceDomRefresh();
    return themeState;
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

  destroy() {
    this.autoAccentRequestId += 1;
    this.cancelAnimationFrameFn(this.appearanceRefreshFrame);
    this.appearanceRefreshFrame = 0;
    this.cancelAnimationFrameFn(this.themeTransitionFrame);
    this.themeTransitionFrame = 0;
    this.clearTimeoutFn(this.themeTransitionTimer);
    this.themeTransitionTimer = 0;
  }
}

export function createAppearanceCoordinator(options = {}) {
  return new AppearanceCoordinator(options);
}
