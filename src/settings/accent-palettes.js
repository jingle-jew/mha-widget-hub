/*
 * MHA accent palettes.
 *
 * Each visual style owns a curated 10-color accent palette.
 * Accent selection is stable across light/dark theme.
 */

export const ACCENT_PALETTES = Object.freeze({
  ios: Object.freeze([
    { value: "blue", label: "Blue" },
    { value: "indigo", label: "Indigo" },
    { value: "purple", label: "Purple" },
    { value: "pink", label: "Pink" },
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "mint", label: "Mint" },
    { value: "teal", label: "Teal" },
  ]),

  oneui: Object.freeze([
    { value: "sky", label: "Sky" },
    { value: "blue", label: "Blue" },
    { value: "violet", label: "Violet" },
    { value: "pink", label: "Pink" },
    { value: "coral", label: "Coral" },
    { value: "orange", label: "Orange" },
    { value: "amber", label: "Amber" },
    { value: "green", label: "Green" },
    { value: "aqua", label: "Aqua" },
    { value: "slate", label: "Slate" },
  ]),

  material: Object.freeze([
    { value: "blue", label: "Blue" },
    { value: "indigo", label: "Indigo" },
    { value: "purple", label: "Purple" },
    { value: "pink", label: "Pink" },
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "teal", label: "Teal" },
    { value: "cyan", label: "Cyan" },
  ]),
});

export const DEFAULT_ACCENT_BY_STYLE = Object.freeze({
  ios: "blue",
  oneui: "sky",
  material: "purple",
});

export function getAccentOptions(themeStyle = "oneui") {
  return ACCENT_PALETTES[themeStyle] || ACCENT_PALETTES.oneui;
}

export function normalizeAccent(themeStyle = "oneui", accent = "") {
  const options = getAccentOptions(themeStyle);
  const exists = options.some((item) => item.value === accent);
  if (exists) return accent;
  return DEFAULT_ACCENT_BY_STYLE[themeStyle] || DEFAULT_ACCENT_BY_STYLE.oneui;
}
