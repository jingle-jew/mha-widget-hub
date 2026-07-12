import { resolveAuthorizedEntity } from "./entity-access.js";
import { getFriendlyEntityName } from "./entity-filters.js";
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
  ["freezing-rainy", "widgets.weatherConditions.freezingRainy"],
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

function toFiniteNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
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
  windUnit = "",
  limit = 5,
} = {}) {
  if (!Array.isArray(forecast)) return [];
  return forecast.slice(0, limit).map((item, index) => {
    const temperatureValue = toFiniteNumber(item.temperature);
    const lowTemperatureValue = toFiniteNumber(item.templow);
    const precipitationProbability = toFiniteNumber(item.precipitation_probability);
    const precipitation = toFiniteNumber(item.precipitation);
    const apparentTemperatureValue = toFiniteNumber(
      item.apparent_temperature ?? item.feels_like_temperature,
    );
    const humidityValue = toFiniteNumber(item.humidity);
    const windSpeedValue = toFiniteNumber(item.wind_speed);
    const windGustValue = toFiniteNumber(item.wind_gust_speed ?? item.wind_gust);
    const uvIndexValue = toFiniteNumber(item.uv_index ?? item.uv);
    const high = formatTemperature(item.temperature, temperatureUnit);
    const low = formatTemperature(item.templow, temperatureUnit);
    return {
      datetime: item.datetime || "",
      day: type === "hourly"
        ? formatForecastHour(item.datetime, index)
        : formatForecastDay(item.datetime, index),
      condition: normalizeWeatherCondition(item.condition),
      high,
      low,
      temp: type === "hourly" ? high : [high, low].filter(Boolean).join(" / "),
      temperatureValue,
      lowTemperatureValue,
      precipitationProbability,
      precipitation,
      apparentTemperatureValue,
      humidityValue,
      windSpeedValue,
      windGustValue,
      windUnit: item.wind_speed_unit || windUnit,
      uvIndexValue,
    };
  }).filter(item => item.condition || item.temp);
}

function normalizeWeatherAlerts(attributes = {}) {
  const source = attributes.alerts ?? attributes.warnings ?? attributes.advisories;
  const values = Array.isArray(source) ? source : source == null ? [] : [source];
  return values.map((value) => {
    if (value && typeof value === "object") {
      return String(
        value.title
          || value.headline
          || value.summary
          || value.description
          || value.message
          || value.event
          || "",
      ).trim();
    }
    return String(value || "").trim();
  }).filter(Boolean);
}

function getPrimaryTemperatureRange(dailyForecast = [], legacyForecast = [], hourlyForecast = []) {
  const source = dailyForecast.find(item => item.high || item.low)
    || legacyForecast.find(item => item.high || item.low)
    || hourlyForecast.find(item => item.high || item.low)
    || null;

  if (!source) {
    return { high: "", low: "", range: "" };
  }

  const high = source.high || "";
  const low = source.low || "";
  return {
    high,
    low,
    range: [high, low].filter(Boolean).join(" / "),
  };
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
    windUnit,
    limit: 8,
  });
  const hourlyForecast = normalizeWeatherForecasts(forecastBundle?.hourly, {
    type: "hourly",
    temperatureUnit,
    windUnit,
    limit: 24,
  });
  const legacyForecast = normalizeWeatherForecasts(attributes.forecast, {
    type: "daily",
    temperatureUnit,
    windUnit,
    limit: 8,
  });
  const preferredForecastType = widget?.forecastType === "hourly" ? "hourly" : "daily";
  const forecast = preferredForecastType === "hourly"
    ? (hourlyForecast.length ? hourlyForecast : dailyForecast.length ? dailyForecast : legacyForecast)
    : (dailyForecast.length ? dailyForecast : hourlyForecast.length ? hourlyForecast : legacyForecast);
  const resolvedForecastType = preferredForecastType === "hourly"
    ? (hourlyForecast.length ? "hourly" : dailyForecast.length ? "daily" : legacyForecast.length ? "legacy" : "none")
    : (dailyForecast.length ? "daily" : hourlyForecast.length ? "hourly" : legacyForecast.length ? "legacy" : "none");
  const temperatureRange = getPrimaryTemperatureRange(dailyForecast, legacyForecast, hourlyForecast);

  return {
    ...access,
    condition: normalizeWeatherCondition(access.entityState?.state),
    summary: getWeatherSummary(access.entityState?.state),
    location: access.entityState ? getFriendlyEntityName(access.entityState, access.entityId) : "",
    temperature: formatTemperature(attributes.temperature, temperatureUnit),
    temperatureValue: toFiniteNumber(attributes.temperature),
    temperatureUnit,
    humidity: formatMetric(attributes.humidity, "%"),
    humidityValue: toFiniteNumber(attributes.humidity),
    wind: formatMetric(attributes.wind_speed, windUnit),
    windSpeedValue: toFiniteNumber(attributes.wind_speed),
    windGustValue: toFiniteNumber(attributes.wind_gust_speed),
    windUnit,
    windBearing: toFiniteNumber(attributes.wind_bearing),
    apparentTemperatureValue: toFiniteNumber(
      attributes.apparent_temperature ?? attributes.feels_like_temperature,
    ),
    apparentTemperature: formatTemperature(
      attributes.apparent_temperature ?? attributes.feels_like_temperature,
      temperatureUnit,
    ),
    cloudCoverageValue: toFiniteNumber(attributes.cloud_coverage),
    precipitationProbability: toFiniteNumber(attributes.precipitation_probability),
    precipitationValue: toFiniteNumber(attributes.precipitation),
    uvIndexValue: toFiniteNumber(attributes.uv_index ?? attributes.uv),
    pressureValue: toFiniteNumber(attributes.pressure),
    visibilityValue: toFiniteNumber(attributes.visibility),
    highTemperature: temperatureRange.high,
    lowTemperature: temperatureRange.low,
    temperatureRange: temperatureRange.range,
    dailyForecast,
    hourlyForecast,
    alerts: normalizeWeatherAlerts(attributes),
    forecast,
    forecastType: resolvedForecastType,
  };
}
