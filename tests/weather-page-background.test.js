import test from "node:test";
import assert from "node:assert/strict";

import { resolveWeatherBackgroundAsset } from "../src/pages/weather-background-assets.js";
import { createWeatherPageBackground } from "../src/pages/weather-page-background.js";

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

test("weather assets carry scene-specific horizon composition", () => {
  const sunny = resolveWeatherBackgroundAsset({ condition: "sunny", period: "day" });
  const foggy = resolveWeatherBackgroundAsset({ condition: "fog", period: "day" });
  const storm = resolveWeatherBackgroundAsset({ condition: "lightning", period: "day" });

  assert.equal(sunny.assetKey, "sunny");
  assert.equal(sunny.composition.horizon, 57);
  assert.ok(foggy.composition.cloudFieldHeight > sunny.composition.cloudFieldHeight);
  assert.ok(foggy.composition.horizonMistOpacity > sunny.composition.horizonMistOpacity);
  assert.ok(storm.composition.cloudFadeStart < sunny.composition.cloudFadeStart);
});

test("partly cloudy builds a few broad overlapping masses across all depths", () => withFakeDocument(() => {
  const scene = createWeatherPageBackground({}, createHass("partlycloudy", 50));
  const cloudField = findLayer(scene, "mha-weather-background__cloud-field");

  assert.equal(scene.dataset.horizon, "58");
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
  assert.ok(Number.parseFloat(stormScene.style.getPropertyValue("--mha-weather-horizon-mist-opacity")) >= 0.3);
}));
