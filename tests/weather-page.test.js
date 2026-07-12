import test from "node:test";
import assert from "node:assert/strict";

import {
  buildWeatherPageData,
  discoverWeatherPageSources,
} from "../src/ha/weather-page-data.js";
import {
  createWeatherPageSeed,
  discoverWeatherPageSeed,
} from "../src/pages/weather-page-seed.js";
import {
  getDefaultPageIcon,
  getDefaultPageName,
  getPageCreatorTypeOptions,
  PAGE_TYPES,
} from "../src/pages/page-types.js";

function createHass() {
  return {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: "partlycloudy",
        attributes: {
          friendly_name: "Maison",
          temperature: 22,
          temperature_unit: "°C",
          humidity: 61,
          pressure: 1012,
          wind_speed: 18,
          wind_speed_unit: "km/h",
          uv_index: 4,
          precipitation_probability: 40,
        },
      },
      "sensor.air_quality_index": {
        entity_id: "sensor.air_quality_index",
        state: "27",
        attributes: {
          friendly_name: "Maison Indice de qualité de l’air",
          device_class: "aqi",
          unit_of_measurement: "AQI",
        },
      },
      "sensor.outdoor_humidity": {
        entity_id: "sensor.outdoor_humidity",
        state: "64",
        attributes: {
          friendly_name: "Jardin Humidité extérieure",
          device_class: "humidity",
          unit_of_measurement: "%",
        },
      },
    },
    config: {
      unit_system: {
        temperature: "°C",
        wind_speed: "km/h",
      },
    },
    user: { id: "user-1", is_admin: true },
  };
}

function createRegistryHass() {
  const hass = createHass();
  hass.states["weather.home"].attributes.friendly_name = "Val-d'Or Prévisions";
  hass.states["sensor.val_d_or_dew_point"] = {
    entity_id: "sensor.val_d_or_dew_point",
    state: "-4.2",
    attributes: {
      friendly_name: "Val-d'Or Point de rosée",
      device_class: "temperature",
      unit_of_measurement: "°C",
    },
  };
  hass.states["sensor.val_d_or_pm25"] = {
    entity_id: "sensor.val_d_or_pm25",
    state: "2.2",
    attributes: {
      friendly_name: "Val-d'Or PM2.5",
      device_class: "pm25",
      unit_of_measurement: "µg/m³",
    },
  };
  hass.states["sensor.val_d_or_summary"] = {
    entity_id: "sensor.val_d_or_summary",
    state: "Ciel dégagé en soirée",
    attributes: {
      friendly_name: "Résumé",
    },
  };
  hass.states["sensor.val_d_or_tendency"] = {
    entity_id: "sensor.val_d_or_tendency",
    state: "À la hausse",
    attributes: {
      friendly_name: "Tendance",
    },
  };
  hass.states["sensor.val_d_or_wind_gust"] = {
    entity_id: "sensor.val_d_or_wind_gust",
    state: "30",
    attributes: {
      friendly_name: "Rafale de vent",
      device_class: "wind_speed",
      unit_of_measurement: "km/h",
    },
  };
  hass.states["sensor.bedroom_humidity"] = {
    entity_id: "sensor.bedroom_humidity",
    state: "45",
    attributes: {
      friendly_name: "Chambre Humidité",
      device_class: "humidity",
      unit_of_measurement: "%",
    },
  };
  hass.states["sun.sun"] = {
    entity_id: "sun.sun",
    state: "above_horizon",
    attributes: {
      friendly_name: "Sun",
      next_rising: "2026-07-13T09:15:00+00:00",
      next_setting: "2026-07-13T01:15:00+00:00",
    },
  };
  hass.callWS = async ({ type }) => {
    if (type === "config/entity_registry/list") {
      return [
        {
          entity_id: "weather.home",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.val_d_or_dew_point",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.val_d_or_pm25",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.val_d_or_summary",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.val_d_or_tendency",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.val_d_or_wind_gust",
          platform: "environment_canada",
          config_entry_id: "weather-entry",
          device_id: "weather-device",
        },
        {
          entity_id: "sensor.bedroom_humidity",
          platform: "template",
          config_entry_id: "other-entry",
          device_id: "bedroom-device",
        },
      ];
    }
    if (type === "config/device_registry/list") {
      return [
        { id: "weather-device", config_entries: ["weather-entry"] },
        { id: "bedroom-device", config_entries: ["other-entry"] },
      ];
    }
    return [];
  };
  return hass;
}

