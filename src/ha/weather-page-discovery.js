import { getAvailableEntitiesForDomain } from "./entity-filters.js";
import { resolveWeatherRadarSource } from "./weather-radar.js";

const REGISTRY_TIMEOUT_MS = 1800;
const GENERIC_WEATHER_WORDS = new Set([
  "weather",
  "forecast",
  "prevision",
  "previsions",
  "meteo",
  "sensor",
  "station",
  "current",
  "conditions",
]);

export const WEATHER_METRIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    key: "humidity",
    icon: "humidity",
    label: "Humidity",
    attributes: Object.freeze(["humidity"]),
    deviceClasses: Object.freeze(["humidity"]),
    keywords: Object.freeze(["humidity", "humidite", "humidité"]),
    fallbackUnit: "%",
    priority: 100,
  }),
  Object.freeze({
    key: "apparent-temperature",
    icon: "temperature",
    label: "Feels like",
    attributes: Object.freeze(["apparent_temperature", "feels_like_temperature"]),
    deviceClasses: Object.freeze(["temperature"]),
    keywords: Object.freeze(["apparent temperature", "feels like", "feels like temperature", "ressentie", "ressenti", "humidex", "wind chill", "refroidissement eolien", "refroidissement éolien"]),
    entityIdSuffixes: Object.freeze(["apparent_temperature", "feels_like_temperature", "humidex", "wind_chill"]),
    requiresKeyword: true,
    preferredSize: Object.freeze({ w: 2, h: 1 }),
    priority: 96,
  }),
  Object.freeze({
    key: "dew-point",
    icon: "temperature",
    label: "Dew point",
    attributes: Object.freeze(["dew_point"]),
    deviceClasses: Object.freeze(["temperature"]),
    keywords: Object.freeze(["dew point", "point de rosee", "point de rosée"]),
    entityIdSuffixes: Object.freeze(["dew_point"]),
    requiresKeyword: true,
    preferredSize: Object.freeze({ w: 2, h: 1 }),
    priority: 94,
  }),
  Object.freeze({
    key: "precipitation-probability",
    icon: "umbrella",
    label: "Precipitation probability",
    attributes: Object.freeze(["precipitation_probability"]),
    deviceClasses: Object.freeze(["precipitation_probability"]),
    keywords: Object.freeze(["precipitation probability", "chance of rain", "chance of precipitation", "probabilite precipitation", "probabilité précipitation", "probabilite pluie", "probabilité pluie"]),
    entityIdSuffixes: Object.freeze(["precipitation_probability", "chance_of_precipitation"]),
    fallbackUnit: "%",
    priority: 93,
  }),
  Object.freeze({
    key: "precipitation",
    icon: "umbrella",
    label: "Precipitation",
    attributes: Object.freeze(["precipitation", "rain", "snow"]),
    deviceClasses: Object.freeze(["precipitation"]),
    keywords: Object.freeze(["precipitation", "rain amount", "snow amount", "rain", "snow", "pluie", "neige"]),
    entityIdSuffixes: Object.freeze(["precipitation", "rain", "snow"]),
    priority: 91,
  }),
  Object.freeze({
    key: "precipitation-rate",
    icon: "umbrella",
    label: "Precipitation rate",
    attributes: Object.freeze(["precipitation_rate", "precipitation_intensity"]),
    deviceClasses: Object.freeze(["precipitation_intensity"]),
    keywords: Object.freeze(["precipitation rate", "precipitation intensity", "rain rate", "taux precipitation", "taux précipitation", "intensite precipitation", "intensité précipitation"]),
    entityIdSuffixes: Object.freeze(["precipitation_rate", "precipitation_intensity", "rain_rate"]),
    priority: 90,
  }),
  Object.freeze({
    key: "snow-depth",
    icon: "snowflake",
    label: "Snow depth",
    attributes: Object.freeze(["snow_depth"]),
    deviceClasses: Object.freeze(["distance"]),
    keywords: Object.freeze(["snow depth", "snow accumulation", "hauteur neige", "accumulation neige"]),
    requiresKeyword: true,
    priority: 82,
  }),
  Object.freeze({
    key: "wind",
    icon: "wind",
    label: "Wind",
    attributes: Object.freeze(["wind_speed"]),
    deviceClasses: Object.freeze(["wind_speed"]),
    keywords: Object.freeze(["wind speed", "vent", "vitesse vent"]),
    entityIdSuffixes: Object.freeze(["wind_speed", "vitesse_du_vent"]),
    priority: 98,
  }),
  Object.freeze({
    key: "wind-gust",
    icon: "wind",
    label: "Wind gusts",
    attributes: Object.freeze(["wind_gust_speed"]),
    deviceClasses: Object.freeze(["wind_speed"]),
    keywords: Object.freeze(["wind gust", "gust speed", "rafale", "rafales"]),
    entityIdSuffixes: Object.freeze(["wind_gust", "wind_gust_speed"]),
    requiresKeyword: true,
    preferredSize: Object.freeze({ w: 2, h: 1 }),
    priority: 89,
  }),
  Object.freeze({
    key: "pressure",
    icon: "pressure",
    label: "Pressure",
    attributes: Object.freeze(["pressure"]),
    deviceClasses: Object.freeze(["atmospheric_pressure", "pressure"]),
    keywords: Object.freeze(["pressure", "pression", "barometer", "barometre", "baromètre"]),
    entityIdSuffixes: Object.freeze(["pressure", "barometric_pressure"]),
    priority: 97,
  }),
  Object.freeze({
    key: "pressure-tendency",
    icon: "pressure",
    label: "Pressure tendency",
    attributes: Object.freeze(["pressure_tendency"]),
    deviceClasses: Object.freeze([]),
    keywords: Object.freeze(["pressure tendency", "tendance pression", "barometric tendency"]),
    entityIdSuffixes: Object.freeze(["tendency", "pressure_tendency", "barometric_tendency"]),
    valueKind: "text",
    preferredSize: Object.freeze({ w: 2, h: 1 }),
    priority: 115,
  }),
  Object.freeze({
    key: "visibility",
    icon: "visibility",
    label: "Visibility",
    attributes: Object.freeze(["visibility"]),
    deviceClasses: Object.freeze(["distance"]),
    keywords: Object.freeze(["visibility", "visibilite", "visibilité"]),
    entityIdSuffixes: Object.freeze(["visibility"]),
    requiresKeywordForDeviceClass: true,
    priority: 88,
  }),
  Object.freeze({
    key: "cloud-coverage",
    icon: "fog",
    label: "Cloud coverage",
    attributes: Object.freeze(["cloud_coverage"]),
    deviceClasses: Object.freeze([]),
    keywords: Object.freeze(["cloud coverage", "cloudiness", "couverture nuageuse", "nebulosite", "nébulosité"]),
    entityIdSuffixes: Object.freeze(["cloud_coverage", "cloudiness"]),
    fallbackUnit: "%",
    priority: 84,
  }),
  Object.freeze({
    key: "uv",
    icon: "uv",
    label: "UV index",
    attributes: Object.freeze(["uv_index"]),
    deviceClasses: Object.freeze(["uv_index"]),
    keywords: Object.freeze(["uv index", "indice uv", "ultraviolet"]),
    entityIdSuffixes: Object.freeze(["uv_index"]),
    priority: 86,
  }),
  Object.freeze({
    key: "ozone",
    icon: "uv",
    label: "Ozone",
    attributes: Object.freeze(["ozone"]),
    deviceClasses: Object.freeze(["ozone"]),
    keywords: Object.freeze(["ozone", "o3"]),
    entityIdSuffixes: Object.freeze(["ozone", "o3"]),
    priority: 66,
  }),
  Object.freeze({
    key: "solar-radiation",
    icon: "sun",
    label: "Solar radiation",
    attributes: Object.freeze(["solar_radiation"]),
    deviceClasses: Object.freeze(["irradiance"]),
    keywords: Object.freeze(["solar radiation", "irradiance", "rayonnement solaire"]),
    priority: 74,
  }),
  Object.freeze({
    key: "illuminance",
    icon: "sun",
    label: "Illuminance",
    attributes: Object.freeze(["illuminance"]),
    deviceClasses: Object.freeze(["illuminance"]),
    keywords: Object.freeze(["illuminance", "luminosite exterieure", "luminosité extérieure"]),
    priority: 62,
  }),
  Object.freeze({
    key: "sunshine-duration",
    icon: "sun",
    label: "Sunshine duration",
    attributes: Object.freeze(["sunshine_duration"]),
    deviceClasses: Object.freeze(["duration"]),
    keywords: Object.freeze(["sunshine duration", "duree ensoleillement", "durée ensoleillement"]),
    requiresKeyword: true,
    priority: 61,
  }),
  Object.freeze({
    key: "air-quality",
    icon: "air-quality",
    label: "Air quality",
    attributes: Object.freeze(["air_quality_index", "aqi", "aqhi"]),
    deviceClasses: Object.freeze(["aqi"]),
    keywords: Object.freeze(["air quality", "qualite air", "qualité air", "aqi", "aqhi", "cote air sante", "côte air santé", "cas"]),
    entityIdSuffixes: Object.freeze(["air_quality_index", "aqi", "aqhi", "cas"]),
    priority: 85,
  }),
  Object.freeze({
    key: "air-quality-pm1",
    icon: "air-quality",
    label: "PM1",
    attributes: Object.freeze(["pm1"]),
    deviceClasses: Object.freeze(["pm1"]),
    keywords: Object.freeze(["pm1"]),
    entityIdSuffixes: Object.freeze(["pm1"]),
    priority: 58,
  }),
  Object.freeze({
    key: "air-quality-pm25",
    icon: "air-quality",
    label: "PM2.5",
    attributes: Object.freeze(["pm25", "pm2_5"]),
    deviceClasses: Object.freeze(["pm25"]),
    keywords: Object.freeze(["pm2.5", "pm25", "pm 2.5"]),
    entityIdSuffixes: Object.freeze(["pm25", "pm2_5"]),
    priority: 72,
  }),
  Object.freeze({
    key: "air-quality-pm10",
    icon: "air-quality",
    label: "PM10",
    attributes: Object.freeze(["pm10"]),
    deviceClasses: Object.freeze(["pm10"]),
    keywords: Object.freeze(["pm10", "pm 10"]),
    entityIdSuffixes: Object.freeze(["pm10"]),
    priority: 68,
  }),
  Object.freeze({
    key: "air-quality-co",
    icon: "air-quality",
    label: "Carbon monoxide",
    attributes: Object.freeze(["carbon_monoxide", "co"]),
    deviceClasses: Object.freeze(["carbon_monoxide"]),
    keywords: Object.freeze(["carbon monoxide", "monoxyde carbone"]),
    entityIdSuffixes: Object.freeze(["carbon_monoxide"]),
    priority: 54,
  }),
  Object.freeze({
    key: "air-quality-co2",
    icon: "air-quality",
    label: "Carbon dioxide",
    attributes: Object.freeze(["carbon_dioxide", "co2"]),
    deviceClasses: Object.freeze(["carbon_dioxide"]),
    keywords: Object.freeze(["carbon dioxide", "dioxyde carbone", "co2"]),
    priority: 52,
  }),
  Object.freeze({
    key: "air-quality-no2",
    icon: "air-quality",
    label: "Nitrogen dioxide",
    attributes: Object.freeze(["nitrogen_dioxide", "no2"]),
    deviceClasses: Object.freeze(["nitrogen_dioxide"]),
    keywords: Object.freeze(["nitrogen dioxide", "dioxyde azote", "dioxyde d'azote", "no2"]),
    entityIdSuffixes: Object.freeze(["nitrogen_dioxide", "no2"]),
    priority: 50,
  }),
  Object.freeze({
    key: "air-quality-so2",
    icon: "air-quality",
    label: "Sulfur dioxide",
    attributes: Object.freeze(["sulphur_dioxide", "sulfur_dioxide", "so2"]),
    deviceClasses: Object.freeze(["sulphur_dioxide"]),
    keywords: Object.freeze(["sulfur dioxide", "sulphur dioxide", "dioxyde soufre", "so2"]),
    entityIdSuffixes: Object.freeze(["sulphur_dioxide", "sulfur_dioxide", "so2"]),
    priority: 48,
  }),
  Object.freeze({
    key: "air-quality-voc",
    icon: "air-quality",
    label: "Volatile organic compounds",
    attributes: Object.freeze(["volatile_organic_compounds", "voc"]),
    deviceClasses: Object.freeze(["volatile_organic_compounds", "volatile_organic_compounds_parts"]),
    keywords: Object.freeze(["volatile organic compounds", "composes organiques volatils", "composés organiques volatils", "voc", "cov"]),
    priority: 46,
  }),
  Object.freeze({
    key: "summary",
    icon: "weather",
    label: "Weather summary",
    attributes: Object.freeze(["summary", "forecast_summary"]),
    deviceClasses: Object.freeze([]),
    keywords: Object.freeze(["weather summary", "forecast summary", "resume meteo", "résumé météo", "sommaire meteo", "sommaire météo"]),
    entityIdSuffixes: Object.freeze(["summary", "forecast_summary"]),
    platformEntityIdSuffixes: Object.freeze({
      openweathermap: Object.freeze(["weather"]),
    }),
    valueKind: "text",
    preferredSize: Object.freeze({ w: 4, h: 2 }),
    priority: 80,
  }),
  Object.freeze({
    key: "alerts",
    icon: "shield",
    label: "Weather alerts",
    attributes: Object.freeze(["alerts", "warnings", "advisories"]),
    deviceClasses: Object.freeze([]),
    keywords: Object.freeze(["weather alert", "weather warning", "weather advisory", "alerte meteo", "alerte météo", "avertissement meteo", "avertissement météo"]),
    valueKind: "text",
    preferredSize: Object.freeze({ w: 4, h: 1 }),
    priority: 79,
  }),
]);

