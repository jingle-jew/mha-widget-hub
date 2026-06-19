import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetLayoutStateCoordinator } from "../src/widgets/widget-layout-state-coordinator.js";

function createStyleTarget() {
  const values = new Map();
  return {
    values,
    set gridColumn(value) {
      values.set("grid-column", value);
    },
    get gridColumn() {
      return values.get("grid-column") || "";
    },
    set gridRow(value) {
      values.set("grid-row", value);
    },
    get gridRow() {
      return values.get("grid-row") || "";
    },
    removeProperty(name) {
      values.delete(name);
    },
  };
}

function createHarness(overrides = {}) {
  const writes = [];
  const effects = [];
  const elements = new Map();
  const state = {
    widgets: [
      { id: "clock", kind: "clock", w: 6, h: 2 },
      { id: "weather", kind: "weather", w: 2, h: 1 },
    ],
    widgetPositions: {},
    activePageId: "living-room",
    effectiveLayout: "tablet",
    bounds: { units: 4, rowUnits: 6 },
    runtimeGridPreset: { columns: 2, rows: 3 },
    mobile: false,
    ...overrides.state,
  };

  for (const widget of state.widgets) {
    elements.set(widget.id, { style: createStyleTarget() });
  }

  const root = {
    querySelector(selector) {
      const match = selector.match(/\[data-widget-id="(.+)"\]/);
      return match ? elements.get(match[1]) || null : null;
    },
    querySelectorAll(selector) {
      if (selector === ".mha-widget") return [...elements.values()];
      return [];
    },
  };

  const coordinator = createWidgetLayoutStateCoordinator({
    getWidgets: () => state.widgets,
    getWidgetPositions: () => state.widgetPositions,
    setWidgetPositions: (positions) => { state.widgetPositions = positions; },
    getActivePageId: () => state.activePageId,
    getGridBounds: () => state.bounds,
    getEffectiveLayout: () => state.effectiveLayout,
    getRuntimeGridPreset: () => state.runtimeGridPreset,
    isMobileLayout: () => state.mobile,
    recordPersistenceResult: (value) => {
      effects.push(["record", value]);
      return value;
    },
    writeWidgetPositions: (positions) => {
      const snapshot = structuredClone(positions);
      writes.push(snapshot);
      return snapshot;
    },
    getRoot: () => root,
    normalizeWidgetForKindFn: (widget) => ({ w: widget.w || 1, h: widget.h || 1 }),
    packWidgetsFn: overrides.packWidgetsFn || (() => ({
      clock: { x: 1, y: 1 },
      weather: { x: 3, y: 1 },
    })),
    isPositionMapValidForWidgetsFn: overrides.isPositionMapValidForWidgetsFn,
  });

  return { coordinator, state, writes, effects, elements };
}

test("widget layout state coordinator keys positions by page, layout, and bounds", () => {
  const { coordinator } = createHarness();

  assert.equal(coordinator.getPositionKey(), "living-room:tablet:4x6");
});

test("invalid persisted positions are dropped and rewritten immediately", () => {
  const { coordinator, state, writes } = createHarness({
    state: {
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: "bad", y: 1 },
          weather: { x: 2, y: 2 },
        },
      },
    },
  });

  assert.equal(coordinator.readStoredPositions(), null);
  assert.deepEqual(state.widgetPositions, {});
  assert.deepEqual(writes, [{}]);
});

test("stored positions with extra keys are normalized and persisted again", () => {
  const { coordinator, state, writes } = createHarness({
    state: {
      widgets: [
        { id: "clock", kind: "clock", w: 2, h: 2 },
        { id: "weather", kind: "weather", w: 2, h: 1 },
      ],
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 3, y: 2 },
          orphan: { x: 4, y: 4 },
        },
      },
    },
    isPositionMapValidForWidgetsFn: () => true,
  });

  const result = coordinator.readStoredPositions();

  assert.deepEqual(result, {
    clock: { x: 1, y: 1 },
    weather: { x: 3, y: 2 },
  });
  assert.deepEqual(state.widgetPositions, {
    "living-room:tablet:4x6": result,
  });
  assert.deepEqual(writes, [{
    "living-room:tablet:4x6": result,
  }]);
});

test("getActivePositions without create does not pack missing layouts", () => {
  let packCalls = 0;
  const { coordinator, writes } = createHarness({
    packWidgetsFn: () => {
      packCalls += 1;
      return null;
    },
  });

  assert.equal(coordinator.getActivePositions({ create: false }), null);
  assert.equal(packCalls, 0);
  assert.deepEqual(writes, []);
});

test("getActivePositions with create packs, saves, and applies the DOM projection", () => {
  const { coordinator, state, writes, elements } = createHarness();

  const positions = coordinator.getActivePositions({ create: true });

  assert.deepEqual(positions, {
    clock: { x: 1, y: 1 },
    weather: { x: 3, y: 1 },
  });
  assert.deepEqual(state.widgetPositions, {
    "living-room:tablet:4x6": positions,
  });
  assert.deepEqual(writes, [{
    "living-room:tablet:4x6": positions,
  }]);
  assert.equal(elements.get("clock").style.gridColumn, "1 / span 4");
  assert.equal(elements.get("clock").style.gridRow, "1 / span 2");
});

test("applyPositionsToDom clamps projected width to the active grid units", () => {
  const { coordinator, elements } = createHarness();

  coordinator.applyPositionsToDom({
    clock: { x: 2, y: 3 },
    weather: { x: 1, y: 1 },
  });

  assert.equal(elements.get("clock").style.gridColumn, "2 / span 4");
  assert.equal(elements.get("clock").style.gridRow, "3 / span 2");
});

test("layout normalization clamps widget size and position to runtime bounds", () => {
  const { coordinator } = createHarness({
    state: {
      runtimeGridPreset: { columns: 2, rows: 2 },
    },
  });

  assert.deepEqual(
    coordinator.clampWidgetSizeToGridBounds(
      { x: 3, y: 2 },
      { w: 6, h: 5 },
    ),
    { w: 2, h: 3 },
  );
  assert.deepEqual(
    coordinator.clampWidgetPositionToGridBounds(
      { w: 3, h: 2 },
      { x: 7, y: 5 },
    ),
    { x: 2, y: 3 },
  );
});
