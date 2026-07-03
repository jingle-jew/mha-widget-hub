import assert from "node:assert/strict";
import test from "node:test";

import { createHubStateIngressCoordinator } from "../src/core/hub-state-ingress-coordinator.js";

test("hub state ingress coordinator initializes persisted shell state", () => {
  globalThis.localStorage = {
    getItem(key) {
      const values = {
        "mha-widget-positions": JSON.stringify({ desktop: { clock: { x: 1, y: 1 } } }),
        "mha-dock-position": "right",
        "mha-hide-ha-sidebar": "true",
        "mha-dock-labels": "true",
        "mha-status-bar-mode": "top-bar",
        "mha-language": "fr",
        "mha-grid-pages": JSON.stringify([
          { id: "home", name: "Home", icon: "home", widgets: [{ id: "clock", kind: "clock" }] },
        ]),
        "mha-active-page": "home",
      };
      return values[key] ?? null;
    },
    setItem() {},
    removeItem() {},
  };

  const host = {
    _initialized: false,
    _hass: null,
    _entityVisibilityConfig: null,
    dataset: {},
    shadowRoot: null,
    attachShadow() {
      this.shadowRoot = { innerHTML: "" };
      return this.shadowRoot;
    },
    _screensaverController: {
      load(options) {
        host.screensaverLoad = options;
      },
    },
    _isMobileDefaultLayout() {
      return false;
    },
    _configureI18n() {
      host.didConfigureI18n = true;
    },
    _applyHaSidebarMode(value) {
      host.didApplySidebar = value;
    },
    _migrateLegacyCustomWallpaper() {
      host.didMigrateWallpaper = true;
    },
    _readCustomWallpapers() {
      return { light: null, dark: null };
    },
    _applyCustomWallpaperState() {
      host.didApplyWallpaper = true;
    },
    _syncAutoAccentFromWallpaper() {
      host.didSyncAccent = true;
    },
    _upgradePredefinedProperty(name) {
      host.upgradedProperty = name;
    },
    _createCriticalBootStyle() {
      return "<style></style>";
    },
  };

  const coordinator = createHubStateIngressCoordinator(host, {
    defaultWidgets: [],
    normalizeWidget: (widget) => widget,
    normalizeWidgetForGrid: (widget) => widget,
  });

  coordinator.initialize();

  assert.equal(host._initialized, true);
  assert.equal(host.shadowRoot.innerHTML, "<style></style>");
  assert.deepEqual(host.screensaverLoad, { enabledFallback: true });
  assert.equal(host._dockPosition, "right");
  assert.equal(host._hideHaSidebar, true);
  assert.equal(host._showDockLabels, true);
  assert.equal(host._statusBarMode, "top-bar");
  assert.equal(host._language, "fr");
  assert.equal(host._activePageId, "home");
  assert.equal(host._widgets[0]?.id, "clock");
  assert.equal(host.upgradedProperty, "hass");
});

test("hub state ingress coordinator updates hass and refresh hooks", () => {
  const calls = [];
  const host = {
    _hass: null,
    _widgetConfigSession: { id: "clock" },
    _widgetConfigHassReady: false,
    dataset: {},
    _configureI18n() {
      calls.push("configureI18n");
    },
    _syncWidgetConfigDom() {
      calls.push("syncWidgetConfigDom");
    },
    _ensureMounted(options) {
      calls.push(["ensureMounted", options]);
    },
    _scheduleHassUpdate() {
      calls.push("scheduleHassUpdate");
    },
  };

  const coordinator = createHubStateIngressCoordinator(host, {
    defaultWidgets: [],
    normalizeWidget: (widget) => widget,
    normalizeWidgetForGrid: (widget) => widget,
  });

  coordinator.setHass({ user: { id: "" } });

  assert.equal(host.dataset.dataState, "ready");
  assert.equal(host._widgetConfigHassReady, true);
  assert.deepEqual(calls, [
    "configureI18n",
    "syncWidgetConfigDom",
    ["ensureMounted", { reason: "hass update" }],
    "scheduleHassUpdate",
  ]);
});
