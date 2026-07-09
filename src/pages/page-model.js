import {
  createDefaultPageConfig,
  getDefaultPageIcon,
  getDefaultPageName,
  isMediaPagePanelWidget,
  normalizePageConfig,
  normalizePageType,
  PAGE_TYPES,
} from "./page-types.js";

function identity(value) {
  return value;
}

function resolveStoredPageType(page = {}, widgets = []) {
  const normalizedType = normalizePageType(page.type || PAGE_TYPES.GRID);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) return PAGE_TYPES.MEDIA_PLAYERS;

  const mediaPagePanelWidgets = widgets.filter(widget => isMediaPagePanelWidget(widget));
  const shouldPromoteLegacyMediaPage = normalizedType === PAGE_TYPES.GRID
    && mediaPagePanelWidgets.length === 1
    && widgets.length === 1;

  return shouldPromoteLegacyMediaPage ? PAGE_TYPES.MEDIA_PLAYERS : normalizedType;
}

function resolveMediaPageConfig(page = {}, widgets = []) {
  const mediaPagePanelWidget = widgets.find(widget => isMediaPagePanelWidget(widget)) || null;
  const widgetEntityId = String(
    mediaPagePanelWidget?.mediaEntityId
    || mediaPagePanelWidget?.entityId
    || mediaPagePanelWidget?.entity_id
    || "",
  ).trim();
  const configuredEnabledIds = Array.isArray(page?.config?.enabledPlayerIds)
    ? page.config.enabledPlayerIds
    : [];

  return normalizePageConfig(PAGE_TYPES.MEDIA_PLAYERS, {
    ...(page.config || {}),
    enabledPlayerIds: configuredEnabledIds.length
      ? configuredEnabledIds
      : widgetEntityId
        ? [widgetEntityId]
        : [],
    defaultPlayerId: page?.config?.defaultPlayerId || widgetEntityId,
    selectedPlayerId: page?.config?.selectedPlayerId || widgetEntityId,
  });
}

export function normalizePage(
  page = {},
  index = 0,
  { normalizeWidget = identity } = {},
) {
  const fallbackId = `page-${index + 1}`;
  const id = String(page.id || fallbackId).trim() || fallbackId;
  const sourceWidgets = Array.isArray(page.widgets)
    ? page.widgets
    : [];
  const type = resolveStoredPageType(page, sourceWidgets);
  const defaultName = String(
    page.name
    || page.label
    || getDefaultPageName(type, index),
  );
  const normalized = {
    id,
    name: defaultName,
    icon: String(
      page.icon
      || (index === 0 && type === PAGE_TYPES.GRID ? "home" : getDefaultPageIcon(type)),
    ),
    widgets: sourceWidgets.map(normalizeWidget),
  };

  if (type !== PAGE_TYPES.GRID || page.type || page.config) {
    normalized.type = type;
    normalized.config = type === PAGE_TYPES.MEDIA_PLAYERS
      ? resolveMediaPageConfig(page, sourceWidgets)
      : normalizePageConfig(type, page.config || {});
  }

  return normalized;
}

export function normalizePages(
  storedPages,
  { normalizeWidget = identity } = {},
) {
  if (!Array.isArray(storedPages)) {
    return { pages: [], repaired: false };
  }

  const usedIds = new Set();
  let repaired = false;
  const pages = storedPages.map((page, index) => {
    const normalized = normalizePage(page, index, { normalizeWidget });
    const baseId = normalized.id;
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    const nextPage = id === baseId ? normalized : { ...normalized, id };
    if (id !== baseId || JSON.stringify(page) !== JSON.stringify(nextPage)) repaired = true;
    return nextPage;
  }).filter(page => page.id);

  return { pages, repaired };
}

export function createFallbackPage({ normalizeWidget = identity } = {}) {
  return normalizePage(
    {
      id: "home",
      name: "Home",
      icon: "home",
      widgets: [],
    },
    0,
    { normalizeWidget },
  );
}

export function createDefaultPages({ normalizeWidget = identity } = {}) {
  return [
    {
      id: "home",
      name: "Home",
      icon: "home",
      widgets: [],
    },
    {
      id: "page-2",
      name: "Page 2",
      icon: "grid",
      widgets: [],
    },
    {
      id: "media",
      name: "Media Players",
      icon: "media-player",
      type: PAGE_TYPES.MEDIA_PLAYERS,
      config: createDefaultPageConfig(PAGE_TYPES.MEDIA_PLAYERS),
      widgets: [],
    },
  ].map((page, index) => normalizePage(page, index, { normalizeWidget }));
}

export function getActivePage(pages = [], activePageId = "") {
  return pages.find(page => page.id === activePageId) || pages[0] || null;
}
