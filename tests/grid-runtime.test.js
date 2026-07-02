import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateGridTrackMetrics,
  createGridRuntime,
  getDockBottomColumnBonus,
  getGridBoundsFromPreset,
  measureGridFrame,
  measureWidgetArea,
} from "../src/layout/grid-runtime.js";
import { getGridPresetForLayout } from "../src/layout/layout-engine.js";

function createStyle(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    setProperty(name, value) {
      values.set(name, String(value));
    },
    getPropertyValue(name) {
      return values.get(name) || "";
    },
    values,
  };
}

test("widget-area measurement removes CSS padding", () => {
  const area = { clientWidth: 800, clientHeight: 500 };
  const style = {
    paddingLeft: "20px",
    paddingRight: "30px",
    paddingTop: "10px",
    paddingBottom: "15px",
  };

  assert.deepEqual(measureWidgetArea(area, () => style), {
    width: 750,
    height: 475,
  });
});

test("widget-area measurement falls back to bounding rect when client height is zero", () => {
  const area = {
    clientWidth: 800,
    clientHeight: 0,
    getBoundingClientRect() {
      return { width: 800, height: 500 };
    },
  };
  const style = {
    paddingLeft: "20px",
    paddingRight: "30px",
    paddingTop: "10px",
    paddingBottom: "15px",
  };

  assert.deepEqual(measureWidgetArea(area, () => style), {
    width: 750,
    height: 475,
  });
});

test("grid-frame measurement follows the actual page panel bounds", () => {
  const frame = { clientWidth: 883, clientHeight: 682 };
  const style = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const grid = {
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? frame : null;
    },
  };

  assert.deepEqual(measureGridFrame(grid, () => style), {
    width: 883,
    height: 682,
  });
});

test("grid-frame measurement falls back to bounding rect when client height is zero", () => {
  const frame = {
    clientWidth: 883,
    clientHeight: 0,
    getBoundingClientRect() {
      return { width: 883, height: 682 };
    },
  };
  const style = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const grid = {
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? frame : null;
    },
  };

  assert.deepEqual(measureGridFrame(grid, () => style), {
    width: 883,
    height: 682,
  });
});

test("dock-position bonus stays disabled when widget-area is already reserved", () => {
  const base = {
    columns: 5,
    minCell: 88,
    targetCell: 100,
  };

  assert.equal(
    getDockBottomColumnBonus({
      dockPosition: "bottom",
      layout: "desktop",
      base,
      metrics: { width: 720 },
      hostWidth: 1200,
    }),
    0,
  );
  assert.equal(
    getDockBottomColumnBonus({
      dockPosition: "bottom",
      layout: "desktop",
      base,
      metrics: { width: 720 },
      hostWidth: 767,
    }),
    0,
  );
  assert.equal(
    getDockBottomColumnBonus({
      dockPosition: "left",
      layout: "desktop",
      base,
      metrics: { width: 720 },
      hostWidth: 1200,
    }),
    0,
  );
});

test("grid bounds preserve the logical-to-internal conversion", () => {
  assert.deepEqual(
    getGridBoundsFromPreset({ columns: 7, rows: 4 }),
    {
      columns: 7,
      rows: 4,
      units: 14,
      rowUnits: 8,
    },
  );
});

test("grid track metrics preserve mobile squareness and desktop/tablet fill", () => {
  const common = {
    metrics: { width: 700, height: 320 },
    preset: { maxCell: 160 },
    units: 7,
    rows: 4,
    columnGap: 10,
    rowGap: 10,
    hardMin: 24,
    maxUnit: 160,
  };

  assert.deepEqual(
    calculateGridTrackMetrics({ ...common, mobile: false }),
    {
      columnSize: 76.125,
      rowSize: 72.5,
      squareUnit: 72.5,
      matrixWidth: 592.875,
      matrixHeight: 320,
    },
  );
  assert.deepEqual(
    calculateGridTrackMetrics({ ...common, mobile: true }),
    {
      columnSize: 91.42857142857143,
      rowSize: 91.42857142857143,
      squareUnit: 91.42857142857143,
      matrixWidth: 700,
      matrixHeight: 395.7142857142857,
    },
  );
  assert.deepEqual(
    calculateGridTrackMetrics({ ...common, mobile: false, fillWidth: true }),
    {
      columnSize: 91.42857142857143,
      rowSize: 91.42857142857143,
      squareUnit: 91.42857142857143,
      matrixWidth: 700,
      matrixHeight: 395.7142857142857,
    },
  );
});

