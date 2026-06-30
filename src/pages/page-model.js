import {
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

export function normalizePage(
  page = {},
  index = 0,
  { normalizeWidget = identity } = {},
) {
  const fallbackId = `page-${index + 1}`;
  const id = String(page.id || fallbackId).trim() || fallbackId;
  const type = normalizePageType(page.type || PAGE_TYPES.GRID);
  const normalized = {
    id,
    name: String(
      page.name
      || page.label
      || getDefaultPageName(type, index),
    ),
    icon: String(page.icon || (index === 0 && type === PAGE_TYPES.GRID ? "home" : getDefaultPageIcon(type))),
    widgets: Array.isArray(page.widgets)
      ? page.widgets.map(normalizeWidget)
      : [],
  };

  if (type !== PAGE_TYPES.GRID || page.type || page.config) {
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
    if (id !== baseId) repaired = true;
    return id === baseId ? normalized : { ...normalized, id };
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
      id: "page-3",
      name: "Page 3",
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
