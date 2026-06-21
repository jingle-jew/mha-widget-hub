import { STORAGE_KEYS } from "../core/storage-keys.js";

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (_error) {
    return fallback;
  }
}

function readString(key, fallback = "") {
  try {
    return localStorage.getItem(key) || fallback;
  } catch (_error) {
    return fallback;
  }
}

function getPages() {
  const pages = readJson(STORAGE_KEYS.gridPages, []);
  return Array.isArray(pages) ? pages : [];
}

function getWidgets(pages = []) {
  return pages.flatMap(page => Array.isArray(page.widgets) ? page.widgets : []);
}

function getWidgetKind(widget = {}) {
  return String(widget.kind || widget.type || widget.component || "unknown");
}

function getConfiguredEntityIds(widget = {}) {
  const values = [
    widget.entity,
    widget.entityId,
    widget.weatherEntity,
    widget.mediaEntity,
    widget.climateEntity,
    widget.sensorEntity,
    widget.targetEntity,
    widget.lightEntity,
    widget.switchEntity,
  ];

  if (Array.isArray(widget.entities)) values.push(...widget.entities);
  if (Array.isArray(widget.buttons)) {
    widget.buttons.forEach(button => values.push(button?.entity, button?.entityId));
  }

  return values
    .filter(value => typeof value === "string" && value.includes("."))
    .map(value => value.trim());
}

function summarizeWidgetKinds(widgets = []) {
  const counts = new Map();
  widgets.forEach(widget => {
    const kind = getWidgetKind(widget);
    counts.set(kind, (counts.get(kind) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([kind, count]) => ({ kind, count }));
}

function summarizeEntityDomains(widgets = []) {
  const counts = new Map();
  widgets.flatMap(getConfiguredEntityIds).forEach(entityId => {
    const domain = entityId.split(".")[0] || "unknown";
    counts.set(domain, (counts.get(domain) || 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([domain, count]) => ({ domain, count }));
}

function summarizeStorage() {
  let keys = [];
  try {
    keys = Object.keys(localStorage).filter(key => key.startsWith("mha-"));
  } catch (_error) {
    keys = [];
  }

  return {
    keyCount: keys.length,
    hasPages: keys.includes(STORAGE_KEYS.gridPages),
    hasActivePage: keys.includes(STORAGE_KEYS.activePage),
    hasPanelAppearance: keys.includes("mha-extension-panel-appearance"),
  };
}

export function collectDiagnosticsStats({ hass } = {}) {
  const pages = getPages();
  const widgets = getWidgets(pages);
  const activePageId = readString(STORAGE_KEYS.activePage, pages[0]?.id || "");
  const activePage = pages.find(page => page.id === activePageId) || pages[0] || null;
  const emptyPages = pages.filter(page => !Array.isArray(page.widgets) || !page.widgets.length);
  const widgetKinds = summarizeWidgetKinds(widgets);
  const entityDomains = summarizeEntityDomains(widgets);
  const storage = summarizeStorage();
  const hassStates = hass?.states || {};

  return {
    pages,
    widgets,
    activePage,
    emptyPages,
    widgetKinds,
    entityDomains,
    storage,
    totals: {
      pages: pages.length,
      widgets: widgets.length,
      widgetKinds: widgetKinds.length,
      configuredEntities: widgets.flatMap(getConfiguredEntityIds).length,
      hassEntities: Object.keys(hassStates).length,
    },
  };
}
