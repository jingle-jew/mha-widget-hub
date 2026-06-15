import { getEntityOptionsByDomain } from "./light-options.js";

export function createWeatherConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    entityId: widget.entityId || widget.entity_id || "",
  };
  return reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileWeatherConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "weather", visibilityConfig);
  if (!options.some(option => option.value === draft.entityId)) {
    draft.entityId = options[0]?.value || "";
  }
  return {
    draft,
    options,
    selected: options.find(option => option.value === draft.entityId) || null,
  };
}

export function updateWeatherEntity(draft, entityId) {
  draft.entityId = String(entityId || "");
  return draft;
}

export function buildWeatherWidgetConfig(widget, draft, hass, visibilityConfig) {
  reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    entityId: draft.entityId || "",
  };
}
