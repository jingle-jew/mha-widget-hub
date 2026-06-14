import {
  createStorageBackup,
  readJson,
  readJsonResult,
  writeJson,
  writeStorageValue,
} from "../core/storage.js";
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  LEGACY_STORAGE_PREFIX,
  STORAGE_KEYS,
} from "../core/storage-keys.js";
import {
  createFallbackPage,
  normalizePage,
  normalizePages,
} from "./page-model.js";

function identity(value) {
  return value;
}

function readLegacyJson(key, legacyKey, fallback) {
  const current = readJson(key, null);
  if (current !== null) return current;
  const legacy = readJson(legacyKey, null);
  return legacy !== null ? legacy : fallback;
}

function readLegacyWidgets({
  defaultWidgets = [],
  normalizeWidget = identity,
  normalizeWidgetForGrid = identity,
} = {}) {
  const custom = (readJson(STORAGE_KEYS.customWidgets, []) || [])
    .filter(widget => widget?.id)
    .map(normalizeWidget);
  const baseWidgets = [...defaultWidgets, ...custom];
  const byId = new Map(baseWidgets.map(widget => [widget.id, widget]));
  const removed = new Set(
    readJson(STORAGE_KEYS.hiddenWidgets, [])
      .filter?.(id => byId.has(id)) || [],
  );
  const order = readLegacyJson(
    STORAGE_KEYS.gridOrder,
    `${LEGACY_STORAGE_PREFIX}-grid-order`,
    defaultWidgets.map(widget => widget.id),
  ).filter?.(id => byId.has(id) && !removed.has(id)) || [];

  defaultWidgets.forEach(widget => {
    if (!removed.has(widget.id) && !order.includes(widget.id)) {
      order.push(widget.id);
    }
  });
  custom.forEach(widget => {
    if (!removed.has(widget.id) && !order.includes(widget.id)) {
      order.push(widget.id);
    }
  });

  const sizes = readLegacyJson(
    STORAGE_KEYS.widgetSizes,
    `${LEGACY_STORAGE_PREFIX}-widget-sizes`,
    {},
  );

  return order.map(id => {
    const merged = normalizeWidget({
      ...byId.get(id),
      ...(sizes[id] || {}),
    });
    return {
      ...merged,
      ...normalizeWidgetForGrid(merged),
    };
  });
}

export function migratePageStorage({
  defaultWidgets = [],
  normalizeWidget = identity,
  normalizeWidgetForGrid = identity,
} = {}) {
  const version = Number(localStorage.getItem(STORAGE_KEYS.schemaVersion)) || 0;
  if (version >= CURRENT_STORAGE_SCHEMA_VERSION) {
    return { migrated: false, success: true };
  }

  const legacyOrderKey = `${LEGACY_STORAGE_PREFIX}-grid-order`;
  const legacySizesKey = `${LEGACY_STORAGE_PREFIX}-widget-sizes`;
  const backupCreated = createStorageBackup(
    STORAGE_KEYS.schemaMigrationBackup,
    [
      STORAGE_KEYS.gridPages,
      STORAGE_KEYS.activePage,
      STORAGE_KEYS.widgetPositions,
      STORAGE_KEYS.gridOrder,
      STORAGE_KEYS.widgetSizes,
      STORAGE_KEYS.hiddenWidgets,
      STORAGE_KEYS.customWidgets,
      legacyOrderKey,
      legacySizesKey,
    ],
    {
      fromSchemaVersion: version,
      toSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    },
  );

  if (!backupCreated) {
    return { migrated: true, success: false };
  }

  const pagesResult = readJsonResult(STORAGE_KEYS.gridPages);
  let storedPages = pagesResult.ok ? pagesResult.value : null;
  if (!Array.isArray(storedPages) || !storedPages.length) {
    const widgets = readLegacyWidgets({
      defaultWidgets,
      normalizeWidget,
      normalizeWidgetForGrid,
    });
    storedPages = [
      normalizePage(
        {
          id: "home",
          name: "Accueil",
          icon: "home",
          widgets,
        },
        0,
        { normalizeWidget },
      ),
    ];
    if (!writeJson(STORAGE_KEYS.gridPages, storedPages)) {
      return { migrated: true, success: false };
    }
  }

  if (!Array.isArray(storedPages) || !storedPages.length) {
    return { migrated: true, success: false };
  }

  return {
    migrated: true,
    success: writeStorageValue(
      STORAGE_KEYS.schemaVersion,
      CURRENT_STORAGE_SCHEMA_VERSION,
    ),
  };
}

export function readPages({ normalizeWidget = identity } = {}) {
  const stored = readJson(STORAGE_KEYS.gridPages, null);
  const normalized = normalizePages(stored, { normalizeWidget });

  if (normalized.pages.length) {
    return {
      pages: normalized.pages,
      persistenceResult: normalized.repaired
        ? writeJson(STORAGE_KEYS.gridPages, normalized.pages)
        : null,
    };
  }

  const pages = [createFallbackPage({ normalizeWidget })];
  return {
    pages,
    persistenceResult: writeJson(STORAGE_KEYS.gridPages, pages),
  };
}

export function readActivePageId(pages = []) {
  const stored = localStorage.getItem(STORAGE_KEYS.activePage);
  if (stored && pages.some(page => page.id === stored)) {
    return { activePageId: stored, persistenceResult: null };
  }

  const activePageId = pages[0]?.id || "home";
  return {
    activePageId,
    persistenceResult: writeStorageValue(
      STORAGE_KEYS.activePage,
      activePageId,
    ),
  };
}

export function savePages(
  pages,
  activePageId,
  { normalizeWidget = identity } = {},
) {
  const normalizedPages = pages.map((page, index) => (
    normalizePage(page, index, { normalizeWidget })
  ));
  const pagesSaved = writeJson(STORAGE_KEYS.gridPages, normalizedPages);
  const activePageSaved = writeStorageValue(
    STORAGE_KEYS.activePage,
    activePageId,
  );
  return pagesSaved && activePageSaved;
}
