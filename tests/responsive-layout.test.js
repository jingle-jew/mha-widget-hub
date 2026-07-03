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
import { resolveGridDensityProfileConstraints } from "../src/layout/grid-density-profiles.js";
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
  assert.deepEqual(widgetSizeToLogicalSize({ w: 4, h: 2 }), { w: 4, h: 2 });
  assert.deepEqual(logicalSizeToWidgetSize({ w: 2, h: 3 }), { w: 2, h: 3 });
});

test("base widget sizes clamp invalid and oversized values", () => {
  assert.deepEqual(normalizeWidgetSize({ w: "bad", h: 0 }), { w: 2, h: 1 });
  assert.deepEqual(normalizeWidgetSize({ w: 1, h: 1 }), { w: 1, h: 1 });
  assert.deepEqual(normalizeWidgetSize({ w: 6, h: 6 }), { w: 6, h: 4 });
});

test("mobile grid presets expose direct widget-grid columns", () => {
  assert.equal(
    getGridPreset(null, "mobile", { width: 390, height: 844 }).columns,
    4,
  );
  assert.equal(
    getGridPreset(null, "mobile", { width: 844, height: 390 }).columns,
    8,
  );
});

test("tablet landscape presets adapt their direct widget-grid matrix to the measured panel rect", () => {
  const hostLikePreset = getGridPreset(null, "tablet", { width: 1133, height: 744 });
  const sideDockPreset = getGridPreset(null, "tablet", { width: 883, height: 682 });
  const bottomDockPreset = getGridPreset(null, "tablet", { width: 1093, height: 565 });

  assert.deepEqual(
    {
      columns: hostLikePreset.columns,
      rows: hostLikePreset.rows,
    },
    { columns: 11, rows: 6 },
  );
  assert.deepEqual(
    {
      columns: sideDockPreset.columns,
      rows: sideDockPreset.rows,
    },
    { columns: 10, rows: 6 },
  );
  assert.deepEqual(
    {
      columns: bottomDockPreset.columns,
      rows: bottomDockPreset.rows,
    },
    { columns: 11, rows: 6 },
  );
  assert.equal(hostLikePreset.density, "tablet-landscape-adaptive");
  assert.equal(sideDockPreset.density, "tablet-landscape-adaptive");
  assert.equal(bottomDockPreset.density, "tablet-landscape-adaptive");
  assert.ok(bottomDockPreset.columns >= sideDockPreset.columns);
  assert.ok(bottomDockPreset.rows <= sideDockPreset.rows);
});

test("layout preset without a measured rect still returns the preferred direct matrix", () => {
  assert.deepEqual(
    {
      columns: getGridPresetForLayout("tablet", "landscape").columns,
      rows: getGridPresetForLayout("tablet", "landscape").rows,
    },
    { columns: 10, rows: 6 },
  );
  assert.deepEqual(
    {
      columns: getGridPresetForLayout("tablet", "portrait").columns,
      rows: getGridPresetForLayout("tablet", "portrait").rows,
    },
    { columns: 8, rows: 12 },
  );
});

test("grid preset can adapt inside the documented bounds when the available rect is constrained", () => {
  const roomyTablet = getGridPreset(null, "tablet", { width: 1133, height: 744 });
  const constrainedTablet = getGridPreset(null, "tablet", { width: 720, height: 520 });

  assert.deepEqual(
    { columns: roomyTablet.columns, rows: roomyTablet.rows },
    { columns: 11, rows: 6 },
  );
  assert.deepEqual(
    { columns: constrainedTablet.columns, rows: constrainedTablet.rows },
    { columns: 10, rows: 6 },
  );
  assert.equal(constrainedTablet.minColumns, 10);
  assert.equal(constrainedTablet.maxColumns, 10);
  assert.equal(constrainedTablet.minRows, 6);
  assert.equal(constrainedTablet.maxRows, 6);
});