test("desktop/tablet track metrics clamp tall panels to quasi-square rows", () => {
  assert.deepEqual(
    calculateGridTrackMetrics({
      metrics: { width: 883, height: 682 },
      preset: { maxCell: 160 },
      units: 12,
      rows: 8,
      columnGap: 0,
      rowGap: 0,
      gridPaddingX: 0,
      gridPaddingY: 0,
      hardMin: 24,
      maxUnit: 160,
      mobile: false,
    }),
    {
      columnSize: 73.58333333333333,
      rowSize: 77.2625,
      squareUnit: 73.58333333333333,
      matrixWidth: 883,
      matrixHeight: 618.1,
    },
  );
});

test("runtime applies the existing grid dataset and CSS contract", () => {
  const hostStyle = createStyle();
  const gridStyle = createStyle({
    "--mha-square-unit-hard-min": "24",
    "--mha-square-unit-max": "160",
  });
  Object.assign(gridStyle, {
    columnGap: "0px",
    rowGap: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  });
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const area = { clientWidth: 1400, clientHeight: 800 };
  const grid = { style: gridStyle, dataset: {} };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const host = {
    dataset: {},
    style: hostStyle,
    shadowRoot: root,
    isConnected: true,
    getBoundingClientRect: () => ({ width: 1200, height: 800 }),
  };
  let dropSlotSyncs = 0;
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "desktop",
    getEffectiveLayout: () => "desktop",
    getStyle: element => (element === area ? areaStyle : gridStyle),
    syncDropSlots: () => {
      dropSlotSyncs += 1;
    },
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.deepEqual(host.dataset, {
    layoutMode: "desktop",
    layout: "desktop",
    gridDensity: "desktop-landscape-adaptive",
    gridUnits: "14",
    logicalColumns: "7",
    gridRows: "8",
    logicalRows: "4",
    panelFrameWidth: "1400",
    panelFrameHeight: "800",
    gridContainerWidth: "1400",
    gridContainerHeight: "800",
    gridTrackWidth: "1400",
    gridTrackHeight: "800",
  });
  assert.equal(hostStyle.values.get("--mha-square-unit"), "100px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "100px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "100px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "800px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "800px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "800px");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
  assert.equal(dropSlotSyncs, 1);
});

test("runtime logical preset ignores measured panel metrics on tablet and desktop", () => {
  const panel = { clientWidth: 883, clientHeight: 682 };
  const area = { clientWidth: 860, clientHeight: 676 };
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const panelStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const grid = {
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? panel : null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const captured = [];
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: 1133, height: 744 }),
    },
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getGridPreset: (_host, _layout, metrics) => {
      captured.push(metrics);
      return {
        columns: 6,
        rows: 5,
        density: "tablet-test",
      };
    },
    getStyle: element => (element === panel ? panelStyle : areaStyle),
  });

  const preset = runtime.getRuntimeGridPreset();

  assert.deepEqual(
    preset,
    getGridPresetForLayout("tablet", "landscape"),
  );
  assert.deepEqual(captured, []);
});

test("runtime logical preset delegates directly to the preset engine without panel metrics", () => {
  const panel = { clientWidth: 883, clientHeight: 682 };
  const area = { clientWidth: 860, clientHeight: 676 };
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const panelStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const grid = {
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? panel : null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const calls = [];
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: 1133, height: 744 }),
    },
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getGridPreset: (_host, _layout, metrics) => {
      calls.push(metrics);
      return {
        columns: 6,
        rows: 5,
        density: "tablet-landscape-adaptive",
      };
    },
    getStyle: element => (element === panel ? panelStyle : areaStyle),
  });

  const preset = runtime.getRuntimeGridPreset();

  assert.deepEqual(
    preset,
    getGridPresetForLayout("tablet", "landscape"),
  );
  assert.deepEqual(calls, []);
});

test("runtime preset sizing stays invariant across dock positions for the same panel frame", () => {
  const panel = { clientWidth: 883, clientHeight: 682 };
  const area = { clientWidth: 860, clientHeight: 676 };
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const panelStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const grid = {
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? panel : null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const createRuntime = dockPosition => createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: 1133, height: 744 }),
    },
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getDockPosition: () => dockPosition,
    getGridPreset: (_host, _layout, metrics) => {
      return {
        columns: 6,
        rows: 5,
        density: "tablet-landscape-adaptive",
      };
    },
    getStyle: element => (element === panel ? panelStyle : areaStyle),
  });

  assert.deepEqual(
    createRuntime("left").getRuntimeGridPreset(),
    createRuntime("bottom").getRuntimeGridPreset(),
  );
});

