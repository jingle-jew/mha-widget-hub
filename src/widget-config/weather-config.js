import { getEntityOptionsByDomain } from "./light-options.js";

export const WEATHER_FORECAST_OPTIONS = Object.freeze([
  Object.freeze({ value: "daily", label: "Daily" }),
  Object.freeze({ value: "hourly", label: "Hourly" }),
]);

export const WEATHER_SURFACE_OPTIONS = Object.freeze([
  Object.freeze({ value: "default", label: "Default" }),
  Object.freeze({ value: "dynamic", label: "Dynamic color" }),
]);

export function normalizeWeatherForecastType(value) {
  return value === "hourly" ? "hourly" : "daily";
}

export function normalizeWeatherSurfaceMode(value) {
  return value === "default" ? "default" : "dynamic";
}

export function supportsWeatherSurfaceModeConfig(widget = {}, themeStyle = "") {
  const normalizedThemeStyle = String(themeStyle || "").trim().toLowerCase();
  return widget.kind === "weather" && normalizedThemeStyle === "oneui";
}

export function createWeatherConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    entityId: widget.entityId || widget.entity_id || "",
    forecastType: normalizeWeatherForecastType(widget.forecastType),
    surfaceMode: normalizeWeatherSurfaceMode(widget.surfaceMode),
  };
  return reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileWeatherConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "weather", visibilityConfig);
  if (!options.some(option => option.value === draft.entityId)) {
    draft.entityId = options[0]?.value || "";
  }
  draft.forecastType = normalizeWeatherForecastType(draft.forecastType);
  draft.surfaceMode = normalizeWeatherSurfaceMode(draft.surfaceMode);
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

export function updateWeatherSurfaceMode(draft, surfaceMode) {
  draft.surfaceMode = normalizeWeatherSurfaceMode(surfaceMode);
  return draft;
}

export function buildWeatherWidgetConfig(widget, draft, hass, visibilityConfig) {
  reconcileWeatherConfigDraft(draft, hass, visibilityConfig);
  const config = {
    ...widget,
    entityId: draft.entityId || "",
    forecastType: normalizeWeatherForecastType(draft.forecastType),
  };
  if (widget.kind === "weather") {
    config.surfaceMode = normalizeWeatherSurfaceMode(draft.surfaceMode);
  }
  return config;
}

function createWeatherSurfaceModeField(draft, onChange, helpers) {
  const { configOptionLabel, t } = helpers;
  const group = document.createElement("fieldset");
  group.className = "mha-widget-config-choice-group";

  const legend = document.createElement("legend");
  legend.className = "mha-widget-config-label";
  legend.textContent = t("widgets.weather.surface", "Widget background");
  group.append(legend);

  const choices = document.createElement("div");
  choices.className = "mha-widget-config-choices";
  WEATHER_SURFACE_OPTIONS.forEach((option) => {
    const choice = document.createElement("label");
    choice.className = "mha-widget-config-choice";

    const input = document.createElement("input");
    input.className = "mha-widget-config-choice-input";
    input.type = "radio";
    input.name = "weather-surface-mode";
    input.value = option.value;
    input.checked = option.value === draft.surfaceMode;
    input.addEventListener("change", (event) => {
      if (!event.currentTarget.checked) return;
      updateWeatherSurfaceMode(draft, event.currentTarget.value);
      onChange?.();
    });

    const label = document.createElement("span");
    label.textContent = configOptionLabel("widgets.weather.surfaceModes", option);
    choice.append(input, label);
    choices.append(choice);
  });
  group.append(choices);
  return group;
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
  if (supportsWeatherSurfaceModeConfig(session.widget, session.themeStyle)) {
    fields.append(createWeatherSurfaceModeField(draft, onChange, helpers));
  }
  return { fields, canSave: Boolean(selected) };
}
