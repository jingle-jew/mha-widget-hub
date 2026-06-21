import {
  normalizeAccent,
} from "../settings/accent-palettes.js";
import {
  normalizeAccentMode,
  normalizeIconShapeSetting,
  normalizeIosGlass,
  normalizeThemeSetting,
  normalizeThemeStyle,
  readThemeState,
  resolveIconShape,
} from "../settings/theme-controller.js";

export const EXTENSION_PANEL_APPEARANCE_STORAGE = "mha-extension-panel-appearance";
export const EXTENSION_APPEARANCE_INHERIT = "inherit";
export const EXTENSION_APPEARANCE_CUSTOM = "custom";

const DATA_ATTRIBUTES = Object.freeze({
  themeSetting: "themeSetting",
  theme: "theme",
  themeStyle: "themeStyle",
  iosGlass: "iosGlass",
  accent: "accent",
  accentMode: "accentMode",
  iconShapeSetting: "iconShapeSetting",
  iconShape: "iconShape",
});

function resolveTheme(themeSetting = "auto") {
  const normalized = normalizeThemeSetting(themeSetting);
  if (normalized !== "auto") return normalized;
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

function readAppearanceStore() {
  try {
    const parsed = JSON.parse(localStorage.getItem(EXTENSION_PANEL_APPEARANCE_STORAGE) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch (_error) {
    return {};
  }
}

function writeAppearanceStore(store = {}) {
  localStorage.setItem(EXTENSION_PANEL_APPEARANCE_STORAGE, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent("mha-extension-panel-appearance-change", {
    detail: { storageKey: EXTENSION_PANEL_APPEARANCE_STORAGE },
  }));
}

export function readExtensionPanelAppearance(panelId = "") {
  const store = readAppearanceStore();
  const config = store[panelId];

  if (!config || typeof config !== "object") {
    return { mode: EXTENSION_APPEARANCE_INHERIT };
  }

  const mode = config.mode === EXTENSION_APPEARANCE_CUSTOM
    ? EXTENSION_APPEARANCE_CUSTOM
    : EXTENSION_APPEARANCE_INHERIT;

  if (mode === EXTENSION_APPEARANCE_INHERIT) {
    return { mode };
  }

  return {
    mode,
    themeSetting: normalizeThemeSetting(config.themeSetting),
    themeStyle: normalizeThemeStyle(config.themeStyle),
    iosGlass: normalizeIosGlass(config.iosGlass),
    accentMode: config.accentMode,
    accent: config.accent,
    iconShapeSetting: normalizeIconShapeSetting(config.iconShapeSetting),
  };
}

export function updateExtensionPanelAppearance(panelId = "", patch = {}) {
  if (!panelId) return;
  const store = readAppearanceStore();
  const current = readExtensionPanelAppearance(panelId);
  const next = {
    ...current,
    mode: EXTENSION_APPEARANCE_CUSTOM,
    ...patch,
  };

  store[panelId] = next;
  writeAppearanceStore(store);
}

export function resetExtensionPanelAppearance(panelId = "") {
  if (!panelId) return;
  const store = readAppearanceStore();
  delete store[panelId];
  writeAppearanceStore(store);
}

function resolveCustomState(globalState, config) {
  const themeSetting = normalizeThemeSetting(config.themeSetting || globalState.themeSetting);
  const theme = resolveTheme(themeSetting);
  const themeStyle = normalizeThemeStyle(config.themeStyle || globalState.themeStyle);
  const iosGlass = normalizeIosGlass(config.iosGlass || globalState.iosGlass);
  const accentMode = normalizeAccentMode(themeStyle, config.accentMode || globalState.accentMode);
  const accent = normalizeAccent(themeStyle, config.accent || globalState.accent);
  const iconShapeSetting = normalizeIconShapeSetting(config.iconShapeSetting || globalState.iconShapeSetting);
  const iconShape = resolveIconShape(themeStyle, iconShapeSetting);

  return {
    themeSetting,
    theme,
    themeStyle,
    iosGlass,
    accent,
    accentMode,
    iconShapeSetting,
    iconShape,
  };
}

export function resolveExtensionPanelAppearance(host, panelId = "") {
  const globalState = readThemeState(host);
  const config = readExtensionPanelAppearance(panelId);

  if (config.mode !== EXTENSION_APPEARANCE_CUSTOM) {
    return {
      mode: EXTENSION_APPEARANCE_INHERIT,
      config,
      globalState,
      state: globalState,
    };
  }

  return {
    mode: EXTENSION_APPEARANCE_CUSTOM,
    config,
    globalState,
    state: resolveCustomState(globalState, config),
  };
}

function setAttribute(target, name, value) {
  if (!target || !name) return;
  target.dataset[name] = value;
  target.setAttribute(
    `data-${name.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`,
    value,
  );
}

export function applyExtensionPanelAppearance(host, state = {}) {
  if (!host) return state;

  for (const [key, attributeName] of Object.entries(DATA_ATTRIBUTES)) {
    if (!state[key]) continue;
    setAttribute(host, attributeName, state[key]);
  }

  host.style.colorScheme = state.theme === "light" ? "light" : "dark";
  return state;
}
