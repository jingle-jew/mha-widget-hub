import { getActivePage, normalizePage } from "../pages/page-model.js?v=media-persistence-v2";
import {
  migratePageStorage,
  readActivePageId,
  readPages,
  savePages,
} from "../pages/page-store.js?v=media-persistence-v2";

function identity(value) {
  return value;
}

export function migrateHubPageStorage({
  defaultWidgets = [],
  normalizeWidget = identity,
  normalizeWidgetForGrid = identity,
} = {}) {
  return migratePageStorage({
    defaultWidgets,
    normalizeWidget,
    normalizeWidgetForGrid,
  });
}

export function normalizeHubPage(
  page = {},
  index = 0,
  { normalizeWidget = identity } = {},
) {
  return normalizePage(page, index, { normalizeWidget });
}

export function readHubPages({ normalizeWidget = identity } = {}) {
  return readPages({ normalizeWidget });
}

export function readHubActivePageId(pages = []) {
  return readActivePageId(pages);
}

export function getHubActivePage(pages = [], activePageId = "") {
  return getActivePage(pages, activePageId);
}

export function saveHubPages(
  pages,
  activePageId,
  { normalizeWidget = identity } = {},
) {
  return savePages(pages, activePageId, { normalizeWidget });
}

export function readActivePageWidgets({
  pages = [],
  activePageId = "",
  normalizeWidget = identity,
  normalizeWidgetForGrid = identity,
} = {}) {
  const page = getHubActivePage(pages, activePageId);
  if (!page) return [];

  return (page.widgets || []).map((widget) => {
    const normalized = normalizeWidget(widget);
    return { ...normalized, ...normalizeWidgetForGrid(normalized) };
  });
}

export function syncActivePageWidgets({
  pages = [],
  activePageId = "",
  widgets = [],
  normalizeWidget = identity,
} = {}) {
  const page = getHubActivePage(pages, activePageId);
  if (!page) return false;
  page.widgets = widgets.map((widget) => normalizeWidget(widget));
  return saveHubPages(pages, activePageId, { normalizeWidget });
}