function createMetRegistryHass() {
  const hass = createHass();
  hass.states = {
    "weather.home": {
      entity_id: "weather.home",
      state: "partlycloudy",
      attributes: {
        friendly_name: "Home",
        temperature: 12,
        temperature_unit: "°C",
        dew_point: 5,
        humidity: 58,
        pressure: 1008,
        pressure_unit: "hPa",
        visibility: 18,
        visibility_unit: "km",
        wind_speed: 14,
        wind_gust_speed: 29,
        wind_bearing: 245,
        wind_speed_unit: "km/h",
        cloud_coverage: 64,
        uv_index: 3,
      },
    },
  };
  hass.callWS = async ({ type }) => {
    if (type === "config/entity_registry/list") {
      return [{
        entity_id: "weather.home",
        platform: "met",
        config_entry_id: "met-entry",
        device_id: "met-device",
      }];
    }
    if (type === "config/device_registry/list") {
      return [{ id: "met-device", config_entries: ["met-entry"] }];
    }
    return [];
  };
  return hass;
}

function createOpenWeatherMapRegistryHass() {
  const hass = createHass();
  hass.states = {
    "weather.quebec": {
      entity_id: "weather.quebec",
      state: "rainy",
      attributes: {
        friendly_name: "Québec",
        temperature: 17,
        temperature_unit: "°C",
        humidity: 72,
        pressure: 1003,
        pressure_unit: "hPa",
        wind_speed: 5.4,
        wind_speed_unit: "m/s",
      },
    },
    "sensor.quebec_feels_like_temperature": {
      entity_id: "sensor.quebec_feels_like_temperature",
      state: "15.8",
      attributes: {
        friendly_name: "Québec Feels like temperature",
        device_class: "temperature",
        unit_of_measurement: "°C",
      },
    },
    "sensor.quebec_weather": {
      entity_id: "sensor.quebec_weather",
      state: "light rain",
      attributes: {
        friendly_name: "Québec Weather",
      },
    },
    "sensor.quebec_rain": {
      entity_id: "sensor.quebec_rain",
      state: "1.6",
      attributes: {
        friendly_name: "Québec Rain",
        unit_of_measurement: "mm/h",
      },
    },
    "sensor.quebec_air_quality_index": {
      entity_id: "sensor.quebec_air_quality_index",
      state: "2",
      attributes: {
        friendly_name: "Québec Air quality index",
        device_class: "aqi",
      },
    },
    "sensor.quebec_pm2_5": {
      entity_id: "sensor.quebec_pm2_5",
      state: "8.4",
      attributes: {
        friendly_name: "Québec PM2.5",
        device_class: "pm25",
        unit_of_measurement: "µg/m³",
      },
    },
    "sensor.kitchen_weather": {
      entity_id: "sensor.kitchen_weather",
      state: "warm",
      attributes: {
        friendly_name: "Kitchen Weather",
      },
    },
  };
  hass.callWS = async ({ type }) => {
    if (type === "config/entity_registry/list") {
      return [
        {
          entity_id: "weather.quebec",
          platform: "openweathermap",
          config_entry_id: "owm-weather-entry",
          device_id: "owm-weather-device",
        },
        ...[
          "sensor.quebec_feels_like_temperature",
          "sensor.quebec_weather",
          "sensor.quebec_rain",
        ].map(entityId => ({
          entity_id: entityId,
          platform: "openweathermap",
          config_entry_id: "owm-weather-entry",
          device_id: "owm-weather-device",
        })),
        ...[
          "sensor.quebec_air_quality_index",
          "sensor.quebec_pm2_5",
        ].map(entityId => ({
          entity_id: entityId,
          platform: "openweathermap",
          config_entry_id: "owm-air-entry",
          device_id: "owm-air-device",
        })),
        {
          entity_id: "sensor.kitchen_weather",
          platform: "template",
          config_entry_id: "template-entry",
          device_id: "kitchen-device",
        },
      ];
    }
    if (type === "config/device_registry/list") {
      return [
        { id: "owm-weather-device", config_entries: ["owm-weather-entry"] },
        { id: "owm-air-device", config_entries: ["owm-air-entry"] },
        { id: "kitchen-device", config_entries: ["template-entry"] },
      ];
    }
    return [];
  };
  return hass;
}

test("weather page is exposed by the page creator for every theme", () => {
  for (const themeStyle of ["oneui", "ios", "material", "alexa"]) {
    const options = getPageCreatorTypeOptions({ themeStyle });
    assert.equal(options.some(option => option.value === PAGE_TYPES.WEATHER), true);
  }
  assert.equal(getDefaultPageName(PAGE_TYPES.WEATHER), "Weather");
  assert.equal(getDefaultPageIcon(PAGE_TYPES.WEATHER), "weather");
});

test("weather page data selects native weather and location-matched complementary sensors", () => {
  const data = buildWeatherPageData(createHass());

  assert.equal(data.weatherEntityId, "weather.home");
  assert.equal(data.metrics.humidity.value, "61 %");
  assert.equal(data.metrics.humidity.valueNumber, 61);
  assert.equal(data.metrics.airQuality.entityId, "sensor.air_quality_index");
  assert.equal(data.metrics.airQuality.value, "27 AQI");
  assert.equal(data.metrics.airQuality.measurementType, "aqi");
});

