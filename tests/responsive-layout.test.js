import test from "node:test";
import assert from "node:assert/strict";
import {
  getLayoutForWidth,
  RESPONSIVE_BREAKPOINTS,
} from "../src/layout/responsive.js";
import {
  computeResponsiveState,
  getGridPreset,
  getGridPresetForLayout,
  getLayoutMode,
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

test("requested layout mode ignores the published resolved layout dataset", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    documentElement: {
      dataset: {
        layoutMode: "auto",
        layout: "desktop",
      },
    },
  };

  try {
    assert.equal(
      getLayoutMode({
        dataset: {
          layout: "mobile",
        },
      }),
      "auto",
    );
  } finally {
    globalThis.document = previousDocument;
  }
});

test("responsive state formalizes mobile landscape as a distinct variant", () => {
  const state = computeResponsiveState({
    layoutMode: "auto",
    viewportMetrics: { width: 844, height: 390 },
    dockPosition: "bottom",
    statusBarMode: "top-bar",
  });

  assert.equal(state.layout, "mobile");
  assert.equal(state.layoutVariant, "mobile-landscape");
  assert.equal(state.dockFamily, "side");
  assert.equal(state.dockPosition, "left");
  assert.equal(state.statusBarVisible, false);
  assert.equal(state.gridPreset.columns, 8);
  assert.equal(state.scrollModel, "widget-area");
  assert.equal(state.settingsCapabilities.supportsDockPosition, false);
  assert.equal(state.settingsCapabilities.showsStatusBarOptions, false);
});

test("responsive state keeps mobile landscape active even below the tablet width breakpoint", () => {
  const state = computeResponsiveState({
    layoutMode: "auto",
    viewportMetrics: { width: 740, height: 360 },
    dockPosition: "bottom",
    statusBarMode: "top-bar",
  });

  assert.equal(state.layout, "mobile");
  assert.equal(state.layoutVariant, "mobile-landscape");
  assert.equal(state.dockFamily, "side");
  assert.equal(state.dockPosition, "left");
  assert.equal(state.statusBarVisible, false);
});

test("responsive state keeps tablet landscape intact when the viewport is not phone-short", () => {
  const state = computeResponsiveState({
    layoutMode: "auto",
    viewportMetrics: { width: 1024, height: 600 },
    dockPosition: "left",
    statusBarMode: "top-bar",
  });

  assert.equal(state.layout, "tablet");
  assert.equal(state.layoutVariant, "tablet-landscape");
  assert.equal(state.dockFamily, "side");
  assert.equal(state.statusBarVisible, true);
});

test("responsive state hides the default desktop status bar until the user picks a mode", () => {
  const state = computeResponsiveState({
    layoutMode: "auto",
    viewportMetrics: { width: 1440, height: 900 },
    dockPosition: "left",
    statusBarMode: "top-bar",
    hasPersistedStatusBarMode: false,
  });

  assert.equal(state.layout, "desktop");
  assert.equal(state.effectiveStatusBarMode, "hidden");
  assert.equal(state.statusBarVisible, false);
});

