import assert from "node:assert/strict";
import test from "node:test";

import {
  applyLightScene,
  getLightCapabilities,
  getLightSnapshot,
  hexToRgb,
  hsvToRgb,
  rgbToHex,
  setLightBrightness,
  setLightColor,
  setLightTemperature,
} from "../src/ha/light-popup-adapter.js";
import { normalizeLightPopupConfig } from "../src/light-popup/light-popup-config.js";

function lightState(attributes = {}, state = "on") {
  return {
    entity_id: "light.salon",
    state,
    attributes: {
      supported_color_modes: ["color_temp", "rgb"],
      brightness: 186,
      color_temp_kelvin: 3000,
      min_color_temp_kelvin: 2000,
      max_color_temp_kelvin: 6500,
      rgb_color: [255, 122, 26],
      ...attributes,
    },
  };
}

test("light popup configuration normalizes the persisted widget contract", () => {
  const config = normalizeLightPopupConfig({
    orientation: "horizontal",
    whites: [5000, 2700, 2700, 12000, 2200],
    colors: ["ff0000", "#00C853"],
    scenes: [{ id: "read", name: "Lecture", type: "color_temp", kelvin: 3500, brightness: 80 }],
  });

  assert.equal(config.orientation, "horizontal");
  assert.equal(config.tintPopup, false);
  assert.deepEqual(config.whites, [5000, 2700, 9000, 2200]);
  assert.deepEqual(config.colors, ["#ff0000", "#00c853"]);
  assert.deepEqual(config.scenes[0], {
    id: "read",
    name: "Lecture",
    icon: "sparkles",
    type: "color_temp",
    kelvin: 3500,
    brightness: 80,
    enabled: true,
  });
});

test("light popup configuration migrates legacy alignment and tint keys", () => {
  const config = normalizeLightPopupConfig({
    controlsAlignment: "horizontal",
    tintPopupWithLightColor: true,
  });

  assert.equal(config.orientation, "horizontal");
  assert.equal(config.tintPopup, true);
  assert.equal("controlsAlignment" in config, false);
  assert.equal("tintPopupWithLightColor" in config, false);
});

test("light popup configuration keeps the four ambience slots from the settings contract", () => {
  const config = normalizeLightPopupConfig({
    scenes: Array.from({ length: 6 }, (_, index) => ({
      id: `scene-${index + 1}`,
      name: `Ambiance ${index + 1}`,
    })),
  });

  assert.equal(config.scenes.length, 4);
  assert.deepEqual(config.scenes.map((scene) => scene.id), ["scene-1", "scene-2", "scene-3", "scene-4"]);
});

test("light popup adapter exposes partial capabilities and live values", () => {
  const entityState = lightState();
  assert.deepEqual(getLightCapabilities(entityState), {
    available: true,
    brightness: true,
    colorTemperature: true,
    color: true,
  });
  assert.deepEqual(getLightSnapshot(entityState), {
    on: true,
    brightness: 73,
    kelvin: 3000,
    minKelvin: 2000,
    maxKelvin: 6500,
    rgb: [255, 122, 26],
  });
  assert.equal(getLightCapabilities(lightState({}, "unavailable")).available, false);
});

test("light popup adapter detects white-temperature-only lights from current and legacy HA metadata", () => {
  const currentModeOnly = lightState({
    supported_color_modes: ["brightness"],
    color_mode: "color_temp",
    color_temp_kelvin: undefined,
    color_temp: undefined,
    min_color_temp_kelvin: undefined,
    max_color_temp_kelvin: undefined,
  });
  const legacyFeatureOnly = lightState({
    supported_color_modes: ["brightness"],
    color_mode: undefined,
    color_temp_kelvin: undefined,
    color_temp: undefined,
    min_color_temp_kelvin: undefined,
    max_color_temp_kelvin: undefined,
    supported_features: 2,
  });

  assert.equal(getLightCapabilities(currentModeOnly).colorTemperature, true);
  assert.equal(getLightCapabilities(currentModeOnly).color, false);
  assert.equal(getLightCapabilities(legacyFeatureOnly).colorTemperature, true);
  assert.equal(getLightCapabilities(legacyFeatureOnly).color, false);
});

test("light popup adapter builds Home Assistant light calls for sliders and presets", async () => {
  const calls = [];
  const hass = { callService: async (...args) => calls.push(args) };
  const entityState = lightState();

  await setLightBrightness(hass, entityState, 73);
  await setLightTemperature(hass, entityState, 2700);
  await setLightColor(hass, entityState, [12, 34, 56], 65);
  await applyLightScene(hass, entityState, {
    type: "color_temp",
    kelvin: 3500,
    brightness: 80,
  });

  assert.deepEqual(calls, [
    ["light", "turn_on", { entity_id: "light.salon", brightness_pct: 73 }],
    ["light", "turn_on", { entity_id: "light.salon", color_temp_kelvin: 2700 }],
    ["light", "turn_on", { entity_id: "light.salon", rgb_color: [12, 34, 56], brightness_pct: 65 }],
    ["light", "turn_on", { entity_id: "light.salon", color_temp_kelvin: 3500, brightness_pct: 80 }],
  ]);
});

test("light popup color conversions preserve the selected hue", () => {
  assert.deepEqual(hexToRgb("#ff7a00"), [255, 122, 0]);
  assert.equal(rgbToHex([255, 122, 0]), "#ff7a00");
  assert.deepEqual(hsvToRgb(120, 100, 100), [0, 255, 0]);
});
