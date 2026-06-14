import test from "node:test";
import assert from "node:assert/strict";
import {
  doesWidgetLayoutFitGrid,
  findWidgetAtCandidatePosition,
  getAdjacentWidgetGroupInDirection,
  getAvailableDropSlotsForCandidate,
  getDirectNeighborInDirection,
  hasNoWidgetOverlaps,
  packTranslatedSwapBand,
  packWidgets,
} from "../src/layout/placement-calculations.js";

const widget = (id, w = 2, h = 2) => ({
  id,
  kind: "empty",
  w,
  h,
});

test("packing uses the first available cell in row-major order", () => {
  assert.deepEqual(
    packWidgets(
      [widget("a", 2, 1), widget("b", 1, 2), widget("c", 1, 1)],
      3,
      2,
    ),
    {
      a: { x: 1, y: 1 },
      b: { x: 3, y: 1 },
      c: { x: 1, y: 2 },
    },
  );
});

test("packing respects desktop rows and can continue on mobile", () => {
  const widgets = [widget("a", 2, 2), widget("b", 2, 2)];

  assert.equal(packWidgets(widgets, 2, 2), null);
  assert.deepEqual(
    packWidgets(widgets, 2, 2, { allowUnboundedRows: true }),
    {
      a: { x: 1, y: 1 },
      b: { x: 1, y: 3 },
    },
  );
});

test("candidate lookup and overlap validation ignore missing positions", () => {
  const widgets = [widget("moving"), widget("occupied"), widget("unplaced")];
  const positions = {
    moving: { x: 1, y: 1 },
    occupied: { x: 3, y: 1 },
  };

  assert.equal(
    findWidgetAtCandidatePosition(
      widgets,
      "moving",
      { x: 2, y: 1, w: 2, h: 2 },
      positions,
      6,
    )?.id,
    "occupied",
  );
  assert.equal(hasNoWidgetOverlaps(widgets, positions, 6), true);
  assert.equal(
    hasNoWidgetOverlaps(
      widgets,
      { ...positions, occupied: { x: 2, y: 1 } },
      6,
    ),
    false,
  );
});

test("adjacent groups expand through widgets that touch the nearest group", () => {
  const widgets = [
    widget("active", 2, 2),
    widget("top", 2, 1),
    widget("bottom", 2, 1),
    widget("far", 1, 2),
  ];
  const positions = {
    active: { x: 1, y: 1 },
    top: { x: 3, y: 1 },
    bottom: { x: 3, y: 2 },
    far: { x: 6, y: 1 },
  };

  assert.deepEqual(
    getAdjacentWidgetGroupInDirection(
      widgets,
      "active",
      "right",
      positions,
      8,
    ).map(item => item.id),
    ["top", "bottom"],
  );
});

test("direct neighbors prefer the closest widget in the movement band", () => {
  const widgets = [
    widget("active"),
    widget("near"),
    widget("far"),
    widget("outside"),
  ];
  const positions = {
    active: { x: 1, y: 1 },
    near: { x: 4, y: 1 },
    far: { x: 7, y: 1 },
    outside: { x: 3, y: 4 },
  };

  assert.equal(
    getDirectNeighborInDirection(
      widgets,
      "active",
      "right",
      positions,
      10,
    )?.widget.id,
    "near",
  );
});

test("translated band packing preserves a valid contiguous band", () => {
  const widgets = [
    widget("active", 2, 2),
    widget("middle", 1, 2),
    widget("end", 1, 2),
  ];
  const positions = {
    active: { x: 1, y: 1 },
    middle: { x: 3, y: 1 },
    end: { x: 4, y: 1 },
  };

  assert.deepEqual(
    packTranslatedSwapBand(
      widgets,
      "active",
      [widgets[1], widgets[2]],
      "right",
      positions,
      4,
      2,
    ),
    positions,
  );
});

test("drop slots exclude occupied cells and the widget current position", () => {
  const existing = widget("existing", 2, 1);
  const moving = widget("moving", 2, 1);
  const widgets = [existing, moving];
  const positions = {
    existing: { x: 1, y: 1 },
    moving: { x: 3, y: 1 },
  };

  assert.deepEqual(
    getAvailableDropSlotsForCandidate(
      widgets,
      moving,
      positions,
      positions.moving,
      4,
      2,
    ),
    [
      { x: 1, y: 2, w: 2, h: 1 },
      { x: 2, y: 2, w: 2, h: 1 },
      { x: 3, y: 2, w: 2, h: 1 },
    ],
  );
});

test("layout fit reports whether first-fit packing can contain all widgets", () => {
  assert.equal(
    doesWidgetLayoutFitGrid(
      [widget("a", 2, 2), widget("b", 2, 2)],
      4,
      2,
    ),
    true,
  );
  assert.equal(
    doesWidgetLayoutFitGrid(
      [widget("a", 2, 2), widget("b", 2, 2), widget("c", 1, 1)],
      4,
      2,
    ),
    false,
  );
});
