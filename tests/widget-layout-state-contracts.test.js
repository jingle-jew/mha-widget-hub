import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetLayoutStateCoordinator } from "../src/widgets/widget-layout-state-coordinator.js";

function createStyleTarget() {
  const values = new Map();

  return {
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
  const validationCalls = [];
  const elements = new Map();

  const state = {
    widgets: [
      { id: "clock", kind: "clock", w: 2, h: 2 },
      { id: "weather", kind: "weather", w: 2, h: 1 },
    ],
    widgetPositions: {},
    activePageId: "living-room",
    effectiveLayout: "tablet",
    bounds: { units: 4, rowUnits: 6 },
    runtimeGridPreset: { columns: 4, rows: 6 },
    mobile: false,
    unboundedRows: false,
    ...overrides.state,
  };

  for (const widget of state.widgets) {
    elements.set(widget.id, { style: createStyleTarget() });
  }

  const root = {
    querySelector(selector) {
      for (const [id, element] of elements.entries()) {
        if (selector.includes(`data-widget-id="${id}"`)) return element;
      }
      return null;
    },
    querySelectorAll(selector) {
      return selector === ".mha-widget" ? [...elements.values()] : [];
    },
  };

  const coordinator = createWidgetLayoutStateCoordinator({
    getWidgets: () => state.widgets,
    getWidgetPositions: () => state.widgetPositions,
    setWidgetPositions: (positions) => {
      state.widgetPositions = positions;
    },
    getActivePageId: () => state.activePageId,
    getGridBounds: () => state.bounds,
    getEffectiveLayout: () => state.effectiveLayout,
    getRuntimeGridPreset: () => state.runtimeGridPreset,
    isMobileLayout: () => state.mobile,
    allowUnboundedRows: () => state.unboundedRows,
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
    normalizeWidgetForKindFn: (widget) => ({
      w: widget.w || 1,
      h: widget.h || 1,
    }),
    packWidgetsFn: overrides.packWidgetsFn || (() => null),
    isPositionMapValidForWidgetsFn: (...args) => {
      validationCalls.push(args);
      return overrides.positionMapValid ?? true;
    },
  });

  return {
    coordinator,
    state,
    writes,
    effects,
    elements,
    validationCalls,
  };
}

test("valid stored positions are returned without persistence rewrites", () => {
  const stored = {
    clock: { x: 1, y: 1 },
    weather: { x: 3, y: 2 },
  };

  const { coordinator, writes } = createHarness({
    state: {
      widgetPositions: {
        "living-room:tablet:4x6": stored,
      },
    },
  });

  assert.deepEqual(coordinator.readStoredPositions(), stored);
  assert.deepEqual(writes, []);
});

test("stored positions rejected by geometry validation are dropped", () => {
  const { coordinator, state, writes } = createHarness({
    state: {
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 4, y: 6 },
        },
      },
    },
    positionMapValid: false,
  });

  assert.equal(coordinator.readStoredPositions(), null);
  assert.deepEqual(state.widgetPositions, {});
  assert.deepEqual(writes, [{}]);
});

test("desktop position validation uses bounded rows", () => {
  const { coordinator, validationCalls } = createHarness({
    state: {
      mobile: false,
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 3, y: 2 },
        },
      },
    },
  });

  coordinator.readStoredPositions();

  assert.equal(validationCalls.length, 1);
  assert.deepEqual(validationCalls[0][4], {
    allowUnboundedRows: false,
    layout: "desktop",
  });
});

test("mobile position validation allows unbounded rows", () => {
  const { coordinator, validationCalls } = createHarness({
    state: {
      mobile: true,
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 3, y: 8 },
        },
      },
    },
  });

  coordinator.readStoredPositions();

  assert.equal(validationCalls.length, 1);
  assert.deepEqual(validationCalls[0][4], {
    allowUnboundedRows: true,
    layout: "mobile",
  });
});

test("scrollable tablet pages validate unbounded rows without mobile layout", () => {
  const packCalls = [];
  const { coordinator, validationCalls } = createHarness({
    state: {
      unboundedRows: true,
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 3, y: 8 },
        },
      },
    },
    packWidgetsFn: (...args) => {
      packCalls.push(args);
      return {};
    },
  });

  coordinator.readStoredPositions();
  coordinator.packWidgetsForCurrentGrid();

  assert.equal(validationCalls.length, 1);
  assert.deepEqual(validationCalls[0][4], {
    allowUnboundedRows: true,
    layout: "desktop",
  });
  assert.deepEqual(packCalls[0][3], {
    allowUnboundedRows: true,
    layout: "desktop",
  });
});

test("saveCurrentPositions persists positions under the active layout key", () => {
  const { coordinator, state, writes, effects } = createHarness();

  const positions = {
    clock: { x: 2, y: 1 },
    weather: { x: 1, y: 3 },
  };

  const result = coordinator.saveCurrentPositions(positions);

  assert.deepEqual(result, {
    "living-room:tablet:4x6": positions,
  });
  assert.deepEqual(state.widgetPositions, {
    "living-room:tablet:4x6": positions,
  });
  assert.deepEqual(writes, [
    {
      "living-room:tablet:4x6": positions,
    },
  ]);
  assert.deepEqual(effects, [
    [
      "record",
      {
        "living-room:tablet:4x6": positions,
      },
    ],
  ]);
});

test("clearCurrentPositions removes stored positions and DOM placement styles", () => {
  const { coordinator, state, writes, elements } = createHarness({
    state: {
      widgetPositions: {
        "living-room:tablet:4x6": {
          clock: { x: 1, y: 1 },
          weather: { x: 3, y: 2 },
        },
        "kitchen:tablet:4x6": {
          clock: { x: 2, y: 1 },
        },
      },
    },
  });

  coordinator.applyPositionsToDom({
    clock: { x: 1, y: 1 },
    weather: { x: 3, y: 2 },
  });

  assert.notEqual(elements.get("clock").style.gridColumn, "");

  coordinator.clearCurrentPositions();

  assert.deepEqual(state.widgetPositions, {
    "kitchen:tablet:4x6": {
      clock: { x: 2, y: 1 },
    },
  });
  assert.deepEqual(writes, [
    {
      "kitchen:tablet:4x6": {
        clock: { x: 2, y: 1 },
      },
    },
  ]);

  assert.equal(elements.get("clock").style.gridColumn, "");
  assert.equal(elements.get("clock").style.gridRow, "");
  assert.equal(elements.get("weather").style.gridColumn, "");
  assert.equal(elements.get("weather").style.gridRow, "");
});

test("normalizeWidgetsToGridBounds clamps multiple widgets in one pass", () => {
  const { coordinator } = createHarness({
    state: {
      runtimeGridPreset: { columns: 4, rows: 4 },
    },
  });

  assert.deepEqual(
    coordinator.normalizeWidgetsToGridBounds([
      { id: "wide", x: 3, y: 1, w: 6, h: 1 },
      { id: "low", x: 1, y: 5, w: 2, h: 4 },
    ]),
    [
      { id: "wide", x: 3, y: 1, w: 6, h: 1 },
      { id: "low", x: 1, y: 4, w: 2, h: 4 },
    ],
  );
});
