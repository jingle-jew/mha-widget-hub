import { getDefaultThemeDockItems, getThemeDockItems } from "../settings/theme-dock-content.js";

export const DOCK_ITEM_TYPES = Object.freeze({
  PAGE: "page",
  ACTION: "action",
  SPACER: "spacer",
});

const DOCK_MANIFEST_ITEM_TYPES = Object.freeze({
  PAGES: "pages",
  EDIT_ACTIONS: "edit-actions",
});

function createDefaultPageItems(pages = []) {
  return (Array.isArray(pages) && pages.length ? pages : [
    { id: "home", name: "Home", icon: "home" },
  ]).map((page, index) => ({
    type: DOCK_ITEM_TYPES.PAGE,
    action: "page",
    pageId: page.id,
    symbol: page.icon || (index === 0 ? "home" : "grid"),
    category: index === 0 ? "home" : "utility",
    label: page.name || `Page ${index + 1}`,
  }));
}

function createEditActionItems({
  labels = {},
} = {}) {
  return [
    {
      type: DOCK_ITEM_TYPES.ACTION,
      action: "add-page",
      symbol: "plus",
      category: "utility",
      label: labels.addPage || "Add page",
      className: "mha-dock-add-page",
      mobileClassName: "mha-mobile-dock-add-page",
    },
    {
      type: DOCK_ITEM_TYPES.ACTION,
      action: "dock-settings",
      symbol: "edit",
      category: "utility",
      label: labels.manageDock || "Manage dock",
      className: "mha-dock-edit",
      mobileClassName: "mha-mobile-dock-edit",
    },
  ];
}

function resolveManifestItemLabel(item = {}, labels = {}) {
  if (item.label) return item.label;
  if (item.labelKey && labels[item.labelKey]) return labels[item.labelKey];
  if (item.action === "settings") return labels.settings || "Settings";
  if (item.action === "add-page") return labels.addPage || "Add page";
  if (item.action === "dock-settings") return labels.manageDock || "Manage dock";
  return item.label || item.pageId || item.action || "";
}

function buildDockItemsFromManifestItem(item = {}, state = {}) {
  if (item.type === DOCK_MANIFEST_ITEM_TYPES.PAGES) {
    return createDefaultPageItems(state.pages);
  }

  if (item.type === DOCK_MANIFEST_ITEM_TYPES.EDIT_ACTIONS) {
    return state.isEditing ? createEditActionItems({ labels: state.labels }) : [];
  }

  return [normalizeDockItem({
    ...item,
    label: resolveManifestItemLabel(item, state.labels || {}),
  })].filter(Boolean);
}

export function buildDockItemsFromManifest(items = [], state = {}) {
  const manifestItems = Array.isArray(items) && items.length
    ? items
    : getDefaultThemeDockItems();
  return normalizeDockItems(manifestItems.flatMap(item => buildDockItemsFromManifestItem(item, state)));
}

export function buildDefaultDockItems(state = {}) {
  return buildDockItemsFromManifest(getDefaultThemeDockItems(), state);
}

const DOCK_CONTENT_BUILDERS = Object.freeze({
  default: buildDefaultDockItems,
});

function inferDockItemType(item = {}) {
  const explicitType = String(item.type || "").trim();
  if (explicitType === DOCK_ITEM_TYPES.PAGE) return DOCK_ITEM_TYPES.PAGE;
  if (explicitType === DOCK_ITEM_TYPES.ACTION) return DOCK_ITEM_TYPES.ACTION;
  if (explicitType === DOCK_ITEM_TYPES.SPACER) return DOCK_ITEM_TYPES.SPACER;
  if (item.action === "page" || item.pageId) return DOCK_ITEM_TYPES.PAGE;
  if (item.action || item.symbol || item.label) return DOCK_ITEM_TYPES.ACTION;
  return "";
}

export function normalizeDockItem(item = {}) {
  const type = inferDockItemType(item);
  if (!type) return null;
  if (type === DOCK_ITEM_TYPES.SPACER) {
    return {
      type,
      className: String(item.className || ""),
      mobileClassName: String(item.mobileClassName || ""),
    };
  }

  return {
    ...item,
    type,
    action: type === DOCK_ITEM_TYPES.PAGE
      ? "page"
      : String(item.action || ""),
    pageId: String(item.pageId || ""),
    symbol: String(item.symbol || (type === DOCK_ITEM_TYPES.PAGE ? "grid" : "")),
    category: String(item.category || (type === DOCK_ITEM_TYPES.PAGE ? "utility" : "system")),
    label: String(item.label || item.pageId || item.action || ""),
    className: String(item.className || ""),
    mobileClassName: String(item.mobileClassName || ""),
  };
}

export function normalizeDockItems(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => normalizeDockItem(item))
    .filter(Boolean);
}

export function getDockContentBuilder(name = "default") {
  return DOCK_CONTENT_BUILDERS[name] || DOCK_CONTENT_BUILDERS.default;
}

export function resolveDockContentBuilder() {
  return getDockContentBuilder("default");
}

export function buildDockContent({
  themeStyle = "oneui",
  ...state
} = {}) {
  return buildDockItemsFromManifest(getThemeDockItems(themeStyle), state);
}

export function resolveDockItems({
  items = [],
  contentBuilder = "",
  themeStyle = "oneui",
  ...state
} = {}) {
  if (Array.isArray(items) && items.length) return buildDockItemsFromManifest(items, state);
  if (contentBuilder) return normalizeDockItems(getDockContentBuilder(contentBuilder)(state));
  return buildDockItemsFromManifest(getThemeDockItems(themeStyle), state);
}
