import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateSquareGridMetrics,
  createGridRuntime,
  getDockBottomColumnBonus,
  getGridBoundsFromPreset,
  measureWidgetArea,
} from "../src/layout/grid-runtime.js";

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

test("square metrics preserve desktop and mobile sizing rules", () => {
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
    calculateSquareGridMetrics({ ...common, mobile: false }),
    {
      unit: 72.5,
      matrixWidth: 567.5,
      matrixHeight: 320,
    },
  );
  assert.deepEqual(
    calculateSquareGridMetrics({ ...common, mobile: true }),
    {
      unit: 91.42857142857143,
      matrixWidth: 700,
      matrixHeight: 395.7142857142857,
    },
  );
  assert.deepEqual(
    calculateSquareGridMetrics({ ...common, mobile: false, fillWidth: true }),
    {
      unit: 91.42857142857143,
      matrixWidth: 700,
      matrixHeight: 395.7142857142857,
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
  const area = { clientWidth: 600, clientHeight: 400 };
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
  let dropSlotSyncs = 0;
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "desktop",
    getEffectiveLayout: () => "desktop",
    getGridPreset: () => ({
      columns: 3,
      rows: 2,
      density: "desktop-test",
      maxCell: 160,
    }),
    getStyle: element => (element === area ? areaStyle : gridStyle),
    syncDropSlots: () => {
      dropSlotSyncs += 1;
    },
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.deepEqual(host.dataset, {
    gridDensity: "desktop-test",
    gridUnits: "6",
    logicalColumns: "3",
    gridRows: "4",
    logicalRows: "2",
  });
  assert.equal(hostStyle.values.get("--mha-square-unit"), "100px");
  assert.equal(gridStyle.values.get("--mha-grid-matrix-width"), "600px");
  assert.equal(gridStyle.values.get("--mha-grid-matrix-height"), "400px");
  assert.equal(dropSlotSyncs, 1);
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
  const area = { clientWidth: 700, clientHeight: 320 };
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
    getBoundingClientRect: () => ({ width: 1133, height: 744 }),
  };
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getDockPosition: () => "bottom",
    getGridPreset: () => ({
      columns: 3,
      rows: 2,
      density: "tablet-test",
      maxCell: 160,
    }),
    getStyle: element => (element === area ? areaStyle : gridStyle),
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.equal(hostStyle.values.get("--mha-square-unit"), "72.5px");
  assert.equal(gridStyle.values.get("--mha-grid-matrix-width"), "485px");
  assert.equal(gridStyle.values.get("--mha-grid-matrix-height"), "320px");
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
  assert.equal(gridStyle.values.get("--mha-grid-matrix-width"), undefined);
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