test("registry discovery keeps related weather sensors and rejects unrelated sensors", async () => {
  const sources = await discoverWeatherPageSources(createRegistryHass());
  const metricKeys = sources.metrics.map(source => source.key);

  assert.equal(sources.discoveryMode, "registry");
  assert.equal(sources.registryLinked, true);
  assert.equal(metricKeys.includes("dew-point"), true);
  assert.equal(metricKeys.includes("air-quality-pm25"), true);
  assert.equal(metricKeys.includes("summary"), true);
  assert.equal(metricKeys.includes("pressure-tendency"), true);
  assert.equal(metricKeys.includes("wind-gust"), true);
  assert.equal(metricKeys.includes("sun"), true);
  assert.equal(sources.metrics.some(source => source.entityId === "sensor.bedroom_humidity"), false);
  assert.equal(
    sources.metrics.filter(source => source.entityId === "sensor.val_d_or_pm25").length,
    1,
  );
  assert.equal(
    sources.metrics.find(source => source.entityId === "sensor.val_d_or_wind_gust")?.key,
    "wind-gust",
  );
});

test("Met.no profile is covered through standard weather attributes", async () => {
  const sources = await discoverWeatherPageSources(createMetRegistryHass());
  const metricKeys = sources.metrics.map(source => source.key);

  assert.equal(sources.discoveryMode, "registry");
  assert.equal(metricKeys.includes("dew-point"), true);
  assert.equal(metricKeys.includes("wind-gust"), true);
  assert.equal(metricKeys.includes("cloud-coverage"), true);
  assert.equal(metricKeys.includes("uv"), true);
  assert.equal(metricKeys.includes("visibility"), true);
});

test("OpenWeatherMap profile resolves condition sensors and separate air quality entry", async () => {
  const sources = await discoverWeatherPageSources(createOpenWeatherMapRegistryHass());
  const byKey = new Map(sources.metrics.map(source => [source.key, source]));

  assert.equal(sources.discoveryMode, "registry");
  assert.equal(byKey.get("apparent-temperature")?.entityId, "sensor.quebec_feels_like_temperature");
  assert.equal(byKey.get("summary")?.entityId, "sensor.quebec_weather");
  assert.equal(byKey.get("precipitation")?.entityId, "sensor.quebec_rain");
  assert.equal(byKey.get("air-quality")?.entityId, "sensor.quebec_air_quality_index");
  assert.equal(byKey.get("air-quality-pm25")?.entityId, "sensor.quebec_pm2_5");
  assert.equal(sources.metrics.some(source => source.entityId === "sensor.kitchen_weather"), false);
});

test("registry discovery falls back safely when registry calls fail", async () => {
  const hass = createHass();
  hass.callWS = async () => {
    throw new Error("registry unavailable");
  };
  const sources = await discoverWeatherPageSources(hass);

  assert.equal(sources.discoveryMode, "state-fallback");
  assert.equal(sources.registryLinked, false);
  assert.equal(sources.weatherEntityId, "weather.home");
  assert.equal(sources.metrics.some(source => source.key === "humidity"), true);
});

test("weather page seed creates grid-compatible sections", () => {
  const seed = createWeatherPageSeed({ hass: createHass(), pageId: "weather-test" });

  assert.equal(seed.weatherEntityId, "weather.home");
  assert.equal(seed.widgets[0].w, 4);
  assert.equal(seed.widgets[0].h, 2);
  assert.equal(seed.widgets.filter(widget => widget.kind === "weather").length, 3);
  assert.equal(seed.widgets.some(widget => widget.kind === "weather-metric"), true);
  assert.equal(seed.widgets.every(widget => [2, 4].includes(widget.w)), true);
  assert.equal(seed.widgets.every(widget => [1, 2].includes(widget.h)), true);
});

test("async weather page seed stores discovery metadata and intentional metric sizes", async () => {
  const seed = await discoverWeatherPageSeed({
    hass: createRegistryHass(),
    pageId: "weather-registry",
  });
  const byMetric = new Map(seed.widgets.map(widget => [widget.metricKey, widget]));
  const summary = byMetric.get("summary");

  assert.equal(seed.config.discoveryMode, "registry");
  assert.equal(seed.config.registryLinked, true);
  assert.equal(seed.config.autoDetectedMetricKeys.includes("dew-point"), true);
  assert.deepEqual(
    { w: byMetric.get("dew-point")?.w, h: byMetric.get("dew-point")?.h },
    { w: 2, h: 1 },
  );
  assert.deepEqual(
    { w: byMetric.get("wind-gust")?.w, h: byMetric.get("wind-gust")?.h },
    { w: 2, h: 1 },
  );
  assert.deepEqual(
    { w: byMetric.get("pressure-tendency")?.w, h: byMetric.get("pressure-tendency")?.h },
    { w: 2, h: 1 },
  );
  assert.equal(summary?.valueKind, "text");
  assert.equal(summary?.w, 4);
  assert.equal(summary?.h, 2);
  assert.equal(summary?.variant, "weather-metric-text-tall");
});
