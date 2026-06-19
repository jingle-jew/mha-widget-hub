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
    _getSettingsPanelsProps() {
      return { all: { scope: "all" }, screensaver: { scope: "screensaver" } };
    },
    _syncSettingsPanels() {},
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
  host._syncSettingsDom = () => sync.syncSettingsDom();

  sync.applyLanguageFromSettings("fr-CA");

  assert.equal(host._language, "auto");
  assert.equal(getLanguage(), "en");
  assert.deepEqual(removed, ["mha-language"]);
  assert.deepEqual(calls, [
    "syncScreensaverSettingsDom",
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
    _getSettingsPanelsProps() {
      return { all: { scope: "all" }, screensaver: { scope: "screensaver" } };
    },
    _syncSettingsPanels() {},
    _syncScreensaverSettingsDom() {},
    _syncDocksDom() {},
    _syncWidgetManagerDom() {},
    _syncScreensaverDom() {},
    _refreshActiveGridOnly() {},
  };

  const sync = createI18nSettingsSync(host);
  host._syncSettingsDom = () => sync.syncSettingsDom();

  sync.applyLanguageFromSettings("fr");

  assert.equal(host._language, "fr");
  assert.equal(getLanguage(), "fr");
});
