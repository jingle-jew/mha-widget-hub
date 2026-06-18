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
  buildButtonServiceCall,
  buildSceneRoutineServiceCall,
  callHomeAssistantService,
  createLatestValueAction,
} from "../src/ha/actions.js";
import {
  buildMediaDisplayModel,
  buildMediaPlayerServiceCall,
  getMediaArtworkUrl,
  resolveHomeAssistantMediaUrl,
} from "../src/ha/media.js";
import { resolveAuthorizedEntity } from "../src/ha/entity-access.js";
import {
  buildWeatherModel,
  clearWeatherForecastCache,
  fetchWeatherForecastBundle,
} from "../src/ha/weather.js";
import { getClockWeatherText } from "../src/widgets/clock-widget.js";
import {
  buildButtonWidgetConfig,
  createButtonConfigDraft,
} from "../src/widget-config/button-config.js";
import {
  buildWeatherWidgetConfig,
  createWeatherConfigDraft,
  normalizeWeatherForecastType,
} from "../src/widget-config/weather-config.js";
import {
  buildScenesWidgetConfig,
  createScenesConfigDraft,
} from "../src/widget-config/scenes-config.js";
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

test("media player model prefers live metadata and readable fallback states", () => {
  const playing = entity("media_player.salon", "playing", {
    friendly_name: "Salon",
    media_title: "Ocean Drive",
    media_artist: "Duke Dumont",
  });
  assert.deepEqual(
    buildMediaDisplayModel(playing, {}, {}).title,
    "Ocean Drive",
  );
  assert.equal(buildMediaDisplayModel(playing, {}, {}).subtitle, "Duke Dumont");

  const paused = entity("media_player.salon", "paused", {
    friendly_name: "Salon",
    media_title: "Ocean Drive",
    media_artist: "Duke Dumont",
  });
  assert.equal(buildMediaDisplayModel(paused, {}, {}).title, "Ocean Drive");
  assert.equal(buildMediaDisplayModel(paused, {}, {}).subtitle, "en pause");

  const idle = entity("media_player.salon", "idle", {
    friendly_name: "Salon",
    media_title: "Stale title",
  });
  assert.equal(buildMediaDisplayModel(idle, {}, {}).title, "Salon");
  assert.equal(buildMediaDisplayModel(idle, {}, {}).subtitle, "inactif");
});

test("media player artwork resolves HA relative URLs in priority order", () => {
  const player = entity("media_player.salon", "playing", {
    entity_picture: "",
    media_image_url: "https://ha.example/api/media_player_proxy/media_player.salon",
    entity_picture_local: "/local/fallback.jpg",
  });

  assert.equal(
    getMediaArtworkUrl(player, {}),
    "https://ha.example/api/media_player_proxy/media_player.salon",
  );
  assert.equal(
    resolveHomeAssistantMediaUrl("/api/media_player_proxy/media_player.salon", "https://ha.example"),
    "https://ha.example/api/media_player_proxy/media_player.salon",
  );
});

