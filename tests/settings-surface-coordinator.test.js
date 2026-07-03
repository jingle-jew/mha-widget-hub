import assert from "node:assert/strict";
import test from "node:test";

import { createSettingsSurfaceCoordinator } from "../src/settings/settings-surface-coordinator.js";

test("settings surface coordinator owns both open-state flags and panel sync", () => {
  globalThis.document = {
    documentElement: {
      dataset: { iconShape: "squircle" },
    },
  };

  const toggles = [];
  const host = {
    _settingsOpen: true,
    _screensaverSettingsOpen: false,
    _language: "fr",
    _hideHaSidebar: false,
    _showDockLabels: true,
    _statusBarMode: "top-bar",
    _accentPaletteExpanded: true,
    _settingsPage: "dock",
    _pages: [{ id: "home" }],
    _activePageId: "home",
    _dockSettingsPageId: "",
    _dockPosition: "left",
    _isMobileLauncherLayout() {
      return true;
    },
    _customWallpapers: {},
    _hass: { states: {} },
    _entityVisibilityConfig: { users: [] },
    dataset: { iconShape: "circle" },
    classList: {
      toggle(name, value) {
        toggles.push([name, value]);
      },
    },
    shadowRoot: { id: "root" },
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
          nowBarItems: { media: true },
          nowBarConfig: { tiles: { media: true } },
          clockVariant: "digital",
        };
      },
    },
    _syncSettingsPanels({ root, props }) {
      host.lastSync = { root, props };
    },
    _closeSettings() {},
    _closeScreensaverSettings() {},
    _applyLanguageFromSettings() {},
    _applyThemeFromSettings() {},
    _applyThemeStyleFromSettings() {},
    _applyIosGlassFromSettings() {},
    _applyAccentFromSettings() {},
    _applyAccentModeFromSettings() {},
    _setAccentPaletteExpanded() {},
    _applyIconShapeFromSettings() {},
    _applyHideHaSidebarFromSettings() {},
    _applyDockLabelsFromSettings() {},
    _applyStatusBarModeFromSettings() {},
    _applyScreensaverEnabledFromSettings() {},
    _applyScreensaverDelayFromSettings() {},
    _applyScreensaverPreviewFromSettings() {},
    _applyScreensaverNowBarFromSettings() {},
    _applyScreensaverNowBarItemFromSettings() {},
    _applyScreensaverNowBarTileEnabledFromSettings() {},
    _applyScreensaverNowBarEntitySelectionFromSettings() {},
    _applyScreensaverNowBarNowItemFromSettings() {},
    _applyScreensaverClockVariantFromSettings() {},
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

  const coordinator = createSettingsSurfaceCoordinator(host);
  coordinator.sync();

  assert.deepEqual(toggles, [
    ["is-settings-open", true],
    ["is-screensaver-settings-open", false],
  ]);
  assert.equal(host.dataset.settingsOpen, "true");
  assert.equal(host.dataset.screensaverSettingsOpen, "false");
  assert.equal(host.lastSync.root, host.shadowRoot);
  assert.equal(host.lastSync.props.all.scope, "all");
  assert.equal(host.lastSync.props.screensaver.scope, "screensaver");
  assert.equal(host.lastSync.props.all.isMobileLayout, true);
  assert.equal(host.lastSync.props.all.showDockLabels, true);
  assert.equal(host.lastSync.props.all.statusBarMode, "top-bar");
});
