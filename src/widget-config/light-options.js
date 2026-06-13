import { getEntityDomain } from "../ha/entity.js";

const LEGACY_SUPPORT_BRIGHTNESS = 1;

export function humanizeEntityId(entityId = "") {
  const objectId = String(entityId).split(".").slice(1).join(".") || String(entityId);
  return objectId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase());
}

export function getEntityDisplayName(entityState, entityId = "") {
  const friendlyName = String(entityState?.attributes?.friendly_name || "").trim();
  return friendlyName || humanizeEntityId(entityId || entityState?.entity_id);
}

export function getLightCapabilities(entityState) {
  const attributes = entityState?.attributes || {};
  const colorModes = Array.isArray(attributes.supported_color_modes)
    ? attributes.supported_color_modes
    : [];
  const supportedFeatures = Number(attributes.supported_features) || 0;
  const supportsBrightness = colorModes.some(mode => mode !== "onoff")
    || Boolean(supportedFeatures & LEGACY_SUPPORT_BRIGHTNESS)
    || (attributes.brightness != null && Number.isFinite(Number(attributes.brightness)));

  return { supportsBrightness };
}

export function getLightOptions(hass) {
  return getEntityOptionsByDomain(hass, "light")
    .map(({ entityState, ...option }) => ({
      ...option,
      ...getLightCapabilities(entityState),
    }));
}

export function getEntityOptionsByDomain(hass, domain) {
  return Object.entries(hass?.states || {})
    .filter(([entityId]) => getEntityDomain(entityId) === domain)
    .map(([entityId, entityState]) => ({
      value: entityId,
      label: getEntityDisplayName(entityState, entityId),
      entityState,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
}
