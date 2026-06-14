import test from "node:test";
import assert from "node:assert/strict";
import {
  createPlacementController,
} from "../src/layout/placement-controller.js";

const widget = (id, w = 2, h = 2) => ({
  id,
  kind: "empty",
  w,
  h,
});

function createHarness({
  widgets = [widget("active")],
  positions = { active: { x: 1, y: 1 } },
  units = 6,
  rowUnits = 4,
  mobile = false,
  movable = true,
} = {}) {
  const effects = [];
  let activeMoveWidgetId = "active";
  const controller = createPlacementController({
    getWidgets: () => widgets,
    getPositions: () => positions,
    getGridBounds: () => ({ units, rowUnits }),
    isMobileLayout: () => mobile,
    canMoveWidget: id => movable && activeMoveWidgetId === id,
    savePositions: next => effects.push(["save", structuredClone(next)]),
    applyPositions: next => effects.push(["apply", structuredClone(next)]),
    applySinglePosition: detail => effects.push(["applySingle", detail]),
    setActiveMoveWidgetId: id => {
      activeMoveWidgetId = id;
      effects.push(["setActive", id]);
    },
    refreshDropSlots: () => effects.push(["refreshDropSlots"]),
    syncEditMode: () => effects.push(["syncEditMode"]),
    scheduleLayoutSync: () => effects.push(["scheduleLayout"]),
    syncDropSlots: () => effects.push(["syncDropSlots"]),
  });

  return {
    controller,
    effects,
    getActiveMoveWidgetId: () => activeMoveWidgetId,
  };
}

test("empty directional moves update one widget and preserve effect order", () => {
  const positions = { active: { x: 1, y: 1 } };
  const harness = createHarness({ positions });

  assert.equal(harness.controller.moveByDirection("active", "right"), true);
  assert.deepEqual(positions.active, { x: 2, y: 1 });
  assert.deepEqual(harness.effects, [
    ["save", { active: { x: 2, y: 1 } }],
    [
      "applySingle",
      {
        widgetId: "active",
        position: { x: 2, y: 1 },
        width: 2,
        height: 2,
      },
    ],
    ["scheduleLayout"],
    ["syncDropSlots"],
  ]);
});

test("directional moves reject inactive widgets and desktop boundaries", () => {
  const inactive = createHarness({ movable: false });
  assert.equal(
    inactive.controller.moveByDirection("active", "right"),
    false,
  );
  assert.deepEqual(inactive.effects, []);

  const boundary = createHarness({
    positions: { active: { x: 1, y: 1 } },
    units: 2,
    rowUnits: 2,
  });
  assert.equal(boundary.controller.moveByDirection("active", "up"), false);
  assert.deepEqual(boundary.effects, []);
});

test("mobile directional moves can continue below configured rows", () => {
  const positions = { active: { x: 1, y: 2 } };
  const harness = createHarness({
    positions,
    units: 2,
    rowUnits: 2,
    mobile: true,
  });

  assert.equal(harness.controller.moveByDirection("active", "down"), true);
  assert.deepEqual(positions.active, { x: 1, y: 3 });
});

test("a direct neighbor swap persists and applies the complete position map", () => {
  const widgets = [widget("active"), widget("neighbor")];
  const positions = {
    active: { x: 1, y: 1 },
    neighbor: { x: 3, y: 1 },
  };
  const harness = createHarness({
    widgets,
    positions,
    units: 4,
    rowUnits: 2,
  });

  assert.equal(harness.controller.moveByDirection("active", "right"), true);
  assert.deepEqual(harness.effects, [
    [
      "save",
      {
        active: { x: 3, y: 1 },
        neighbor: { x: 1, y: 1 },
      },
    ],
    [
      "apply",
      {
        active: { x: 3, y: 1 },
        neighbor: { x: 1, y: 1 },
      },
    ],
    ["scheduleLayout"],
  ]);
});

test("an exactly filled destination swaps the complete widget group", () => {
  const widgets = [widget("active", 1, 2), widget("occupant", 1, 2)];
  const positions = {
    active: { x: 1, y: 1 },
    occupant: { x: 2, y: 1 },
  };
  const harness = createHarness({
    widgets,
    positions,
    units: 2,
    rowUnits: 2,
  });

  assert.equal(harness.controller.moveByDirection("active", "right"), true);
  assert.deepEqual(harness.effects, [
    [
      "save",
      {
        active: { x: 2, y: 1 },
        occupant: { x: 1, y: 1 },
      },
    ],
    [
      "apply",
      {
        active: { x: 2, y: 1 },
        occupant: { x: 1, y: 1 },
      },
    ],
    ["scheduleLayout"],
    ["syncDropSlots"],
  ]);
});

test("drop-slot moves finish move mode after persistence", () => {
  const positions = { active: { x: 1, y: 1 } };
  const harness = createHarness({ positions });

  assert.equal(harness.controller.moveToDropSlot("active", 3, 1), true);
  assert.equal(harness.getActiveMoveWidgetId(), "");
  assert.deepEqual(harness.effects, [
    ["save", { active: { x: 3, y: 1 } }],
    ["setActive", ""],
    ["apply", { active: { x: 3, y: 1 } }],
    ["refreshDropSlots"],
    ["syncEditMode"],
    ["scheduleLayout"],
  ]);
});

test("invalid drop-slot moves do not trigger callbacks", () => {
  const harness = createHarness({
    units: 2,
    rowUnits: 2,
  });

  assert.equal(harness.controller.moveToDropSlot("active", 2, 1), false);
  assert.deepEqual(harness.effects, []);
  assert.equal(harness.getActiveMoveWidgetId(), "active");
});
