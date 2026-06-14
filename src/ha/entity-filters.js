import { getEntityDomain } from "./entity.js";
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

export function getEntitiesForDomain(hass, domain, config) {
  const entities = Object.entries(hass?.states || {})
    .filter(([entityId]) => getEntityDomain(entityId) === domain)
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
