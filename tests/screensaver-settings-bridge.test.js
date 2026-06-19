import assert from "node:assert/strict";
import test from "node:test";

import { createScreensaverSettingsBridge } from "../src/screensaver/screensaver-settings-bridge.js";

test("screensaver settings bridge syncs calendar refresh and settings surfaces for entity selection", () => {
  globalThis.document = {
    documentElement: {
      dataset: { iconShape: "squircle" },
    },
  };

  const calls = [];
  const host = {
    dataset: {},
    classList: { toggle() {} },
    shadowRoot: {},
    _settingsOpen: false,
    _screensaverSettingsOpen: true,
    _isEditing: false,
    _language: "en",
    _hideHaSidebar: false,
    _accentPaletteExpanded: false,
    _settingsPage: "screensaver-nowbar",
    _pages: [],
    _activePageId: "home",
    _dockSettingsPageId: "",
    _dockPosition: "left",
    _customWallpapers: {},
    _hass: null,
    _entityVisibilityConfig: null,
    _themeController: {
      read() {
        return {
          themeSetting: "dark",
          themeStyle: "oneui",
          iosGlass: "liquid",
          accent: "sky",
          accentMode: "manual",
          iconShapeSetting: "auto",
          iconShape: "squircle",
        };
      },
    },
    _screensaverController: {
      read() {
        return {
          enabled: true,
          delay: 30000,
          preview: false,
          nowBar: true,
          nowBarItems: { calendar: true },
          nowBarConfig: {},
          clockVariant: "digital",
        };
      },
      setNowBarEntitySelection(section, entityId, selected) {
        calls.push(["setNowBarEntitySelection", section, entityId, selected]);
        return true;
      },
      isVisible() {
        return false;
      },
    },
    _screensaverCoordinator: {
      requestNowBarCalendarEvents(options = {}) {
        calls.push(["requestNowBarCalendarEvents", options]);
      },
      syncDom(root, options = {}) {
        calls.push(["syncDom", root, options]);
      },
    },
    _recordPersistenceResult(value) {
      calls.push(["recordPersistenceResult", value]);
    },
    _syncSettingsDom() {
      calls.push("syncSettingsDom");
    },
    _syncSettingsPanels({ root, props }) {
      calls.push(["syncSettingsPanels", root, props.screensaver.scope, props.screensaver.open]);
    },
    _closeSettings() {},
    _applyLanguageFromSettings() {},
    _applyThemeFromSettings() {},
    _applyThemeStyleFromSettings() {},
    _applyIosGlassFromSettings() {},
    _applyAccentFromSettings() {},
    _applyAccentModeFromSettings() {},
    _setAccentPaletteExpanded() {},
    _applyIconShapeFromSettings() {},
    _applyHideHaSidebarFromSettings() {},
    resetGrid() {},
    _openWallpaperSettings() {},
    _openNowBarSettings() {},
    _openSettings() {},
    _openDockSettings() {},
    _openDockPageSettings() {},
    _moveDockPage() {},
    _deleteDockPage() {},
    _renameDockPage() {},
    _changeDockPageIcon() {},
    _applyDockPositionFromSettings() {},
    _saveCustomWallpaper() {},
    _resetCustomWallpaper() {},
  };

  const bridge = createScreensaverSettingsBridge(host);

  bridge.applyNowBarEntitySelectionFromSettings("calendar", "calendar.family", true);

  assert.deepEqual(calls, [
    ["setNowBarEntitySelection", "calendar", "calendar.family", true],
    ["recordPersistenceResult", true],
    ["requestNowBarCalendarEvents", { force: true }],
    ["syncDom", host.shadowRoot, { force: false }],
    "syncSettingsDom",
    ["syncSettingsPanels", host.shadowRoot, "screensaver", true],
  ]);
  assert.equal(host.dataset.screensaverSettingsOpen, "true");
});
