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
    _pageUiCoordinator: {
      syncPageCreator() {},
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

  const rafCallbacks = new Map();
  const timeoutCallbacks = new Map();
  let rafId = 0;
  let timeoutId = 0;

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
      const id = ++rafId;
      rafCallbacks.set(id, callback);
      return id;
    },
    cancelAnimationFrameFn: (id) => {
      rafCallbacks.delete(id);
    },
    setTimeoutFn: (callback) => {
      const id = ++timeoutId;
      timeoutCallbacks.set(id, callback);
      return id;
    },
    clearTimeoutFn: (id) => {
      timeoutCallbacks.delete(id);
    },
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
      while (rafCallbacks.size) {
        const pending = Array.from(rafCallbacks.entries());
        rafCallbacks.clear();
        for (const [, callback] of pending) {
          callback();
        }
      }
    },
    flushNextRaf() {
      const pending = Array.from(rafCallbacks.entries());
      rafCallbacks.clear();
      for (const [, callback] of pending) {
        callback();
      }
    },
    flushNextTimeout() {
      const next = timeoutCallbacks.entries().next().value;
      if (!next) return;
      const [id, callback] = next;
      timeoutCallbacks.delete(id);
      callback();
    },
    flushTimeouts() {
      while (timeoutCallbacks.size) {
        const pending = Array.from(timeoutCallbacks.entries());
        timeoutCallbacks.clear();
        for (const [, callback] of pending) {
          callback();
        }
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

test("appearance refresh resyncs the page creator with the new theme style", () => {
  const harness = createHarness();
  harness.host._pageUiCoordinator = {
    syncPageCreator() {
      harness.calls.push("syncPageCreator");
    },
  };

  assert.equal(harness.coordinator.refreshAppearanceDom(), true);
  assert.deepEqual(harness.calls, [
    "syncDocksDom",
    "refreshActiveGridOnly",
    "syncPageCreator",
    "scheduleIconSymbolRefresh",
  ]);
});

test("theme style changes overlap outgoing and incoming themes in one crossfade", () => {
  const harness = createHarness();
  harness.host._pageUiCoordinator = {
    syncPageCreator() {
      harness.calls.push("syncPageCreator");
    },
  };

  const themeState = harness.coordinator.applyThemeStyleFromSettings("ios");

  assert.equal(themeState.themeStyle, "ios");
  assert.equal(harness.host.classList.contains("is-theme-transitioning"), true);
  assert.equal(harness.host.classList.contains("is-theme-backdrop-crossfading"), true);
  assert.equal(harness.host.dataset.themeTransitionPhase, "crossfade");
  assert.equal(harness.host.style.properties.get("--mha-theme-crossfade-from"), "rgb(0, 0, 0)");
  assert.equal(harness.root.children.length, 0);
  assert.deepEqual(harness.calls.slice(0, 4), [
    ["setThemeStyle", "ios"],
    ["applyWallpaperState", "ios"],
    "syncTheme",
    "syncSettingsDom",
  ]);

  harness.flushRaf();
  assert.deepEqual(harness.calls.slice(4), [
    "syncDocksDom",
    "refreshActiveGridOnly",
    "syncPageCreator",
    "scheduleIconSymbolRefresh",
  ]);

  harness.flushTimeouts();
  assert.equal(harness.root.children.length, 0);
  assert.equal(harness.host.classList.contains("is-theme-backdrop-crossfading"), false);
  assert.equal(harness.host.classList.contains("is-theme-transitioning"), false);
  assert.equal(harness.host.dataset.themeTransitionPhase, undefined);
  assert.equal(harness.host.style.properties.has("--mha-theme-crossfade-from"), false);
});
