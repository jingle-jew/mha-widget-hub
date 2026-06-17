const freezeTheme = (definition) => Object.freeze({
  ...definition,
  aliases: Object.freeze([...(definition.aliases || [])]),
});

const THEMES = {
  ios: freezeTheme({
    id: "ios",
    label: "iOS",
    order: 10,
    defaultIconShape: "rounded-square",
    aliases: ["apple", "liquid-glass", "frosted-glass"],
  }),
  oneui: freezeTheme({
    id: "oneui",
    label: "OneUI",
    order: 20,
    defaultIconShape: "squircle",
    aliases: ["samsung", "one-ui"],
  }),
  material: freezeTheme({
    id: "material",
    label: "Material You",
    order: 30,
    defaultIconShape: "circle",
    aliases: ["material-you", "material3", "material-3"],
  }),
};

export const THEME_REGISTRY = Object.freeze(THEMES);

export function getThemeDefinitions() {
  return Object.values(THEME_REGISTRY)
    .sort((a, b) => (a.order || 0) - (b.order || 0));
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
