const css = (...paths) => Object.freeze(paths);
const WALLPAPER_TYPES = new Set(["image", "css", "token", "advanced"]);
const ACCENT_SOURCE_TYPES = new Set(["image", "color", "token", "none"]);
const ICON_SHAPES = new Set(["rounded-square", "squircle", "circle"]);

const IOS_ACCENTS = Object.freeze([
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "lime", label: "Lime" },
  { value: "green", label: "Green" },
  { value: "mint", label: "Mint" },
  { value: "seafoam", label: "Seafoam" },
  { value: "teal", label: "Teal" },
  { value: "cyan", label: "Cyan" },
  { value: "blue", label: "Blue" },
  { value: "indigo", label: "Indigo" },
  { value: "lavender", label: "Lavender" },
  { value: "purple", label: "Purple" },
  { value: "berry", label: "Berry" },
  { value: "pink", label: "Pink" },
  { value: "rose", label: "Rose" },
  { value: "brown", label: "Brown" },
  { value: "graphite", label: "Graphite" },
  { value: "gray", label: "Gray" },
]);

const ONEUI_ACCENTS = Object.freeze([
  { value: "coral", label: "Coral" },
  { value: "peach", label: "Peach" },
  { value: "orange", label: "Orange" },
  { value: "amber", label: "Amber" },
  { value: "lemon", label: "Lemon" },
  { value: "lime", label: "Lime" },
  { value: "green", label: "Green" },
  { value: "emerald", label: "Emerald" },
  { value: "aqua", label: "Aqua" },
  { value: "sky", label: "Sky" },
  { value: "blue", label: "Blue" },
  { value: "navy", label: "Navy" },
  { value: "violet", label: "Violet" },
  { value: "lavender", label: "Lavender" },
  { value: "lilac", label: "Lilac" },
  { value: "magenta", label: "Magenta" },
  { value: "pink", label: "Pink" },
  { value: "rose", label: "Rose" },
  { value: "slate", label: "Slate" },
]);

const MATERIAL_ACCENTS = Object.freeze([
  { value: "red", label: "Red" },
  { value: "orange", label: "Orange" },
  { value: "yellow", label: "Yellow" },
  { value: "lime", label: "Lime" },
  { value: "olive", label: "Olive" },
  { value: "green", label: "Green" },
  { value: "emerald", label: "Emerald" },
  { value: "sea", label: "Sea" },
  { value: "teal", label: "Teal" },
  { value: "cyan", label: "Cyan" },
  { value: "sky", label: "Sky" },
  { value: "blue", label: "Blue" },
  { value: "navy", label: "Navy" },
  { value: "indigo", label: "Indigo" },
  { value: "lavender", label: "Lavender" },
  { value: "purple", label: "Purple" },
  { value: "magenta", label: "Magenta" },
  { value: "pink", label: "Pink" },
  { value: "brown", label: "Brown" },
]);

const ALEXA_ACCENTS = Object.freeze([
  { value: "cyan", label: "Cyan" },
  { value: "blue", label: "Blue" },
  { value: "sky", label: "Sky" },
  { value: "navy", label: "Navy" },
  { value: "teal", label: "Teal" },
  { value: "aqua", label: "Aqua" },
  { value: "emerald", label: "Emerald" },
  { value: "violet", label: "Violet" },
  { value: "pink", label: "Pink" },
  { value: "amber", label: "Amber" },
  { value: "slate", label: "Slate" },
]);

function freezeArray(items = []) {
  return Object.freeze([...items]);
}

function normalizeThemeAliases(aliases = []) {
  if (!Array.isArray(aliases)) return Object.freeze([]);
  return freezeArray(aliases.map(alias => String(alias || "").trim()).filter(Boolean));
}

function normalizeThemeCss(cssPaths = []) {
  if (!Array.isArray(cssPaths)) return Object.freeze([]);
  return freezeArray(cssPaths.map(path => String(path || "").trim()).filter(Boolean));
}

function normalizeThemeVariant(definition = {}, index = 0) {
  const id = String(definition?.id || "").trim();
  if (!id) return null;

  return Object.freeze({
    id,
    label: String(definition.label || id),
    order: Number.isFinite(definition.order) ? definition.order : index,
    default: Boolean(definition.default),
  });
}

function normalizeThemeVariants(variants = []) {
  if (!Array.isArray(variants)) return Object.freeze([]);
  return freezeArray(variants.map(normalizeThemeVariant).filter(Boolean));
}

function normalizeThemeAccents(accents = []) {
  if (!Array.isArray(accents)) return Object.freeze([]);
  return freezeArray(accents.map(accent => Object.freeze({
    value: String(accent?.value || "").trim(),
    label: String(accent?.label || accent?.value || ""),
  })).filter(accent => accent.value));
}

