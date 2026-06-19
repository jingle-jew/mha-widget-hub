export const LAYOUT_MODE_STORAGE_KEY = "mha-layout-mode";

const LAYOUT_MODES = new Set(["auto", "mobile", "tablet", "desktop"]);

export function normalizeLayoutMode(value = "auto") {
  const mode = String(value || "auto").trim();
  return LAYOUT_MODES.has(mode) ? mode : "auto";
}

export function getStoredLayoutMode(storage = globalThis.localStorage) {
  try {
    return normalizeLayoutMode(storage?.getItem?.(LAYOUT_MODE_STORAGE_KEY) || "auto");
  } catch (error) {
    return "auto";
  }
}

export function writeStoredLayoutMode(value = "auto", storage = globalThis.localStorage) {
  const mode = normalizeLayoutMode(value);
  if (!storage) return false;

  try {
    if (mode === "auto") storage.removeItem?.(LAYOUT_MODE_STORAGE_KEY);
    else storage.setItem?.(LAYOUT_MODE_STORAGE_KEY, mode);
    return true;
  } catch (error) {
    return false;
  }
}
