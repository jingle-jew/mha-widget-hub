import { resolveAuthorizedEntity } from "./entity-access.js";
import { t } from "../i18n/index.js";

const WEATHER_LABELS = new Map([
  ["sunny", "widgets.weatherConditions.sunny"],
  ["clear-night", "widgets.weatherConditions.clearNight"],
  ["clear", "widgets.weatherConditions.sunny"],
  ["cloudy", "widgets.weatherConditions.cloudy"],
  ["cloud", "widgets.weatherConditions.cloudy"],
  ["partlycloudy", "widgets.weatherConditions.partlyCloudy"],
  ["partly-cloudy", "widgets.weatherConditions.partlyCloudy"],
  ["partly_cloudy", "widgets.weatherConditions.partlyCloudy"],
  ["rainy", "widgets.weatherConditions.rainy"],
  ["rain", "widgets.weatherConditions.rainy"],
  ["pouring", "widgets.weatherConditions.pouring"],
  ["lightning", "widgets.weatherConditions.lightning"],
  ["lightning-rainy", "widgets.weatherConditions.lightningRainy"],
  ["thunderstorm", "widgets.weatherConditions.lightning"],
  ["snowy", "widgets.weatherConditions.snowy"],
  ["snow", "widgets.weatherConditions.snowy"],
  ["snowy-rainy", "widgets.weatherConditions.snowyRainy"],
  ["fog", "widgets.weatherConditions.fog"],
  ["foggy", "widgets.weatherConditions.fog"],
  ["windy", "widgets.weatherConditions.windy"],
  ["windy-variant", "widgets.weatherConditions.windy"],
  ["hail", "widgets.weatherConditions.hail"],
  ["exceptional", "widgets.weatherConditions.exceptional"],
]);

export function normalizeWeatherCondition(condition = "") {
  return String(condition || "unknown").trim().toLowerCase();
}

export function getWeatherSummary(condition = "") {
  const key = WEATHER_LABELS.get(normalizeWeatherCondition(condition));
  return key ? t(key) : t("widgets.weather.title", "Weather");
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
  return `D+${index + 1}`;
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
  const preferredForecastType = widget?.forecastType === "hourly" ? "hourly" : "daily";
  const forecast = preferredForecastType === "hourly"
    ? (hourlyForecast.length ? hourlyForecast : dailyForecast.length ? dailyForecast : legacyForecast)
    : (dailyForecast.length ? dailyForecast : hourlyForecast.length ? hourlyForecast : legacyForecast);
  const resolvedForecastType = preferredForecastType === "hourly"
    ? (hourlyForecast.length ? "hourly" : dailyForecast.length ? "daily" : legacyForecast.length ? "legacy" : "none")
    : (dailyForecast.length ? "daily" : hourlyForecast.length ? "hourly" : legacyForecast.length ? "legacy" : "none");

  return {
    ...access,
    condition: normalizeWeatherCondition(access.entityState?.state),
    summary: getWeatherSummary(access.entityState?.state),
    temperature: formatTemperature(attributes.temperature, temperatureUnit),
    humidity: formatMetric(attributes.humidity, "%"),
    wind: formatMetric(attributes.wind_speed, windUnit),
    forecast,
    forecastType: resolvedForecastType,
  };
}
