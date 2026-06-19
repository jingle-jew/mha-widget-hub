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

export function renderWeatherConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, configOptionLabel, t } = helpers;
  const { draft, options, selected } = reconcileWeatherConfigDraft(
    session.draft,
    hass,
    visibilityConfig,
  );
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const select = document.createElement("select");
  select.className = "mha-widget-config-control";
  select.disabled = !options.length;
  if (!options.length) {
    const empty = document.createElement("option");
    empty.textContent = t("widgets.config.noWeatherEntity", "No authorized and available weather entity.");
    select.append(empty);
  } else {
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      select.append(item);
    });
  }
  select.addEventListener("change", (event) => {
    updateWeatherEntity(draft, event.currentTarget.value);
    onChange?.({ rerender: true });
  });

  const forecastSelect = document.createElement("select");
  forecastSelect.className = "mha-widget-config-control";
  WEATHER_FORECAST_OPTIONS.forEach((option) => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = configOptionLabel("widgets.weather.forecastTypes", option);
    item.selected = option.value === draft.forecastType;
    forecastSelect.append(item);
  });
  forecastSelect.addEventListener("change", (event) => {
    updateWeatherForecastType(draft, event.currentTarget.value);
    onChange?.();
  });

  fields.append(
    createField(t("widgets.config.weatherEntity", "Weather entity"), select),
    createField(t("widgets.weather.forecast", "Forecasts"), forecastSelect),
  );
  return { fields, canSave: Boolean(selected) };
}
