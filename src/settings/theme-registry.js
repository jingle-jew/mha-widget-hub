const css = (...paths) => Object.freeze(paths);
const WALLPAPER_TYPES = new Set(["image", "css", "token", "advanced"]);
const ACCENT_SOURCE_TYPES = new Set(["image", "color", "token", "none"]);

function normalizeThemeWallpaper(definition = null) {
  if (typeof definition === "string") {
    return Object.freeze({
      type: "image",
      light: definition,
      dark: definition,
    });
  }

  if (!definition || typeof definition !== "object") {
    return Object.freeze({
      type: "advanced",
      light: "",
      dark: "",
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

const freezeTheme = (definition) => Object.freeze({
  ...definition,
  aliases: Object.freeze([...(definition.aliases || [])]),
  css: Object.freeze([...(definition.css || [])]),
  wallpaper: normalizeThemeWallpaper(definition.wallpaper),
});

const THEMES = {
  ios: freezeTheme({
    id: "ios",
    label: "iOS",
    order: 10,
    defaultIconShape: "rounded-square",
    css: css("styles/themes/ios.css"),
    wallpaper: {
      type: "advanced",
      accentSource: {
        type: "color",
        light: "#7f94ef",
        dark: "#5f7dff",
      },
    },
    aliases: ["apple", "liquid-glass", "frosted-glass"],
  }),
  oneui: freezeTheme({
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
    aliases: ["samsung", "one-ui"],
  }),
  material: freezeTheme({
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
    aliases: ["material-you", "material3", "material-3"],
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

export function getDefaultIconShape(themeStyle = getDefaultThemeStyle()) {
  return getThemeDefinition(themeStyle).defaultIconShape;
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
