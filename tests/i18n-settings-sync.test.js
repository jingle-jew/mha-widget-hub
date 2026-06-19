import assert from "node:assert/strict";
import test from "node:test";

import { createI18nSettingsSync } from "../src/settings/i18n-settings-sync.js";
import { getLanguage } from "../src/i18n/index.js";

test("i18n settings sync applies language and refreshes dependent surfaces", () => {
  const removed = [];
  globalThis.localStorage = {
    setItem() {},
    removeItem(key) {
      removed.push(key);
    },
  };

  const calls = [];
  const host = {
    _language: "auto",
    _hass: { locale: { language: "en-US" } },
    _widgetConfigSession: { id: "clock" },
    _settingsOpen: true,
    _settingsPage: "main",
    _dockSettingsPageId: "",
    dataset: {},
    classList: {
      toggle() {},
    },
    shadowRoot: {},
    _settingsSurfaceCoordinator: {
      syncSettingsOpenState() {
        calls.push("syncSettingsOpenState");
      },
      sync() {
        calls.push("syncSettingsSurface");
      },
    },
    _syncScreensaverSettingsDom() {
      calls.push("syncScreensaverSettingsDom");
    },
    _syncDocksDom() {
      calls.push("syncDocksDom");
    },
    _syncWidgetManagerDom() {
      calls.push("syncWidgetManagerDom");
    },
    _syncWidgetConfigDom() {
      calls.push("syncWidgetConfigDom");
    },
    _syncScreensaverDom(options) {
      calls.push(["syncScreensaverDom", options]);
    },
    _refreshActiveGridOnly() {
      calls.push("refreshActiveGridOnly");
    },
  };

  const sync = createI18nSettingsSync(host);

  sync.applyLanguageFromSettings("fr-CA");

  assert.equal(host._language, "auto");
  assert.equal(getLanguage(), "en");
  assert.deepEqual(removed, ["mha-language"]);
  assert.deepEqual(calls, [
    "syncSettingsSurface",
    "syncDocksDom",
    "syncWidgetManagerDom",
    "syncWidgetConfigDom",
    ["syncScreensaverDom", { force: true }],
    "refreshActiveGridOnly",
  ]);
});

test("i18n settings sync normalizes supported language values", () => {
  globalThis.localStorage = {
    setItem() {},
    removeItem() {},
  };

  const host = {
    _language: "auto",
    _hass: null,
    _widgetConfigSession: null,
    _settingsOpen: false,
    _settingsPage: "main",
    _dockSettingsPageId: "",
    dataset: {},
    classList: {
      toggle() {},
    },
    shadowRoot: {},
    _settingsSurfaceCoordinator: {
      syncSettingsOpenState() {},
      sync() {},
    },
    _syncScreensaverSettingsDom() {},
    _syncDocksDom() {},
    _syncWidgetManagerDom() {},
    _syncScreensaverDom() {},
    _refreshActiveGridOnly() {},
  };

  const sync = createI18nSettingsSync(host);

  sync.applyLanguageFromSettings("fr");

  assert.equal(host._language, "fr");
  assert.equal(getLanguage(), "fr");
});

test("i18n settings sync routes dock detail through canonical settings page opening", () => {
  const calls = [];
  const host = {
    _language: "auto",
    _hass: null,
    _settingsOpen: false,
    _settingsPage: "main",
    _dockSettingsPageId: "",
    dataset: {},
    classList: {
      toggle() {},
    },
    shadowRoot: {},
    _settingsSurfaceCoordinator: {
      syncSettingsOpenState() {
        calls.push("syncSettingsOpenState");
      },
      sync() {
        calls.push("syncSettingsSurface");
      },
    },
    _setScreensaverActive(value) {
      calls.push(["setScreensaverActive", value]);
    },
    _screensaverController: {
      clearIdleTimer() {
        calls.push("clearIdleTimer");
      },
    },
    _scheduleScreensaverIdleTimer() {},
  };

  const sync = createI18nSettingsSync(host);
  sync.openSettingsPage("dock-detail", { dockPageId: "lights" });

  assert.equal(host._settingsOpen, true);
  assert.equal(host._settingsPage, "dock-detail");
  assert.equal(host._dockSettingsPageId, "lights");
  assert.deepEqual(calls, [
    ["setScreensaverActive", false],
    "clearIdleTimer",
    "syncSettingsSurface",
  ]);
});
