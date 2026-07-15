import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_ONEUI_PRIMARY_SURFACE_OPACITY,
  createThemeController,
  normalizeOneUiPrimarySurfaceOpacity,
} from "../src/settings/theme-controller.js";

function createStyle() {
  const properties = new Map();
  return {
    properties,
    getPropertyValue(name) {
      return properties.get(name) || "";
    },
    setProperty(name, value) {
      properties.set(name, String(value));
    },
    removeProperty(name) {
      properties.delete(name);
    },
  };
}

function withThemeEnvironment(run) {
  const previousDocument = globalThis.document;
  const previousLocalStorage = globalThis.localStorage;
  const previousWindow = globalThis.window;
  const storage = new Map();
  const root = {
    dataset: { themeStyle: "oneui" },
    style: createStyle(),
    setAttribute(name, value) {
      this.attributes ??= {};
      this.attributes[name] = String(value);
    },
  };
  const host = {
    dataset: {},
    style: createStyle(),
    setAttribute(name, value) {
      this.attributes ??= {};
      this.attributes[name] = String(value);
    },
  };

  globalThis.document = { documentElement: root };
  globalThis.localStorage = {
    getItem(key) {
      return storage.has(key) ? storage.get(key) : null;
    },
    setItem(key, value) {
      storage.set(key, String(value));
    },
  };
  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };

  try {
    return run({ host, root, storage });
  } finally {
    globalThis.document = previousDocument;
    globalThis.localStorage = previousLocalStorage;
    globalThis.window = previousWindow;
  }
}

test("OneUI primary surface opacity is normalized to a percentage", () => {
  assert.equal(normalizeOneUiPrimarySurfaceOpacity(-10), 0);
  assert.equal(normalizeOneUiPrimarySurfaceOpacity(42.6), 43);
  assert.equal(normalizeOneUiPrimarySurfaceOpacity(140), 100);
  assert.equal(
    normalizeOneUiPrimarySurfaceOpacity("invalid"),
    DEFAULT_ONEUI_PRIMARY_SURFACE_OPACITY,
  );
});

test("OneUI primary surface opacity persists and only applies to OneUI", () => withThemeEnvironment(({
  host,
  root,
  storage,
}) => {
  const controller = createThemeController(host);
  const oneUiState = controller.setOneUiPrimarySurfaceOpacity(37);

  assert.equal(storage.get("mha-oneui-primary-surface-opacity"), "37");
  assert.equal(oneUiState.oneUiPrimarySurfaceOpacity, 37);
  assert.equal(host.style.properties.get("--mha-oneui-primary-surface-opacity"), "37%");
  assert.equal(root.style.properties.get("--mha-oneui-primary-surface-opacity"), "37%");

  controller.setThemeStyle("ios");
  assert.equal(host.style.properties.has("--mha-oneui-primary-surface-opacity"), false);
  assert.equal(root.style.properties.has("--mha-oneui-primary-surface-opacity"), false);

  controller.setThemeStyle("oneui");
  assert.equal(host.style.properties.get("--mha-oneui-primary-surface-opacity"), "37%");
  assert.equal(root.style.properties.get("--mha-oneui-primary-surface-opacity"), "37%");
}));
