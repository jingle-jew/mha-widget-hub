import test from "node:test";
import assert from "node:assert/strict";

import { createPageUiCoordinator } from "../src/pages/page-ui-coordinator.js";

function createHarness(overrides = {}) {
  const calls = {
    syncDocks: 0,
    syncPageCreator: 0,
    refreshActiveGridOnly: 0,
    syncWidgetDropSlots: 0,
    syncSettingsDom: 0,
    recordPersistenceResult: [],
    writeActivePage: [],
    writeWidgetPositions: [],
    updatePageCreatorIconSelection: [],
  };

  const state = {
    pages: [
      { id: "home", name: "Home", icon: "home", widgets: [{ id: "clock" }] },
      { id: "lights", name: "Lights", icon: "light", widgets: [{ id: "lamp" }] },
    ],
    activePageId: "home",
    widgets: [{ id: "clock" }],
    widgetPositions: {
      "home:desktop:8x6": { clock: { x: 1, y: 1 } },
      "lights:desktop:8x6": { lamp: { x: 2, y: 1 } },
    },
    pageCreatorOpen: false,
    newPageIcon: "grid",
    dockSettingsPageId: "lights",
    settingsPage: "dock-detail",
    isEditing: true,
    isMobileLandscapeLayout: false,
    activeMoveWidgetId: "clock",
    pendingWidgetPlacement: { id: "pending" },
    widgetManagerOpen: true,
    widgetManagerCategory: "media",
    ...overrides.state,
  };

  const coordinator = createPageUiCoordinator({
    getRoot: () => ({ appended: true }),
    getPages: () => state.pages,
    setPages: (pages) => { state.pages = pages; },
    getActivePageId: () => state.activePageId,
    setActivePageId: (id) => { state.activePageId = id; },
    getWidgets: () => state.widgets,
    setWidgets: (widgets) => { state.widgets = widgets; },
    getWidgetPositions: () => state.widgetPositions,
    setWidgetPositions: (positions) => { state.widgetPositions = positions; },
    getPageCreatorOpen: () => state.pageCreatorOpen,
    setPageCreatorOpen: (open) => { state.pageCreatorOpen = open; },
    getNewPageIcon: () => state.newPageIcon,
    setNewPageIcon: (icon) => { state.newPageIcon = icon; },
    getDockSettingsPageId: () => state.dockSettingsPageId,
    setDockSettingsPageId: (id) => { state.dockSettingsPageId = id; },
    setSettingsPage: (page) => { state.settingsPage = page; },
    getIsEditing: () => state.isEditing,
    isMobileLandscapeLayout: () => state.isMobileLandscapeLayout,
    normalizeWidget: (widget) => widget,
    savePages: () => true,
    readWidgets: () => [{ id: `widgets-for-${state.activePageId}` }],
    writeActivePage: (id) => {
      calls.writeActivePage.push(id);
      return true;
    },
    writeWidgetPositions: (positions) => {
      calls.writeWidgetPositions.push(positions);
      return true;
    },
    recordPersistenceResult: (success) => {
      calls.recordPersistenceResult.push(success);
      return success;
    },
    refreshActiveGridOnly: () => { calls.refreshActiveGridOnly += 1; },
    syncWidgetDropSlots: () => { calls.syncWidgetDropSlots += 1; },
    syncSettingsDom: () => { calls.syncSettingsDom += 1; },
    openDockSettings: () => {},
    openSettings: () => {},
    clearPlacementState: () => {
      state.activeMoveWidgetId = "";
      state.pendingWidgetPlacement = null;
      state.widgetManagerOpen = false;
      state.widgetManagerCategory = "";
    },
    syncDocksFn: () => { calls.syncDocks += 1; },
    syncPageCreatorPanelFn: () => { calls.syncPageCreator += 1; },
    updatePageCreatorIconSelectionFn: (_root, icon) => {
      calls.updatePageCreatorIconSelection.push(icon);
    },
    ...overrides.options,
  });

  return { coordinator, state, calls };
}

test("selecting a page closes placement state and reloads widgets", () => {
  const { coordinator, state, calls } = createHarness();

  assert.equal(coordinator.selectPage("lights"), true);
  assert.equal(state.activePageId, "lights");
  assert.deepEqual(state.widgets, [{ id: "widgets-for-lights" }]);
  assert.equal(state.activeMoveWidgetId, "");
  assert.equal(state.pendingWidgetPlacement, null);
  assert.equal(state.widgetManagerOpen, false);
  assert.equal(state.widgetManagerCategory, "");
  assert.deepEqual(calls.writeActivePage, ["lights"]);
  assert.equal(calls.refreshActiveGridOnly, 1);
  assert.equal(calls.syncDocks, 1);
});

test("deleting a page cleans positions and reloads widgets when the active page changes", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pages: [
        { id: "home", name: "Home", icon: "home", widgets: [{ id: "clock" }] },
        { id: "lights", name: "Lights", icon: "light", widgets: [{ id: "lamp" }] },
      ],
      activePageId: "lights",
      widgets: [{ id: "lamp" }],
      widgetPositions: {
        "home:desktop:8x6": { clock: { x: 1, y: 1 }, lamp: { x: 3, y: 1 } },
        "lights:desktop:8x6": { lamp: { x: 2, y: 1 } },
      },
      dockSettingsPageId: "lights",
      settingsPage: "dock-detail",
    },
  });

  assert.equal(coordinator.deleteDockPage("lights"), true);
  assert.equal(state.activePageId, "home");
  assert.deepEqual(state.widgets, [{ id: "widgets-for-home" }]);
  assert.deepEqual(state.widgetPositions, {
    "home:desktop:8x6": { clock: { x: 1, y: 1 } },
  });
  assert.equal(state.settingsPage, "dock");
  assert.equal(state.dockSettingsPageId, "");
  assert.deepEqual(calls.writeWidgetPositions, [{
    "home:desktop:8x6": { clock: { x: 1, y: 1 } },
  }]);
  assert.equal(calls.refreshActiveGridOnly, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
});

test("creating a page resets the page creator state and refreshes dock and grid", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      pageCreatorOpen: true,
      newPageIcon: "star",
    },
  });

  assert.equal(coordinator.createPageFromCreator(), true);
  assert.equal(state.pageCreatorOpen, false);
  assert.equal(state.newPageIcon, "grid");
  assert.equal(state.activePageId.startsWith("page-"), true);
  assert.deepEqual(state.widgets, []);
  assert.equal(calls.syncDocks, 1);
  assert.equal(calls.syncPageCreator, 1);
  assert.equal(calls.refreshActiveGridOnly, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
});
