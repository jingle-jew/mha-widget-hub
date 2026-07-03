import assert from "node:assert/strict";
import test from "node:test";

import "../src/widgets/widget-registry.js";

async function createHarness(overrides = {}) {
  const { createWidgetFlowCoordinator } = await import("../src/widgets/widget-flow-coordinator.js");
  const calls = {
    syncEditModeDom: 0,
    syncWidgetDropSlots: 0,
  };

  const state = {
    isEditing: true,
    isMobileLandscapeLayout: true,
    widgetManagerOpen: false,
    widgetManagerCategory: "",
    widgetConfigSession: null,
    widgetConfigHassReady: false,
    pendingWidgetPlacement: null,
    activeMoveWidgetId: "",
    widgets: [
      {
        id: "button-1",
        kind: "button",
        type: "button",
        component: "button-widget",
        category: "controls",
        variant: "button",
        w: 2,
        h: 2,
        entityId: "switch.kitchen",
      },
      {
        id: "scenes-1",
        kind: "scenes",
        type: "scenes",
        component: "scenes-widget",
        category: "controls",
        variant: "scenes",
        w: 2,
        h: 2,
        buttons: [{}, {}, {}, {}],
      },
    ],
    hass: {
      states: {},
      user: { name: "Test" },
      locale: { language: "en" },
    },
    entityVisibilityConfig: null,
    ...overrides.state,
  };

  const coordinator = createWidgetFlowCoordinator({
    getRoot: () => null,
    getIsEditing: () => state.isEditing,
    isMobileLandscapeLayout: () => state.isMobileLandscapeLayout,
    getWidgetManagerOpen: () => state.widgetManagerOpen,
    setWidgetManagerOpen: (open) => { state.widgetManagerOpen = open; },
    getWidgetManagerCategory: () => state.widgetManagerCategory,
    setWidgetManagerCategory: (category) => { state.widgetManagerCategory = category; },
    getWidgetConfigSession: () => state.widgetConfigSession,
    setWidgetConfigSession: (session) => { state.widgetConfigSession = session; },
    getHass: () => state.hass,
    getWidgetConfigHassReady: () => state.widgetConfigHassReady,
    setWidgetConfigHassReady: (ready) => { state.widgetConfigHassReady = ready; },
    getEntityVisibilityConfig: () => state.entityVisibilityConfig,
    getPendingWidgetPlacement: () => state.pendingWidgetPlacement,
    setPendingWidgetPlacement: (widget) => { state.pendingWidgetPlacement = widget; },
    getActiveMoveWidgetId: () => state.activeMoveWidgetId,
    setActiveMoveWidgetId: (id) => { state.activeMoveWidgetId = id; },
    getWidgets: () => state.widgets,
    setWidgets: (widgets) => { state.widgets = widgets; },
    syncEditModeDom: () => { calls.syncEditModeDom += 1; },
    syncWidgetDropSlots: () => { calls.syncWidgetDropSlots += 1; },
    saveWidgets: () => true,
    ...overrides.options,
  });

  return { coordinator, state, calls };
}

test("widget manager opens in mobile landscape while editing", async () => {
  const { coordinator, state, calls } = await createHarness({
    state: {
      pendingWidgetPlacement: { id: "pending" },
      activeMoveWidgetId: "clock",
      widgetManagerCategory: "utilities",
    },
  });

  coordinator.openWidgetManager();

  assert.equal(state.pendingWidgetPlacement, null);
  assert.equal(state.activeMoveWidgetId, "");
  assert.equal(state.widgetManagerOpen, true);
  assert.equal(state.widgetManagerCategory, "");
  assert.equal(calls.syncEditModeDom, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
});

test("widget placement flows still start in mobile landscape", async () => {
  const { coordinator, state, calls } = await createHarness();

  coordinator.beginWidgetPlacement({ kind: "clock" });
  assert.equal(state.pendingWidgetPlacement?.kind, "clock");
  assert.equal(state.widgetManagerOpen, false);
  assert.equal(calls.syncEditModeDom, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);

  coordinator.beginWidgetPlacement({ kind: "button" });
  assert.equal(state.widgetConfigSession?.configType, "button");
  assert.equal(state.widgetConfigSession?.mode, "create");
  assert.equal(state.widgetConfigHassReady, true);
});

test("widget and scenes configuration open in mobile landscape", async () => {
  const { coordinator, state } = await createHarness();

  coordinator.openWidgetConfig("button-1");
  assert.equal(state.widgetConfigSession?.configType, "button");
  assert.equal(state.widgetConfigSession?.mode, "edit");

  coordinator.openScenesButtonConfig("scenes-1", 2);
  assert.equal(state.widgetConfigSession?.configType, "scenes");
  assert.equal(state.widgetConfigSession?.mode, "edit");
  assert.equal(state.widgetConfigSession?.buttonIndex, 2);
});
