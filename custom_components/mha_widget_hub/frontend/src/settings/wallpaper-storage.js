export const LEGACY_WALLPAPER_STORAGE_KEY = "mha_custom_wallpaper";
export const WALLPAPER_STORAGE_KEYS = Object.freeze({
  light: "mha_custom_wallpaper_light",
  dark: "mha_custom_wallpaper_dark",
});

export const WALLPAPER_MAX_BYTES = 5 * 1024 * 1024;
export const WALLPAPER_ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const WALLPAPER_ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "webp",
]);

export function validateWallpaperFile(file) {
  if (!file) return "Aucun fichier sélectionné.";

  const extension = String(file.name || "").split(".").pop()?.toLowerCase() || "";
  if (
    !WALLPAPER_ALLOWED_MIME_TYPES.has(file.type)
    || !WALLPAPER_ALLOWED_EXTENSIONS.has(extension)
  ) {
    return "Ce format n’est pas accepté. Choisis une image JPG, PNG ou WebP.";
  }

  if (file.size > WALLPAPER_MAX_BYTES) {
    return "Cette image est trop lourde. La taille maximale est de 5 Mo.";
  }

  return "";
}

export function normalizeWallpaperPayload(value) {
  const dataUrl = String(value?.dataUrl || "");
  const mime = String(value?.mime || "");
  if (
    !dataUrl.startsWith(`data:${mime};base64,`)
    || !WALLPAPER_ALLOWED_MIME_TYPES.has(mime)
  ) {
    return null;
  }

  return {
    dataUrl,
    name: String(value?.name || "Image importée"),
    importedAt: String(value?.importedAt || ""),
    mime,
  };
}

export function readWallpaper(storage, mode) {
  const key = WALLPAPER_STORAGE_KEYS[mode];
  if (!key) return null;

  const raw = storage.getItem(key);
  if (!raw) return null;

  try {
    return normalizeWallpaperPayload(JSON.parse(raw));
  } catch (error) {
    console.warn(`[MHA] Custom ${mode} wallpaper could not be read.`, error);
    return null;
  }
}

export function readLegacyWallpaper(storage) {
  const raw = storage.getItem(LEGACY_WALLPAPER_STORAGE_KEY);
  if (!raw) return null;

  try {
    return normalizeWallpaperPayload(JSON.parse(raw));
  } catch (error) {
    console.warn("[MHA] Legacy custom wallpaper could not be read.", error);
    return null;
  }
}

export function readWallpapers(storage) {
  return {
    light: readWallpaper(storage, "light"),
    dark: readWallpaper(storage, "dark"),
  };
}

export function migrateLegacyWallpaper(storage, mode) {
  if (!WALLPAPER_STORAGE_KEYS[mode] || storage.getItem(WALLPAPER_STORAGE_KEYS[mode])) {
    return false;
  }

  if (!storage.getItem(LEGACY_WALLPAPER_STORAGE_KEY)) return false;

  const wallpaper = readLegacyWallpaper(storage);
  if (!wallpaper) return false;

  try {
    storage.setItem(WALLPAPER_STORAGE_KEYS[mode], JSON.stringify(wallpaper));
    storage.removeItem(LEGACY_WALLPAPER_STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn("[MHA] Legacy custom wallpaper could not be migrated.", error);
    return false;
  }
}

export function saveWallpaper(storage, mode, payload) {
  const key = WALLPAPER_STORAGE_KEYS[mode];
  const wallpaper = normalizeWallpaperPayload(payload);
  if (!key || !wallpaper) return false;
  storage.setItem(key, JSON.stringify(wallpaper));
  return true;
}

export function resetWallpaper(storage, mode) {
  const key = WALLPAPER_STORAGE_KEYS[mode];
  if (!key) return false;
  storage.removeItem(key);
  return true;
}
