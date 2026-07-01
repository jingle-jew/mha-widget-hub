const DEFAULT_THEME_DOCK_ITEMS = Object.freeze([
  Object.freeze({ type: "pages" }),
  Object.freeze({ type: "edit-actions" }),
  Object.freeze({
    type: "action",
    action: "settings",
    symbol: "gear",
    category: "system",
    labelKey: "settings",
  }),
]);

const THEME_DOCK_CONTENT = Object.freeze({
  ios: DEFAULT_THEME_DOCK_ITEMS,
  oneui: DEFAULT_THEME_DOCK_ITEMS,
  material: DEFAULT_THEME_DOCK_ITEMS,
  alexa: DEFAULT_THEME_DOCK_ITEMS,
});

export function getDefaultThemeDockItems() {
  return DEFAULT_THEME_DOCK_ITEMS;
}

export function getThemeDockItems(themeStyle = "oneui") {
  return THEME_DOCK_CONTENT[themeStyle] || THEME_DOCK_CONTENT.oneui;
}