function normalizeThemeDock(definition = null) {
  if (!definition || typeof definition !== "object") {
    return Object.freeze({
      usesDock: true,
      contentBuilder: "default",
      css: Object.freeze([]),
      supportedPositions: Object.freeze(["left", "right", "bottom"]),
    });
  }

  const supportedPositions = Array.isArray(definition.supportedPositions)
    ? freezeArray(definition.supportedPositions.map(value => String(value || "").trim()).filter(Boolean))
    : Object.freeze(["left", "right", "bottom"]);

  return Object.freeze({
    usesDock: definition.usesDock !== false,
    contentBuilder: String(definition.contentBuilder || "default"),
    css: normalizeThemeCss(definition.css),
    supportedPositions,
  });
}

function normalizeThemeWallpaper(definition = null) {
  if (typeof definition === "string") {
    return Object.freeze({
      type: "image",
      light: definition,
      dark: definition,
      accentSource: normalizeThemeAccentSource(),
    });
  }

  if (!definition || typeof definition !== "object") {
    return Object.freeze({
      type: "advanced",
      light: "",
      dark: "",
      accentSource: normalizeThemeAccentSource(),
    });
  }

  const type = WALLPAPER_TYPES.has(definition.type) ? definition.type : "advanced";
  return Object.freeze({
    type,
    light: String(definition.light || ""),
    dark: String(definition.dark || ""),
    accentSource: normalizeThemeAccentSource(definition.accentSource),
  });
}

function normalizeThemeAccentSource(definition = null) {
  if (typeof definition === "string") {
    return Object.freeze({
      type: "image",
      light: definition,
      dark: definition,
    });
  }

  if (!definition || typeof definition !== "object") {
    return Object.freeze({
      type: "none",
      light: "",
      dark: "",
    });
  }

  const type = ACCENT_SOURCE_TYPES.has(definition.type) ? definition.type : "none";
  return Object.freeze({
    type,
    light: String(definition.light || ""),
    dark: String(definition.dark || ""),
  });
}

function normalizeDefaultIconShape(defaultIconShape = "rounded-square") {
  return ICON_SHAPES.has(defaultIconShape) ? defaultIconShape : "rounded-square";
}

function normalizeThemeDefinition(definition = {}) {
  const id = String(definition.id || "").trim();
  const variants = normalizeThemeVariants(definition.variants);
  const defaultVariant = variants.find(variant => variant.default)?.id || variants[0]?.id || "";
  const accents = normalizeThemeAccents(definition.accents);

  return Object.freeze({
    ...definition,
    id,
    label: String(definition.label || id),
    order: Number.isFinite(definition.order) ? definition.order : 0,
    defaultIconShape: normalizeDefaultIconShape(definition.defaultIconShape),
    aliases: normalizeThemeAliases(definition.aliases),
    css: normalizeThemeCss(definition.css),
    wallpaper: normalizeThemeWallpaper(definition.wallpaper),
    variants,
    defaultVariant: String(definition.defaultVariant || defaultVariant),
    accents,
    defaultAccent: String(definition.defaultAccent || accents[0]?.value || ""),
    supportsAutoAccent: Boolean(definition.supportsAutoAccent),
    dock: normalizeThemeDock(definition.dock),
  });
}

