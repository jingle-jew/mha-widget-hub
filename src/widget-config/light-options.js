import { getAvailableEntitiesForDomain } from "../ha/entity-filters.js";
import { supportsLightBrightness } from "../ha/capabilities.js";

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
  return { supportsBrightness: supportsLightBrightness(attributes) };
}

export function getLightOptions(hass, visibilityConfig) {
  return getEntityOptionsByDomain(hass, "light", visibilityConfig)
    .map(({ entityState, ...option }) => ({
      ...option,
      ...getLightCapabilities(entityState),
    }))
    .filter(option => option.supportsBrightness);
}

export function getEntityOptionsByDomain(hass, domain, visibilityConfig) {
  return getAvailableEntitiesForDomain(hass, domain, visibilityConfig)
    .map(({ entity_id: entityId, name, state }) => ({
      value: entityId,
      label: name,
      entityState: state,
    }));
}