test("media player buttons map to supported Home Assistant services", () => {
  const supported = entity("media_player.salon", "playing", {
    supported_features: 1 | 4 | 8 | 16 | 32 | 16384,
    volume_level: 0.43,
    is_volume_muted: false,
  });

  assert.deepEqual(buildMediaPlayerServiceCall(supported, "previous"), {
    domain: "media_player",
    service: "media_previous_track",
    data: { entity_id: "media_player.salon" },
  });
  assert.deepEqual(buildMediaPlayerServiceCall(supported, "playPause"), {
    domain: "media_player",
    service: "media_pause",
    data: { entity_id: "media_player.salon" },
  });
  assert.deepEqual(buildMediaPlayerServiceCall({
    ...supported,
    state: "paused",
  }, "playPause"), {
    domain: "media_player",
    service: "media_play",
    data: { entity_id: "media_player.salon" },
  });
  assert.deepEqual(buildMediaPlayerServiceCall(supported, "next"), {
    domain: "media_player",
    service: "media_next_track",
    data: { entity_id: "media_player.salon" },
  });
  assert.deepEqual(buildMediaPlayerServiceCall(supported, "volumeDown"), {
    domain: "media_player",
    service: "volume_set",
    data: { entity_id: "media_player.salon", volume_level: 0.38 },
  });
  assert.deepEqual(buildMediaPlayerServiceCall(supported, "volumeUp"), {
    domain: "media_player",
    service: "volume_set",
    data: { entity_id: "media_player.salon", volume_level: 0.48 },
  });
  assert.deepEqual(buildMediaPlayerServiceCall(supported, "mute"), {
    domain: "media_player",
    service: "volume_mute",
    data: { entity_id: "media_player.salon", is_volume_muted: true },
  });
  assert.deepEqual(buildMediaPlayerServiceCall({
    ...supported,
    attributes: {
      ...supported.attributes,
      volume_level: 0.98,
      is_volume_muted: true,
    },
  }, "volumeUp"), {
    domain: "media_player",
    service: "volume_set",
    data: { entity_id: "media_player.salon", volume_level: 1 },
  });
  assert.deepEqual(buildMediaPlayerServiceCall({
    ...supported,
    attributes: {
      ...supported.attributes,
      is_volume_muted: true,
    },
  }, "mute"), {
    domain: "media_player",
    service: "volume_mute",
    data: { entity_id: "media_player.salon", is_volume_muted: false },
  });
  assert.equal(
    buildMediaPlayerServiceCall(entity("media_player.salon", "playing", {
      supported_features: 16 | 32,
    }), "playPause"),
    null,
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

test("button widget builds the correct HA call for toggle, press and configured actions", () => {
  assert.deepEqual(buildButtonServiceCall({}, entity("light.kitchen", "off")), {
    domain: "light",
    service: "turn_on",
    data: { entity_id: "light.kitchen" },
  });
  assert.deepEqual(buildButtonServiceCall({}, entity("switch.coffee", "on")), {
    domain: "switch",
    service: "turn_off",
    data: { entity_id: "switch.coffee" },
  });
  assert.deepEqual(buildButtonServiceCall({}, entity("input_boolean.guest", "off")), {
    domain: "input_boolean",
    service: "turn_on",
    data: { entity_id: "input_boolean.guest" },
  });
  assert.deepEqual(buildButtonServiceCall({}, entity("button.restart", "unknown")), {
    domain: "button",
    service: "press",
    data: { entity_id: "button.restart" },
  });
  assert.deepEqual(buildButtonServiceCall({
    action: {
      domain: "scene",
      service: "turn_on",
      data: { entity_id: "scene.evening" },
    },
  }, null), {
    domain: "scene",
    service: "turn_on",
    data: { entity_id: "scene.evening" },
  });
});

test("modes and routines map to the expected Home Assistant services", () => {
  assert.deepEqual(buildSceneRoutineServiceCall("scene.movie_time"), {
    domain: "scene",
    service: "turn_on",
    data: { entity_id: "scene.movie_time" },
  });
  assert.deepEqual(buildSceneRoutineServiceCall("script.good_night"), {
    domain: "script",
    service: "turn_on",
    data: { entity_id: "script.good_night" },
  });
  assert.deepEqual(buildSceneRoutineServiceCall("automation.arrival"), {
    domain: "automation",
    service: "trigger",
    data: {
      entity_id: "automation.arrival",
      skip_condition: false,
    },
  });
  assert.equal(buildSceneRoutineServiceCall("light.kitchen"), null);
});

test("authorized entity access rejects blocked and unsupported entities before reading state", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "light.kitchen": entity("light.kitchen", "on"),
      "weather.home": entity("weather.home", "sunny"),
    },
  };
  const visibilityConfig = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: { light: [] },
      },
    },
  };

  const blocked = resolveAuthorizedEntity(hass, "light.kitchen", {
    allowedDomains: ["light"],
    visibilityConfig,
  });
  assert.equal(blocked.entityAllowed, false);
  assert.equal(blocked.entityState, null);

  const unsupported = resolveAuthorizedEntity(hass, "weather.home", {
    allowedDomains: ["light"],
    visibilityConfig,
  });
  assert.equal(unsupported.domainAllowed, false);
  assert.equal(unsupported.entityState, null);
});

