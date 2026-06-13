import test from "node:test";
import assert from "node:assert/strict";
import {
  getEntityDomain,
  getEntityState,
  isEntityAvailable,
} from "../src/ha/entity.js";
import {
  buildSliderServiceCall,
  getSliderBinding,
} from "../src/ha/slider.js";
import {
  buildToggleServiceCall,
  supportsToggleEntity,
} from "../src/ha/toggle.js";
import {
  callHomeAssistantService,
  createLatestValueAction,
} from "../src/ha/actions.js";
import {
  buildSliderWidgetConfig,
  createSliderConfigDraft,
  updateSliderAction,
} from "../src/widget-config/slider-config.js";

const entity = (entityId, state, attributes = {}) => ({
  entity_id: entityId,
  state,
  attributes,
});

test("entity helpers tolerate missing or unavailable Home Assistant state", () => {
  assert.equal(getEntityDomain("light.kitchen"), "light");
  assert.equal(getEntityState(null, "light.kitchen"), null);
  assert.equal(isEntityAvailable(null), false);
  assert.equal(isEntityAvailable(entity("light.kitchen", "unknown")), false);
  assert.equal(isEntityAvailable(entity("light.kitchen", "unavailable")), false);
  assert.equal(isEntityAvailable(entity("light.kitchen", "on")), true);
});

test("light brightness maps to percentage service calls", () => {
  const light = entity("light.kitchen", "on", { brightness: 128 });

  assert.equal(getSliderBinding(light).value, 50);
  assert.deepEqual(buildSliderServiceCall(light, 63.7), {
    domain: "light",
    service: "turn_on",
    data: {
      entity_id: "light.kitchen",
      brightness_pct: 64,
    },
  });
});

test("fan, media player and cover sliders use domain-specific payloads", () => {
  assert.deepEqual(
    buildSliderServiceCall(entity("fan.office", "on", { percentage: 35 }), 42),
    {
      domain: "fan",
      service: "set_percentage",
      data: { entity_id: "fan.office", percentage: 42 },
    },
  );
  assert.deepEqual(
    buildSliderServiceCall(entity("media_player.salon", "playing", { volume_level: 0.3 }), 25),
    {
      domain: "media_player",
      service: "volume_set",
      data: { entity_id: "media_player.salon", volume_level: 0.25 },
    },
  );
  assert.deepEqual(
    buildSliderServiceCall(entity("cover.patio", "open", { current_position: 75 }), 20),
    {
      domain: "cover",
      service: "set_cover_position",
      data: { entity_id: "cover.patio", position: 20 },
    },
  );
});

test("toggle calls reject unsupported and unavailable entities", () => {
  assert.equal(supportsToggleEntity(entity("sensor.temperature", "20")), false);
  assert.equal(buildToggleServiceCall(entity("light.kitchen", "unavailable")), null);
  assert.deepEqual(buildToggleServiceCall(entity("switch.coffee", "off")), {
    domain: "switch",
    service: "turn_on",
    data: { entity_id: "switch.coffee" },
  });
  assert.deepEqual(buildToggleServiceCall(entity("switch.coffee", "on")), {
    domain: "switch",
    service: "turn_off",
    data: { entity_id: "switch.coffee" },
  });
});

test("Home Assistant service wrapper validates its contract", async () => {
  const calls = [];
  const hass = {
    async callService(...args) {
      calls.push(args);
    },
  };

  assert.equal(await callHomeAssistantService(null, null), false);
  assert.equal(await callHomeAssistantService(hass, {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.kitchen" },
  }), true);
  assert.deepEqual(calls, [[
    "light",
    "turn_on",
    { entity_id: "light.kitchen" },
  ]]);
});

test("latest-value actions coalesce drag updates and preserve the final value", async () => {
  const started = [];
  const pending = [];
  const action = createLatestValueAction((value) => {
    started.push(value);
    return new Promise(resolve => pending.push(resolve));
  }, { intervalMs: 0 });

  action.update(10);
  action.update(20);
  action.update(30);
  action.commit(40);

  assert.deepEqual(started, [10]);

  pending.shift()();
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(started, [10, 40]);
  pending.shift()();
});

test("slider configuration filters entities by action and stores only the selected id", () => {
  const hass = {
    states: {
      "light.kitchen": entity("light.kitchen", "on", {
        friendly_name: "Cuisine",
        brightness: 128,
      }),
      "media_player.salon": entity("media_player.salon", "playing", {
        friendly_name: "Haut-parleur du salon",
        volume_level: 0.3,
      }),
      "sensor.temperature": entity("sensor.temperature", "21", {
        friendly_name: "Température",
      }),
    },
  };

  const brightness = createSliderConfigDraft({
    kind: "slider",
    variant: "light-slider-wide",
  }, hass);
  assert.deepEqual(brightness.options.map(option => option.label), ["Cuisine"]);
  assert.equal(brightness.draft.entityId, "light.kitchen");
  assert.equal(brightness.draft.label, "Cuisine");

  const volume = updateSliderAction(brightness.draft, "volume", hass);
  assert.deepEqual(volume.options.map(option => option.label), ["Haut-parleur du salon"]);

  const configured = buildSliderWidgetConfig({
    kind: "slider",
    variant: "light-slider-wide",
  }, volume.draft, hass);
  assert.deepEqual(configured, {
    kind: "slider",
    variant: "light-slider-wide",
    entityId: "media_player.salon",
    label: "Haut-parleur du salon",
    sliderAction: "volume",
  });
});
