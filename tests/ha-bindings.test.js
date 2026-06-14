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
import {
  createToggleSliderConfigDraft,
} from "../src/widget-config/toggle-slider-config.js";
import {
  buildToggleWidgetConfig,
  createToggleConfigDraft,
  updateToggleDeviceType,
} from "../src/widget-config/toggle-config.js";

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
  assert.deepEqual(buildToggleServiceCall(entity("input_boolean.guest", "off"), true), {
    domain: "input_boolean",
    service: "turn_on",
    data: { entity_id: "input_boolean.guest" },
  });
  assert.deepEqual(buildToggleServiceCall(entity("light.kitchen", "on"), false), {
    domain: "light",
    service: "turn_off",
    data: { entity_id: "light.kitchen" },
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

test("toggle-slider configuration only exposes available brightness-capable lights", () => {
  const hass = {
    states: {
      "light.brightness": entity("light.brightness", "on", {
        friendly_name: "Lampe réglable",
        supported_color_modes: ["brightness"],
      }),
      "light.color": entity("light.color", "off", {
        friendly_name: "Lampe couleur",
        supported_color_modes: ["hs"],
      }),
      "light.on_off": entity("light.on_off", "on", {
        friendly_name: "Relais lumière",
        supported_color_modes: ["onoff"],
      }),
      "light.unsupported_mode": entity("light.unsupported_mode", "on", {
        friendly_name: "Mode non reconnu",
        supported_color_modes: ["unsupported"],
      }),
      "light.unavailable": entity("light.unavailable", "unavailable", {
        friendly_name: "Lampe indisponible",
        supported_color_modes: ["brightness"],
      }),
      "light.unknown": entity("light.unknown", "unknown", {
        friendly_name: "Lampe inconnue",
        brightness: 120,
      }),
    },
  };

  const config = createToggleSliderConfigDraft({
    kind: "toggle-slider",
    entityId: "light.on_off",
  }, hass);

  assert.deepEqual(
    config.options.map(option => option.label),
    ["Lampe couleur", "Lampe réglable"],
  );
  assert.equal(config.draft.lightEntityId, "light.color");
  assert.ok(config.options.every(option => option.supportsBrightness));
  assert.ok(config.options.every(option => !option.label.includes("light.")));
});

test("toggle-slider configuration returns no selection without compatible lights", () => {
  const config = createToggleSliderConfigDraft({}, {
    states: {
      "light.on_off": entity("light.on_off", "on", {
        friendly_name: "Relais lumière",
        supported_color_modes: ["onoff"],
      }),
      "light.offline": entity("light.offline", "unavailable", {
        friendly_name: "Lampe hors ligne",
        supported_color_modes: ["brightness"],
      }),
    },
  });

  assert.deepEqual(config.options, []);
  assert.equal(config.draft.lightEntityId, "");
  assert.equal(config.selected, null);
});

test("toggle configuration filters supported domains and stores one entity id", () => {
  const hass = {
    states: {
      "light.kitchen": entity("light.kitchen", "on", {
        friendly_name: "Cuisine",
      }),
      "switch.coffee": entity("switch.coffee", "off", {
        friendly_name: "Cafetière",
      }),
      "input_boolean.guest": entity("input_boolean.guest", "off", {
        friendly_name: "Mode invités",
      }),
      "switch.offline": entity("switch.offline", "unavailable", {
        friendly_name: "Interrupteur hors ligne",
      }),
    },
  };

  const light = createToggleConfigDraft({}, hass);
  assert.deepEqual(light.options.map(option => option.label), ["Cuisine"]);
  assert.equal(light.draft.entityId, "light.kitchen");
  assert.equal(light.draft.label, "Cuisine");

  const switchConfig = updateToggleDeviceType(light.draft, "switch", hass);
  assert.deepEqual(switchConfig.options.map(option => option.label), ["Cafetière"]);

  const booleanConfig = updateToggleDeviceType(light.draft, "input_boolean", hass);
  assert.deepEqual(booleanConfig.options.map(option => option.label), ["Mode invités"]);

  const configured = buildToggleWidgetConfig({
    kind: "toggle",
    variant: "toggle-widget",
  }, booleanConfig.draft, hass);
  assert.deepEqual(configured, {
    kind: "toggle",
    variant: "toggle-widget",
    entityId: "input_boolean.guest",
    label: "Mode invités",
  });
});