test("weather model reads HA attributes and exposes a clean unavailable fallback", () => {
  const hass = {
    states: {
      "weather.home": entity("weather.home", "partlycloudy", {
        temperature: 21,
        temperature_unit: "°C",
        humidity: 54,
        wind_speed: 12,
        wind_speed_unit: "km/h",
        forecast: [{
          datetime: "2026-06-16T12:00:00Z",
          condition: "rainy",
          temperature: 19,
          templow: 12,
        }],
      }),
    },
  };
  const model = buildWeatherModel(hass, { entityId: "weather.home" });

  assert.equal(model.temperature, "21°C");
  assert.equal(model.summary, "Part. nuageux");
  assert.equal(model.humidity, "54 %");
  assert.equal(model.wind, "12 km/h");
  assert.equal(model.forecast[0].condition, "rainy");
  assert.equal(model.forecast[0].temp, "19°C / 12°C");
  assert.equal(getClockWeatherText(model), "21°C · Part. nuageux");

  const unavailable = buildWeatherModel({
    states: {
      "weather.home": entity("weather.home", "unavailable"),
    },
  }, { entityId: "weather.home" });
  assert.equal(unavailable.entityAvailable, false);
  assert.equal(unavailable.temperature, "");
  assert.equal(unavailable.forecast.length, 0);
  assert.equal(getClockWeatherText(unavailable), "");
});

test("weather forecasts prefer service data and fall back to hourly or legacy attributes", async () => {
  clearWeatherForecastCache();
  const calls = [];
  const hass = {
    states: {
      "weather.home": entity("weather.home", "partlycloudy", {
        temperature: 21,
        temperature_unit: "°C",
        forecast: [{
          datetime: "2026-06-20T12:00:00Z",
          condition: "cloudy",
          temperature: 18,
          templow: 11,
        }],
      }),
    },
    async callWS(payload) {
      calls.push(payload);
      if (payload.service_data.type === "daily") {
        return {
          response: {
            "weather.home": {
              forecast: [{
                datetime: "2026-06-18T12:00:00Z",
                condition: "rainy",
                temperature: 19,
                templow: 12,
              }],
            },
          },
        };
      }
      return {
        response: {
          "weather.home": {
            forecast: [{
              datetime: "2026-06-17T14:00:00Z",
              condition: "sunny",
              temperature: 23,
            }],
          },
        },
      };
    },
  };

  const bundle = await fetchWeatherForecastBundle(hass, "weather.home");
  const model = buildWeatherModel(hass, { entityId: "weather.home" }, null, bundle);

  assert.equal(calls.length, 2);
  assert.deepEqual(calls.map(call => call.service_data.type).sort(), ["daily", "hourly"]);
  assert.equal(calls[0].type, "call_service");
  assert.equal(calls[0].domain, "weather");
  assert.equal(calls[0].service, "get_forecasts");
  assert.deepEqual(calls[0].target, { entity_id: "weather.home" });
  assert.equal(calls[0].return_response, true);
  assert.equal(model.forecastType, "daily");
  assert.equal(model.forecast[0].condition, "rainy");
  assert.equal(model.forecast[0].temp, "19°C / 12°C");

  const hourlyModel = buildWeatherModel(hass, { entityId: "weather.home" }, null, {
    daily: [],
    hourly: bundle.hourly,
  });
  assert.equal(hourlyModel.forecastType, "hourly");
  assert.equal(hourlyModel.forecast[0].condition, "sunny");
  assert.equal(hourlyModel.forecast[0].temp, "23°C");

  const legacyModel = buildWeatherModel(hass, { entityId: "weather.home" });
  assert.equal(legacyModel.forecastType, "legacy");
  assert.equal(legacyModel.forecast[0].condition, "cloudy");

  await fetchWeatherForecastBundle(hass, "weather.home");
  assert.equal(calls.length, 2);
});

