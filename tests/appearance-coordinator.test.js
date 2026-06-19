import test from "node:test";
import assert from "node:assert/strict";

import { createAppearanceCoordinator } from "../src/settings/appearance-coordinator.js";

function createDeferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function createHost() {
  const properties = new Map();
  const classSet = new Set();
  return {
    dataset: {},
    style: {
      setProperty(name, value) {
        properties.set(name, String(value));
      },
      removeProperty(name) {
        properties.delete(name);
      },
      properties,
    },
    classList: {
      add(token) {
        classSet.add(token);
      },
      remove(token) {
        classSet.delete(token);
      },
      contains(token) {
        return classSet.has(token);
      },
    },
  };
}

function createHarness(overrides = {}) {
  const calls = [];
  const host = createHost();
  host.style.setProperty("--mha-accent-auto", "#111");
  host.style.setProperty("--mha-accent-auto-contrast", "#eee");

  const root = {
    children: [],
    querySelector(selector) {
      return this.children.find((child) => child.className === selector.slice(1)) || null;
    },
    append(node) {
      node.parentNode = this;
      this.children.push(node);
    },
  };

  const state = {
    customWallpapers: { light: null, dark: null },
    themeState: { theme: "dark", themeStyle: "oneui", themeSetting: "auto" },
    accentSource: { source: "theme", kind: "none", value: "" },
    connected: true,
    ...overrides.state,
  };

  const rafCallbacks = [];
  const timeoutCallbacks = [];

  const coordinator = createAppearanceCoordinator({
    host,
    getRoot: () => root,
    isConnected: () => state.connected,
    getCustomWallpapers: () => state.customWallpapers,
    setCustomWallpapers: (wallpapers) => { state.customWallpapers = wallpapers; },
    readThemeState: () => state.themeState,
    syncTheme: () => {
      calls.push("syncTheme");
      return state.themeState;
    },
    setTheme: (value) => {
      state.themeState = { ...state.themeState, themeSetting: value };
      calls.push(["setTheme", value]);
      return state.themeState;
    },
    setThemeStyle: (value) => {
      state.themeState = { ...state.themeState, themeStyle: value };
      calls.push(["setThemeStyle", value]);
      return state.themeState;
    },
    setIosGlass: (value) => calls.push(["setIosGlass", value]),
    setAccent: (value) => calls.push(["setAccent", value]),
    setAccentMode: (value) => calls.push(["setAccentMode", value]),
    setIconShape: (value) => calls.push(["setIconShape", value]),
    migrateLegacyWallpaper: () => calls.push("migrateLegacyWallpaper"),
    readWallpapers: () => state.customWallpapers,
    applyWallpaperState: (themeState) => {
      calls.push(["applyWallpaperState", themeState.themeStyle]);
      return state.customWallpapers;
    },
    saveWallpaper: (mode, payload) => {
      calls.push(["saveWallpaper", mode, payload?.name || ""]);
      state.customWallpapers = { ...state.customWallpapers, [mode]: payload };
      return state.customWallpapers;
    },
    resetWallpaper: (mode) => {
      calls.push(["resetWallpaper", mode]);
      state.customWallpapers = { ...state.customWallpapers, [mode]: null };
      return state.customWallpapers;
    },
    getActiveAccentSource: () => state.accentSource,
    syncSettingsDom: () => calls.push("syncSettingsDom"),
    syncScreensaverSettingsDom: () => calls.push("syncScreensaverSettingsDom"),
    syncDocksDom: () => calls.push("syncDocksDom"),
    refreshActiveGridOnly: () => calls.push("refreshActiveGridOnly"),
    scheduleIconSymbolRefresh: () => calls.push("scheduleIconSymbolRefresh"),
    requestAnimationFrameFn: (callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    },
    cancelAnimationFrameFn: () => {},
    setTimeoutFn: (callback) => {
      timeoutCallbacks.push(callback);
      return timeoutCallbacks.length;
    },
    clearTimeoutFn: () => {},
    createElement: () => ({
      className: "",
      dataset: {},
      style: {},
      attributes: {},
      parentNode: null,
      setAttribute(name, value) {
        this.attributes[name] = value;
      },
      remove() {
        if (!this.parentNode) return;
        this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
        this.parentNode = null;
      },
    }),
    getComputedStyleFn: () => ({ background: "rgb(0, 0, 0)" }),
    matchMediaFn: () => ({ matches: false }),
    warn: (...args) => calls.push(["warn", ...args]),
    ...overrides.options,
  });

  return {
    coordinator,
    host,
    root,
    state,
    calls,
    flushRaf() {
      while (rafCallbacks.length) {
        const callback = rafCallbacks.shift();
        callback();
      }
    },
    flushTimeouts() {
      while (timeoutCallbacks.length) {
        const callback = timeoutCallbacks.shift();
        callback();
      }
    },
  };
}

test("auto accent request ids cancel stale async results", async () => {
  const first = createDeferred();
  const harness = createHarness({
    state: {
      accentSource: { source: "custom", kind: "image", value: "image-a" },
    },
    options: {
      extractAccentFromWallpaperFn: (value) => {
        if (value === "image-a") return first.promise;
        return Promise.resolve({ color: "#00ff00", contrast: "#000000" });
      },
      resolveAccentFromColorValueFn: (value) => ({
        color: value,
        contrast: "#ffffff",
      }),
    },
  });

  const firstRequest = harness.coordinator.syncAutoAccentFromWallpaper();
  harness.state.accentSource = { source: "custom", kind: "color", value: "#ff00ff" };
  const secondRequest = harness.coordinator.syncAutoAccentFromWallpaper();

  await secondRequest;
  assert.equal(harness.host.style.properties.get("--mha-accent-auto"), "#ff00ff");
  assert.equal(harness.host.style.properties.get("--mha-accent-auto-contrast"), "#ffffff");

  first.resolve({ color: "#123456", contrast: "#abcdef" });
  await firstRequest;

  assert.equal(harness.host.style.properties.get("--mha-accent-auto"), "#ff00ff");
  assert.equal(harness.host.style.properties.get("--mha-accent-auto-contrast"), "#ffffff");
  assert.equal(harness.calls.filter((entry) => entry === "syncTheme").length, 1);
});

test("auto accent clears css vars when no active source exists", async () => {
  const harness = createHarness({
    state: {
      accentSource: { source: "theme", kind: "none", value: "" },
    },
  });

  await harness.coordinator.syncAutoAccentFromWallpaper();

  assert.equal(harness.host.style.properties.has("--mha-accent-auto"), false);
  assert.equal(harness.host.style.properties.has("--mha-accent-auto-contrast"), false);
});

test("appearance refresh is triggered after theme sync", async () => {
  const harness = createHarness({
    state: {
      accentSource: { source: "theme", kind: "none", value: "" },
    },
  });

  await harness.coordinator.syncAutoAccentFromWallpaper();
  harness.flushRaf();

  assert.deepEqual(harness.calls.slice(0, 3), [
    "syncTheme",
    "syncSettingsDom",
    "syncDocksDom",
  ]);
  assert.deepEqual(harness.calls.slice(3), [
    "refreshActiveGridOnly",
    "scheduleIconSymbolRefresh",
  ]);
});
