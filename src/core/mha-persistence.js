import { readBoolean } from "./storage.js";
import { STORAGE_KEYS } from "./storage-keys.js";

export const {
  gridOrder: ORDER,
  widgetSizes: SIZES,
  hiddenWidgets: REMOVED,
  widgetPositions: POSITIONS,
  gridPages: PAGES,
  activePage: ACTIVE_PAGE,
  dockPosition: DOCK_POSITION,
  hideHaSidebar: HIDE_HA_SIDEBAR,
  dockLabels: DOCK_LABELS,
  language: LANGUAGE,
} = STORAGE_KEYS;

const DOCK_POSITIONS = new Set(["left", "right", "bottom"]);
const LANGUAGE_OPTIONS = new Set(["auto", "en", "fr", "es"]);
const GRID_STORAGE_KEYS = Object.freeze([ORDER, SIZES, REMOVED, POSITIONS, PAGES, ACTIVE_PAGE]);

export function normalizeDockPosition(value = "left") {
  return DOCK_POSITIONS.has(value) ? value : "left";
}

export function getStoredDockPosition(storage = localStorage) {
  return normalizeDockPosition(storage.getItem(DOCK_POSITION) || "left");
}

export function getStoredHideHaSidebar(storage = localStorage) {
  return readBoolean(HIDE_HA_SIDEBAR, false, storage);
}

export function getStoredDockLabels(storage = localStorage) {
  return readBoolean(DOCK_LABELS, false, storage);
}

export function normalizeLanguageSetting(value = "auto") {
  return LANGUAGE_OPTIONS.has(value) ? value : "auto";
}

export function getStoredLanguageSetting(storage = localStorage) {
  return normalizeLanguageSetting(storage.getItem(LANGUAGE) || "auto");
}

export function clearGridStorage(storage = localStorage) {
  GRID_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
}
