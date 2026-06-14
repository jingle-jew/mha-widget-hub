import test from "node:test";
import assert from "node:assert/strict";
import {
  createWallpaperController,
} from "../src/settings/wallpaper-controller.js";
import {
  LEGACY_WALLPAPER_STORAGE_KEY,
  WALLPAPER_STORAGE_KEYS,
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

function createHost() {
  const properties = new Map();
  return {
    dataset: {},
    style: {
      setProperty(name, value) {
        properties.set(name, value);
      },
      removeProperty(name) {
        properties.delete(name);
      },
      properties,
    },
  };
}

const wallpaper = {
  dataUrl: "data:image/jpeg;base64,d2FsbHBhcGVy",
  name: "salon.jpg",
  importedAt: "2026-06-14T12:00:00.000Z",
  mime: "image/jpeg",
};

test("wallpaper controller migrates and applies the effective theme", () => {
  const storage = createStorage({
    [LEGACY_WALLPAPER_STORAGE_KEY]: JSON.stringify(wallpaper),
  });
  const host = createHost();
  const controller = createWallpaperController(host, {
    storage,
    getTheme: () => "dark",
  });

  assert.equal(controller.migrateLegacy(), true);
  assert.deepEqual(controller.apply(), {
    light: null,
    dark: wallpaper,
  });
  assert.equal(host.dataset.customWallpaper, "true");
  assert.equal(
    host.style.properties.get("--mha-custom-wallpaper-image"),
    `url("${wallpaper.dataUrl}")`,
  );
});

test("wallpaper save and reset keep storage, state and host style aligned", () => {
  const storage = createStorage();
  const host = createHost();
  const controller = createWallpaperController(host, {
    storage,
    getTheme: () => "light",
  });

  assert.deepEqual(controller.save("light", wallpaper), {
    light: wallpaper,
    dark: null,
  });
  assert.ok(storage.getItem(WALLPAPER_STORAGE_KEYS.light));
  assert.equal(host.dataset.customWallpaper, "true");

  assert.deepEqual(controller.reset("light"), {
    light: null,
    dark: null,
  });
  assert.equal(host.dataset.customWallpaper, "false");
  assert.equal(
    host.style.properties.has("--mha-custom-wallpaper-image"),
    false,
  );
});

test("invalid wallpaper payloads preserve the existing error contract", () => {
  const controller = createWallpaperController(createHost(), {
    storage: createStorage(),
  });

  assert.throws(
    () => controller.save("light", { dataUrl: "invalid" }),
    /Invalid wallpaper payload/,
  );
});
