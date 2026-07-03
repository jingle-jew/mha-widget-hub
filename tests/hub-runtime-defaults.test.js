import assert from "node:assert/strict";
import test from "node:test";

import {
  applyHubRuntimeDefaults,
  createHubRuntimeDefaults,
} from "../src/core/hub-runtime-defaults.js";

test("createHubRuntimeDefaults returns the expected initial runtime state", () => {
  const defaults = createHubRuntimeDefaults();

  assert.equal(defaults._initialized, false);
  assert.equal(defaults._bootComplete, false);
  assert.equal(defaults._hass, null);
  assert.deepEqual(defaults._entityVisibilityConfig, { version: 1, users: {} });
  assert.equal(defaults._isEditing, false);
  assert.equal(defaults._activeMoveWidgetId, "");
  assert.deepEqual(defaults._widgetPositions, {});
  assert.equal(defaults._settingsOpen, false);
  assert.equal(defaults._settingsPage, "main");
  assert.equal(defaults._widgetManagerOpen, false);
  assert.equal(defaults._widgetConfigSession, null);
  assert.equal(defaults._pendingWidgetPlacement, null);
  assert.equal(defaults._dockPosition, "left");
  assert.equal(defaults._hideHaSidebar, false);
  assert.equal(defaults._showDockLabels, false);
  assert.equal(defaults._statusBarMode, "pill");
  assert.equal(defaults._language, "auto");
  assert.deepEqual(defaults._customWallpapers, { light: null, dark: null });
  assert.deepEqual(defaults._pages, []);
  assert.equal(defaults._activePageId, "");
  assert.deepEqual(defaults._widgets, []);
});

test("createHubRuntimeDefaults returns fresh mutable containers", () => {
  const first = createHubRuntimeDefaults();
  const second = createHubRuntimeDefaults();

  assert.notEqual(first._widgetPositions, second._widgetPositions);
  assert.notEqual(first._customWallpapers, second._customWallpapers);
  assert.notEqual(first._pages, second._pages);
  assert.notEqual(first._widgets, second._widgets);
  assert.notEqual(first._entityVisibilityConfig, second._entityVisibilityConfig);
});

test("applyHubRuntimeDefaults applies defaults to an existing host", () => {
  const host = {
    _initialized: true,
    _widgets: [{ id: "existing" }],
  };

  const result = applyHubRuntimeDefaults(host);

  assert.equal(result, host);
  assert.equal(host._initialized, false);
  assert.deepEqual(host._widgets, []);
  assert.deepEqual(host._pages, []);
  assert.deepEqual(host._entityVisibilityConfig, { version: 1, users: {} });
});
