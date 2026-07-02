import {
  createMediaPageWidgetSeed,
  createDefaultPageConfig,
  getDefaultPageIcon,
  getDefaultPageName,
  normalizePageConfig,
  normalizePageType,
  PAGE_TYPES,
} from "./page-types.js";

function identity(value) {
  return value;
}

function isMediaWidgetCandidate(widget = {}) {
  return ["media", "media-widget"].includes(widget?.kind)
    || ["media", "media-widget"].includes(widget?.type)
    || widget?.component === "media-widget";
}

export function normalizePage(
  page = {},
  index = 0,
  { normalizeWidget = identity } = {},
) {
  const fallbackId = `page-${index + 1}`;
  const id = String(page.id || fallbackId).trim() || fallbackId;
  const normalizedType = normalizePageType(page.type || PAGE_TYPES.GRID);
  const isLegacyMediaPage = normalizedType === PAGE_TYPES.MEDIA_PLAYERS;
  const type = isLegacyMediaPage ? PAGE_TYPES.GRID : normalizedType;
  const defaultType = isLegacyMediaPage ? PAGE_TYPES.MEDIA_PLAYERS : type;
  const defaultName = String(
    page.name
    || page.label
    || getDefaultPageName(defaultType, index),
  );
  const sourceWidgets = Array.isArray(page.widgets)
    ? page.widgets
    : [];
  const widgets = isLegacyMediaPage && !sourceWidgets.some(isMediaWidgetCandidate)
    ? [
      createMediaPageWidgetSeed({
        pageId: id,
        pageName: defaultName,
        config: page.config || {},
      }),
      ...sourceWidgets,
    ]
    : sourceWidgets;
  const normalized = {
    id,
    name: defaultName,
    icon: String(
      page.icon
      || (index === 0 && type === PAGE_TYPES.GRID ? "home" : getDefaultPageIcon(defaultType)),
    ),
    widgets: widgets.map(normalizeWidget),
  };

  if (!isLegacyMediaPage && (type !== PAGE_TYPES.GRID || page.type || page.config)) {
    normalized.type = type;
    normalized.config = normalizePageConfig(type, page.config || {});
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
      widgets: [
        createMediaPageWidgetSeed({
          pageId: "media",
          pageName: "Media Players",
          config: createDefaultPageConfig(PAGE_TYPES.MEDIA_PLAYERS),
        }),
      ],
    },
  ].map((page, index) => normalizePage(page, index, { normalizeWidget }));
}

export function getActivePage(pages = [], activePageId = "") {
  return pages.find(page => page.id === activePageId) || pages[0] || null;
}
