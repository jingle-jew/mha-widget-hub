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

function formatForecastHour(datetime, index) {
  const date = datetime ? new Date(datetime) : null;
  if (date && !Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString([], { hour: "2-digit" }).replace(/\s/g, "");
  }
  return `H+${index + 1}`;
}

export function normalizeWeatherForecasts(forecast = [], {
  type = "daily",
  temperatureUnit = "°",
} = {}) {
  if (!Array.isArray(forecast)) return [];
  return forecast.slice(0, 4).map((item, index) => {
    const high = formatTemperature(item.temperature, temperatureUnit);
    const low = formatTemperature(item.templow, temperatureUnit);
    return {
      day: type === "hourly"
        ? formatForecastHour(item.datetime, index)
        : formatForecastDay(item.datetime, index),
      condition: normalizeWeatherCondition(item.condition),
      temp: type === "hourly" ? high : [high, low].filter(Boolean).join(" / "),
    };
  }).filter(item => item.condition || item.temp);
}

const FORECAST_CACHE_TTL_MS = 10 * 60 * 1000;
const forecastCache = new Map();
const forecastRequests = new Map();

function getForecastCacheKey(entityId = "", type = "daily") {
  return `${entityId}::${type}`;
}

function extractForecastResponse(response, entityId = "") {
  const payload = response?.response || response;
  const entityForecast = payload?.[entityId] || Object.values(payload || {})[0];
  return Array.isArray(entityForecast?.forecast) ? entityForecast.forecast : [];
}

export function clearWeatherForecastCache() {
  forecastCache.clear();
  forecastRequests.clear();
}

export async function fetchWeatherForecasts(hass, entityId = "", type = "daily", {
  now = Date.now,
  ttlMs = FORECAST_CACHE_TTL_MS,
} = {}) {
  if (!entityId || !["daily", "hourly"].includes(type) || typeof hass?.callWS !== "function") {
    return [];
  }

  const key = getForecastCacheKey(entityId, type);
  const cached = forecastCache.get(key);
  const timestamp = now();
  if (cached && timestamp - cached.timestamp < ttlMs) return cached.forecast;
  if (forecastRequests.has(key)) return forecastRequests.get(key);

  const request = hass.callWS({
    type: "call_service",
    domain: "weather",
    service: "get_forecasts",
    service_data: { type },
    target: { entity_id: entityId },
    return_response: true,
  }).then(response => {
    const forecast = extractForecastResponse(response, entityId);
    forecastCache.set(key, { timestamp: now(), forecast });
    return forecast;
  }).catch(error => {
    console.warn(`[mha-widget-hub] Weather ${type} forecast unavailable for ${entityId}.`, error);
    forecastCache.set(key, { timestamp: now(), forecast: [] });
    return [];
  }).finally(() => {
    forecastRequests.delete(key);
  });

  forecastRequests.set(key, request);
  return request;
}

export async function fetchWeatherForecastBundle(hass, entityId = "") {
  const [daily, hourly] = await Promise.all([
    fetchWeatherForecasts(hass, entityId, "daily"),
    fetchWeatherForecasts(hass, entityId, "hourly"),
  ]);
  return { daily, hourly };
}

export function buildWeatherModel(hass, widget = {}, visibilityConfig, forecastBundle = null) {
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
  const dailyForecast = normalizeWeatherForecasts(forecastBundle?.daily, {
    type: "daily",
    temperatureUnit,
  });
  const hourlyForecast = normalizeWeatherForecasts(forecastBundle?.hourly, {
    type: "hourly",
    temperatureUnit,
  });
  const legacyForecast = normalizeWeatherForecasts(attributes.forecast, {
    type: "daily",
    temperatureUnit,
  });
  const forecast = dailyForecast.length
    ? dailyForecast
    : hourlyForecast.length
      ? hourlyForecast
      : legacyForecast;

  return {
    ...access,
    condition: normalizeWeatherCondition(access.entityState?.state),
    summary: getWeatherSummary(access.entityState?.state),
    temperature: formatTemperature(attributes.temperature, temperatureUnit),
    humidity: formatMetric(attributes.humidity, "%"),
    wind: formatMetric(attributes.wind_speed, windUnit),
    forecast,
    forecastType: dailyForecast.length
      ? "daily"
      : hourlyForecast.length
        ? "hourly"
        : legacyForecast.length
          ? "legacy"
          : "none",
  };
}
