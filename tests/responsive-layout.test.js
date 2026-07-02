import test from "node:test";
import assert from "node:assert/strict";
import {
  getLayoutForWidth,
  RESPONSIVE_BREAKPOINTS,
} from "../src/layout/responsive.js";
import {
  getGridPreset,
  getGridPresetForLayout,
  logicalSizeToWidgetSize,
  normalizeWidgetSize,
  widgetSizeToLogicalSize,
} from "../src/layout/layout-engine.js";
import { resolveGridDensity } from "../src/layout/grid-density-solver.js";

test("responsive boundaries use one canonical matrix", () => {
  assert.equal(getLayoutForWidth(RESPONSIVE_BREAKPOINTS.tablet - 1), "mobile");
  assert.equal(getLayoutForWidth(RESPONSIVE_BREAKPOINTS.tablet), "tablet");
  assert.equal(getLayoutForWidth(RESPONSIVE_BREAKPOINTS.desktop - 1), "tablet");
  assert.equal(getLayoutForWidth(RESPONSIVE_BREAKPOINTS.desktop), "desktop");
});

test("intermediate tablet-sized screens stay out of desktop layout", () => {
  assert.equal(getLayoutForWidth(1180), "tablet");
  assert.equal(getLayoutForWidth(1366), "tablet");
  assert.equal(getLayoutForWidth(1400), "desktop");
});

test("manual layout modes override width-based layout selection", () => {
  assert.equal(getLayoutForWidth(390, { layoutMode: "desktop" }), "desktop");
  assert.equal(getLayoutForWidth(1600, { layoutMode: "tablet" }), "tablet");
  assert.equal(getLayoutForWidth(1600, { layoutMode: "auto" }), "desktop");
});

test("widget and logical sizes convert consistently", () => {
  assert.deepEqual(widgetSizeToLogicalSize({ w: 4, h: 2 }), { w: 2, h: 1 });
  assert.deepEqual(logicalSizeToWidgetSize({ w: 2, h: 3 }), { w: 4, h: 6 });
});

test("base widget sizes clamp invalid and oversized values", () => {
  assert.deepEqual(normalizeWidgetSize({ w: "bad", h: 0 }), { w: 2, h: 1 });
  assert.deepEqual(normalizeWidgetSize({ w: 1, h: 1 }), { w: 2, h: 1 });
  assert.deepEqual(normalizeWidgetSize({ w: 6, h: 6 }), { w: 6, h: 4 });
});

test("mobile grid presets preserve the documented logical columns", () => {
  assert.equal(
    getGridPreset(null, "mobile", { width: 390, height: 844 }).columns,
    2,
  );
  assert.equal(
    getGridPreset(null, "mobile", { width: 844, height: 390 }).columns,
    4,
  );
});

test("tablet landscape presets adapt their logical matrix to the measured panel rect", () => {
  const hostLikePreset = getGridPreset(null, "tablet", { width: 1133, height: 744 });
  const sideDockPreset = getGridPreset(null, "tablet", { width: 886, height: 676 });
  const bottomDockPreset = getGridPreset(null, "tablet", { width: 960, height: 595 });

  assert.deepEqual(
    {
      columns: hostLikePreset.columns,
      rows: hostLikePreset.rows,
    },
    { columns: 8, rows: 5 },
  );
  assert.deepEqual(
    {
      columns: sideDockPreset.columns,
      rows: sideDockPreset.rows,
    },
    { columns: 6, rows: 4 },
  );
  assert.deepEqual(
    {
      columns: bottomDockPreset.columns,
      rows: bottomDockPreset.rows,
    },
    { columns: 7, rows: 4 },
  );
  assert.equal(hostLikePreset.density, "tablet-landscape-adaptive");
  assert.equal(sideDockPreset.density, "tablet-landscape-adaptive");
  assert.equal(bottomDockPreset.density, "tablet-landscape-adaptive");
  assert.ok(bottomDockPreset.columns > sideDockPreset.columns);
  assert.ok(bottomDockPreset.rows <= sideDockPreset.rows);
});

test("layout preset without a measured rect still returns the preferred logical matrix", () => {
  assert.deepEqual(
    {
      columns: getGridPresetForLayout("tablet", "landscape").columns,
      rows: getGridPresetForLayout("tablet", "landscape").rows,
    },
    { columns: 6, rows: 4 },
  );
  assert.deepEqual(
    {
      columns: getGridPresetForLayout("tablet", "portrait").columns,
      rows: getGridPresetForLayout("tablet", "portrait").rows,
    },
    { columns: 4, rows: 6 },
  );
});

test("grid preset can adapt inside the documented bounds when the available rect is constrained", () => {
  const roomyTablet = getGridPreset(null, "tablet", { width: 1133, height: 744 });
  const constrainedTablet = getGridPreset(null, "tablet", { width: 720, height: 520 });

  assert.deepEqual(
    { columns: roomyTablet.columns, rows: roomyTablet.rows },
    { columns: 8, rows: 5 },
  );
  assert.deepEqual(
    { columns: constrainedTablet.columns, rows: constrainedTablet.rows },
    { columns: 5, rows: 3 },
  );
  assert.equal(constrainedTablet.minColumns, 4);
  assert.equal(constrainedTablet.maxColumns, 8);
  assert.equal(constrainedTablet.minRows, 3);
  assert.equal(constrainedTablet.maxRows, 5);
});

test("density solver treats legacy preset columns and rows as preferences, not rigid values", () => {
  const constraints = {
    minCell: 52,
    targetCell: 60,
    maxCell: 88,
    minColumns: 4,
    maxColumns: 8,
    minRows: 3,
    maxRows: 5,
    preferredColumns: 6,
    preferredRows: 4,
    fillX: 0.88,
    fillY: 0.76,
    preferencePenaltyFactor: 0.06,
  };

  const preferred = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 960, height: 595 },
  });
  const adapted = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 720, height: 520 },
  });

  assert.deepEqual(
    { columns: preferred.columns, rows: preferred.rows },
    { columns: 7, rows: 4 },
  );
  assert.deepEqual(
    { columns: adapted.columns, rows: adapted.rows },
    { columns: 5, rows: 3 },
  );
});

test("density solver keeps tablet columns stable when only the available height changes", () => {
  const constraints = {
    minCell: 52,
    targetCell: 60,
    maxCell: 88,
    minColumns: 4,
    maxColumns: 8,
    minRows: 3,
    maxRows: 5,
    preferredColumns: 6,
    preferredRows: 4,
    fillX: 0.88,
    fillY: 0.76,
    preferencePenaltyFactor: 0.06,
  };

  const tallerRect = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 860, height: 595 },
  });
  const shorterRect = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 860, height: 520 },
  });

  assert.equal(tallerRect.columns, 6);
  assert.equal(shorterRect.columns, 6);
  assert.equal(tallerRect.rows, 4);
  assert.equal(shorterRect.rows, 3);
});

test("density solver keeps tablet rows stable when only the available width changes", () => {
  const constraints = {
    minCell: 52,
    targetCell: 60,
    maxCell: 88,
    minColumns: 4,
    maxColumns: 8,
    minRows: 3,
    maxRows: 5,
    preferredColumns: 6,
    preferredRows: 4,
    fillX: 0.88,
    fillY: 0.76,
    preferencePenaltyFactor: 0.06,
  };

  const widerRect = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 1133, height: 520 },
  });
  const narrowerRect = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 860, height: 520 },
  });

  assert.equal(widerRect.rows, 3);
  assert.equal(narrowerRect.rows, 3);
  assert.equal(widerRect.columns, 8);
  assert.equal(narrowerRect.columns, 6);
});
