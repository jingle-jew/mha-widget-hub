import test from "node:test";
import assert from "node:assert/strict";

import {
  createDefaultOverviewPageConfig,
  getAllowedOverviewVariants,
  moveOverviewItem,
  normalizeOverviewPageConfig,
  orderOverviewAreas,
  orderOverviewEntities,
  OVERVIEW_VARIANTS,
  reconcileOverviewPageConfig,
  setOverviewItemHidden,
  updateOverviewAreaConfig,
} from "../src/pages/overview-page-config.js";

const areas = [
  {
    id: "living_room",
    name: "Living room",
    entities: [
      { entityId: "light.floor_lamp", domain: "light" },
      { entityId: "media_player.television", domain: "media_player" },
    ],
  },
  {
    id: "kitchen",
    name: "Kitchen",
    entities: [
      { entityId: "button.coffee", domain: "button" },
      { entityId: "switch.counter", domain: "switch" },
    ],
  },
];

test("overview config exposes a neutral versionable default", () => {
  assert.deepEqual(createDefaultOverviewPageConfig(), {
    inactivitySeconds: 15,
    roomOrder: [],
    hiddenRoomIds: [],
    areas: {},
  });
});

test("overview config normalization repairs arrays, duplicates, and invalid variants", () => {
  assert.deepEqual(normalizeOverviewPageConfig({
    inactivitySeconds: 2,
    areaOrder: ["kitchen", "kitchen", "", null],
    hiddenAreaIds: ["garage", "garage"],
    areas: {
      kitchen: {
        entityOrder: ["switch.counter", "switch.counter", ""],
        hiddenEntityIds: ["switch.counter", "switch.counter"],
        variants: {
          "switch.counter": "invalid",
          "button.coffee": "button-2x1",
        },
      },
    },
  }), {
    inactivitySeconds: 10,
    roomOrder: ["kitchen"],
    hiddenRoomIds: ["garage"],
    areas: {
      kitchen: {
        entityOrder: ["switch.counter"],
        hiddenEntityIds: ["switch.counter"],
        variants: {
          "button.coffee": "button-2x1",
        },
        deviceWidgets: [],
        deviceWidgetsConfigured: false,
        removedEntityIds: ["switch.counter"],
      },
    },
  });
});

test("overview reconciliation preserves stale ids and appends new rooms and entities", () => {
  const reconciled = reconcileOverviewPageConfig({
    roomOrder: ["missing_room", "kitchen"],
    hiddenRoomIds: ["garage"],
    areas: {
      kitchen: {
        entityOrder: ["switch.removed", "switch.counter"],
        hiddenEntityIds: ["switch.removed"],
        variants: {
          "switch.counter": OVERVIEW_VARIANTS.BUTTON,
        },
      },
    },
  }, areas);

  assert.deepEqual(reconciled.roomOrder, ["missing_room", "kitchen", "living_room"]);
  assert.deepEqual(reconciled.areas.kitchen.entityOrder, [
    "switch.removed",
    "switch.counter",
    "button.coffee",
  ]);
  assert.equal(reconciled.areas.kitchen.variants["switch.counter"], OVERVIEW_VARIANTS.BUTTON);
  assert.equal(reconciled.areas.kitchen.variants["button.coffee"], OVERVIEW_VARIANTS.BUTTON);
  assert.equal(reconciled.areas.living_room.variants["light.floor_lamp"], OVERVIEW_VARIANTS.TOGGLE);
  assert.equal(reconciled.areas.living_room.variants["media_player.television"], OVERVIEW_VARIANTS.MEDIA_COMPACT);
});

test("overview ordering follows persisted ids while ignoring currently missing entries", () => {
  const config = reconcileOverviewPageConfig({
    roomOrder: ["kitchen", "missing", "living_room"],
    areas: {
      kitchen: {
        entityOrder: ["switch.counter", "button.coffee"],
      },
    },
  }, areas);

  assert.deepEqual(orderOverviewAreas(areas, config).map(area => area.id), ["kitchen", "living_room"]);
  assert.deepEqual(
    orderOverviewEntities(areas[1], config).map(entity => entity.entityId),
    ["switch.counter", "button.coffee"],
  );
});

test("overview variant mapping is restricted by entity domain", () => {
  assert.deepEqual(getAllowedOverviewVariants("light"), ["toggle-4x1", "button-2x1"]);
  assert.deepEqual(getAllowedOverviewVariants("switch"), ["toggle-4x1", "button-2x1"]);
  assert.deepEqual(getAllowedOverviewVariants("input_boolean"), ["toggle-4x1", "button-2x1"]);
  assert.deepEqual(getAllowedOverviewVariants("button"), ["button-2x1"]);
  assert.deepEqual(getAllowedOverviewVariants("media_player"), ["media-2x2", "media-4x2"]);
  assert.deepEqual(getAllowedOverviewVariants("sensor"), []);
});

test("overview local ordering and visibility helpers are isolated immutable updates", () => {
  const order = ["one", "two", "three"];
  assert.deepEqual(moveOverviewItem(order, "two", -1), ["two", "one", "three"]);
  assert.deepEqual(moveOverviewItem(order, "two", 1), ["one", "three", "two"]);
  assert.deepEqual(moveOverviewItem(order, "one", -1), order);
  assert.deepEqual(
    moveOverviewItem(["one", "stale", "two"], "two", -1, ["one", "two"]),
    ["two", "stale", "one"],
  );
  assert.deepEqual(setOverviewItemHidden(["one"], "two", true), ["one", "two"]);
  assert.deepEqual(setOverviewItemHidden(["one", "two"], "one", false), ["two"]);
  assert.deepEqual(order, ["one", "two", "three"]);
});

test("updating one room configuration leaves every other room untouched", () => {
  const source = reconcileOverviewPageConfig({}, areas);
  const next = updateOverviewAreaConfig(source, "kitchen", current => ({
    ...current,
    hiddenEntityIds: ["switch.counter"],
  }));

  assert.notEqual(next, source);
  assert.deepEqual(next.areas.kitchen.hiddenEntityIds, ["switch.counter"]);
  assert.deepEqual(next.areas.living_room, source.areas.living_room);
  assert.deepEqual(source.areas.kitchen.hiddenEntityIds, []);
});
