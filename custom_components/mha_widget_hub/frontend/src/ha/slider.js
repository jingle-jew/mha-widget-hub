import { getEntityDomain } from "./entity.js";

const LEGACY_LIGHT_SUPPORT_BRIGHTNESS = 1;

function supportsLightBrightness(attributes = {}) {
  const colorModes = Array.isArray(attributes.supported_color_modes)
    ? attributes.supported_color_modes
    : [];
  return colorModes.some(mode => mode !== "onoff")
    || Boolean((Number(attributes.supported_features) || 0) & LEGACY_LIGHT_SUPPORT_BRIGHTNESS)
    || (attributes.brightness != null && Number.isFinite(Number(attributes.brightness)));
}

function createSliderBinding({
  value = 0,
  min = 0,
  max = 100,
  service = "",
  data,
} = {}) {
  return {
    value,
    min,
    max,
    service,
    data,
  };
}

export function getSliderBinding(entityState) {
  if (!entityState) return null;

  const attributes = entityState.attributes || {};
  const domain = getEntityDomain(entityState.entity_id || "");

  if (
    (attributes.brightness != null && Number.isFinite(Number(attributes.brightness)))
    || (domain === "light" && supportsLightBrightness(attributes))
  ) {
    return createSliderBinding({
      value: Math.round((Number(attributes.brightness) || 0) / 2.55),
      service: "turn_on",
      data: (value) => ({ brightness_pct: Math.round(value) }),
    });
  }

  if (Number.isFinite(Number(attributes.percentage)) || domain === "fan") {
    return createSliderBinding({
      value: Number(attributes.percentage) || 0,
      service: "set_percentage",
      data: (value) => ({ percentage: Math.round(value) }),
    });
  }

  if (Number.isFinite(Number(attributes.volume_level)) || domain === "media_player") {
    return createSliderBinding({
      value: Math.round((Number(attributes.volume_level) || 0) * 100),
      service: "volume_set",
      data: (value) => ({ volume_level: Number(value) / 100 }),
    });
  }

  if (Number.isFinite(Number(attributes.current_position)) || Number.isFinite(Number(attributes.position))) {
    return createSliderBinding({
      value: Number.isFinite(Number(attributes.current_position))
        ? Number(attributes.current_position)
        : Number(attributes.position),
      service: "set_cover_position",
      data: (value) => ({ position: Math.round(value) }),
    });
  }

  return null;
}

export function buildSliderServiceCall(entityState, value) {
  const entityId = entityState?.entity_id || "";
  const domain = getEntityDomain(entityId);
  const binding = getSliderBinding(entityState);

  if (!entityId || !domain || !binding) return null;

  return {
    domain,
    service: binding.service,
    data: {
      entity_id: entityId,
      ...binding.data(value),
    },
  };
}
