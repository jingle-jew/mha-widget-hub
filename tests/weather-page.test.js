import test from "node:test";
import assert from "node:assert/strict";

import { buildWeatherPageData } from "../src/ha/weather-page-data.js";
import { createWeatherPageSeed } from "../src/pages/weather-page-seed.js";
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
          friendly_name: "Indice de qualité de l’air",
          device_class: "aqi",
          unit_of_measurement: "AQI",
        },
      },
      "sensor.outdoor_humidity": {
        entity_id: "sensor.outdoor_humidity",
        state: "64",
        attributes: {
          friendly_name: "Humidité extérieure",
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

test("weather page is exposed by the page creator for every theme", () => {
  for (const themeStyle of ["oneui", "ios", "material", "alexa"]) {
    const options = getPageCreatorTypeOptions({ themeStyle });
    assert.equal(options.some(option => option.value === PAGE_TYPES.WEATHER), true);
  }
  assert.equal(getDefaultPageName(PAGE_TYPES.WEATHER), "Weather");
  assert.equal(getDefaultPageIcon(PAGE_TYPES.WEATHER), "weather");
});

test("weather page data selects native weather and complementary sensors", () => {
  const data = buildWeatherPageData(createHass());

  assert.equal(data.weatherEntityId, "weather.home");
  assert.equal(data.metrics.humidity.value, "61 %");
  assert.equal(data.metrics.humidity.valueNumber, 61);
  assert.equal(data.metrics.airQuality.entityId, "sensor.air_quality_index");
  assert.equal(data.metrics.airQuality.value, "27 AQI");
  assert.equal(data.metrics.airQuality.measurementType, "aqi");
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
