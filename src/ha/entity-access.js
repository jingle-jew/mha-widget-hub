import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";
import {
  getEntityDomain,
  getEntityState,
  getWidgetEntityId,
  isEntityAvailable,
  normalizeEntityStateValue,
} from "./entity.js";

export function resolveAuthorizedEntity(hass, widgetOrEntityId, {
  allowedDomains = [],
  visibilityConfig,
} = {}) {
  const entityId = typeof widgetOrEntityId === "string"
    ? widgetOrEntityId
    : getWidgetEntityId(widgetOrEntityId);
  const domain = getEntityDomain(entityId);
  const domainAllowed = !allowedDomains.length || allowedDomains.includes(domain);
  const entityAllowed = Boolean(entityId)
    && domainAllowed
    && isEntityAllowedForCurrentUser(hass, entityId, visibilityConfig);
  const entityState = entityAllowed ? getEntityState(hass, entityId) : null;
  const entityAvailable = domain === "button"
    ? Boolean(entityState)
      && !["unavailable", "none"].includes(normalizeEntityStateValue(entityState?.state))
    : isEntityAvailable(entityState);

  return {
    entityId,
    domain,
    domainAllowed,
    entityAllowed,
    entityState,
    entityAvailable,
  };
}
