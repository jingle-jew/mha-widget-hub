import test from "node:test";
import assert from "node:assert/strict";
import {
  calculateGridTrackMetrics,
  createGridRuntime,
  getDockBottomColumnBonus,
  getGridBoundsFromPreset,
  measureContentRect,
  measureGridFrame,
  measureWidgetArea,
  resolveGridTrackAlignment,
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

test("content-rect measurement exposes x/y/width/height after padding", () => {
  const area = {
    clientWidth: 800,
    clientHeight: 500,
    getBoundingClientRect() {
      return { left: 100, top: 40, width: 800, height: 500 };
    },
  };
  const style = {
    paddingLeft: "20px",
    paddingRight: "30px",
    paddingTop: "10px",
    paddingBottom: "15px",
  };

  assert.deepEqual(measureContentRect(area, () => style), {
    x: 120,
    y: 50,
    width: 750,
    height: 475,
    left: 120,
    top: 50,
    right: 870,
    bottom: 525,
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

test("runtime grid preset ignores stale published orientation datasets", () => {
  const host = {
    dataset: {
      gridOrientation: "portrait",
    },
    style: createStyle(),
    shadowRoot: null,
    getBoundingClientRect() {
      return { width: 844, height: 390 };
    },
  };
  const runtime = createGridRuntime({
    host,
    getLayoutMode: () => "mobile",
    getEffectiveLayout: () => "mobile",
    getGridOrientation: () => "landscape",
  });

  const preset = runtime.getRuntimeGridPreset({
    availableContentRect: { width: 844, height: 390 },
  });

  assert.equal(preset.columns, 8);
  assert.equal(preset.rows, 5);
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

test("grid bounds preserve the direct widget-grid contract", () => {
  assert.deepEqual(
    getGridBoundsFromPreset({ columns: 7, rows: 4 }),
    {
      columns: 7,
      rows: 4,
      units: 7,
      rowUnits: 4,
    },
  );
});

test("grid track alignment resolves from runtime geometry instead of direct CSS dock selectors", () => {
  assert.deepEqual(
    resolveGridTrackAlignment({
      layout: "tablet",
      containerWidth: 883,
      trackWidth: 818.75,
      defaultPaddingStart: "0.6rem",
      defaultPaddingEnd: "0.6rem",
    }),
    {
      justify: "center",
      paddingInlineStart: "0.6rem",
      paddingInlineEnd: "0.6rem",
    },
  );
  assert.deepEqual(
    resolveGridTrackAlignment({
      layout: "tablet",
      containerWidth: 883,
      trackWidth: 818.75,
      defaultPaddingStart: "0.6rem",
      defaultPaddingEnd: "0.6rem",
    }),
    {
      justify: "center",
      paddingInlineStart: "0.6rem",
      paddingInlineEnd: "0.6rem",
    },
  );
  assert.deepEqual(
    resolveGridTrackAlignment({
      layout: "tablet",
      containerWidth: 860,
      trackWidth: 818.75,
      defaultPaddingStart: "0.6rem",
      defaultPaddingEnd: "0.6rem",
    }),
    {
      justify: "center",
      paddingInlineStart: "0.6rem",
      paddingInlineEnd: "0.6rem",
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
  assert.equal(host.dataset.layoutMode, "desktop");
  assert.equal(host.dataset.layout, "desktop");
  assert.equal(host.dataset.gridDensity, "desktop-landscape-adaptive");
  assert.equal(host.dataset.gridUnits, "14");
  assert.equal(host.dataset.logicalColumns, "14");
  assert.equal(host.dataset.gridRows, "10");
  assert.equal(host.dataset.logicalRows, "10");
  assert.equal(host.dataset.availableContentX, "0");
  assert.equal(host.dataset.availableContentY, "0");
  assert.equal(host.dataset.availableContentWidth, "1400");
  assert.equal(host.dataset.availableContentHeight, "800");
  assert.equal(host.dataset.gridTrackJustify, "center");
  assert.equal(host.dataset.panelFrameWidth, "1400");
  assert.equal(host.dataset.panelFrameHeight, "800");
  assert.equal(host.dataset.gridContainerWidth, "1400");
  assert.equal(host.dataset.gridContainerHeight, "800");
  assert.equal(host.dataset.gridTrackWidth, "1176");
  assert.equal(host.dataset.gridTrackHeight, "800");
  assert.equal(host.dataset.gridDebugViewportHeight, "800");
  assert.equal(host.dataset.gridDebugShellHeight, "0");
  assert.equal(host.dataset.gridDebugStatusBarReservedHeight, "0");
  assert.equal(host.dataset.gridDebugDockReservedHeight, "0");
  assert.equal(host.dataset.gridDebugGridAvailableHeight, "800");
  assert.equal(host.dataset.gridDebugSelectedRowCount, "10");
  assert.equal(host.dataset.gridDebugRowUnitHeight, "80");
  assert.equal(host.dataset.gridDebugLeftoverHeight, "0");
  assert.equal(hostStyle.values.get("--mha-square-unit"), "80px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "84px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "80px");
  assert.equal(hostStyle.values.get("--mha-available-content-x"), "0px");
  assert.equal(hostStyle.values.get("--mha-available-content-y"), "0px");
  assert.equal(hostStyle.values.get("--mha-available-content-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-available-content-height"), "800px");
  assert.equal(hostStyle.values.get("--mha-grid-track-justify-runtime"), "center");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "800px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "1400px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "800px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "1176px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "800px");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
  assert.equal(dropSlotSyncs, 1);
});

test("media page sidebar grid keeps a fixed four-column preset while rows follow height", () => {
  const mediaSidebar = { clientWidth: 420, clientHeight: 860 };
  const grid = {
    closest(selector) {
      if (selector === ".mha-media-page-widget-panel") return mediaSidebar;
      if (selector === ".mha-page-panel--grid") return mediaSidebar;
      return null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-grid") return grid;
      if (selector === ".mha-widget-area") return null;
      return null;
    },
  };
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      getBoundingClientRect() {
        return { width: 1440, height: 900 };
      },
    },
    getRoot: () => root,
    getLayoutMode: () => "desktop",
    getEffectiveLayout: () => "desktop",
    getStyle: () => ({
      paddingLeft: "0px",
      paddingRight: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
      getPropertyValue() {
        return "";
      },
    }),
  });

  const preset = runtime.getRuntimeGridPreset({
    grid,
    availableContentRect: { width: 420, height: 860 },
  });

  assert.equal(preset.columns, 4);
  assert.equal(preset.rows, 9);
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

  const preset = runtime.getLogicalGridPreset();

  assert.deepEqual(
    preset,
    getGridPresetForLayout("tablet", "landscape"),
  );
  assert.deepEqual(captured, []);
});

test("runtime runtime preset delegates to the preset engine with the available rect", () => {
  const panel = { clientWidth: 822, clientHeight: 693 };
  const area = { clientWidth: 799, clientHeight: 687 };
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
    getStyle: element => (element === panel ? panelStyle : areaStyle),
  });

  const preset = runtime.getRuntimeGridPreset();

  assert.deepEqual(
    preset,
    getGridPresetForLayout("tablet", "landscape", {
      width: 822,
      height: 693,
      dockPosition: "left",
    }),
  );
});

test("runtime keeps side-dock tablets at the 11-column side-dock density while bottom dock can stay wider", () => {
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

  const createRuntime = ({ panelWidth, panelHeight, areaWidth, areaHeight, dockPosition }) => {
    const panel = { clientWidth: panelWidth, clientHeight: panelHeight };
    const area = { clientWidth: areaWidth, clientHeight: areaHeight };
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
    return createGridRuntime({
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
      getStyle: element => (element === panel ? panelStyle : areaStyle),
    });
  };

  const miniSideRuntime = createRuntime({
    panelWidth: 822,
    panelHeight: 693,
    areaWidth: 799,
    areaHeight: 687,
    dockPosition: "left",
  });
  const mediumSideRuntime = createRuntime({
    panelWidth: 975,
    panelHeight: 753,
    areaWidth: 952,
    areaHeight: 747,
    dockPosition: "left",
  });
  const largeSideRuntime = createRuntime({
    panelWidth: 1121,
    panelHeight: 937,
    areaWidth: 1098,
    areaHeight: 931,
    dockPosition: "left",
  });
  const bottomRuntime = createRuntime({
    panelWidth: 1093,
    panelHeight: 565,
    areaWidth: 1070,
    areaHeight: 559,
    dockPosition: "bottom",
  });
  const tallBottomRuntime = createRuntime({
    panelWidth: 1140,
    panelHeight: 633,
    areaWidth: 1117,
    areaHeight: 627,
    dockPosition: "bottom",
  });

  assert.deepEqual(
    {
      columns: miniSideRuntime.getRuntimeGridPreset().columns,
      rows: miniSideRuntime.getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 8 },
  );
  assert.deepEqual(
    {
      columns: mediumSideRuntime.getRuntimeGridPreset().columns,
      rows: mediumSideRuntime.getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 8 },
  );
  assert.deepEqual(
    {
      columns: largeSideRuntime.getRuntimeGridPreset().columns,
      rows: largeSideRuntime.getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 8 },
  );
  assert.deepEqual(
    {
      columns: bottomRuntime.getRuntimeGridPreset().columns,
      rows: bottomRuntime.getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 6 },
  );
  assert.deepEqual(
    {
      columns: tallBottomRuntime.getRuntimeGridPreset().columns,
      rows: tallBottomRuntime.getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 6 },
  );
});

test("available content rect resolves from the panel frame on tablet and desktop", () => {
  const panel = {
    clientWidth: 883,
    clientHeight: 682,
    getBoundingClientRect() {
      return { left: 48, top: 96, width: 883, height: 682 };
    },
  };
  const area = {
    clientWidth: 860,
    clientHeight: 676,
    getBoundingClientRect() {
      return { left: 60, top: 104, width: 860, height: 676 };
    },
  };
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
    getStyle: element => (element === panel ? panelStyle : areaStyle),
  });

  assert.deepEqual(runtime.getAvailableContentRect(), {
    x: 48,
    y: 96,
    width: 883,
    height: 682,
    left: 48,
    top: 96,
    right: 931,
    bottom: 778,
  });
});

test("available content rect resolves from the widget area on mobile", () => {
  const area = {
    clientWidth: 390,
    clientHeight: 720,
    getBoundingClientRect() {
      return { left: 16, top: 32, width: 390, height: 720 };
    },
  };
  const areaStyle = {
    paddingLeft: "14px",
    paddingRight: "14px",
    paddingTop: "0px",
    paddingBottom: "20px",
  };
  const grid = {
    closest() {
      return null;
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-widget-area") return area;
      if (selector === ".mha-grid") return grid;
      return null;
    },
  };
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: createStyle(),
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: 390, height: 844 }),
    },
    getLayoutMode: () => "mobile",
    getEffectiveLayout: () => "mobile",
    isMobileLayout: () => true,
    getStyle: () => areaStyle,
  });

  assert.deepEqual(runtime.getAvailableContentRect(), {
    x: 30,
    y: 32,
    width: 362,
    height: 700,
    left: 30,
    top: 32,
    right: 392,
    bottom: 732,
  });
});

