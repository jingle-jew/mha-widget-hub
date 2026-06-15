import test from "node:test";
import assert from "node:assert/strict";
import {
  filterEntitiesForCurrentUser,
  getAllowedDomains,
  isEntityAllowedForUser,
  normalizeEntityVisibilityConfig,
} from "../src/admin/entity-permissions.js";
import { getEntitiesForDomain } from "../src/ha/entity-filters.js";
import { createToggleConfigDraft } from "../src/widget-config/toggle-config.js";

test("visibility defaults to unrestricted when configuration is absent", () => {
  assert.equal(isEntityAllowedForUser("light.kitchen", "user-1", null), true);
  assert.equal(isEntityAllowedForUser("light.kitchen", "", {
    users: {},
  }), true);
});

test("restricted users only receive explicitly allowed entities by domain", () => {
  const config = normalizeEntityVisibilityConfig({
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          light: ["light.kitchen", "switch.invalid"],
          switch: ["switch.coffee"],
        },
      },
    },
  });

  assert.equal(isEntityAllowedForUser("light.kitchen", "user-1", config), true);
  assert.equal(isEntityAllowedForUser("light.office", "user-1", config), false);
  assert.deepEqual(config.users["user-1"].allowedEntities.light, ["light.kitchen"]);

  const hass = { user: { id: "user-1" } };
  assert.deepEqual(
    filterEntitiesForCurrentUser(hass, [
      { entity_id: "light.kitchen" },
      { entity_id: "light.office" },
    ], config),
    [{ entity_id: "light.kitchen" }],
  );
});

test("domain inventory includes binary_sensor and entity lists use human names", () => {
  assert.ok(getAllowedDomains().some(domain => domain.value === "binary_sensor"));
  assert.ok(getAllowedDomains().some(domain => domain.value === "button"));
  const entities = getEntitiesForDomain({
    states: {
      "binary_sensor.front_door": {
        entity_id: "binary_sensor.front_door",
        state: "off",
        attributes: { friendly_name: "Porte d’entrée" },
      },
      "binary_sensor.back_door": {
        entity_id: "binary_sensor.back_door",
        state: "off",
        attributes: {},
      },
    },
  }, "binary_sensor");

  assert.deepEqual(entities.map(entity => entity.name), [
    "Back Door",
    "Porte d’entrée",
  ]);
});

test("widget configuration options exclude entities denied to the current user", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "light.kitchen": {
        entity_id: "light.kitchen",
        state: "on",
        attributes: { friendly_name: "Cuisine" },
      },
      "light.office": {
        entity_id: "light.office",
        state: "off",
        attributes: { friendly_name: "Bureau" },
      },
    },
  };
  const config = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: { light: ["light.kitchen"] },
      },
    },
  };

  const result = createToggleConfigDraft({}, hass, config);
  assert.deepEqual(result.options.map(option => option.label), ["Cuisine"]);
  assert.equal(result.draft.entityId, "light.kitchen");
});
