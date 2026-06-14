import test from "node:test";
import assert from "node:assert/strict";
import {
  doesWidgetGroupExactlyFillRect,
  getGroupBoundingRect,
  getWidgetRectFromPosition,
  getWidgetsInCandidateRect,
  isGroupInternallyValid,
  isPositionMapValidForWidgets,
  rectsOverlap,
  translateWidgetGroupPositions,
} from "../src/layout/placement-geometry.js";

const widget = (id, w = 2, h = 2) => ({
  id,
  kind: "empty",
  w,
  h,
});

test("rectangle collisions exclude edges that only touch", () => {
  assert.equal(
    rectsOverlap(
      { x: 1, y: 1, w: 2, h: 2 },
      { x: 2, y: 2, w: 2, h: 2 },
    ),
    true,
  );
  assert.equal(
    rectsOverlap(
      { x: 1, y: 1, w: 2, h: 2 },
      { x: 3, y: 1, w: 2, h: 2 },
    ),
    false,
  );
});

test("widget rectangles preserve normalized sizes and clamp width to the grid", () => {
  assert.deepEqual(
    getWidgetRectFromPosition(widget("wide", 6, 2), { x: 2, y: 3 }, 4),
    { x: 2, y: 3, w: 4, h: 2 },
  );
});

test("candidate lookup ignores the moving widget and returns collisions", () => {
  const widgets = [widget("moving"), widget("occupied"), widget("far")];
  const positions = {
    moving: { x: 1, y: 1 },
    occupied: { x: 3, y: 1 },
    far: { x: 5, y: 1 },
  };

  assert.deepEqual(
    getWidgetsInCandidateRect(
      widgets,
      "moving",
      { x: 2, y: 1, w: 2, h: 2 },
      positions,
      8,
    ).map(item => item.id),
    ["occupied"],
  );
});

test("a widget group must cover every target cell exactly once", () => {
  const widgets = [widget("left"), widget("right")];
  const positions = {
    left: { x: 1, y: 1 },
    right: { x: 3, y: 1 },
  };
  const target = { x: 1, y: 1, w: 4, h: 2 };

  assert.equal(
    doesWidgetGroupExactlyFillRect(widgets, target, positions, 8),
    true,
  );
  assert.equal(
    doesWidgetGroupExactlyFillRect(
      widgets,
      target,
      { ...positions, right: { x: 4, y: 1 } },
      8,
    ),
    false,
  );
});

test("group translation returns a new position map with the same offsets", () => {
  const group = [widget("a"), widget("b")];
  const positions = {
    a: { x: 3, y: 1 },
    b: { x: 3, y: 3 },
    untouched: { x: 7, y: 1 },
  };

  const translated = translateWidgetGroupPositions(
    group,
    { x: 3, y: 1 },
    { x: 1, y: 3 },
    positions,
  );

  assert.deepEqual(translated, {
    a: { x: 1, y: 3 },
    b: { x: 1, y: 5 },
    untouched: { x: 7, y: 1 },
  });
  assert.notEqual(translated, positions);
});

test("group bounds and internal collision checks share the same geometry", () => {
  const group = [widget("a"), widget("b")];
  const positions = {
    a: { x: 2, y: 2 },
    b: { x: 4, y: 3 },
  };

  assert.deepEqual(getGroupBoundingRect(group, positions, 8), {
    x: 2,
    y: 2,
    w: 4,
    h: 3,
  });
  assert.equal(isGroupInternallyValid(group, positions, 8), true);
  assert.equal(
    isGroupInternallyValid(
      group,
      { ...positions, b: { x: 3, y: 2 } },
      8,
    ),
    false,
  );
});

test("position maps reject missing, overlapping and out-of-bounds widgets", () => {
  const widgets = [widget("a"), widget("b")];

  assert.equal(
    isPositionMapValidForWidgets(
      { a: { x: 1, y: 1 }, b: { x: 3, y: 1 } },
      widgets,
      4,
      2,
    ),
    true,
  );
  assert.equal(
    isPositionMapValidForWidgets(
      { a: { x: 1, y: 1 } },
      widgets,
      4,
      2,
    ),
    false,
  );
  assert.equal(
    isPositionMapValidForWidgets(
      { a: { x: 1, y: 1 }, b: { x: 2, y: 1 } },
      widgets,
      4,
      2,
    ),
    false,
  );
  assert.equal(
    isPositionMapValidForWidgets(
      { a: { x: 1, y: 1 }, b: { x: 3, y: 3 } },
      widgets,
      4,
      2,
    ),
    false,
  );
  assert.equal(
    isPositionMapValidForWidgets(
      { a: { x: 1, y: 1 }, b: { x: 3, y: 3 } },
      widgets,
      4,
      2,
      { allowUnboundedRows: true },
    ),
    true,
  );
});