test("button and weather configuration only persist authorized selections", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "button.allowed": entity("button.allowed", "unknown", { friendly_name: "Autorisé" }),
      "button.blocked": entity("button.blocked", "unknown", { friendly_name: "Bloqué" }),
      "weather.home": entity("weather.home", "sunny", { friendly_name: "Maison" }),
    },
  };
  const visibilityConfig = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          button: ["button.allowed"],
          weather: ["weather.home"],
        },
      },
    },
  };
  const button = createButtonConfigDraft({
    buttonType: "button",
    entityId: "button.blocked",
  }, hass, visibilityConfig);
  assert.deepEqual(button.options.map(option => option.value), ["button.allowed"]);
  assert.equal(buildButtonWidgetConfig({}, button.draft, hass, visibilityConfig).entityId, "button.allowed");

  const weather = createWeatherConfigDraft({}, hass, visibilityConfig);
  assert.equal(
    buildWeatherWidgetConfig({ kind: "weather" }, weather.draft, hass, visibilityConfig).entityId,
    "weather.home",
  );
  assert.equal(
    buildWeatherWidgetConfig({ kind: "weather" }, weather.draft, hass, visibilityConfig).forecastType,
    "daily",
  );
});

test("weather configuration defaults and persists forecast type", () => {
  const hass = {
    states: {
      "weather.home": entity("weather.home", "sunny", { friendly_name: "Maison" }),
    },
  };

  const created = createWeatherConfigDraft({}, hass);
  assert.equal(created.draft.forecastType, "daily");
  assert.equal(normalizeWeatherForecastType("weird"), "daily");
  assert.equal(
    buildWeatherWidgetConfig({ kind: "weather" }, {
      ...created.draft,
      forecastType: "hourly",
    }, hass).forecastType,
    "hourly",
  );
});

test("modes and routines configuration keeps four buttons and preserves missing scenes", () => {
  const hass = {
    states: {
      "scene.evening": entity("scene.evening", "unknown", { friendly_name: "Soirée" }),
      "script.good_night": entity("script.good_night", "off", { friendly_name: "Bonne nuit" }),
      "automation.arrival": entity("automation.arrival", "on", { friendly_name: "Arrivée" }),
    },
  };

  const created = createScenesConfigDraft({
    buttons: [
      { type: "mode", entityId: "scene.missing_mode", label: "Absente" },
      { type: "routine", entityId: "script.good_night" },
    ],
  }, hass);

  assert.equal(created.draft.buttons.length, 4);
  assert.equal(created.buttons[0].options[0].value, "scene.missing_mode");
  assert.equal(created.buttons[1].selected?.value, "script.good_night");

  const built = buildScenesWidgetConfig({ kind: "scenes" }, created.draft, hass);
  assert.equal(built.buttons.length, 4);
  assert.equal(built.buttons[0].entityId, "scene.missing_mode");
  assert.equal(built.buttons[1].entityId, "script.good_night");
  assert.equal(built.buttons[2].type, "routine");
});

test("weather model respects widget forecastType preference with robust fallback", () => {
  const hass = {
    states: {
      "weather.home": entity("weather.home", "sunny", {
        temperature: 24,
        temperature_unit: "°C",
        forecast: [{
          datetime: "2026-06-21T12:00:00Z",
          condition: "cloudy",
          temperature: 20,
          templow: 15,
        }],
      }),
    },
  };
  const bundle = {
    daily: [{
      datetime: "2026-06-19T12:00:00Z",
      condition: "rainy",
      temperature: 19,
      templow: 11,
    }],
    hourly: [{
      datetime: "2026-06-17T18:00:00Z",
      condition: "sunny",
      temperature: 23,
    }],
  };

  const hourlyPreferred = buildWeatherModel(hass, {
    entityId: "weather.home",
    forecastType: "hourly",
  }, null, bundle);
  assert.equal(hourlyPreferred.forecastType, "hourly");
  assert.equal(hourlyPreferred.forecast[0].temp, "23°C");

  const hourlyFallback = buildWeatherModel(hass, {
    entityId: "weather.home",
    forecastType: "hourly",
  }, null, { daily: bundle.daily, hourly: [] });
  assert.equal(hourlyFallback.forecastType, "daily");
  assert.equal(hourlyFallback.forecast[0].temp, "19°C / 11°C");
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
