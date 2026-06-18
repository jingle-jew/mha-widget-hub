import { getEntityOptionsByDomain } from "./light-options.js";

export const WEATHER_FORECAST_OPTIONS = Object.freeze([
  Object.freeze({ value: "daily", label: "Daily" }),
  Object.freeze({ value: "hourly", label: "Hourly" }),
]);

export function normalizeWeatherForecastType(value) {
  return value === "hourly" ? "hourly" : "daily";
}

export function createWeatherConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    entityId: widget.entityId || widget.entity_id || "",
    forecastType: normalizeWeatherForecastType(widget.forecastType),
  };
  return reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileWeatherConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "weather", visibilityConfig);
  if (!options.some(option => option.value === draft.entityId)) {
    draft.entityId = options[0]?.value || "";
  }
  draft.forecastType = normalizeWeatherForecastType(draft.forecastType);
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

export function updateWeatherForecastType(draft, forecastType) {
  draft.forecastType = normalizeWeatherForecastType(forecastType);
  return draft;
}

export function buildWeatherWidgetConfig(widget, draft, hass, visibilityConfig) {
  reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    entityId: draft.entityId || "",
    forecastType: normalizeWeatherForecastType(draft.forecastType),
  };
}