const THEMES = {
  ios: normalizeThemeDefinition({
    id: "ios",
    label: "iOS",
    order: 10,
    defaultIconShape: "rounded-square",
    css: css("styles/themes/ios.css", "styles/themes/ios-organic-wallpaper.css"),
    wallpaper: {
      type: "advanced",
      accentSource: {
        type: "color",
        light: "#7f94ef",
        dark: "#5f7dff",
      },
    },
    variants: [
      { id: "liquid", label: "Liquid Glass", order: 10, default: true },
      { id: "frosted", label: "Frosted Glass", order: 20 },
    ],
    accents: IOS_ACCENTS,
    defaultAccent: "blue",
    supportsAutoAccent: true,
    aliases: ["apple", "liquid-glass", "frosted-glass"],
    dock: {
      usesDock: true,
      contentBuilder: "ios-default",
      css: ["styles/themes/ios-dock.css"],
      supportedPositions: ["left", "right", "bottom"],
    },
  }),
  oneui: normalizeThemeDefinition({
    id: "oneui",
    label: "OneUI",
    order: 20,
    defaultIconShape: "squircle",
    css: css("styles/themes/oneui.css"),
    wallpaper: {
      type: "advanced",
      accentSource: {
        type: "color",
        light: "#8bbdff",
        dark: "#65a8ff",
      },
    },
    accents: ONEUI_ACCENTS,
    defaultAccent: "sky",
    supportsAutoAccent: true,
    aliases: ["samsung", "one-ui"],
    dock: {
      usesDock: true,
      contentBuilder: "oneui-default",
      css: ["styles/themes/oneui-dock.css"],
      supportedPositions: ["left", "right", "bottom"],
    },
  }),
  material: normalizeThemeDefinition({
    id: "material",
    label: "Material You",
    order: 30,
    defaultIconShape: "circle",
    css: css("styles/themes/material.css"),
    wallpaper: {
      type: "advanced",
      accentSource: {
        type: "color",
        light: "#6750a4",
        dark: "#d0bcff",
      },
    },
    accents: MATERIAL_ACCENTS,
    defaultAccent: "purple",
    supportsAutoAccent: true,
    aliases: ["material-you", "material3", "material-3"],
    dock: {
      usesDock: true,
      contentBuilder: "material-default",
      css: ["styles/themes/material-dock.css"],
      supportedPositions: ["left", "right", "bottom"],
    },
  }),
  alexa: normalizeThemeDefinition({
    id: "alexa",
    label: "Alexa",
    order: 40,
    defaultIconShape: "circle",
    css: css("styles/themes/alexa.css"),
    wallpaper: {
      type: "advanced",
      accentSource: {
        type: "color",
        light: "#00a8e1",
        dark: "#53d8ff",
      },
    },
    accents: ALEXA_ACCENTS,
    defaultAccent: "cyan",
    supportsAutoAccent: true,
    aliases: ["echo", "amazon-alexa", "amazon"],
    dock: {
      usesDock: true,
      contentBuilder: "alexa-default",
      supportedPositions: ["left", "right", "bottom"],
    },
  }),
};

export const THEME_REGISTRY = Object.freeze(THEMES);

export function getThemeDefinitions() {
  return Object.values(THEME_REGISTRY)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

export function getThemeCssPaths() {
  return getThemeDefinitions().flatMap(({ css }) => [...(css || [])]);
}

export function getThemeDockCssPaths() {
  return getThemeDefinitions().flatMap(({ dock }) => [...(dock?.css || [])]);
}

export function getThemeStyleOptions() {
  return getThemeDefinitions().map(({ id, label }) => ({ value: id, label }));
}

export function getThemeStyleIds() {
  return getThemeDefinitions().map(({ id }) => id);
}

export function getDefaultThemeStyle() {
  return "oneui";
}

export function getThemeDefinition(themeStyle = getDefaultThemeStyle()) {
  return THEME_REGISTRY[themeStyle] || THEME_REGISTRY[getDefaultThemeStyle()];
}

export function getThemeDockDefinition(themeStyle = getDefaultThemeStyle()) {
  return getThemeDefinition(themeStyle).dock || normalizeThemeDock();
}

export function getDefaultIconShape(themeStyle = getDefaultThemeStyle()) {
  return getThemeDefinition(themeStyle).defaultIconShape;
}

export function getThemeVariants(themeStyle = getDefaultThemeStyle()) {
  return getThemeDefinition(themeStyle).variants;
}

export function getDefaultThemeVariant(themeStyle = getDefaultThemeStyle()) {
  return getThemeDefinition(themeStyle).defaultVariant;
}

export function getThemeVariantOptions(themeStyle = getDefaultThemeStyle()) {
  return getThemeVariants(themeStyle).map(({ id, label }) => ({ value: id, label }));
}

export function normalizeThemeVariantSelection(themeStyle = getDefaultThemeStyle(), variant = "") {
  const variants = getThemeVariants(themeStyle);
  if (!variants.length) return "";
  const normalized = String(variant || "").trim();
  return variants.some(item => item.id === normalized)
    ? normalized
    : getDefaultThemeVariant(themeStyle);
}

export function getThemeAccentContract(themeStyle = getDefaultThemeStyle()) {
  const definition = getThemeDefinition(themeStyle);
  return Object.freeze({
    accents: definition.accents,
    defaultAccent: definition.defaultAccent,
    supportsAutoAccent: definition.supportsAutoAccent,
  });
}

export function getThemeWallpaper(themeStyle = getDefaultThemeStyle(), theme = "dark") {
  const definition = getThemeDefinition(themeStyle);
  const tone = theme === "light" ? "light" : "dark";
  return Object.freeze({
    type: definition.wallpaper?.type || "advanced",
    value: String(definition.wallpaper?.[tone] || ""),
  });
}

export function getThemeAccentSource(themeStyle = getDefaultThemeStyle(), theme = "dark") {
  const definition = getThemeDefinition(themeStyle);
  const tone = theme === "light" ? "light" : "dark";
  return Object.freeze({
    type: definition.wallpaper?.accentSource?.type || "none",
    value: String(definition.wallpaper?.accentSource?.[tone] || ""),
  });
}
