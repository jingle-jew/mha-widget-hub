import { normalizePage } from "./page-model.js?v=media-persistence-v2";
import {
  createDefaultPageConfig,
  getDefaultPageIcon,
  getDefaultPageName,
  normalizePageConfig,
  normalizePageType,
  PAGE_TYPES,
} from "./page-types.js?v=media-persistence-v2";

export function selectPage(pages, activePageId, pageId) {
  if (
    !pageId
    || pageId === activePageId
    || !pages.some(page => page.id === pageId)
  ) {
    return null;
  }

  return { activePageId: pageId };
}

export function addPage(
  pages,
  {
    icon = "",
    name = "",
    pageType = PAGE_TYPES.GRID,
    pageConfig = {},
    initialWidgets = [],
    now = Date.now,
    normalizeWidget,
  } = {},
) {
  const index = pages.length + 1;
  const id = `page-${now().toString(36)}-${index}`;
  const type = normalizePageType(pageType);
  const config = normalizePageConfig(
    type,
    Object.keys(pageConfig || {}).length ? pageConfig : createDefaultPageConfig(type),
  );
  const rawPage = {
    id,
    name: String(name || "").trim() || getDefaultPageName(type, index - 1),
    icon: icon || getDefaultPageIcon(type),
    widgets: Array.isArray(initialWidgets) ? initialWidgets : [],
  };
  if (type !== PAGE_TYPES.GRID) {
    rawPage.type = type;
    rawPage.config = config;
  }
  const page = normalizePage(rawPage, index - 1, { normalizeWidget });

  return {
    pages: [...pages, page],
    activePageId: id,
    page,
  };
}

export function movePage(pages, pageId, direction = 0) {
  const from = pages.findIndex(page => page.id === pageId);
  if (from < 0) return null;

  const to = from + (Number(direction) < 0 ? -1 : 1);
  if (to < 0 || to >= pages.length) return null;

  const nextPages = [...pages];
  const [page] = nextPages.splice(from, 1);
  nextPages.splice(to, 0, page);
  return { pages: nextPages, from, to };
}

export function renamePage(pages, pageId, name = "") {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;

  return {
    pages: pages.map(page => (
      page.id === pageId ? { ...page, name: cleanName } : page
    )),
    name: cleanName,
  };
}

export function changePageIcon(pages, pageId, icon = "grid") {
  const nextIcon = String(icon || "grid");
  return {
    pages: pages.map(page => (
      page.id === pageId ? { ...page, icon: nextIcon } : page
    )),
    icon: nextIcon,
  };
}

export function updatePageConfig(pages, pageId, updater = {}) {
  const page = pages.find(candidate => candidate.id === pageId);
  if (!page) return null;

  const nextConfig = typeof updater === "function"
    ? updater(page.config || {}, page)
    : { ...(page.config || {}), ...(updater || {}) };

  return {
    pages: pages.map(candidate => (
      candidate.id === pageId
        ? {
          ...candidate,
          config: normalizePageConfig(candidate.type, nextConfig),
        }
        : candidate
    )),
  };
}

export function deletePage(pages, activePageId, pageId) {
  if (!pageId || pages.length <= 1) return null;

  const page = pages.find(candidate => candidate.id === pageId);
  if (!page) return null;

  const nextPages = pages.filter(candidate => candidate.id !== pageId);
  const activePageChanged = activePageId === pageId;

  return {
    pages: nextPages,
    activePageId: activePageChanged
      ? nextPages[0]?.id || "home"
      : activePageId,
    activePageChanged,
    removedWidgetIds: (page.widgets || [])
      .map(widget => widget?.id)
      .filter(Boolean),
  };
}

export function removePageWidgetPositions(
  widgetPositions,
  pageId,
  removedWidgetIds = [],
) {
  const ids = new Set(removedWidgetIds);
  const nextPositions = {};

  Object.entries(widgetPositions || {}).forEach(([key, layout]) => {
    if (key.startsWith(`${pageId}:`)) return;
    if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
      nextPositions[key] = layout;
      return;
    }

    nextPositions[key] = Object.fromEntries(
      Object.entries(layout).filter(([widgetId]) => !ids.has(widgetId)),
    );
  });

  return nextPositions;
}
