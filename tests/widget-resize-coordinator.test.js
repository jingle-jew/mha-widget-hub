import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetResizeCoordinator } from "../src/widgets/widget-resize-coordinator.js";

function createElement() {
  const values = new Map();
  const badge = { textContent: "" };
  return {
    dataset: {},
    style: {
      values,
      gridColumn: "",
      gridRow: "",
      setProperty(name, value) {
        values.set(name, String(value));
      },
    },
    classList: {
      added: [],
      removed: [],
      add(name) {
        this.added.push(name);
      },
      remove(name) {
        this.removed.push(name);
      },
    },
    querySelector(selector) {
      return selector === ".mha-size-badge" ? badge : null;
    },
    badge,
  };
}

function createHarness(overrides = {}) {
  const element = createElement();
  const effects = [];
  const state = {
    resizeState: {
      pointerId: 12,
      widgetId: "clock",
      startX: 0,
      startY: 0,
      startW: 2,
      startH: 2,
      metrics: { columnStep: 10, rowStep: 20 },
    },
    widgets: [{ id: "clock", kind: "clock", w: 2, h: 2 }],
    activeGridUnits: 3,
    gridMetrics: {
      columnStep: 10,
      rowStep: 20,
    },
    position: { x: 2, y: 3 },
    ...overrides.state,
  };

  const coordinator = createWidgetResizeCoordinator({
    getResizeState: () => state.resizeState,
    setResizeState: (next) => {
      state.resizeState = next;
      effects.push(["setResizeState", next]);
    },
    getWidgets: () => state.widgets,
    setWidgets: (widgets) => {
      state.widgets = widgets;
      effects.push(["setWidgets", structuredClone(widgets)]);
    },
    getGridMetrics: () => state.gridMetrics,
    getActiveGridUnits: () => state.activeGridUnits,
    getWidgetPosition: () => state.position,
    doesWidgetLayoutFitGrid: overrides.doesWidgetLayoutFitGrid || (() => true),
    normalizeWidgetsToGridBounds: overrides.normalizeWidgetsToGridBounds || (widgets => widgets),
    clampWidgetSizeToGridBounds: overrides.clampWidgetSizeToGridBounds || ((_widget, size) => ({
      ...size,
      w: Math.max(1, Math.min(size.w, 4)),
      h: Math.max(1, Math.min(size.h, 4)),
    })),
    queryWidgetElement: () => element,
    saveWidgets: () => {
      effects.push(["saveWidgets"]);
      return true;
    },
    replaceWidgetDom: (widgetId) => {
      effects.push(["replaceWidgetDom", widgetId]);
      return true;
    },
    scheduleSquareUnitSync: () => {
      effects.push(["scheduleSquareUnitSync"]);
    },
    normalizeWidgetForKindFn: overrides.normalizeWidgetForKindFn || (widget => ({
      w: widget.w,
      h: widget.h,
    })),
    getWidgetDensityFn: () => "dense",
    sizeToStringFn: ({ w, h }) => `${w}x${h}`,
  });

  return { coordinator, state, element, effects };
}

test("startResize captures the current widget size and marks the shell as resizing", () => {
  const { coordinator, state, element, effects } = createHarness({
    state: {
      resizeState: null,
      widgets: [{ id: "clock", kind: "clock", w: 3, h: 2 }],
    },
  });

  assert.equal(
    coordinator.startResize("clock", {
      pointerId: 7,
      clientX: 120,
      clientY: 80,
    }),
    true,
  );

  assert.deepEqual(state.resizeState, {
    pointerId: 7,
    widgetId: "clock",
    startX: 120,
    startY: 80,
    startW: 3,
    startH: 2,
    metrics: {
      columnStep: 10,
      rowStep: 20,
    },
  });
  assert.deepEqual(element.classList.added, ["is-resizing"]);
  assert.deepEqual(effects, [["setResizeState", state.resizeState]]);
});

test("findFittingResize shrinks height first, then width, and falls back to current size", () => {
  const sequence = [];
  const { coordinator } = createHarness({
    doesWidgetLayoutFitGrid: (widgets) => {
      const current = widgets[0];
      sequence.push(`${current.w}x${current.h}`);
      return current.w === 3 && current.h === 1;
    },
    normalizeWidgetsToGridBounds: (widgets) => widgets,
  });

  assert.deepEqual(
    coordinator.findFittingResize(
      { id: "clock", w: 2, h: 2 },
      { w: 3, h: 3 },
    ),
    { w: 3, h: 1 },
  );
  assert.deepEqual(sequence, ["3x3", "3x2", "3x1"]);

  const fallback = createHarness({
    doesWidgetLayoutFitGrid: () => false,
    normalizeWidgetForKindFn: () => ({ w: 2, h: 2 }),
  });
  assert.deepEqual(
    fallback.coordinator.findFittingResize(
      { id: "clock", w: 2, h: 2 },
      { w: 4, h: 4 },
    ),
    { w: 2, h: 2 },
  );
});

test("updateResize mutates datasets, CSS vars, and badge text for the active pointer", () => {
  const { coordinator, state, element, effects } = createHarness();
  const event = {
    pointerId: 12,
    clientX: 20,
    clientY: 40,
    preventDefault() {
      effects.push(["preventDefault"]);
    },
  };

  coordinator.updateResize(event);

  assert.deepEqual(state.widgets, [{ id: "clock", kind: "clock", w: 4, h: 4, responsiveSizeMode: "" }]);
  assert.deepEqual(element.dataset, {
    widgetConfiguredW: "4",
    widgetW: "3",
    widgetH: "4",
    widgetSize: "4x4",
    widgetDensity: "dense",
  });
  assert.equal(element.style.values.get("--mha-widget-w"), "3");
  assert.equal(element.style.values.get("--mha-widget-configured-w"), "4");
  assert.equal(element.style.values.get("--mha-widget-h"), "4");
  assert.equal(element.style.gridColumn, "2 / span 3");
  assert.equal(element.style.gridRow, "3 / span 4");
  assert.equal(element.badge.textContent, "4x4 · dense");
  assert.deepEqual(effects[0], ["preventDefault"]);
});

test("updateResize is a no-op for mismatched pointers", () => {
  const { coordinator, state, element, effects } = createHarness();

  coordinator.updateResize({
    pointerId: 99,
    clientX: 20,
    clientY: 20,
    preventDefault() {
      effects.push(["preventDefault"]);
    },
  });

  assert.deepEqual(state.widgets, [{ id: "clock", kind: "clock", w: 2, h: 2 }]);
  assert.deepEqual(element.dataset, {});
  assert.deepEqual(effects, []);
});

test("finishResize clears the live state, saves widgets, and rebuilds the resized widget DOM", () => {
  const { coordinator, state, element, effects } = createHarness();

  coordinator.finishResize();

  assert.equal(state.resizeState, null);
  assert.deepEqual(element.classList.removed, ["is-resizing"]);
  assert.deepEqual(effects, [
    ["setResizeState", null],
    ["saveWidgets"],
    ["replaceWidgetDom", "clock"],
  ]);
});