test("runtime preset sizing uses dock position as part of the tablet density context", () => {
  const panel = { clientWidth: 975, clientHeight: 753 };
  const area = { clientWidth: 952, clientHeight: 747 };
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
    {
      columns: createRuntime("left").getRuntimeGridPreset().columns,
      rows: createRuntime("left").getRuntimeGridPreset().rows,
    },
    { columns: 11, rows: 8 },
  );
  assert.deepEqual(
    {
      columns: createRuntime("bottom").getRuntimeGridPreset().columns,
      rows: createRuntime("bottom").getRuntimeGridPreset().rows,
    },
    { columns: 10, rows: 7 },
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
  assert.equal(hostStyle.values.get("--mha-square-unit"), "80.27272727272727px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "80.27272727272727px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "84.28636363636363px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "883px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "682px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "883px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "682px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "882.9999999999999px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "674.290909090909px");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
});

test("runtime debug metrics reflect status-bar and dock vertical reserves without phantom side-dock padding", () => {
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
  const shellStyle = {
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

  const createRuntimeForDebug = ({
    dockPosition,
    panelWidth,
    panelHeight,
    hostHeight,
    topReserve,
    bottomInset = 0,
    dockZoneHeight = 0,
  }) => {
    const shell = { clientWidth: panelWidth, clientHeight: hostHeight };
    const workspace = { clientWidth: panelWidth, clientHeight: hostHeight };
    const widgetArea = {
      clientWidth: panelWidth,
      clientHeight: panelHeight + topReserve + bottomInset,
    };
    const dockZone = { clientWidth: 96, clientHeight: dockZoneHeight };
    const panel = { clientWidth: panelWidth, clientHeight: panelHeight };
    const widgetAreaStyle = {
      paddingLeft: "0px",
      paddingRight: "0px",
      paddingTop: `${topReserve}px`,
      paddingBottom: `${bottomInset}px`,
    };
    const workspaceStyle = createStyle({
      "--mha-shell-content-top-inset": `${topReserve}px`,
      "--mha-shell-content-bottom-inset": `${bottomInset}px`,
    });
    Object.assign(workspaceStyle, shellStyle);
    const grid = {
      style: gridStyle,
      dataset: {},
      closest(selector) {
        return selector === ".mha-page-panel--grid" ? panel : null;
      },
    };
    const root = {
      querySelector(selector) {
        if (selector === ".mha-shell") return shell;
        if (selector === ".mha-workspace") return workspace;
        if (selector === ".mha-widget-area") return widgetArea;
        if (selector === ".mha-dock-zone") return dockZone;
        if (selector === ".mha-grid") return grid;
        return null;
      },
    };
    const host = {
      dataset: {},
      style: createStyle(),
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: panelWidth, height: hostHeight }),
    };
    const runtime = createGridRuntime({
      host,
      getLayoutMode: () => "tablet",
      getEffectiveLayout: () => "tablet",
      getDockPosition: () => dockPosition,
      getStyle: element => {
        if (element === shell) return shellStyle;
        if (element === workspace) return workspaceStyle;
        if (element === widgetArea) return widgetAreaStyle;
        if (element === panel) return panelStyle;
        if (element === dockZone) return shellStyle;
        return gridStyle;
      },
    });
    return { host, runtime };
  };

  const leftHidden = createRuntimeForDebug({
    dockPosition: "left",
    panelWidth: 883,
    panelHeight: 744,
    hostHeight: 744,
    topReserve: 0,
  });
  const rightTopBar = createRuntimeForDebug({
    dockPosition: "right",
    panelWidth: 883,
    panelHeight: 620,
    hostHeight: 744,
    topReserve: 44,
  });
  const leftPill = createRuntimeForDebug({
    dockPosition: "left",
    panelWidth: 883,
    panelHeight: 682,
    hostHeight: 744,
    topReserve: 62,
  });
  const bottomDock = createRuntimeForDebug({
    dockPosition: "bottom",
    panelWidth: 1093,
    panelHeight: 565,
    hostHeight: 744,
    topReserve: 62,
    dockZoneHeight: 96,
  });

  assert.equal(leftHidden.runtime.syncSquareUnit(), true);
  assert.equal(rightTopBar.runtime.syncSquareUnit(), true);
  assert.equal(leftPill.runtime.syncSquareUnit(), true);
  assert.equal(bottomDock.runtime.syncSquareUnit(), true);

  assert.equal(leftHidden.host.dataset.gridDebugStatusBarReservedHeight, "0");
  assert.equal(leftHidden.host.dataset.gridDebugDockReservedHeight, "0");
  assert.equal(leftHidden.host.dataset.gridDebugSelectedRowCount, "8");

  assert.equal(rightTopBar.host.dataset.gridDebugStatusBarReservedHeight, "44");
  assert.equal(rightTopBar.host.dataset.gridDebugDockReservedHeight, "0");
  assert.equal(rightTopBar.host.dataset.gridDebugSelectedRowCount, "8");

  assert.equal(leftPill.host.dataset.gridDebugStatusBarReservedHeight, "62");
  assert.equal(leftPill.host.dataset.gridDebugDockReservedHeight, "0");
  assert.equal(leftPill.host.dataset.gridDebugSelectedRowCount, "8");

  assert.equal(bottomDock.host.dataset.gridDebugStatusBarReservedHeight, "62");
  assert.equal(bottomDock.host.dataset.gridDebugDockReservedHeight, "96");
  assert.equal(bottomDock.host.dataset.gridDebugSelectedRowCount, "6");
  assert.ok(
    Number(leftHidden.host.dataset.gridDebugSelectedRowCount)
      >= Number(rightTopBar.host.dataset.gridDebugSelectedRowCount),
  );
  assert.ok(
    Number(leftHidden.host.dataset.gridDebugSelectedRowCount)
      >= Number(leftPill.host.dataset.gridDebugSelectedRowCount),
  );
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
  assert.equal(hostStyle.values.get("--mha-square-unit"), "77px");
  assert.equal(hostStyle.values.get("--mha-grid-column-size"), "77px");
  assert.equal(hostStyle.values.get("--mha-grid-row-size"), "78.33333333333333px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-width"), "860px");
  assert.equal(hostStyle.values.get("--mha-panel-frame-height"), "520px");
  assert.equal(hostStyle.values.get("--mha-grid-container-width"), "860px");
  assert.equal(hostStyle.values.get("--mha-grid-container-height"), "520px");
  assert.equal(hostStyle.values.get("--mha-grid-track-width"), "860px");
  assert.equal(hostStyle.values.get("--mha-grid-track-height"), "520px");
  assert.equal(hostStyle.values.get("--mha-grid-track-justify-runtime"), "center");
  assert.equal(gridStyle.values.get("--mha-grid-container-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-container-height"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-width"), undefined);
  assert.equal(gridStyle.values.get("--mha-grid-track-height"), undefined);
  assert.deepEqual(grid.dataset, {});
});

test("runtime centers the grid track from the computed geometry even with a side dock", () => {
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
    getPropertyValue(name) {
      return this.values.get(name) || "";
    },
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
  const area = { clientWidth: 960, clientHeight: 595 };
  const panel = { clientWidth: 960, clientHeight: 595 };
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
  const runtime = createGridRuntime({
    host: {
      dataset: {},
      style: hostStyle,
      shadowRoot: root,
      isConnected: true,
      getBoundingClientRect: () => ({ width: 1133, height: 744 }),
    },
    getLayoutMode: () => "tablet",
    getEffectiveLayout: () => "tablet",
    getDockPosition: () => "left",
    getStyle: element => {
      if (element === area) return areaStyle;
      if (element === panel) return panelStyle;
      return gridStyle;
    },
  });

  assert.equal(runtime.syncSquareUnit(), true);
  assert.equal(hostStyle.values.get("--mha-grid-track-justify-runtime"), "center");
  assert.equal(
    hostStyle.values.get("--mha-grid-padding-inline-end-runtime"),
    "var(--mha-grid-padding-inline-end)",
  );
  assert.equal(
    hostStyle.values.get("--mha-grid-padding-inline-start-runtime"),
    "var(--mha-grid-padding-inline-start)",
  );
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