test("runtime surfaces the parent grid frame on tablet/desktop", () => {
  const hostStyle = createStyle();
  const gridStyle = createStyle({
    "--mha-square-unit-hard-min": "24",
    "--mha-square-unit-max": "160",
  });
  Object.assign(gridStyle, {
    columnGap: "0px",
    rowGap: "0px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  });
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const panelStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const area = { clientWidth: 860, clientHeight: 676 };
  const panel = { clientWidth: 883, clientHeight: 682 };
  const grid = {
    style: gridStyle,
    dataset: {},
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? panel : null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const host = {
    dataset: {},
    style: hostStyle,
    shadowRoot: root,
    isConnected: true,
    getBoundingClientRect: () => ({ width: 1133, height: 744 }),
  };
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getStyle: element => {
      if (element === area) return areaStyle;
      if (element === panel) return panelStyle;
      return gridStyle;
    },
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.equal(hostStyle.values.get("--mha-square-unit"), "73.58333333333333px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "73.58333333333333px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "77.2625px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "883px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "682px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "883px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "682px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "883px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "618.1px");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
});

test("runtime keeps bottom dock square-unit constrained by measured height", () => {
  const hostStyle = createStyle();
  const gridStyle = createStyle({
    "--mha-square-unit-hard-min": "24",
    "--mha-square-unit-max": "160",
  });
  Object.assign(gridStyle, {
    columnGap: "10px",
    rowGap: "10px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  });
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const panelStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const area = { clientWidth: 860, clientHeight: 520 };
  const panel = { clientWidth: 860, clientHeight: 520 };
  const grid = {
    style: gridStyle,
    dataset: {},
    closest(selector) {
      return selector === ".mha-page-panel--grid" ? panel : null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const host = {
    dataset: {},
    style: hostStyle,
    shadowRoot: root,
    isConnected: true,
    getBoundingClientRect: () => ({ width: 1133, height: 744 }),
  };
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getDockPosition: () => "bottom",
    getStyle: element => {
      if (element === area) return areaStyle;
      if (element === panel) return panelStyle;
      return gridStyle;
    },
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.equal(hostStyle.values.get("--mha-square-unit"), "56.25px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "59.0625px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "56.25px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "860px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "520px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "860px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "520px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "818.75px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "520px");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
});

test("runtime ignores unstable early desktop square units", () => {
  const hostStyle = createStyle({
    "--mha-square-unit": "72px",
  });
  const gridStyle = createStyle({
    "--mha-square-unit-hard-min": "24",
    "--mha-square-unit-max": "160",
  });
  Object.assign(gridStyle, {
    columnGap: "10px",
    rowGap: "10px",
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  });
  const areaStyle = {
    paddingLeft: "0px",
    paddingRight: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
  };
  const area = { clientWidth: 240, clientHeight: 110 };
  const grid = { style: gridStyle };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const host = {
    dataset: {},
    style: hostStyle,
    shadowRoot: root,
    isConnected: true,
    getBoundingClientRect: () => ({ width: 1200, height: 800 }),
  };
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "desktop",
    getEffectiveLayout: () => "desktop",
    getGridPreset: () => ({
      columns: 3,
      rows: 2,
      density: "desktop-test",
      minCell: 88,
      maxCell: 160,
    }),
    getStyle: element => (element === area ? areaStyle : gridStyle),
  });

  assert.equal(runtime.syncSquareUnit(), false);
  assert.equal(hostStyle.values.get("--mha-square-unit"), "72px");
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
});

test("runtime owns and cancels scheduled frames", () => {
  const callbacks = new Map();
  const cancelled = [];
  let nextFrame = 1;
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      isConnected: true,
    },
    getLayoutMode: () => "desktop",
    getEffectiveLayout: () => "desktop",
    getGridPreset: () => ({
      columns: 1,
      rows: 1,
      density: "test",
    }),
    requestFrame(callback) {
      const frame = nextFrame;
      nextFrame += 1;
      callbacks.set(frame, callback);
      return frame;
    },
    cancelFrame(frame) {
      cancelled.push(frame);
      callbacks.delete(frame);
    },
  });

  runtime.scheduleGridRuntimeSync();
  assert.equal(runtime.gridRuntimeFrame, 1);
  runtime.destroy();

  assert.deepEqual(cancelled, [0, 0, 1]);
  assert.equal(runtime.gridRuntimeFrame, 0);
  assert.equal(runtime.squareUnitFrame, 0);
});