test("responsive state preserves the desktop status bar once the user preference is persisted", () => {
  const state = computeResponsiveState({
    layoutMode: "auto",
    viewportMetrics: { width: 1440, height: 900 },
    dockPosition: "left",
    statusBarMode: "top-bar",
    hasPersistedStatusBarMode: true,
  });

  assert.equal(state.layout, "desktop");
  assert.equal(state.effectiveStatusBarMode, "top-bar");
  assert.equal(state.statusBarVisible, true);
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

test("tablet landscape presets adapt their direct widget-grid matrix to the measured panel rect and dock family", () => {
  const hostLikePreset = getGridPreset(null, "tablet", { width: 1133, height: 744 });
  const sideDockPreset = getGridPreset(null, "tablet", {
    width: 822,
    height: 693,
    dockPosition: "left",
  });
  const bottomDockPreset = getGridPreset(null, "tablet", {
    width: 1093,
    height: 565,
    dockPosition: "bottom",
  });
  const largeBottomDockPreset = getGridPreset(null, "tablet", {
    width: 1330,
    height: 821,
    dockPosition: "bottom",
  });

  assert.deepEqual(
    {
      columns: hostLikePreset.columns,
      rows: hostLikePreset.rows,
    },
    { columns: 11, rows: 10 },
  );
  assert.deepEqual(
    {
      columns: sideDockPreset.columns,
      rows: sideDockPreset.rows,
    },
    { columns: 11, rows: 8 },
  );
  assert.deepEqual(
    {
      columns: bottomDockPreset.columns,
      rows: bottomDockPreset.rows,
    },
    { columns: 11, rows: 6 },
  );
  assert.deepEqual(
    {
      columns: largeBottomDockPreset.columns,
      rows: largeBottomDockPreset.rows,
    },
    { columns: 12, rows: 8 },
  );
  assert.equal(hostLikePreset.density, "tablet-landscape-adaptive");
  assert.equal(sideDockPreset.density, "tablet-landscape-adaptive");
  assert.equal(bottomDockPreset.density, "tablet-landscape-adaptive");
  assert.equal(largeBottomDockPreset.density, "tablet-landscape-adaptive");
  assert.ok(hostLikePreset.columns >= sideDockPreset.columns);
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
    { columns: 11, rows: 10 },
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

test("tablet landscape preset prefers one more row when a side panel would otherwise leave a large vertical gap", () => {
  const compactSidePanel = getGridPreset(null, "tablet", {
    width: 822,
    height: 693,
    dockPosition: "left",
  });

  assert.deepEqual(
    { columns: compactSidePanel.columns, rows: compactSidePanel.rows },
    { columns: 11, rows: 8 },
  );
});

test("tablet density profiles split width/height by dock family before the solver runs", () => {
  const compactSide = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 822, height: 693, dockPosition: "left" },
  );
  const mediumSide = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 975, height: 753, dockPosition: "left" },
  );
  const mediumBottom = resolveGridDensityProfileConstraints(
    "tablet",
    "landscape",
    { width: 975, height: 753, dockPosition: "bottom" },
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
      preferredColumns: compactSide.preferredColumns,
      minColumns: compactSide.minColumns,
      maxColumns: compactSide.maxColumns,
      preferredRows: compactSide.preferredRows,
      minRows: compactSide.minRows,
      maxRows: compactSide.maxRows,
      estimatedColumnGap: compactSide.estimatedColumnGap,
      estimatedRowGap: compactSide.estimatedRowGap,
      estimatedPaddingX: compactSide.estimatedPaddingX,
      estimatedPaddingY: compactSide.estimatedPaddingY,
      minCellWidthAbsolute: compactSide.minCellWidthAbsolute,
      minCellHeightAbsolute: compactSide.minCellHeightAbsolute,
      minCellHeightComfort: compactSide.minCellHeightComfort,
    },
    {
      preferredColumns: 11,
      minColumns: 11,
      maxColumns: 11,
      preferredRows: 8,
      minRows: 8,
      maxRows: 8,
      estimatedColumnGap: 12,
      estimatedRowGap: 12,
      estimatedPaddingX: 14,
      estimatedPaddingY: 14,
      minCellWidthAbsolute: 82,
      minCellHeightAbsolute: 82,
      minCellHeightComfort: 70,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: mediumSide.preferredColumns,
      minColumns: mediumSide.minColumns,
      maxColumns: mediumSide.maxColumns,
      preferredRows: mediumSide.preferredRows,
      minRows: mediumSide.minRows,
      maxRows: mediumSide.maxRows,
      minCellWidthAbsolute: mediumSide.minCellWidthAbsolute,
      minCellHeightAbsolute: mediumSide.minCellHeightAbsolute,
      minCellHeightComfort: mediumSide.minCellHeightComfort,
    },
    {
      preferredColumns: 11,
      minColumns: 11,
      maxColumns: 11,
      preferredRows: 8,
      minRows: 8,
      maxRows: 8,
      minCellWidthAbsolute: 82,
      minCellHeightAbsolute: 82,
      minCellHeightComfort: 79,
    },
  );
  assert.deepEqual(
    {
      preferredColumns: mediumBottom.preferredColumns,
      minColumns: mediumBottom.minColumns,
      maxColumns: mediumBottom.maxColumns,
      preferredRows: mediumBottom.preferredRows,
      minRows: mediumBottom.minRows,
      maxRows: mediumBottom.maxRows,
      minCellWidthAbsolute: mediumBottom.minCellWidthAbsolute,
      minCellHeightAbsolute: mediumBottom.minCellHeightAbsolute,
    },
    {
      preferredColumns: 11,
      minColumns: 10,
      maxColumns: 11,
      preferredRows: 8,
      minRows: 7,
      maxRows: 10,
      minCellWidthAbsolute: 82,
      minCellHeightAbsolute: 82,
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
      preferredRows: 10,
      minRows: 8,
      maxRows: 12,
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

test("matrix solver accounts for estimated track overhead before adding another side-dock row", () => {
  const constraints = {
    minCell: 70,
    targetCell: 75,
    maxCell: 80,
    minColumns: 10,
    maxColumns: 10,
    minRows: 7,
    maxRows: 10,
    preferredColumns: 10,
    preferredRows: 8,
    fillX: 0.88,
    fillY: 0.76,
    preferencePenaltyFactor: 0.06,
    unusedSpacePenaltyFactor: 0.9,
  };

  const optimistic = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 975, height: 753, dockPosition: "left" },
  });
  const corrected = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints: {
      ...constraints,
      estimatedColumnGap: 12,
      estimatedRowGap: 12,
      estimatedPaddingX: 14,
      estimatedPaddingY: 14,
    },
    availableContentRect: { width: 975, height: 753, dockPosition: "left" },
  });

  assert.equal(optimistic.columns, 10);
  assert.equal(optimistic.rows, 10);
  assert.equal(corrected.columns, 10);
  assert.equal(corrected.rows, 9);
});

