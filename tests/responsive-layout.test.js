import test from "node:test";
import assert from "node:assert/strict";
import {
  getLayoutForWidth,
  RESPONSIVE_BREAKPOINTS,
} from "../src/layout/responsive.js";
import {
  getGridPreset,
  logicalSizeToWidgetSize,
  normalizeWidgetSize,
  widgetSizeToLogicalSize,
} from "../src/layout/layout-engine.js";

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
