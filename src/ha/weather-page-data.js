import { resolveAuthorizedEntity } from "./entity-access.js";
import { getAvailableEntitiesForDomain, getFriendlyEntityName } from "./entity-filters.js";

const METRIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: "humidity",
    icon: "humidity",
    attributes: Object.freeze(["humidity"]),
    deviceClasses: Object.freeze(["humidity"]),
    keywords: Object.freeze(["humidity", "humidite", "humidité"]),
    fallbackUnit: "%",
  }),
  Object.freeze({
    key: "precipitation",
    icon: "umbrella",
    attributes: Object.freeze(["precipitation_probability", "precipitation"]),
    deviceClasses: Object.freeze(["precipitation", "precipitation_intensity"]),
    keywords: Object.freeze(["precipitation", "precipitations", "rain", "pluie"]),
  }),
  Object.freeze({
    key: "wind",
    icon: "wind",
    attributes: Object.freeze(["wind_speed", "wind_gust_speed"]),
    deviceClasses: Object.freeze(["wind_speed"]),
    keywords: Object.freeze(["wind", "vent"]),
  }),
  Object.freeze({
    key: "pressure",
    icon: "pressure",
    attributes: Object.freeze(["pressure"]),
    deviceClasses: Object.freeze(["atmospheric_pressure", "pressure"]),
    keywords: Object.freeze(["pressure", "pression", "barometer", "barometre", "baromètre"]),
  }),
  Object.freeze({
    key: "uv",
    icon: "uv",
    attributes: Object.freeze(["uv_index"]),
    deviceClasses: Object.freeze(["uv_index"]),
    keywords: Object.freeze(["uv index", "indice uv", "ultraviolet"]),
  }),
  Object.freeze({
    key: "air-quality",
    icon: "air-quality",
    attributes: Object.freeze(["air_quality_index", "aqi"]),
    deviceClasses: Object.freeze([
      "aqi",
      "pm25",
      "pm10",
      "carbon_dioxide",
      "volatile_organic_compounds",
      "volatile_organic_compounds_parts",
    ]),
    keywords: Object.freeze([
      "air quality",
      "qualite air",
      "qualité air",
      "aqi",
      "aqhi",
      "cote air sante",
      "côte air santé",
      "cas",
      "pm2.5",
      "pm25",
      "pm10",
    ]),
  }),
  Object.freeze({
    key: "visibility",
    icon: "visibility",
    attributes: Object.freeze(["visibility"]),
    deviceClasses: Object.freeze(["distance"]),
    keywords: Object.freeze(["visibility", "visibilite", "visibilité"]),
  }),
]);

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

function getSensorSearchText(entity = {}) {
  const state = entity.state || {};
  return normalizeText([
    entity.entity_id,
    entity.name,
    state.attributes?.friendly_name,
    state.attributes?.device_class,
    state.attributes?.unit_of_measurement,
  ].filter(Boolean).join(" "));
}

function scoreSensor(entity, definition) {
  const attributes = entity.state?.attributes || {};
  const deviceClass = String(attributes.device_class || "").trim().toLowerCase();
  const searchText = getSensorSearchText(entity);
  let score = 0;

  if (definition.deviceClasses.includes(deviceClass)) score += 100;
  if (definition.key === "visibility" && deviceClass === "distance" && searchText.includes("visibility")) score += 70;
  definition.keywords.forEach((keyword) => {
    if (searchText.includes(normalizeText(keyword))) score += 20;
  });

  return score;
}

function findBestSensor(sensors, definition) {
  return sensors
    .map(entity => ({ entity, score: scoreSensor(entity, definition) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.entity.name.localeCompare(b.entity.name))[0]?.entity || null;
}

function resolveWeatherAttributeUnit(attributes = {}, attribute = "", fallbackUnit = "") {
  if (attribute === "humidity" || attribute === "precipitation_probability") return "%";
  if (attribute === "wind_speed" || attribute === "wind_gust_speed") return attributes.wind_speed_unit || fallbackUnit;
  if (attribute === "pressure") return attributes.pressure_unit || fallbackUnit;
  if (attribute === "visibility") return attributes.visibility_unit || fallbackUnit;
  if (attribute === "precipitation") return attributes.precipitation_unit || fallbackUnit;
  return fallbackUnit;
}

function createMetricSourceFromWeather(weatherEntity, definition) {
  const attributes = weatherEntity?.state?.attributes || {};
  const attribute = definition.attributes.find(name => hasValue(attributes[name]));
  if (!attribute) return null;

  return {
    key: definition.key,
    icon: definition.icon,
    sourceType: "weather-attribute",
    weatherEntityId: weatherEntity.entity_id,
    entityId: weatherEntity.entity_id,
    attribute,
    unit: resolveWeatherAttributeUnit(attributes, attribute, definition.fallbackUnit || ""),
  };
}

function createMetricSourceFromSensor(sensor, definition) {
  if (!sensor) return null;
  return {
    key: definition.key,
    icon: definition.icon,
    sourceType: "entity",
    entityId: sensor.entity_id,
    attribute: "",
    unit: sensor.state?.attributes?.unit_of_measurement || definition.fallbackUnit || "",
  };
}

export function resolveWeatherPageSources(hass, visibilityConfig) {
  const weatherEntities = getAvailableEntitiesForDomain(hass, "weather", visibilityConfig);
  const sensors = getAvailableEntitiesForDomain(hass, "sensor", visibilityConfig);
  const sunEntities = getAvailableEntitiesForDomain(hass, "sun", visibilityConfig);
  const weatherEntity = weatherEntities[0] || null;

  const metrics = METRIC_DEFINITIONS.map((definition) => (
    createMetricSourceFromWeather(weatherEntity, definition)
    || createMetricSourceFromSensor(findBestSensor(sensors, definition), definition)
  )).filter(Boolean);

  const sunEntity = sunEntities.find(entity => (
    hasValue(entity.state?.attributes?.next_rising)
    || hasValue(entity.state?.attributes?.next_setting)
  )) || null;

  if (sunEntity) {
    metrics.push({
      key: "sun",
      icon: "sunrise",
      sourceType: "sun",
      entityId: sunEntity.entity_id,
      attribute: "",
      unit: "",
    });
  }

  return {
    weatherEntityId: weatherEntity?.entity_id || "",
    metrics,
  };
}

function formatMetricValue(value, unit = "") {
  if (!hasValue(value)) return "--";
  const normalizedUnit = String(unit || "").trim();
  return `${value}${normalizedUnit ? ` ${normalizedUnit}` : ""}`;
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
      sourceType: source.sourceType,
      entityId: source.entityId,
      attribute: source.attribute,
      unit: source.unit,
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
  const measurementType = widget.metricKey === "air-quality"
    ? inferAirQualityMeasurement({
      deviceClass,
      unit,
      sourceName,
      attribute: widget.attribute,
    })
    : widget.metricKey || deviceClass || "metric";

  return {
    ...access,
    metricKey: widget.metricKey || "metric",
    icon: widget.icon || "weather",
    title: widget.label || sourceName,
    value: formatMetricValue(rawValue, unit),
    secondaryValue: "",
    rawValue,
    valueNumber: toFiniteNumber(rawValue),
    unit,
    deviceClass,
    measurementType,
    windBearing: toFiniteNumber(attributes.wind_bearing),
    windGust: toFiniteNumber(attributes.wind_gust_speed),
    sourceName,
  };
}
