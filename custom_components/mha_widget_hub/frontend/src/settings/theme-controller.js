import { deriveOneUiBlobPalette, normalizeAccent, supportsAutoAccent } from "./accent-palettes.js";
import { getDefaultIconShape, getThemeStyleIds, normalizeThemeVariantSelection } from "./theme-registry.js";

export const THEME_STYLES = Object.freeze(new Set(getThemeStyleIds()));

function getSystemThemePreference() {
  if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) {
    return "dark";
  }
  if (window.matchMedia?.("(prefers-color-scheme: light)")?.matches) {
    return "light";
  }
  return "light";
}

export function normalizeThemeSetting(theme = "auto") {
  return ["auto", "dark", "light"].includes(theme) ? theme : "auto";
}

function resolveTheme(themeSetting = "auto") {
  const normalized = normalizeThemeSetting(themeSetting);
  return normalized === "auto" ? getSystemThemePreference() : normalized;
}

export function getStoredThemeSetting(host) {
  const stored = localStorage.getItem("mha-theme")
    || host?.dataset?.themeSetting
    || "auto";

  return normalizeThemeSetting(stored);
}

export function normalizeThemeStyle(themeStyle = "oneui") {
  return THEME_STYLES.has(themeStyle) ? themeStyle : "oneui";
}

export function getStoredThemeStyle(host) {
  const stored = localStorage.getItem("mha-theme-style")
    || document.documentElement.dataset.themeStyle
    || host?.dataset?.themeStyle
    || "oneui";

  return normalizeThemeStyle(stored);
}

export function normalizeIosGlass(iosGlass = "liquid") {
  return normalizeThemeVariantSelection("ios", iosGlass) || "liquid";
}

export function getStoredThemeVariant(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const legacyIosGlass = normalizedStyle === "ios"
    ? localStorage.getItem("mha-ios-glass")
      || document.documentElement.dataset.iosGlass
      || host?.dataset?.iosGlass
      || ""
    : "";

  const stored = localStorage.getItem(`mha-theme-variant-${normalizedStyle}`)
    || localStorage.getItem("mha-theme-variant")
    || document.documentElement.dataset.themeVariant
    || host?.dataset?.themeVariant
    || legacyIosGlass
    || "";

  return normalizeThemeVariantSelection(normalizedStyle, stored);
}

export function getStoredIosGlass(host) {
  const stored = localStorage.getItem("mha-ios-glass")
    || document.documentElement.dataset.iosGlass
    || host?.dataset?.iosGlass
    || "liquid";

  return normalizeIosGlass(stored);
}

export function normalizeAccentMode(themeStyle = "oneui", mode = "manual") {
  return supportsAutoAccent(themeStyle) && mode === "auto" ? "auto" : "manual";
}

export function getStoredAccentMode(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const stored = localStorage.getItem(`mha-accent-mode-${normalizedStyle}`)
    || localStorage.getItem("mha-accent-mode")
    || document.documentElement.dataset.accentMode
    || host?.dataset?.accentMode
    || "auto";

  return normalizeAccentMode(normalizedStyle, stored);
}

export function getStoredManualAccent(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const stored = localStorage.getItem(`mha-accent-${normalizedStyle}`)
    || localStorage.getItem("mha-accent")
    || document.documentElement.dataset.accent
    || host?.dataset?.accent
    || "";

  return normalizeAccent(normalizedStyle, stored);
}

export function getStoredAutoAccent(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const stored = localStorage.getItem(`mha-accent-auto-${normalizedStyle}`)
    || document.documentElement.dataset.autoAccent
    || host?.dataset?.autoAccent
    || "";

  return normalizeAccent(normalizedStyle, stored);
}

export function getStoredAccent(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const mode = getStoredAccentMode(host, normalizedStyle);
  return mode === "auto"
    ? getStoredAutoAccent(host, normalizedStyle)
    : getStoredManualAccent(host, normalizedStyle);
}

export function normalizeIconShapeSetting(iconShapeSetting = "auto") {
  return ["auto", "rounded-square", "squircle", "circle"].includes(iconShapeSetting)
    ? iconShapeSetting
    : "auto";
}

export function resolveIconShape(themeStyle = "oneui", iconShapeSetting = "auto") {
  const normalized = normalizeIconShapeSetting(iconShapeSetting);
  return normalized === "auto"
    ? getDefaultIconShape(themeStyle)
    : normalized;
}

export function getStoredIconShapeSetting(host) {
  const stored = localStorage.getItem("mha-icon-shape")
    || document.documentElement.dataset.iconShapeSetting
    || host.dataset.iconShapeSetting
    || "auto";

  return normalizeIconShapeSetting(stored);
}

export function readThemeState(host) {
  const themeSetting = getStoredThemeSetting(host);
  const theme = resolveTheme(themeSetting);
  const themeStyle = getStoredThemeStyle(host);
  const themeVariant = getStoredThemeVariant(host, themeStyle);
  const iosGlass = themeStyle === "ios" ? normalizeIosGlass(themeVariant) : getStoredIosGlass(host);
  const accentMode = getStoredAccentMode(host, themeStyle);
  const accent = getStoredAccent(host, themeStyle);
  const iconShapeSetting = getStoredIconShapeSetting(host);
  const iconShape = resolveIconShape(themeStyle, iconShapeSetting);

  return {
    themeSetting,
    theme,
    themeStyle,
    iosGlass,
    themeVariant,
    accent,
    accentMode,
    iconShapeSetting,
    iconShape,
  };
}

