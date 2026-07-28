import { getAvailableEntitiesForDomain } from "../ha/entity-filters.js";
import { supportsLightBrightness } from "../ha/capabilities.js";

export const MHA_SWITCH_ENTITY_DOMAINS = Object.freeze(["switch", "input_boolean"]);

export function isMhaSwitchEntityDomain(domain = "") {
  return MHA_SWITCH_ENTITY_DOMAINS.includes(String(domain || ""));
}

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
  return getEntityOptionsByDomains(hass, [domain], visibilityConfig);
}

export function getEntityOptionsByDomains(hass, domains = [], visibilityConfig) {
  return [...new Set(domains.filter(Boolean))]
    .flatMap(domain => getAvailableEntitiesForDomain(hass, domain, visibilityConfig))
    .map(({ entity_id: entityId, name, state }) => ({
      value: entityId,
      label: name,
      entityState: state,
    }))
    .sort((a, b) => (
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
      || a.value.localeCompare(b.value)
    ));
}

export function getMhaSwitchEntityOptions(hass, visibilityConfig) {
  return getEntityOptionsByDomains(hass, MHA_SWITCH_ENTITY_DOMAINS, visibilityConfig);
}
