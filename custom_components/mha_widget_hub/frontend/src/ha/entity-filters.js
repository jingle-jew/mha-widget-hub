import { getEntityDomain, isEntityAvailable } from "./entity.js";
import { filterEntitiesForCurrentUser } from "../admin/entity-permissions.js";

export function getFriendlyEntityName(entity, entityId = "") {
  const friendlyName = String(entity?.attributes?.friendly_name || "").trim();
  if (friendlyName) return friendlyName;
  const objectId = String(entityId || entity?.entity_id || "")
    .split(".")
    .slice(1)
    .join(".");
  return objectId
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\p{L}/gu, letter => letter.toLocaleUpperCase());
}

function isEntityVisibleForDomain(entityState, domain) {
  return isEntityAvailable(entityState)
    || (domain === "button" && entityState?.state === "unknown");
}

function collectEntitiesForDomain(hass, domain, config, { availableOnly = false } = {}) {
  const entities = Object.entries(hass?.states || {})
    .filter(([entityId, entityState]) => (
      getEntityDomain(entityId) === domain
      && (!availableOnly || isEntityVisibleForDomain(entityState, domain))
    ))
    .map(([entityId, entityState]) => ({
      entity_id: entityId,
      name: getFriendlyEntityName(entityState, entityId),
      state: entityState,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return config
    ? filterEntitiesForCurrentUser(hass, entities, config)
    : entities;
}

export function getEntitiesForDomain(hass, domain, config) {
  return collectEntitiesForDomain(hass, domain, config);
}

export function getAvailableEntitiesForDomain(hass, domain, config) {
  return collectEntitiesForDomain(hass, domain, config, { availableOnly: true });
}
