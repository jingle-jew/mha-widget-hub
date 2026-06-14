const LEGACY_LIGHT_SUPPORT_BRIGHTNESS = 1;
const BRIGHTNESS_COLOR_MODES = new Set([
  "brightness",
  "color_temp",
  "hs",
  "rgb",
  "rgbw",
  "rgbww",
  "white",
  "xy",
]);

export function supportsLightBrightness(attributes = {}) {
  const colorModes = Array.isArray(attributes.supported_color_modes)
    ? attributes.supported_color_modes
    : [];
  return colorModes.some(mode => BRIGHTNESS_COLOR_MODES.has(mode))
    || Boolean((Number(attributes.supported_features) || 0) & LEGACY_LIGHT_SUPPORT_BRIGHTNESS)
    || (attributes.brightness != null && Number.isFinite(Number(attributes.brightness)));
}
