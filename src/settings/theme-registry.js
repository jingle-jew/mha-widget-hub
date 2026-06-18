const css = (...paths) => Object.freeze(paths);

function createWallpaperSvgDataUrl({
  baseStart = "#171b30",
  baseEnd = "#242844",
  radialOne = "rgba(113,128,255,.32)",
  radialTwo = "rgba(255,112,178,.28)",
  radialThree = "rgba(56,209,255,.22)",
} = {}) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 1440" preserveAspectRatio="xMidYMid slice">
      <defs>
        <radialGradient id="r1" cx="20%" cy="15%" r="34%">
          <stop offset="0%" stop-color="${radialOne}"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <radialGradient id="r2" cx="82%" cy="24%" r="38%">
          <stop offset="0%" stop-color="${radialTwo}"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <radialGradient id="r3" cx="50%" cy="92%" r="42%">
          <stop offset="0%" stop-color="${radialThree}"/>
          <stop offset="100%" stop-color="rgba(0,0,0,0)"/>
        </radialGradient>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${baseStart}"/>
          <stop offset="100%" stop-color="${baseEnd}"/>
        </linearGradient>
      </defs>
      <rect width="1440" height="1440" fill="url(#bg)"/>
      <rect width="1440" height="1440" fill="url(#r1)"/>
      <rect width="1440" height="1440" fill="url(#r2)"/>
      <rect width="1440" height="1440" fill="url(#r3)"/>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

const wallpaper = (light, dark) => Object.freeze({ light, dark });

const freezeTheme = (definition) => Object.freeze({
  ...definition,
  aliases: Object.freeze([...(definition.aliases || [])]),
  css: Object.freeze([...(definition.css || [])]),
  wallpaper: definition.wallpaper
    ? Object.freeze({ ...definition.wallpaper })
    : Object.freeze({ light: "", dark: "" }),
});

const THEMES = {
  ios: freezeTheme({
    id: "ios",
    label: "iOS",
    order: 10,
    defaultIconShape: "rounded-square",
    css: css("styles/themes/ios.css"),
    wallpaper: wallpaper(
      createWallpaperSvgDataUrl({
        baseStart: "#f4f7ff",
        baseEnd: "#dfe8ff",
        radialOne: "rgba(124,157,255,.34)",
        radialTwo: "rgba(255,168,208,.28)",
        radialThree: "rgba(140,228,255,.24)",
      }),
      createWallpaperSvgDataUrl({
        baseStart: "#171b30",
        baseEnd: "#242844",
        radialOne: "rgba(113,128,255,.32)",
        radialTwo: "rgba(255,112,178,.24)",
        radialThree: "rgba(56,209,255,.20)",
      }),
    ),
    aliases: ["apple", "liquid-glass", "frosted-glass"],
  }),
  oneui: freezeTheme({
    id: "oneui",
    label: "OneUI",
    order: 20,
    defaultIconShape: "squircle",
    css: css("styles/themes/oneui.css"),
    wallpaper: wallpaper(
      createWallpaperSvgDataUrl({
        baseStart: "#fbf8f5",
        baseEnd: "#eef3ff",
        radialOne: "rgba(101,168,255,.22)",
        radialTwo: "rgba(255,135,183,.16)",
        radialThree: "rgba(123,221,165,.14)",
      }),
      createWallpaperSvgDataUrl({
        baseStart: "#07070d",
        baseEnd: "#16131f",
        radialOne: "rgba(101,168,255,.30)",
        radialTwo: "rgba(255,135,183,.24)",
        radialThree: "rgba(123,221,165,.18)",
      }),
    ),
    aliases: ["samsung", "one-ui"],
  }),
  material: freezeTheme({
    id: "material",
    label: "Material You",
    order: 30,
    defaultIconShape: "circle",
    css: css("styles/themes/material.css"),
    wallpaper: wallpaper(
      createWallpaperSvgDataUrl({
        baseStart: "#fffbfe",
        baseEnd: "#f7f2fa",
        radialOne: "rgba(103,80,164,.14)",
        radialTwo: "rgba(125,82,96,.10)",
        radialThree: "rgba(0,104,116,.10)",
      }),
      createWallpaperSvgDataUrl({
        baseStart: "#25212c",
        baseEnd: "#312d38",
        radialOne: "rgba(208,188,255,.22)",
        radialTwo: "rgba(239,184,200,.16)",
        radialThree: "rgba(181,232,224,.14)",
      }),
    ),
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
  return String(definition.wallpaper?.[tone] || "");
}
