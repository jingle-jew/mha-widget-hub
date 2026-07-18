import { getEntityDomain, isEntityAvailable } from "./entity.js";
import { isToggleEntityOn } from "./toggle.js";
import { supportsLightBrightness } from "./capabilities.js";

const COLOR_MODES = new Set(["hs", "rgb", "rgbw", "rgbww", "xy"]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function approximatelyEqual(first, second, tolerance = 1) {
  return Math.abs(Number(first) - Number(second)) <= tolerance;
}

function miredToKelvin(value) {
  const mired = Number(value);
  return mired > 0 ? Math.round(1000000 / mired) : null;
}

export function hexToRgb(value = "") {
  const match = String(value).trim().match(/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/iu);
  if (!match) return null;
  return match.slice(1).map(part => Number.parseInt(part, 16));
}

export function rgbToHex(value = []) {
  if (!Array.isArray(value) || value.length < 3) return "#ffffff";
  return `#${value.slice(0, 3)
    .map(channel => Math.round(clamp(channel, 0, 255)).toString(16).padStart(2, "0"))
    .join("")}`;
}

export function rgbToHsv(value = []) {
  const [red, green, blue] = Array.isArray(value)
    ? value.slice(0, 3).map(channel => clamp(channel, 0, 255) / 255)
    : [1, 1, 1];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const hue = delta === 0 ? 0
    : max === red ? 60 * (((green - blue) / delta) % 6)
      : max === green ? 60 * (((blue - red) / delta) + 2)
        : 60 * (((red - green) / delta) + 4);
  return {
    hue: (hue + 360) % 360,
    saturation: max === 0 ? 0 : delta / max,
    value: max,
  };
}

export function hsvToRgb(hue = 0, saturation = 0, value = 1) {
  const normalizedHue = ((Number(hue) % 360) + 360) % 360;
  const normalizedSaturation = clamp(saturation, 0, 1);
  const normalizedValue = clamp(value, 0, 1);
  const chroma = normalizedValue * normalizedSaturation;
  const sector = normalizedHue / 60;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const match = normalizedValue - chroma;
  const [red, green, blue] = sector < 1 ? [chroma, x, 0]
    : sector < 2 ? [x, chroma, 0]
      : sector < 3 ? [0, chroma, x]
        : sector < 4 ? [0, x, chroma]
          : sector < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  return [red, green, blue].map(channel => Math.round((channel + match) * 255));
}

export function kelvinToRgb(value = 3500) {
  const temperature = clamp(value, 1000, 40000) / 100;
  const red = temperature <= 66
    ? 255
    : 329.698727446 * ((temperature - 60) ** -0.1332047592);
  const green = temperature <= 66
    ? 99.4708025861 * Math.log(temperature) - 161.1195681661
    : 288.1221695283 * ((temperature - 60) ** -0.0755148492);
  const blue = temperature >= 66
    ? 255
    : temperature <= 19
      ? 0
      : 138.5177312231 * Math.log(temperature - 10) - 305.0447927307;
  return [red, green, blue].map(channel => Math.round(clamp(channel, 0, 255)));
}

export function getLightColorTemperatureRange(entityState) {
  const attributes = entityState?.attributes || {};
  const min = Number(attributes.min_color_temp_kelvin)
    || miredToKelvin(attributes.max_mireds)
    || 2000;
  const max = Number(attributes.max_color_temp_kelvin)
    || miredToKelvin(attributes.min_mireds)
    || 6500;
  return {
    min: Math.min(min, max),
    max: Math.max(min, max),
  };
}

export function getLightColorTemperature(entityState) {
  const attributes = entityState?.attributes || {};
  return Number(attributes.color_temp_kelvin)
    || miredToKelvin(attributes.color_temp)
    || null;
}

export function getLightBrightnessPercent(entityState) {
  const brightness = Number(entityState?.attributes?.brightness);
  return Number.isFinite(brightness)
    ? Math.round(clamp(brightness, 0, 255) / 2.55)
    : null;
}

export function getLightRgbColor(entityState) {
  const rgb = entityState?.attributes?.rgb_color;
  return Array.isArray(rgb) && rgb.length >= 3
    ? rgb.slice(0, 3).map(channel => Math.round(clamp(channel, 0, 255)))
    : null;
}

export function getLightCapabilities(entityState) {
  const attributes = entityState?.attributes || {};
  const modes = Array.isArray(attributes.supported_color_modes)
    ? attributes.supported_color_modes
    : [];
  return {
    brightness: supportsLightBrightness(attributes),
    colorTemperature: modes.includes("color_temp")
      || attributes.color_temp != null
      || attributes.color_temp_kelvin != null,
    color: modes.some(mode => COLOR_MODES.has(mode))
      || Array.isArray(attributes.rgb_color)
      || Array.isArray(attributes.hs_color),
  };
}

function sameRgb(first, second) {
  return Array.isArray(first)
    && Array.isArray(second)
    && first.length >= 3
    && second.length >= 3
    && first.slice(0, 3).every((channel, index) => approximatelyEqual(channel, second[index], 2));
}

export function buildLightControlServiceCall(entityState, patch = {}) {
  if (!isEntityAvailable(entityState) || getEntityDomain(entityState?.entity_id) !== "light") {
    return null;
  }

  const entityId = entityState.entity_id;
  if (typeof patch.on === "boolean") {
    const alreadyOn = isToggleEntityOn(entityState);
    if (patch.on === alreadyOn && Object.keys(patch).length === 1) return null;
    if (!patch.on) {
      return alreadyOn
        ? { domain: "light", service: "turn_off", data: { entity_id: entityId } }
        : null;
    }
  }

  const capabilities = getLightCapabilities(entityState);
  const data = { entity_id: entityId };
  const hasValuePatch = patch.brightness != null
    || patch.colorTemperature != null
    || patch.color != null;
  let hasChange = (patch.on === true || hasValuePatch) && !isToggleEntityOn(entityState);

  if (patch.brightness != null && capabilities.brightness) {
    const brightness = Math.round(clamp(patch.brightness, 1, 100));
    if (!approximatelyEqual(brightness, getLightBrightnessPercent(entityState))) {
      data.brightness_pct = brightness;
      hasChange = true;
    }
  }

  if (patch.colorTemperature != null && capabilities.colorTemperature) {
    const range = getLightColorTemperatureRange(entityState);
    const temperature = Math.round(clamp(patch.colorTemperature, range.min, range.max));
    if (!approximatelyEqual(temperature, getLightColorTemperature(entityState), 10)) {
      data.color_temp_kelvin = temperature;
      hasChange = true;
    }
  } else if (patch.color && capabilities.color) {
    const rgb = Array.isArray(patch.color) ? patch.color : hexToRgb(patch.color);
    if (rgb && !sameRgb(rgb, getLightRgbColor(entityState))) {
      data.rgb_color = rgb.slice(0, 3).map(channel => Math.round(clamp(channel, 0, 255)));
      hasChange = true;
    }
  }

  return hasChange
    ? { domain: "light", service: "turn_on", data }
    : null;
}
