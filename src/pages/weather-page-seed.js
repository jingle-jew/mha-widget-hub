import {
  discoverWeatherPageSources,
  resolveWeatherPageSources,
} from "../ha/weather-page-data.js";

const WEATHER_METRIC_DISPLAY_ORDER = Object.freeze({
  "dew-point": 10,
  "apparent-temperature": 20,
  "wind-gust": 30,
  "pressure-tendency": 40,
  humidity: 50,
  "precipitation-probability": 60,
  precipitation: 65,
  "precipitation-rate": 66,
  wind: 70,
  pressure: 80,
  visibility: 90,
  "cloud-coverage": 100,
  uv: 110,
  "air-quality": 120,
  "air-quality-pm1": 121,
  "air-quality-pm25": 122,
  "air-quality-pm10": 123,
  "air-quality-co": 124,
  "air-quality-co2": 125,
  "air-quality-no2": 126,
  "air-quality-so2": 127,
  "air-quality-voc": 128,
  ozone: 130,
  "solar-radiation": 140,
  illuminance: 150,
  "sunshine-duration": 160,
  "snow-depth": 170,
  summary: 180,
  alerts: 190,
  sun: 200,
});

function sortMetricSources(metrics = []) {
  return [...metrics].sort((a, b) => (
    (WEATHER_METRIC_DISPLAY_ORDER[a.key] ?? 1000)
    - (WEATHER_METRIC_DISPLAY_ORDER[b.key] ?? 1000)
  ));
}

export function createWeatherPageWeatherWidget({
  id,
  pageName,
  entityId,
  displayMode,
  forecastType = "daily",
  surfaceMode = "dynamic",
  w = 4,
  h = 2,
}) {
  return {
    id,
    kind: "weather",
    type: "weather",
    component: "weather-widget",
    category: "climate",
    variant: "adaptive-weather",
    w,
    h,
    label: pageName,
    title: pageName,
    entityId,
    entity_id: entityId,
    forecastType,
    displayMode,
    surfaceMode,
  };
}

export function resolveWeatherPageMetricSize(source = {}) {
  const preferred = source.preferredSize;
  if (Number(preferred?.w) > 0 && Number(preferred?.h) > 0) {
    return { w: Number(preferred.w), h: Number(preferred.h) };
  }
  return { w: 2, h: 2 };
}

export function resolveWeatherPageMetricVariant(source = {}, size = {}) {
  if (source.key === "sun") return size.h <= 1 ? "weather-metric-wide" : "weather-metric-square";
  if (source.valueKind === "text") {
    if (size.w >= 4 && size.h >= 2) return "weather-metric-text-tall";
    return size.w <= 2 ? "weather-metric-compact" : "weather-metric-text-wide";
  }
  return size.h <= 1 ? "weather-metric-compact" : "weather-metric-square";
}

export function createWeatherPageMetricWidget({ pageId, source }) {
  const size = resolveWeatherPageMetricSize(source);
  return {
    id: `widget-weather-page-${pageId}-${source.key}`,
    kind: "weather-metric",
    type: "weather-metric",
    component: "weather-metric-widget",
    category: "climate",
    variant: resolveWeatherPageMetricVariant(source, size),
    w: size.w,
    h: size.h,
    metricKey: source.key,
    icon: source.icon,
    label: source.label || "",
    sourceType: source.sourceType,
    valueKind: source.valueKind || "number",
    weatherEntityId: source.weatherEntityId || "",
    entityId: source.entityId || "",
    entity_id: source.entityId || "",
    attribute: source.attribute || "",
    unit: source.unit || "",
  };
}

export function createWeatherPageRadarWidget({ pageId, source = {} }) {
  const entityId = String(source.entityId || "").trim();
  return {
    id: `widget-weather-page-${pageId}-radar`,
    kind: "weather-radar",
    type: "weather-radar",
    component: "weather-radar-widget",
    category: "climate",
    variant: "weather-radar",
    w: 4,
    h: 3,
    label: source.label || "Radar",
    title: source.label || "Radar",
    sourceType: source.sourceType || "radar-entity",
    entityId,
    entity_id: entityId,
  };
}

function createWeatherPageSeedFromSources({
  pageId = "weather",
  pageName = "Weather",
  sources = {},
} = {}) {
  const normalizedPageId = String(pageId || "weather").trim() || "weather";
  const entityId = sources.weatherEntityId || "";
  const metrics = sortMetricSources(Array.isArray(sources.metrics) ? sources.metrics : []);

  const widgets = [
    createWeatherPageWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-current`,
      pageName,
      entityId,
      displayMode: "current",
    }),
    createWeatherPageWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-hourly`,
      pageName,
      entityId,
      displayMode: "forecast",
      forecastType: "hourly",
    }),
    createWeatherPageWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-daily`,
      pageName,
      entityId,
      displayMode: "forecast",
      forecastType: "daily",
    }),
    ...(sources.radar ? [createWeatherPageRadarWidget({
      pageId: normalizedPageId,
      source: sources.radar,
    })] : []),
    ...metrics.map(source => createWeatherPageMetricWidget({
      pageId: normalizedPageId,
      source,
    })),
  ];

  return {
    weatherEntityId: entityId,
    config: {
      weatherEntityId: entityId,
      radarEntityId: sources.radar?.entityId || "",
      radarDiscoveryCompleted: true,
      autoDetectedMetricKeys: metrics.map(source => source.key),
      discoveryMode: sources.discoveryMode || "state-fallback",
      registryLinked: sources.registryLinked === true,
    },
    widgets,
  };
}

export function createWeatherPageSeed({
  pageId = "weather",
  pageName = "Weather",
  hass,
  visibilityConfig,
  weatherEntityId = "",
} = {}) {
  const sources = resolveWeatherPageSources(hass, visibilityConfig, { weatherEntityId });
  return createWeatherPageSeedFromSources({ pageId, pageName, sources });
}

export async function discoverWeatherPageSeed({
  pageId = "weather",
  pageName = "Weather",
  hass,
  visibilityConfig,
  weatherEntityId = "",
} = {}) {
  const sources = await discoverWeatherPageSources(hass, visibilityConfig, { weatherEntityId });
  return createWeatherPageSeedFromSources({ pageId, pageName, sources });
}
