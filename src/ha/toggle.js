import {
  getEntityDomain,
  isEntityAvailable,
  normalizeEntityStateValue,
} from "./entity.js";

const TOGGLE_DOMAINS = new Set([
  "fan",
  "humidifier",
  "input_boolean",
  "light",
  "media_player",
  "switch",
]);

const OFF_STATES = new Set([
  "off",
  "closed",
  "idle",
  "standby",
  "unavailable",
  "unknown",
  "none",
]);

export function isToggleEntityOn(entityState) {
  if (!entityState) return false;
  return !OFF_STATES.has(normalizeEntityStateValue(entityState.state));
}

export function getToggleService(entityState) {
  return isToggleEntityOn(entityState) ? "turn_off" : "turn_on";
}

export function buildToggleServiceCall(entityState) {
  if (!isEntityAvailable(entityState)) return null;

  const entityId = entityState?.entity_id || "";
  const domain = getEntityDomain(entityId);

  if (!entityId || !TOGGLE_DOMAINS.has(domain)) return null;

  return {
    domain,
    service: getToggleService(entityState),
    data: { entity_id: entityId },
  };
}

export function supportsToggleEntity(entityState) {
  const domain = getEntityDomain(entityState?.entity_id || "");
  return TOGGLE_DOMAINS.has(domain);
}
