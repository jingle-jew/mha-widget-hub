import assert from "node:assert/strict";
import test from "node:test";

import { createSettingsSurfaceCoordinator } from "../src/settings/settings-surface-coordinator.js";

test("settings surface coordinator owns both open-state flags and panel sync", () => {
  globalThis.document = {
    documentElement: {
      dataset: { iconShape: "squircle" },
    },
    createElement() {
      return {
        className: "",
        dataset: {},
        attributes: {},
        hidden: false,
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
      };
    },
  };

  const toggles = [];
  const appendedNodes = [];
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
    _getResponsiveState() {
      return {
        isMobileLayout: true,
        settingsCapabilities: {
          supportsScreensaver: false,
          supportsDockPosition: false,
          supportsSidebarToggle: false,
          showsStatusBarOptions: false,
          isMobileLandscape: true,
        },
      };
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
    shadowRoot: {
      id: "root",
      querySelector(selector) {
        if (selector === ".mha-settings-backdrop") {
          return appendedNodes.find(node => node.className === "mha-settings-backdrop") || null;
        }
        return null;
      },
      append(node) {
        appendedNodes.push(node);
      },
    },
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
  assert.equal(appendedNodes.some(node => node.className === "mha-settings-backdrop"), true);
  assert.equal(appendedNodes.find(node => node.className === "mha-settings-backdrop")?.dataset.active, "true");
  assert.equal(host.lastSync.root, host.shadowRoot);
  assert.equal(host.lastSync.props.all.scope, "all");
  assert.equal(host.lastSync.props.screensaver.scope, "screensaver");
  assert.equal(host.lastSync.props.all.isMobileLayout, true);
  assert.equal(host.lastSync.props.all.isMobileLandscape, true);
  assert.equal(host.lastSync.props.all.supportsDockPosition, false);
  assert.equal(host.lastSync.props.all.showsStatusBarOptions, false);
  assert.equal(host.lastSync.props.all.showDockLabels, true);
  assert.equal(host.lastSync.props.all.statusBarMode, "top-bar");
});

test("settings surface coordinator exposes the desktop default status bar as hidden until persisted", () => {
  globalThis.document = {
    documentElement: {
      dataset: { iconShape: "squircle" },
    },
    createElement() {
      return {
        className: "",
        dataset: {},
        attributes: {},
        hidden: false,
        setAttribute(name, value) {
          this.attributes[name] = value;
        },
      };
    },
  };

  const host = {
    _settingsOpen: true,
    _screensaverSettingsOpen: false,
    _language: "en",
    _hideHaSidebar: false,
    _showDockLabels: false,
    _hasPersistedStatusBarMode: false,
    _statusBarMode: "top-bar",
    _accentPaletteExpanded: false,
    _settingsPage: "main",
    _pages: [],
    _activePageId: "",
    _dockSettingsPageId: "",
    _dockPosition: "left",
    _customWallpapers: {},
    _hass: { states: {} },
    _entityVisibilityConfig: { users: [] },
    dataset: { iconShape: "circle" },
    classList: { toggle() {} },
    shadowRoot: {
      querySelector() {
        return null;
      },
      append() {},
    },
    _getResponsiveState() {
      return {
        layout: "desktop",
        isMobileLayout: false,
        effectiveStatusBarMode: "hidden",
        settingsCapabilities: {
          supportsScreensaver: true,
          supportsDockPosition: true,
          supportsSidebarToggle: true,
          showsStatusBarOptions: true,
          isMobileLandscape: false,
        },
      };
    },
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
          nowBarItems: {},
          nowBarConfig: {},
          clockVariant: "digital",
        };
      },
    },
    _syncSettingsPanels({ props }) {
      host.lastSync = props;
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

  createSettingsSurfaceCoordinator(host).sync();

  assert.equal(host.lastSync.all.statusBarMode, "hidden");
});
