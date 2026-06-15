import { resolveAuthorizedEntity } from "./entity-access.js";

const WEATHER_LABELS = new Map([
  ["sunny", "Ensoleillé"],
  ["clear-night", "Nuit claire"],
  ["clear", "Ensoleillé"],
  ["cloudy", "Nuageux"],
  ["cloud", "Nuageux"],
  ["partlycloudy", "Part. nuageux"],
  ["partly-cloudy", "Part. nuageux"],
  ["partly_cloudy", "Part. nuageux"],
  ["rainy", "Pluie"],
  ["rain", "Pluie"],
  ["pouring", "Forte pluie"],
  ["lightning", "Orage"],
  ["lightning-rainy", "Orage"],
  ["thunderstorm", "Orage"],
  ["snowy", "Neige"],
  ["snow", "Neige"],
  ["snowy-rainy", "Neige/pluie"],
  ["fog", "Brouillard"],
  ["foggy", "Brouillard"],
  ["windy", "Venteux"],
  ["windy-variant", "Venteux"],
  ["hail", "Grêle"],
  ["exceptional", "Météo active"],
]);

export function normalizeWeatherCondition(condition = "") {
  return String(condition || "unknown").trim().toLowerCase();
}

export function getWeatherSummary(condition = "") {
  return WEATHER_LABELS.get(normalizeWeatherCondition(condition)) || "Météo";
}

function formatMetric(value, unit = "") {
  if (value == null || value === "") return "";
  return `${value}${unit ? ` ${unit}` : ""}`;
}

function formatTemperature(value, unit = "°") {
  if (value == null || value === "") return "";
  return `${value}${unit === "°" || String(unit).startsWith("°") ? unit : ` ${unit}`}`;
}

function formatForecastDay(datetime, index) {
  const date = datetime ? new Date(datetime) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return date.toLocaleDateString([], { weekday: "short" }).replace(".", "");
  }
  return `J+${index + 1}`;
}

export function buildWeatherModel(hass, widget = {}, visibilityConfig) {
  const access = resolveAuthorizedEntity(hass, widget, {
    allowedDomains: ["weather"],
    visibilityConfig,
  });
  const attributes = access.entityState?.attributes || {};
  const temperatureUnit = attributes.temperature_unit
    || hass?.config?.unit_system?.temperature
    || "°";
  const windUnit = attributes.wind_speed_unit
    || hass?.config?.unit_system?.wind_speed
    || "";
  const forecast = Array.isArray(attributes.forecast)
    ? attributes.forecast.slice(0, 4).map((item, index) => {
      const high = formatTemperature(item.temperature, temperatureUnit);
      const low = formatTemperature(item.templow, temperatureUnit);
      return {
        day: formatForecastDay(item.datetime, index),
        condition: normalizeWeatherCondition(item.condition),
        temp: [high, low].filter(Boolean).join(" / "),
      };
    })
    : [];

  return {
    ...access,
    condition: normalizeWeatherCondition(access.entityState?.state),
    summary: getWeatherSummary(access.entityState?.state),
    temperature: formatTemperature(attributes.temperature, temperatureUnit),
    humidity: formatMetric(attributes.humidity, "%"),
    wind: formatMetric(attributes.wind_speed, windUnit),
    forecast,
  };
}
