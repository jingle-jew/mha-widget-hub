import { callHomeAssistantService, runToggleAction } from "./actions.js";
import { supportsLightBrightness } from "./capabilities.js";
import { getEntityDomain, isEntityAvailable } from "./entity.js";
import { isToggleEntityOn } from "./toggle.js";

const COLOR_MODES = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

export function getLightCapabilities(entityState) {
  const attributes = entityState?.attributes || {};
  const modes = Array.isArray(attributes.supported_color_modes)
    ? attributes.supported_color_modes
    : [];
  const domain = getEntityDomain(entityState?.entity_id || "");
  const available = domain === "light" && isEntityAvailable(entityState);
  const currentColorMode = String(attributes.color_mode || "");
  const supportedFeatures = Number(attributes.supported_features) || 0;
  const supportsLegacyColorTemperature = (supportedFeatures & 2) === 2;

  return {
    available,
    brightness: available && supportsLightBrightness(attributes),
    colorTemperature: available && (
      modes.includes("color_temp")
      || currentColorMode === "color_temp"
      || supportsLegacyColorTemperature
      || attributes.color_temp_kelvin != null
      || attributes.color_temp != null
      || attributes.min_color_temp_kelvin != null
      || attributes.max_color_temp_kelvin != null
      || attributes.min_mireds != null
      || attributes.max_mireds != null
    ),
    color: available && modes.some((mode) => COLOR_MODES.has(mode)),
  };
}

export function getLightSnapshot(entityState) {
  const attributes = entityState?.attributes || {};
  const minKelvin = Math.round(Number(attributes.min_color_temp_kelvin) || 2000);
  const maxKelvin = Math.round(Number(attributes.max_color_temp_kelvin) || 6500);
  const brightness = Math.round(clamp((Number(attributes.brightness) || 0) / 2.55, 0, 100));
  const kelvin = Math.round(clamp(Number(attributes.color_temp_kelvin) || 2700, minKelvin, maxKelvin));
  const rgb = Array.isArray(attributes.rgb_color) ? attributes.rgb_color.slice(0, 3).map(Number) : [255, 122, 26];

  return {
    on: isToggleEntityOn(entityState),
    brightness,
    kelvin,
    minKelvin,
    maxKelvin,
    rgb,
  };
}

function lightCall(entityState, data = {}) {
  const entityId = entityState?.entity_id || "";
  if (getEntityDomain(entityId) !== "light") return null;
  return { domain: "light", service: "turn_on", data: { entity_id: entityId, ...data } };
}

export function setLightPower(hass, entityState, nextOn) {
  return runToggleAction(hass, entityState, nextOn);
}

export function setLightBrightness(hass, entityState, brightness) {
  return callHomeAssistantService(hass, lightCall(entityState, {
    brightness_pct: Math.round(clamp(brightness, 0, 100)),
  }));
}

export function setLightTemperature(hass, entityState, kelvin) {
  return callHomeAssistantService(hass, lightCall(entityState, {
    color_temp_kelvin: Math.round(clamp(kelvin, 1500, 9000)),
  }));
}

export function hexToRgb(hex = "#ffffff") {
  const normalized = String(hex).replace("#", "");
  const value = Number.parseInt(normalized, 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function rgbToHex(rgb = [255, 255, 255]) {
  return `#${rgb.slice(0, 3).map((value) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0")).join("")}`;
}

export function hsvToRgb(hue, saturation, value) {
  const h = ((Number(hue) % 360) + 360) % 360;
  const s = clamp(saturation, 0, 100) / 100;
  const v = clamp(value, 0, 100) / 100;
  const c = v * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = v - c;
  const [r, g, b] = h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
      : h < 180 ? [0, c, x]
        : h < 240 ? [0, x, c]
          : h < 300 ? [x, 0, c]
            : [c, 0, x];
  return [r, g, b].map((channel) => Math.round((channel + m) * 255));
}

export function rgbToHsv(rgb = [255, 255, 255]) {
  const [r, g, b] = rgb.map((channel) => clamp(channel, 0, 255) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  return {
    hue: Math.round((hue + 360) % 360),
    saturation: Math.round(max ? (delta / max) * 100 : 0),
    value: Math.round(max * 100),
  };
}

export function setLightColor(hass, entityState, rgb, brightness) {
  return callHomeAssistantService(hass, lightCall(entityState, {
    rgb_color: rgb.slice(0, 3).map((value) => Math.round(clamp(value, 0, 255))),
    ...(brightness == null ? {} : { brightness_pct: Math.round(clamp(brightness, 1, 100)) }),
  }));
}

export function applyLightScene(hass, entityState, scene = {}) {
  const brightness = Math.round(clamp(scene.brightness ?? 60, 1, 100));
  if (scene.type === "rgb") return setLightColor(hass, entityState, hexToRgb(scene.color), brightness);
  return callHomeAssistantService(hass, lightCall(entityState, {
    color_temp_kelvin: Math.round(clamp(scene.kelvin, 1500, 9000)),
    brightness_pct: brightness,
  }));
}
