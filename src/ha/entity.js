export function getWidgetEntityId(widget = {}) {
  return widget?.lightEntityId || widget?.entityId || widget?.entity_id || widget?.entity || "";
}

export function getEntityDomain(entityId = "") {
  const normalized = String(entityId || "").trim();
  const separatorIndex = normalized.indexOf(".");
  return separatorIndex > 0 ? normalized.slice(0, separatorIndex) : "";
}

export function normalizeEntityStateValue(state) {
  const normalized = String(state ?? "none").trim().toLowerCase();
  return normalized || "none";
}

export function getEntityState(hass, widgetOrEntityId) {
  const entityId = typeof widgetOrEntityId === "string"
    ? widgetOrEntityId
    : getWidgetEntityId(widgetOrEntityId);

  return entityId ? hass?.states?.[entityId] || null : null;
}

export function isEntityAvailable(entityState) {
  if (!entityState) return false;
  const state = normalizeEntityStateValue(entityState.state);
  return state !== "unknown" && state !== "unavailable" && state !== "none";
}
