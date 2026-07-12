import { resolveAuthorizedEntity } from "./entity-access.js";
import { getFriendlyEntityName } from "./entity-filters.js";
import {
  discoverWeatherPageSources,
  resolveWeatherAttributeUnit,
  resolveWeatherPageSourcesFromState,
} from "./weather-page-discovery.js";

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function toFiniteNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function resolveWeatherPageSources(hass, visibilityConfig, options = {}) {
  return resolveWeatherPageSourcesFromState(hass, visibilityConfig, options);
}

export { discoverWeatherPageSources };

function normalizeDisplayValue(value) {
  if (Array.isArray(value)) {
    return value
      .map(item => normalizeDisplayValue(item))
      .filter(item => item && item !== "--")
      .join(" · ") || "--";
  }
  if (value && typeof value === "object") {
    const preferred = [
      value.title,
      value.headline,
      value.summary,
      value.message,
      value.description,
      value.event,
      value.text,
      value.name,
    ].find(hasValue);
    return preferred == null ? "--" : String(preferred);
  }
  return hasValue(value) ? String(value) : "--";
}

function formatMetricValue(value, unit = "") {
  const normalizedValue = normalizeDisplayValue(value);
  if (normalizedValue === "--") return normalizedValue;
  const normalizedUnit = String(unit || "").trim();
  return `${normalizedValue}${normalizedUnit ? ` ${normalizedUnit}` : ""}`;
}

function formatSunTime(value) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function resolveSunProgress({ nextRising = "", nextSetting = "", isDay = false, now = Date.now() } = {}) {
  const rising = new Date(nextRising).getTime();
  const setting = new Date(nextSetting).getTime();
  if (!Number.isFinite(rising) || !Number.isFinite(setting) || !isDay) return 0;
  const previousRising = rising > now ? rising - 24 * 60 * 60 * 1000 : rising;
  const duration = setting - previousRising;
  if (duration <= 0) return 0;
  return clamp((now - previousRising) / duration);
}

function inferAirQualityMeasurement({ deviceClass = "", unit = "", sourceName = "", attribute = "" } = {}) {
  const text = normalizeText([deviceClass, unit, sourceName, attribute].filter(Boolean).join(" "));
  if (text.includes("pm2.5") || text.includes("pm25")) return "pm25";
  if (text.includes("pm10")) return "pm10";
  if (text.includes("aqhi") || text.includes("cote air sante") || /\bcas\b/.test(text)) return "aqhi";
  if (text.includes("aqi") || deviceClass === "aqi") return "aqi";
  return "generic";
}

function resolveAirQualityMeasurement(metricKey = "", context = {}) {
  if (metricKey === "air-quality-pm1") return "pm1";
  if (metricKey === "air-quality-pm25") return "pm25";
  if (metricKey === "air-quality-pm10") return "pm10";
  if (metricKey.startsWith("air-quality-")) return metricKey.slice("air-quality-".length);
  return inferAirQualityMeasurement(context);
}

function buildSunMetricModel(hass, widget, visibilityConfig) {
  const access = resolveAuthorizedEntity(hass, widget.entityId, {
    allowedDomains: ["sun"],
    visibilityConfig,
  });
  const attributes = access.entityState?.attributes || {};
  const nextRising = attributes.next_rising || "";
  const nextSetting = attributes.next_setting || "";
  const isDay = access.entityState?.state === "above_horizon";
  return {
    ...access,
    metricKey: "sun",
    icon: widget.icon || "sunrise",
    title: widget.label || "Sunrise & sunset",
    value: formatSunTime(nextRising),
    secondaryValue: formatSunTime(nextSetting),
    rawValue: null,
    valueNumber: null,
    valueKind: "sun",
    unit: "",
    deviceClass: "sun",
    measurementType: "sun",
    nextRising,
    nextSetting,
    isDay,
    progress: resolveSunProgress({ nextRising, nextSetting, isDay }),
    sourceName: access.entityState ? getFriendlyEntityName(access.entityState, access.entityId) : "",
  };
}

export function buildWeatherPageData(hass, visibilityConfig) {
  const sources = resolveWeatherPageSources(hass, visibilityConfig);
  const metrics = Object.fromEntries(sources.metrics.map(source => {
    const model = buildWeatherMetricModel(hass, {
      metricKey: source.key,
      icon: source.icon,
      label: source.label,
      sourceType: source.sourceType,
      entityId: source.entityId,
      attribute: source.attribute,
      unit: source.unit,
      valueKind: source.valueKind,
    }, visibilityConfig);
    return [source.key === "air-quality" ? "airQuality" : source.key, model];
  }));

  return {
    weatherEntityId: sources.weatherEntityId,
    metrics,
  };
}

export function buildWeatherMetricModel(hass, widget = {}, visibilityConfig) {
  if (widget.sourceType === "sun" || widget.metricKey === "sun") {
    return buildSunMetricModel(hass, widget, visibilityConfig);
  }

  const allowedDomains = widget.sourceType === "weather-attribute"
    ? ["weather"]
    : ["sensor"];
  const access = resolveAuthorizedEntity(hass, widget.entityId, {
    allowedDomains,
    visibilityConfig,
  });
  const attributes = access.entityState?.attributes || {};
  const rawValue = widget.sourceType === "weather-attribute"
    ? attributes[widget.attribute]
    : access.entityState?.state;
  const unit = widget.unit
    || (widget.sourceType === "weather-attribute"
      ? resolveWeatherAttributeUnit(attributes, widget.attribute)
      : attributes.unit_of_measurement)
    || "";
  const deviceClass = String(attributes.device_class || "").trim().toLowerCase();
  const sourceName = access.entityState ? getFriendlyEntityName(access.entityState, access.entityId) : "";
  const metricKey = widget.metricKey || "metric";
  const measurementType = metricKey.startsWith("air-quality")
    ? resolveAirQualityMeasurement(metricKey, {
      deviceClass,
      unit,
      sourceName,
      attribute: widget.attribute,
    })
    : metricKey || deviceClass || "metric";

  return {
    ...access,
    metricKey,
    icon: widget.icon || "weather",
    title: widget.label || sourceName,
    value: formatMetricValue(rawValue, unit),
    secondaryValue: "",
    rawValue,
    valueNumber: toFiniteNumber(rawValue),
    valueKind: widget.valueKind === "text" ? "text" : "number",
    unit,
    deviceClass,
    measurementType,
    windBearing: toFiniteNumber(attributes.wind_bearing),
    windGust: toFiniteNumber(attributes.wind_gust_speed),
    sourceName,
  };
}
