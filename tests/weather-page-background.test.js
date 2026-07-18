import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  DEFAULT_WEATHER_LANDSCAPE_ID,
  normalizeWeatherLandscapeId,
  resolveWeatherBackgroundAsset,
  resolveWeatherLandscapeAmbience,
  WEATHER_LANDSCAPES,
} from "../src/pages/weather-background-assets.js";
import {
  createWeatherPageBackground,
  resolveWeatherPeriod,
} from "../src/pages/weather-page-background.js";

function createFakeElement(tagName) {
  const properties = new Map();
  return {
    tagName,
    className: "",
    dataset: {},
    attributes: {},
    children: [],
    style: {
      setProperty(name, value) {
        properties.set(name, String(value));
      },
      getPropertyValue(name) {
        return properties.get(name) || "";
      },
    },
    append(...children) {
      this.children.push(...children);
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
  };
}

function withFakeDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = { createElement: createFakeElement };
  try {
    return callback();
  } finally {
    globalThis.document = previousDocument;
  }
}

function createHass(condition, cloudCoverage) {
  const attributes = {
    temperature: 18,
    wind_speed: 18,
    wind_speed_unit: "km/h",
  };
  if (cloudCoverage !== undefined) attributes.cloud_coverage = cloudCoverage;
  return {
    states: {
      "weather.home": {
        entity_id: "weather.home",
        state: condition,
        attributes,
      },
      "sun.sun": {
        entity_id: "sun.sun",
        state: "above_horizon",
        attributes: {},
      },
    },
  };
}

function findLayer(scene, className) {
  return scene.children.find(child => child.className === className);
}

test("weather conditions map to the three landscape ambiences", () => {
  ["sunny", "clear", "clear-day", "clear-night", "clear_night", "clearnight", "exceptional"].forEach(condition => {
    assert.equal(resolveWeatherLandscapeAmbience(condition), "clear");
  });
  [
    "partlycloudy", "partly-cloudy", "partly_cloudy", "windy", "wind", "windy-variant",
    "windy_variant", "fog", "foggy", "mist", "unknown", "unavailable", "unknown-condition",
  ].forEach(condition => {
    assert.equal(resolveWeatherLandscapeAmbience(condition), "overcast-light");
  });
  [
    "cloudy", "cloud", "rainy", "rain", "pouring", "heavy-rain", "lightning", "thunderstorm",
    "lightning-rainy", "hail", "snowy", "snow", "snowy-rainy", "freezing-rainy", "sleet",
  ].forEach(condition => {
    assert.equal(resolveWeatherLandscapeAmbience(condition), "overcast-high");
  });
});

test("weather period extends sun.sun transitions across all landscape moments", () => {
  const midday = new Date("2026-07-18T14:00:00-04:00");
  const sun = (state, attributes = {}, lastChanged = "") => ({
    states: {
      "sun.sun": {
        state,
        attributes,
        last_changed: lastChanged,
      },
    },
  });
  const inMinutes = minutes => new Date(midday.getTime() + (minutes * 60 * 1000)).toISOString();

  assert.equal(resolveWeatherPeriod(sun("above_horizon"), true, midday), "afternoon");
  assert.equal(resolveWeatherPeriod(sun("above_horizon", {}, inMinutes(-10)), true, midday), "sunrise");
  assert.equal(resolveWeatherPeriod(sun("above_horizon", { next_setting: inMinutes(20) }), true, midday), "sunset");
  assert.equal(resolveWeatherPeriod(sun("below_horizon", { next_rising: inMinutes(60) }), false, midday), "dawn");
  assert.equal(resolveWeatherPeriod(sun("below_horizon", { next_rising: inMinutes(10) }), false, midday), "sunrise");
  assert.equal(resolveWeatherPeriod(sun("below_horizon", {}, inMinutes(-20)), false, midday), "dusk");
  assert.equal(resolveWeatherPeriod(null, false, new Date(2026, 6, 18, 23, 0)), "night");
  assert.equal(resolveWeatherPeriod(null, true, new Date(2026, 6, 18, 9, 0)), "morning");
});

test("weather period accepts the explicit dev scene override", () => {
  const now = new Date("2026-07-18T14:00:00-04:00");
  const sun = {
    states: {
      "sun.sun": {
        state: "above_horizon",
        attributes: { _mha_weather_period_override: "dusk" },
      },
    },
  };

  assert.equal(resolveWeatherPeriod(sun, true, now), "dusk");
  sun.states["sun.sun"].attributes._mha_weather_period_override = "invalid";
  assert.equal(resolveWeatherPeriod(sun, true, now), "afternoon");
});

