import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_IOS_GLASS_TINT,
  DEFAULT_IOS_WIDGET_TINT,
  createThemeController,
  normalizeIosGlassTint,
  normalizeIosWidgetTint,
  resolveIosGlassCompatibility,
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
  const makeTarget = () => ({
    dataset: {},
    style: createStyle(),
    setAttribute(name, value) {
      this.attributes ??= {};
      this.attributes[name] = String(value);
    },
  });
  const root = makeTarget();
  const host = makeTarget();

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

test("iOS glass tint and widget tint values are normalized", () => {
  assert.equal(DEFAULT_IOS_GLASS_TINT, 0);
  assert.equal(DEFAULT_IOS_WIDGET_TINT, "transparent");
  assert.equal(normalizeIosGlassTint(-4), 0);
  assert.equal(normalizeIosGlassTint(42.6), 43);
  assert.equal(normalizeIosGlassTint(140), 100);
  assert.equal(normalizeIosGlassTint("invalid"), 0);
  assert.equal(normalizeIosWidgetTint("tinted"), "tinted");
  assert.equal(normalizeIosWidgetTint("unknown"), "transparent");
  assert.equal(resolveIosGlassCompatibility(49), "liquid");
  assert.equal(resolveIosGlassCompatibility(50), "frosted");
});

test("legacy iOS glass selection migrates both new controls to matching endpoints", () => withThemeEnvironment(({
  host,
  storage,
}) => {
  storage.set("mha-theme-style", "ios");
  storage.set("mha-ios-glass", "frosted");

  const state = createThemeController(host).read();

  assert.equal(state.iosGlassTint, 100);
  assert.equal(state.iosWidgetTint, "tinted");
  assert.equal(state.iosGlass, "frosted");
}));

test("iOS glass tint persists and synchronizes only widget mix properties", () => withThemeEnvironment(({
  host,
  root,
  storage,
}) => {
  storage.set("mha-theme-style", "ios");
  const controller = createThemeController(host);
  const state = controller.setIosGlassTint(37);

  assert.equal(storage.get("mha-ios-glass-tint"), "37");
  assert.equal(state.iosGlassTint, 37);
  assert.equal(state.iosGlass, "liquid");
  assert.equal(host.dataset.iosGlassTint, "37");
  assert.equal(root.dataset.iosGlassTint, "37");
  assert.equal(host.style.properties.get("--mha-ios-glass-tint"), "0.37");
  assert.equal(host.style.properties.get("--mha-ios-glass-tint-percent"), "37%");
  assert.equal(host.style.properties.get("--mha-ios-liquid-percent"), "63%");
  assert.equal(host.style.properties.get("--mha-ios-widget-noise-opacity"), "0.0694");
  assert.equal(host.style.properties.get("--mha-ios-widget-highlight-opacity"), "0.412");
  assert.equal(root.style.properties.get("--mha-ios-glass-tint-percent"), "37%");

  controller.setThemeStyle("material");
  assert.equal(host.style.properties.has("--mha-ios-glass-tint-percent"), false);
  assert.equal(root.style.properties.has("--mha-ios-glass-tint-percent"), false);
}));

test("iOS special-widget tint persists independently from the glass slider", () => withThemeEnvironment(({
  host,
  storage,
}) => {
  storage.set("mha-theme-style", "ios");
  storage.set("mha-ios-glass-tint", "28");
  const controller = createThemeController(host);
  const state = controller.setIosWidgetTint("tinted");

  assert.equal(storage.get("mha-ios-widget-tint"), "tinted");
  assert.equal(storage.get("mha-ios-glass-tint"), "28");
  assert.equal(state.iosGlassTint, 28);
  assert.equal(state.iosWidgetTint, "tinted");
  assert.equal(host.dataset.iosWidgetTint, "tinted");
}));
