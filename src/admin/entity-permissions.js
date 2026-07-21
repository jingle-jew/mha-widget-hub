import { getEntityDomain } from "../ha/entity.js";

export const MHA_ENTITY_DOMAINS = Object.freeze([
  Object.freeze({ value: "light", label: "Lights" }),
  Object.freeze({ value: "switch", label: "Switches" }),
  Object.freeze({ value: "input_boolean", label: "Booleans" }),
  Object.freeze({ value: "button", label: "Buttons" }),
  Object.freeze({ value: "camera", label: "Cameras" }),
  Object.freeze({ value: "weather", label: "Weather" }),
  Object.freeze({ value: "media_player", label: "Media players" }),
  Object.freeze({ value: "climate", label: "Climate" }),
  Object.freeze({ value: "sensor", label: "Sensors" }),
  Object.freeze({ value: "binary_sensor", label: "Binary sensors" }),
]);

const DOMAIN_SET = new Set(MHA_ENTITY_DOMAINS.map(domain => domain.value));

export function getAllowedDomains() {
  return [...MHA_ENTITY_DOMAINS];
}

export function normalizeEntityVisibilityConfig(config) {
  const users = config?.users && typeof config.users === "object"
    ? config.users
    : {};
  const normalizedUsers = {};

  Object.entries(users).forEach(([userId, userConfig]) => {
    if (!userId || !userConfig || typeof userConfig !== "object") return;
    const allowedEntities = {};
    Object.entries(userConfig.allowedEntities || {}).forEach(([domain, entityIds]) => {
      if (!DOMAIN_SET.has(domain) || !Array.isArray(entityIds)) return;
      allowedEntities[domain] = [...new Set(
        entityIds.filter(entityId => (
          typeof entityId === "string"
          && getEntityDomain(entityId) === domain
        )),
      )].sort();
    });
    normalizedUsers[userId] = {
      unrestricted: userConfig.unrestricted !== false,
      allowedEntities,
    };
  });

  return { version: 1, users: normalizedUsers };
}

export function getCurrentUserId(hass) {
  return String(hass?.user?.id || "").trim();
}

/*
 * This is an MHA UI visibility layer only. It does not replace Home Assistant
 * permissions and must not be treated as server-side security.
 */
export function isEntityAllowedForUser(entityId, userId, config) {
  if (!entityId) return true;
  const normalizedUserId = String(userId || "").trim();
  const userConfig = config?.users?.[normalizedUserId];
  if (!normalizedUserId || !userConfig || userConfig.unrestricted !== false) {
    return true;
  }

  const domain = getEntityDomain(entityId);
  if (!DOMAIN_SET.has(domain)) return true;
  return Boolean(userConfig.allowedEntities?.[domain]?.includes(entityId));
}

export function filterEntitiesForCurrentUser(hass, entities, config) {
  const userId = getCurrentUserId(hass);
  return (Array.isArray(entities) ? entities : []).filter(entity => {
    const entityId = typeof entity === "string"
      ? entity
      : entity?.entity_id || entity?.value || "";
    return isEntityAllowedForUser(entityId, userId, config);
  });
}

export function isEntityAllowedForCurrentUser(hass, entityId, config) {
  return isEntityAllowedForUser(entityId, getCurrentUserId(hass), config);
}