test("alpine lake registry resolves every declared WebP asset", () => {
  const landscape = WEATHER_LANDSCAPES[DEFAULT_WEATHER_LANDSCAPE_ID];
  const urls = Object.values(landscape.assets).flatMap(variants => Object.values(variants));

  assert.equal(urls.length, 21);
  urls.forEach(url => {
    assert.match(url, /\/landscapes\/alpine-lake\/webp\/.*\.webp$/);
    assert.equal(existsSync(fileURLToPath(url)), true, url);
  });
  const sunsetRain = resolveWeatherBackgroundAsset({
    landscapeId: "alpine-lake",
    moment: "sunset",
    condition: "rainy",
  });
  assert.equal(sunsetRain.filename, "sunset-overcast-high.webp");
  assert.equal(sunsetRain.fallback, "exact");

  const winterFallback = resolveWeatherBackgroundAsset({
    landscapeId: "alpine-lake",
    moment: "night",
    condition: "snowy",
    winter: true,
  });
  assert.equal(winterFallback.filename, "night-overcast-high.webp");
  assert.equal(winterFallback.season, "standard");
  assert.equal(winterFallback.winterFallback, true);
});

test("weather asset resolver follows declared fallbacks without constructing missing URLs", () => {
  const preview = "https://example.test/preview.webp";
  const registry = {
    "alpine-lake": {
      id: "alpine-lake",
      label: "Alpine lake",
      preview,
      assets: {
        sunset: {
          clear: "https://example.test/sunset-clear.webp",
          "overcast-light": "https://example.test/sunset-overcast-light.webp",
        },
      },
    },
  };
  const resolved = resolveWeatherBackgroundAsset({
    landscapeId: "alpine-lake",
    moment: "sunset",
    condition: "rainy",
    registry,
  });

  assert.equal(resolved.url, "https://example.test/sunset-overcast-light.webp");
  assert.equal(resolved.fallback, "same-moment-overcast-light");
});

test("unknown and absent landscape ids normalize to alpine lake", () => {
  assert.equal(normalizeWeatherLandscapeId(), "alpine-lake");
  assert.equal(normalizeWeatherLandscapeId("missing"), "alpine-lake");
  assert.equal(resolveWeatherBackgroundAsset({ landscapeId: "missing" }).landscapeId, "alpine-lake");
});

test("partly cloudy builds a few broad overlapping masses across all depths", () => withFakeDocument(() => {
  const scene = createWeatherPageBackground({}, createHass("partlycloudy", 50));
  const cloudField = findLayer(scene, "mha-weather-background__cloud-field");

  assert.equal(scene.dataset.landscapeId, "alpine-lake");
  assert.equal(scene.dataset.ambience, "overcast-light");
  assert.equal(scene.style.getPropertyValue("--mha-weather-cloud-field-height"), "66%");
  assert.match(scene.dataset.sceneKey, /:cloud-partly-4$/);
  assert.equal(cloudField.dataset.profile, "partly");
  assert.equal(cloudField.children.length, 4);
  assert.deepEqual(new Set(cloudField.children.map(cloud => cloud.dataset.depth)), new Set(["far", "mid", "near"]));
  cloudField.children.forEach(cloud => {
    assert.ok(Number.parseFloat(cloud.style.getPropertyValue("--mha-weather-cloud-width")) > 50);
  });
}));

test("clear and storm profiles preserve open sky and progressively fill the upper scene", () => withFakeDocument(() => {
  const clearScene = createWeatherPageBackground({}, createHass("sunny"));
  const stormScene = createWeatherPageBackground({}, createHass("lightning-rainy", 100));
  const clearField = findLayer(clearScene, "mha-weather-background__cloud-field");
  const stormField = findLayer(stormScene, "mha-weather-background__cloud-field");

  assert.equal(clearField.children.length, 0);
  assert.equal(stormField.dataset.profile, "storm");
  assert.equal(stormField.children.length, 10);
  assert.ok(stormField.children.some(cloud => cloud.dataset.horizon === "true"));
  assert.ok(Number.parseFloat(stormScene.style.getPropertyValue("--mha-weather-horizon-mist-opacity")) >= 0.24);
}));