test("tablet density profiles split width and height bands before the solver runs", () => {
  const side = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 883, height: 682 },
  );
  const bottom = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 1093, height: 565 },
  );
  const roomy = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 1133, height: 744 },
  );
  const largeTablet = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 1621, height: 926 },
  );
  const desktop13 = resolveGridDensityProfileConstraints(
    "desktop",
    "landscape",
    { width: 1280, height: 760 },
  );

  assert.deepEqual(
    {
      preferredColumns: side.preferredColumns,
      minColumns: side.minColumns,
      maxColumns: side.maxColumns,
      preferredRows: side.preferredRows,
      minRows: side.minRows,
      maxRows: side.maxRows,
    },
    {
      preferredColumns: 10,
      minColumns: 10,
      maxColumns: 10,
      preferredRows: 6,
      minRows: 6,
      maxRows: 6,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: bottom.preferredColumns,
      minColumns: bottom.minColumns,
      maxColumns: bottom.maxColumns,
      preferredRows: bottom.preferredRows,
      minRows: bottom.minRows,
      maxRows: bottom.maxRows,
    },
    {
      preferredColumns: 11,
      minColumns: 10,
      maxColumns: 11,
      preferredRows: 6,
      minRows: 6,
      maxRows: 6,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: roomy.preferredColumns,
      minColumns: roomy.minColumns,
      maxColumns: roomy.maxColumns,
      preferredRows: roomy.preferredRows,
      minRows: roomy.minRows,
      maxRows: roomy.maxRows,
    },
    {
      preferredColumns: 11,
      minColumns: 10,
      maxColumns: 11,
      preferredRows: 6,
      minRows: 6,
      maxRows: 6,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: largeTablet.preferredColumns,
      minColumns: largeTablet.minColumns,
      maxColumns: largeTablet.maxColumns,
      preferredRows: largeTablet.preferredRows,
      minRows: largeTablet.minRows,
      maxRows: largeTablet.maxRows,
    },
    {
      preferredColumns: 14,
      minColumns: 12,
      maxColumns: 14,
      preferredRows: 8,
      minRows: 6,
      maxRows: 8,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: desktop13.preferredColumns,
      minColumns: desktop13.minColumns,
      maxColumns: desktop13.maxColumns,
      preferredRows: desktop13.preferredRows,
      minRows: desktop13.minRows,
      maxRows: desktop13.maxRows,
    },
    {
      preferredColumns: 14,
      minColumns: 14,
      maxColumns: 14,
      preferredRows: 8,
      minRows: 6,
      maxRows: 8,
    },
  );
});

test("density solver treats legacy preset columns and rows as preferences, not rigid values", () => {
  const constraints = {
    minCell: 70,
    targetCell: 75,
    maxCell: 80,
    minColumns: 10,
    maxColumns: 12,
    minRows: 6,
    maxRows: 8,
    preferredColumns: 10,
    preferredRows: 6,
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
    { columns: 10, rows: 8 },
  );
  assert.deepEqual(
    { columns: adapted.columns, rows: adapted.rows },
    { columns: 10, rows: 6 },
  );
});

test("matrix solver can trade columns and rows together to stay near the target cell size", () => {
  const constraints = {
    minCell: 70,
    targetCell: 75,
    maxCell: 80,
    minColumns: 10,
    maxColumns: 12,
    minRows: 6,
    maxRows: 8,
    preferredColumns: 10,
    preferredRows: 6,
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

  assert.equal(tallerRect.columns, 10);
  assert.equal(shorterRect.columns, 10);
  assert.equal(tallerRect.rows, 8);
  assert.equal(shorterRect.rows, 7);
});

test("matrix solver only adds columns on wider tablet rects when the cell size stays comfortable", () => {
  const constraints = {
    minCell: 70,
    targetCell: 75,
    maxCell: 80,
    minColumns: 12,
    maxColumns: 14,
    minRows: 6,
    maxRows: 10,
    preferredColumns: 14,
    preferredRows: 8,
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

  assert.equal(widerRect.rows, 7);
  assert.equal(narrowerRect.rows, 7);
  assert.equal(widerRect.columns, 14);
  assert.equal(narrowerRect.columns, 12);
});
