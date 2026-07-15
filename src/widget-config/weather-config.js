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
  const { createRadioControl, configOptionLabel, t } = helpers;
  const group = document.createElement("fieldset");
  group.className = "mha-widget-config-choice-group";

  const legend = document.createElement("legend");
  legend.className = "mha-widget-config-label";
  legend.textContent = t("widgets.weather.surface", "Widget background");
  group.append(legend);

  const choices = document.createElement("div");
  choices.className = "mha-widget-config-choices";
  WEATHER_SURFACE_OPTIONS.forEach((option) => {
    const choice = createRadioControl({
      label: configOptionLabel("widgets.weather.surfaceModes", option),
      name: "weather-surface-mode",
      value: option.value,
      checked: option.value === draft.surfaceMode,
      onChange: (value) => {
        updateWeatherSurfaceMode(draft, value);
        onChange?.();
      },
    });
    choices.append(choice);
  });
  group.append(choices);
  return group;
}

export function renderWeatherConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, createSelectControl, configOptionLabel, t } = helpers;
  const { draft, options, selected } = reconcileWeatherConfigDraft(
    session.draft,
    hass,
    visibilityConfig,
  );
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const entityLabel = t("widgets.config.weatherEntity", "Weather entity");
  const select = createSelectControl({
    label: entityLabel,
    value: draft.entityId,
    disabled: !options.length,
    options: options.length
      ? options
      : [{
        value: "",
        label: t("widgets.config.noWeatherEntity", "No authorized and available weather entity."),
      }],
    onChange: (value) => {
      updateWeatherEntity(draft, value);
      onChange?.({ rerender: true });
    },
  });

  const forecastLabel = t("widgets.weather.forecast", "Forecasts");
  const forecastSelect = createSelectControl({
    label: forecastLabel,
    value: draft.forecastType,
    options: WEATHER_FORECAST_OPTIONS.map(option => ({
      value: option.value,
      label: configOptionLabel("widgets.weather.forecastTypes", option),
    })),
    onChange: (value) => {
      updateWeatherForecastType(draft, value);
      onChange?.();
    },
  });

  fields.append(
    createField(entityLabel, select),
    createField(forecastLabel, forecastSelect),
  );
  if (supportsWeatherSurfaceModeConfig(session.widget, session.themeStyle)) {
    fields.append(createWeatherSurfaceModeField(draft, onChange, helpers));
  }
  return { fields, canSave: Boolean(selected) };
}