function setAttribute(target, name, value) {
  target.dataset[name] = value;
  target.setAttribute(
    `data-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
    value,
  );
}

function syncOneUiBlobPalette(host, state) {
  if (!host?.style) return;

  if (state.themeStyle !== "oneui") {
    host.style.removeProperty("--mha-bg-blob-1");
    host.style.removeProperty("--mha-bg-blob-2");
    host.style.removeProperty("--mha-bg-blob-3");
    host.style.removeProperty("--mha-bg-blob-4");
    return;
  }

  const accentColor = state.accentMode === "auto"
    ? host.style.getPropertyValue?.("--mha-accent-auto") || ""
    : "";
  const palette = deriveOneUiBlobPalette(state.accent, accentColor);

  host.style.setProperty("--mha-bg-blob-1", palette.blob1);
  host.style.setProperty("--mha-bg-blob-2", palette.blob2);
  host.style.setProperty("--mha-bg-blob-3", palette.blob3);
  host.style.setProperty("--mha-bg-blob-4", palette.blob4);
}

export function syncThemeAttributes(host) {
  const state = readThemeState(host);
  const root = document.documentElement;

  setAttribute(host, "themeSetting", state.themeSetting);
  setAttribute(host, "theme", state.theme);
  setAttribute(host, "themeStyle", state.themeStyle);
  setAttribute(host, "iosGlass", state.iosGlass);
  setAttribute(host, "themeVariant", state.themeVariant);
  setAttribute(host, "accent", state.accent);
  setAttribute(host, "accentMode", state.accentMode);
  setAttribute(host, "iconShapeSetting", state.iconShapeSetting);
  setAttribute(host, "iconShape", state.iconShape);

  setAttribute(root, "themeSetting", state.themeSetting);
  setAttribute(root, "theme", state.theme);
  setAttribute(root, "themeStyle", state.themeStyle);
  setAttribute(root, "iosGlass", state.iosGlass);
  setAttribute(root, "themeVariant", state.themeVariant);
  setAttribute(root, "accent", state.accent);
  setAttribute(root, "accentMode", state.accentMode);
  setAttribute(root, "iconShapeSetting", state.iconShapeSetting);
  setAttribute(root, "iconShape", state.iconShape);

  syncOneUiBlobPalette(host, state);

  return state;
}

export class ThemeController {
  constructor(host) {
    this.host = host;
  }

  read() {
    return readThemeState(this.host);
  }

  sync() {
    return syncThemeAttributes(this.host);
  }

  setTheme(value = "auto") {
    const themeSetting = normalizeThemeSetting(value);
    localStorage.setItem("mha-theme", themeSetting);
    localStorage.setItem("mha-dev-theme", themeSetting);
    return this.sync();
  }

  setThemeStyle(value = "oneui") {
    const themeStyle = normalizeThemeStyle(value);
    localStorage.setItem("mha-theme-style", themeStyle);
    localStorage.setItem("mha-dev-theme-style", themeStyle);

    const accent = getStoredAccent(this.host, themeStyle);
    localStorage.setItem("mha-accent", accent);
    if (getStoredAccentMode(this.host, themeStyle) === "manual") {
      localStorage.setItem(`mha-accent-${themeStyle}`, accent);
    }
    return this.sync();
  }

  setThemeVariant(value = "") {
    const themeStyle = getStoredThemeStyle(this.host);
    const themeVariant = normalizeThemeVariantSelection(themeStyle, value);
    if (!themeVariant) return this.sync();

    localStorage.setItem("mha-theme-variant", themeVariant);
    localStorage.setItem(`mha-theme-variant-${themeStyle}`, themeVariant);

    if (themeStyle === "ios") {
      localStorage.setItem("mha-ios-glass", themeVariant);
      localStorage.setItem("mha-dev-ios-glass", themeVariant);
    }

    return this.sync();
  }

  setIosGlass(value = "liquid") {
    return this.setThemeVariant(value);
  }

  setAccent(value = "") {
    const themeStyle = getStoredThemeStyle(this.host);
    const accent = normalizeAccent(themeStyle, value);
    localStorage.setItem("mha-accent-mode", "manual");
    localStorage.setItem(`mha-accent-mode-${themeStyle}`, "manual");
    localStorage.setItem("mha-accent", accent);
    localStorage.setItem(`mha-accent-${themeStyle}`, accent);
    return this.sync();
  }

  setAccentMode(value = "manual") {
    const themeStyle = getStoredThemeStyle(this.host);
    const mode = normalizeAccentMode(themeStyle, value);
    localStorage.setItem("mha-accent-mode", mode);
    localStorage.setItem(`mha-accent-mode-${themeStyle}`, mode);
    localStorage.setItem("mha-accent", getStoredAccent(this.host, themeStyle));
    return this.sync();
  }

  setAutoAccent(themeStyle = "oneui", value = "") {
    const normalizedStyle = normalizeThemeStyle(themeStyle);
    if (!supportsAutoAccent(normalizedStyle)) return this.sync();
    const accent = normalizeAccent(normalizedStyle, value);
    localStorage.setItem(`mha-accent-auto-${normalizedStyle}`, accent);
    if (getStoredThemeStyle(this.host) === normalizedStyle && getStoredAccentMode(this.host, normalizedStyle) === "auto") {
      localStorage.setItem("mha-accent", accent);
    }
    return this.sync();
  }

  setIconShape(value = "auto") {
    const iconShape = normalizeIconShapeSetting(value);
    localStorage.setItem("mha-icon-shape", iconShape);
    localStorage.setItem("mha-dev-icon-shape", iconShape);
    return this.sync();
  }
}

export function createThemeController(host) {
  return new ThemeController(host);
}
