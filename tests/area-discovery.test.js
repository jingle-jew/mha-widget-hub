import test from "node:test";
import assert from "node:assert/strict";

import {
  AREA_REGISTRY_COMMANDS,
  buildAreaDiscoveryModel,
  discoverOverviewAreas,
  invalidateAreaRegistryCache,
} from "../src/ha/area-discovery.js";

function createHass(overrides = {}) {
  const connection = {};
  const registries = {
    [AREA_REGISTRY_COMMANDS.areas]: [
      { area_id: "living", name: "Living room", icon: "mdi:sofa" },
      { area_id: "kitchen", name: "Kitchen" },
      { area_id: "empty", name: "Empty" },
    ],
    [AREA_REGISTRY_COMMANDS.devices]: [
      { id: "lamp-device", area_id: "living", name: "Lamp" },
      { id: "tv-device", area_id: "living", name: "Television" },
      { id: "orphan-device", area_id: null, name: "Orphan" },
    ],
    [AREA_REGISTRY_COMMANDS.entities]: [
      { entity_id: "light.floor", device_id: "lamp-device", area_id: null },
      { entity_id: "switch.counter", device_id: "lamp-device", area_id: "kitchen" },
      { entity_id: "button.coffee", device_id: null, area_id: "kitchen" },
      { entity_id: "media_player.tv", device_id: "tv-device", area_id: null },
      { entity_id: "sensor.temperature", device_id: "lamp-device", area_id: null },
      { entity_id: "switch.disabled", device_id: "lamp-device", disabled_by: "user" },
      { entity_id: "switch.hidden", device_id: "lamp-device", hidden_by: "user" },
      { entity_id: "switch.diagnostic", device_id: "lamp-device", entity_category: "diagnostic" },
      { entity_id: "switch.no_area", device_id: "orphan-device", area_id: null },
      { entity_id: "switch.deleted", device_id: "lamp-device", area_id: null },
    ],
  };
  const calls = [];
  const hass = {
    connection,
    user: { id: "user-1" },
    states: Object.fromEntries([
      ["light.floor", "Floor lamp"],
      ["switch.counter", "Counter"],
      ["button.coffee", "Coffee"],
      ["media_player.tv", "Television"],
      ["sensor.temperature", "Temperature"],
      ["switch.disabled", "Disabled"],
      ["switch.hidden", "Hidden"],
      ["switch.diagnostic", "Diagnostic"],
      ["switch.no_area", "No area"],
    ].map(([entityId, name]) => [entityId, {
      entity_id: entityId,
      state: "off",
      attributes: { friendly_name: name },
    }])),
    callWS: async ({ type }) => {
      calls.push(type);
      return registries[type] || [];
    },
    ...overrides,
  };
  return { hass, registries, calls };
}

test("area discovery reads all registries and caches them per HA connection", async () => {
  const { hass, calls } = createHass();
  const first = await discoverOverviewAreas({ hass });
  const second = await discoverOverviewAreas({ hass });

  assert.deepEqual(new Set(calls), new Set(Object.values(AREA_REGISTRY_COMMANDS)));
  assert.equal(calls.length, 3);
  assert.equal(first.registry, second.registry);
  assert.equal(invalidateAreaRegistryCache(hass), true);
});

test("entity area assignment prefers a direct area over the device area", async () => {
  const { hass } = createHass();
  const result = await discoverOverviewAreas({ hass });
  const living = result.areas.find(area => area.id === "living");
  const kitchen = result.areas.find(area => area.id === "kitchen");

  assert.deepEqual(living.entities.map(entity => entity.entityId), [
    "light.floor",
    "media_player.tv",
  ]);
  assert.deepEqual(kitchen.entities.map(entity => entity.entityId), [
    "button.coffee",
    "switch.counter",
  ]);
  assert.equal(kitchen.entities.find(entity => entity.entityId === "switch.counter")?.areaId, "kitchen");
});

test("area discovery keeps direct entities without devices and falls back to registry names", () => {
  const { hass, registries } = createHass();
  delete hass.states["button.coffee"].attributes.friendly_name;
  const coffeeEntry = registries[AREA_REGISTRY_COMMANDS.entities]
    .find(entry => entry.entity_id === "button.coffee");
  coffeeEntry.name = "Coffee maker";

  const areas = buildAreaDiscoveryModel(hass, {
    areas: registries[AREA_REGISTRY_COMMANDS.areas],
    devices: registries[AREA_REGISTRY_COMMANDS.devices],
    entities: registries[AREA_REGISTRY_COMMANDS.entities],
  });
  const coffee = areas.find(area => area.id === "kitchen")?.entities
    .find(entity => entity.entityId === "button.coffee");

  assert.equal(coffee?.deviceId, "");
  assert.equal(coffee?.name, "Coffee maker");
});

test("area discovery filters unsupported, stale, hidden, disabled, diagnostic, and unassigned entities", () => {
  const { hass, registries } = createHass();
  const areas = buildAreaDiscoveryModel(hass, {
    areas: registries[AREA_REGISTRY_COMMANDS.areas],
    devices: registries[AREA_REGISTRY_COMMANDS.devices],
    entities: registries[AREA_REGISTRY_COMMANDS.entities],
  });
  const ids = areas.flatMap(area => area.entities.map(entity => entity.entityId));

  assert.deepEqual(ids.sort(), [
    "button.coffee",
    "light.floor",
    "media_player.tv",
    "switch.counter",
  ]);
  assert.equal(areas.some(area => area.id === "empty"), false);
});

test("area discovery applies MHA permissions before exposing a room", async () => {
  const { hass } = createHass();
  const visibilityConfig = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          light: ["light.floor"],
          switch: [],
          button: [],
          media_player: [],
        },
      },
    },
  };
  const result = await discoverOverviewAreas({ hass, visibilityConfig });

  assert.deepEqual(result.areas.map(area => area.id), ["living"]);
  assert.deepEqual(result.areas[0].entities.map(entity => entity.entityId), ["light.floor"]);
});

test("a failed device registry still permits entities with a direct area", async () => {
  const { hass, registries } = createHass();
  hass.callWS = async ({ type }) => {
    if (type === AREA_REGISTRY_COMMANDS.devices) throw new Error("devices unavailable");
    return registries[type] || [];
  };
  const result = await discoverOverviewAreas({ hass, force: true });

  assert.equal(Boolean(result.errors.devices), true);
  assert.deepEqual(
    result.areas.flatMap(area => area.entities.map(entity => entity.entityId)).sort(),
    ["button.coffee", "switch.counter"],
  );
});

test("area discovery resolves timeouts and unavailable HA without throwing", async () => {
  const { hass } = createHass({
    callWS: async () => new Promise(() => {}),
  });
  const timedOut = await discoverOverviewAreas({
    hass,
    timeoutMs: 5,
    maxAgeMs: 0,
    force: true,
  });
  const unavailable = await discoverOverviewAreas({ hass: null, timeoutMs: 5 });

  assert.deepEqual(timedOut.areas, []);
  assert.deepEqual(Object.keys(timedOut.errors).sort(), ["areas", "devices", "entities"]);
  assert.deepEqual(unavailable.areas, []);
  assert.equal(Boolean(unavailable.errors.connection), true);
});