function hasValue(value) {
  return value !== undefined && value !== null && value !== "";
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenizeLocation(value = "") {
  return normalizeText(value)
    .split(" ")
    .filter(token => token.length >= 3 && !GENERIC_WEATHER_WORDS.has(token));
}

function getCommonLocationTokenCount(weatherName = "", sensorName = "") {
  const weatherTokens = new Set(tokenizeLocation(weatherName));
  return tokenizeLocation(sensorName).filter(token => weatherTokens.has(token)).length;
}

function getSensorSearchText(entity = {}, registryEntry = {}) {
  const state = entity.state || {};
  return normalizeText([
    entity.entity_id,
    entity.name,
    state.attributes?.friendly_name,
    state.attributes?.device_class,
    state.attributes?.unit_of_measurement,
    registryEntry.name,
    registryEntry.original_name,
    registryEntry.translation_key,
  ].filter(Boolean).join(" "));
}

function getSensorDeviceClass(entity = {}, registryEntry = {}) {
  return String(
    entity.state?.attributes?.device_class
      || registryEntry.device_class
      || registryEntry.original_device_class
      || "",
  ).trim().toLowerCase();
}

function getMetricKeywordMatches(searchText, definition) {
  return definition.keywords.reduce((count, keyword) => (
    searchText.includes(normalizeText(keyword)) ? count + 1 : count
  ), 0);
}

function getEntityObjectId(entity = {}) {
  return String(entity.entity_id || "")
    .split(".")
    .slice(1)
    .join(".")
    .trim()
    .toLowerCase();
}

function getMetricEntityIdSuffixes(definition = {}, registryEntry = {}) {
  const commonSuffixes = Array.isArray(definition.entityIdSuffixes)
    ? definition.entityIdSuffixes
    : [];
  const platform = String(registryEntry.platform || "").trim().toLowerCase();
  const platformSuffixes = Array.isArray(definition.platformEntityIdSuffixes?.[platform])
    ? definition.platformEntityIdSuffixes[platform]
    : [];
  return [...commonSuffixes, ...platformSuffixes];
}

function matchesMetricEntityId(entity = {}, registryEntry = {}, definition = {}) {
  const objectId = getEntityObjectId(entity);
  return getMetricEntityIdSuffixes(definition, registryEntry).some(suffix => (
    objectId === suffix
    || objectId.endsWith(`_${suffix}`)
  ));
}

function scoreSensorMetric(entity, registryEntry, definition) {
  const deviceClass = getSensorDeviceClass(entity, registryEntry);
  const searchText = getSensorSearchText(entity, registryEntry);
  const keywordMatches = getMetricKeywordMatches(searchText, definition);
  const entityIdMatch = matchesMetricEntityId(entity, registryEntry, definition);
  const deviceClassMatch = definition.deviceClasses.includes(deviceClass);

  if (definition.requiresKeyword && keywordMatches === 0 && !entityIdMatch) return 0;
  if (definition.requiresKeywordForDeviceClass && keywordMatches === 0 && !entityIdMatch) return 0;
  if (!deviceClassMatch && keywordMatches === 0 && !entityIdMatch) return 0;

  return (entityIdMatch ? 220 : 0)
    + (deviceClassMatch ? 120 : 0)
    + Math.min(keywordMatches, 3) * 36
    + Number(definition.priority || 0);
}

function resolveWeatherAttributeUnit(attributes = {}, attribute = "", fallbackUnit = "") {
  if (attribute === "humidity" || attribute === "precipitation_probability" || attribute === "cloud_coverage") return "%";
  if (attribute === "wind_speed" || attribute === "wind_gust_speed") return attributes.wind_speed_unit || fallbackUnit;
  if (attribute === "pressure") return attributes.pressure_unit || fallbackUnit;
  if (attribute === "visibility") return attributes.visibility_unit || fallbackUnit;
  if (["precipitation", "precipitation_rate", "precipitation_intensity", "rain", "snow", "snow_depth"].includes(attribute)) {
    return attributes.precipitation_unit || fallbackUnit;
  }
  if (["apparent_temperature", "feels_like_temperature", "dew_point"].includes(attribute)) {
    return attributes.temperature_unit || fallbackUnit;
  }
  return fallbackUnit;
}

function createMetricSourceFromWeather(weatherEntity, definition) {
  const attributes = weatherEntity?.state?.attributes || {};
  const attribute = definition.attributes.find(name => hasValue(attributes[name]));
  if (!attribute) return null;

  return {
    key: definition.key,
    icon: definition.icon,
    label: definition.label,
    sourceType: "weather-attribute",
    weatherEntityId: weatherEntity.entity_id,
    entityId: weatherEntity.entity_id,
    attribute,
    unit: resolveWeatherAttributeUnit(attributes, attribute, definition.fallbackUnit || ""),
    valueKind: definition.valueKind || "number",
    preferredSize: definition.preferredSize || null,
    priority: definition.priority || 0,
  };
}

function createMetricSourceFromSensor(sensor, definition, score = 0, weatherEntityId = "") {
  if (!sensor) return null;
  return {
    key: definition.key,
    icon: definition.icon,
    label: definition.label,
    sourceType: "entity",
    weatherEntityId,
    entityId: sensor.entity_id,
    attribute: "",
    unit: sensor.state?.attributes?.unit_of_measurement || definition.fallbackUnit || "",
    valueKind: definition.valueKind || "number",
    preferredSize: definition.preferredSize || null,
    priority: score || definition.priority || 0,
  };
}

function createSunSource(sunEntities = []) {
  const sunEntity = sunEntities.find(entity => (
    hasValue(entity.state?.attributes?.next_rising)
    || hasValue(entity.state?.attributes?.next_setting)
  ));
  if (!sunEntity) return null;
  return {
    key: "sun",
    icon: "sunrise",
    label: "Sunrise & sunset",
    sourceType: "sun",
    entityId: sunEntity.entity_id,
    attribute: "",
    unit: "",
    valueKind: "sun",
    preferredSize: Object.freeze({ w: 4, h: 1 }),
    priority: 70,
  };
}

function deduplicateSources(sources = []) {
  const byKey = new Map();
  sources.filter(Boolean).forEach(source => {
    const current = byKey.get(source.key);
    const sourceRank = source.sourceType === "weather-attribute" ? 1000 : 0;
    const currentRank = current?.sourceType === "weather-attribute" ? 1000 : 0;
    if (!current || sourceRank + source.priority > currentRank + current.priority) {
      byKey.set(source.key, source);
    }
  });
  return [...byKey.values()].sort((a, b) => b.priority - a.priority || a.key.localeCompare(b.key));
}

function resolveWeatherEntity(weatherEntities, weatherEntityId = "") {
  return weatherEntities.find(entity => entity.entity_id === weatherEntityId)
    || weatherEntities[0]
    || null;
}

function collectWeatherAttributeSources(weatherEntity) {
  if (!weatherEntity) return [];
  return WEATHER_METRIC_DEFINITIONS
    .map(definition => createMetricSourceFromWeather(weatherEntity, definition))
    .filter(Boolean);
}

function classifySensor(entity, registryEntry = {}) {
  return WEATHER_METRIC_DEFINITIONS
    .map(definition => ({
      definition,
      score: scoreSensorMetric(entity, registryEntry, definition),
    }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.definition.priority - a.definition.priority)[0]
    || null;
}

function collectGlobalSensorSources(sensors = [], weatherName = "", weatherEntityId = "") {
  const bestByMetric = new Map();
  const weatherLocationTokens = tokenizeLocation(weatherName);
  sensors.forEach(sensor => {
    if (
      weatherLocationTokens.length === 0
      || getCommonLocationTokenCount(weatherName, sensor.name) === 0
    ) return;
    const classification = classifySensor(sensor);
    if (!classification) return;
    const current = bestByMetric.get(classification.definition.key);
    if (!current || classification.score > current.score) {
      bestByMetric.set(classification.definition.key, {
        sensor,
        definition: classification.definition,
        score: classification.score,
      });
    }
  });
  return [...bestByMetric.values()].map(candidate => (
    createMetricSourceFromSensor(candidate.sensor, candidate.definition, candidate.score, weatherEntityId)
  ));
}

export function resolveWeatherPageSourcesFromState(
  hass,
  visibilityConfig,
  { weatherEntityId = "" } = {},
) {
  const weatherEntities = getAvailableEntitiesForDomain(hass, "weather", visibilityConfig);
  const sensors = getAvailableEntitiesForDomain(hass, "sensor", visibilityConfig);
  const sunEntities = getAvailableEntitiesForDomain(hass, "sun", visibilityConfig);
  const weatherEntity = resolveWeatherEntity(weatherEntities, weatherEntityId);
  const weatherName = weatherEntity?.name || weatherEntity?.state?.attributes?.friendly_name || "";
  const sensorSources = collectGlobalSensorSources(sensors, weatherName, weatherEntity?.entity_id || "");
  const sunSource = createSunSource(sunEntities);
  const radar = resolveWeatherRadarSource(hass, visibilityConfig);

  return {
    weatherEntityId: weatherEntity?.entity_id || "",
    radar,
    metrics: deduplicateSources([
      ...collectWeatherAttributeSources(weatherEntity),
      ...sensorSources,
      sunSource,
    ]),
    discoveryMode: "state-fallback",
    registryLinked: false,
  };
}

function withTimeout(promise, timeoutMs = REGISTRY_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error("weather registry discovery timeout"));
    }, timeoutMs);
    Promise.resolve(promise).then(
      value => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      error => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function loadRegistryContext(hass, timeoutMs) {
  if (typeof hass?.callWS !== "function") return null;
  const [entityResult, deviceResult] = await Promise.allSettled([
    withTimeout(
      Promise.resolve().then(() => hass.callWS({ type: "config/entity_registry/list" })),
      timeoutMs,
    ),
    withTimeout(
      Promise.resolve().then(() => hass.callWS({ type: "config/device_registry/list" })),
      timeoutMs,
    ),
  ]);
  const entities = entityResult.status === "fulfilled" ? entityResult.value : null;
  if (!Array.isArray(entities)) return null;
  const devices = deviceResult.status === "fulfilled" && Array.isArray(deviceResult.value)
    ? deviceResult.value
    : [];
  return { entities, devices };
}

function getRelatedDeviceIds(weatherEntry = {}, devices = []) {
  const related = new Set();
  if (weatherEntry.device_id) related.add(weatherEntry.device_id);
  if (!weatherEntry.config_entry_id) return related;
  devices.forEach(device => {
    const configEntries = Array.isArray(device.config_entries) ? device.config_entries : [];
    if (configEntries.includes(weatherEntry.config_entry_id) && device.id) related.add(device.id);
  });
  return related;
}

function getRegistryRelationScore({
  weatherEntry = {},
  sensorEntry = {},
  relatedDeviceIds = new Set(),
  weatherName = "",
  sensorName = "",
} = {}) {
  if (weatherEntry.device_id && sensorEntry.device_id === weatherEntry.device_id) return 500;
  if (weatherEntry.config_entry_id && sensorEntry.config_entry_id === weatherEntry.config_entry_id) return 430;
  if (sensorEntry.device_id && relatedDeviceIds.has(sensorEntry.device_id)) return 380;
  if (
    weatherEntry.platform
    && sensorEntry.platform === weatherEntry.platform
    && getCommonLocationTokenCount(weatherName, sensorName) > 0
  ) return 180;
  return 0;
}

function collectRegistrySensorSources({
  sensors,
  entityEntries,
  weatherEntry,
  relatedDeviceIds,
  weatherName,
  weatherEntityId = "",
} = {}) {
  const bestByMetric = new Map();
  sensors.forEach(sensor => {
    const registryEntry = entityEntries.get(sensor.entity_id);
    if (!registryEntry || registryEntry.disabled_by || registryEntry.hidden_by || registryEntry.entity_category === "diagnostic") return;
    const relationScore = getRegistryRelationScore({
      weatherEntry,
      sensorEntry: registryEntry,
      relatedDeviceIds,
      weatherName,
      sensorName: sensor.name,
    });
    if (relationScore <= 0) return;

    const classification = classifySensor(sensor, registryEntry);
    if (!classification) return;
    const score = relationScore + classification.score;
    const current = bestByMetric.get(classification.definition.key);
    if (!current || score > current.score) {
      bestByMetric.set(classification.definition.key, {
        sensor,
        definition: classification.definition,
        score,
      });
    }
  });

  return [...bestByMetric.values()].map(candidate => (
    createMetricSourceFromSensor(candidate.sensor, candidate.definition, candidate.score, weatherEntityId)
  ));
}

export async function discoverWeatherPageSources(
  hass,
  visibilityConfig,
  {
    weatherEntityId = "",
    timeoutMs = REGISTRY_TIMEOUT_MS,
  } = {},
) {
  const fallback = resolveWeatherPageSourcesFromState(hass, visibilityConfig, { weatherEntityId });
  const registry = await loadRegistryContext(hass, timeoutMs);
  if (!registry || !fallback.weatherEntityId) return fallback;

  const entityEntries = new Map(registry.entities.map(entry => [entry.entity_id, entry]));
  const weatherEntry = entityEntries.get(fallback.weatherEntityId);
  if (!weatherEntry) return fallback;

  const weatherEntities = getAvailableEntitiesForDomain(hass, "weather", visibilityConfig);
  const sensors = getAvailableEntitiesForDomain(hass, "sensor", visibilityConfig);
  const sunEntities = getAvailableEntitiesForDomain(hass, "sun", visibilityConfig);
  const weatherEntity = resolveWeatherEntity(weatherEntities, fallback.weatherEntityId);
  const relatedDeviceIds = getRelatedDeviceIds(weatherEntry, registry.devices);
  const weatherName = weatherEntity?.name || weatherEntity?.state?.attributes?.friendly_name || fallback.weatherEntityId;
  const sensorSources = collectRegistrySensorSources({
    sensors,
    entityEntries,
    weatherEntry,
    relatedDeviceIds,
    weatherName,
    weatherEntityId: fallback.weatherEntityId,
  });
  const sunSource = createSunSource(sunEntities);
  const radar = resolveWeatherRadarSource(hass, visibilityConfig, {
    registryEntries: registry.entities,
  }) || fallback.radar;

  return {
    weatherEntityId: fallback.weatherEntityId,
    radar,
    metrics: deduplicateSources([
      ...collectWeatherAttributeSources(weatherEntity),
      ...sensorSources,
      sunSource,
    ]),
    discoveryMode: "registry",
    registryLinked: true,
  };
}

export { resolveWeatherAttributeUnit };