test("matrix solver rejects side-dock candidates that fall under the absolute 82px track envelope", () => {
  const constraints = {
    minCell: 70,
    targetCell: 75,
    maxCell: 80,
    minColumns: 10,
    maxColumns: 10,
    minRows: 8,
    maxRows: 10,
    preferredColumns: 10,
    preferredRows: 8,
    fillX: 0.88,
    fillY: 0.76,
    preferencePenaltyFactor: 0.06,
    unusedSpacePenaltyFactor: 0.9,
    estimatedColumnGap: 12,
    estimatedRowGap: 12,
    estimatedPaddingX: 14,
    estimatedPaddingY: 14,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    minCellWidthComfort: 82,
    minCellHeightComfort: 79,
    idealCellWidth: 90,
    idealCellHeight: 86,
    idealCellRatio: 1,
    minCellRatioComfort: 0.92,
    maxCellRatioComfort: 1.12,
    minCellRatioAbsolute: 0.82,
    maxCellRatioAbsolute: 1.2,
    idealPenaltyFactor: 0.48,
    comfortPenaltyFactor: 0.72,
    ratioPenaltyFactor: 0.35,
    densityPenaltyFactor: 0.6,
  };

  const dense11 = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints,
    availableContentRect: { width: 975, height: 753, dockPosition: "left" },
  });
  const dense13 = resolveGridDensity({
    layout: "tablet",
    orientation: "landscape",
    constraints: {
      ...constraints,
      minRows: 9,
      maxRows: 12,
      preferredRows: 10,
    },
    availableContentRect: { width: 1121, height: 937, dockPosition: "left" },
  });

  assert.deepEqual(
    { columns: dense11.columns, rows: dense11.rows },
    { columns: 10, rows: 8 },
  );
  assert.deepEqual(
    { columns: dense13.columns, rows: dense13.rows },
    { columns: 10, rows: 9 },
  );
});

test("tablet bottom dock also rejects candidates that would fall under the absolute 82px track envelope", () => {
  const mediumBottom = getGridPreset(null, "tablet", {
    width: 1140,
    height: 633,
    dockPosition: "bottom",
  });
  const largeBottom = getGridPreset(null, "tablet", {
    width: 1330,
    height: 821,
    dockPosition: "bottom",
  });

  assert.deepEqual(
    { columns: mediumBottom.columns, rows: mediumBottom.rows },
    { columns: 11, rows: 6 },
  );
  assert.deepEqual(
    { columns: largeBottom.columns, rows: largeBottom.rows },
    { columns: 12, rows: 8 },
  );
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
