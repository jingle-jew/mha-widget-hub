import test from "node:test";
import assert from "node:assert/strict";
import {
  LEGACY_WALLPAPER_STORAGE_KEY,
  WALLPAPER_MAX_BYTES,
  WALLPAPER_STORAGE_KEYS,
  migrateLegacyWallpaper,
  readWallpapers,
  resetWallpaper,
  saveWallpaper,
  validateWallpaperFile,
} from "../src/settings/wallpaper-storage.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    values,
  };
}

const wallpaper = {
  dataUrl: "data:image/jpeg;base64,d2FsbHBhcGVy",
  name: "salon.jpg",
  importedAt: "2026-06-14T12:00:00.000Z",
  mime: "image/jpeg",
};

test("wallpaper validation accepts supported images and explains failures", () => {
  assert.equal(validateWallpaperFile({
    name: "salon.webp",
    type: "image/webp",
    size: WALLPAPER_MAX_BYTES,
  }), "");
  assert.match(validateWallpaperFile({
    name: "salon.gif",
    type: "image/gif",
    size: 100,
  }), /JPG, PNG ou WebP/);
  assert.match(validateWallpaperFile({
    name: "salon.png",
    type: "image/png",
    size: WALLPAPER_MAX_BYTES + 1,
  }), /5 Mo/);
});

test("light and dark wallpapers are stored and reset independently", () => {
  const storage = createStorage();
  const darkWallpaper = {
    ...wallpaper,
    dataUrl: "data:image/png;base64,ZGFyaw==",
    name: "nuit.png",
    mime: "image/png",
  };

  assert.equal(saveWallpaper(storage, "light", wallpaper), true);
  assert.equal(saveWallpaper(storage, "dark", darkWallpaper), true);
  assert.deepEqual(readWallpapers(storage), {
    light: wallpaper,
    dark: darkWallpaper,
  });

  assert.equal(resetWallpaper(storage, "light"), true);
  assert.deepEqual(readWallpapers(storage), {
    light: null,
    dark: darkWallpaper,
  });
});

test("legacy wallpaper migrates once to the effective theme without duplication", () => {
  const storage = createStorage({
    [LEGACY_WALLPAPER_STORAGE_KEY]: JSON.stringify(wallpaper),
  });

  assert.equal(migrateLegacyWallpaper(storage, "dark"), true);
  assert.equal(storage.getItem(LEGACY_WALLPAPER_STORAGE_KEY), null);
  assert.equal(storage.getItem(WALLPAPER_STORAGE_KEYS.light), null);
  assert.deepEqual(readWallpapers(storage), {
    light: null,
    dark: wallpaper,
  });
});

test("failed legacy migration keeps the original wallpaper intact", () => {
  const storage = createStorage({
    [LEGACY_WALLPAPER_STORAGE_KEY]: JSON.stringify(wallpaper),
  });
  const previousWarn = console.warn;
  console.warn = () => {};
  storage.setItem = () => {
    throw new DOMException("Quota exceeded", "QuotaExceededError");
  };

  try {
    assert.equal(migrateLegacyWallpaper(storage, "light"), false);
    assert.notEqual(storage.getItem(LEGACY_WALLPAPER_STORAGE_KEY), null);
  } finally {
    console.warn = previousWarn;
  }
});
