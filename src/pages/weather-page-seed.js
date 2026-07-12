import {
  discoverWeatherPageSources,
  resolveWeatherPageSources,
} from "../ha/weather-page-data.js";

function createWeatherWidget({
  id,
  pageName,
  entityId,
  displayMode,
  forecastType = "daily",
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
  };
}

function resolveMetricSize(source = {}) {
  const preferred = source.preferredSize;
  if (Number(preferred?.w) > 0 && Number(preferred?.h) > 0) {
    return { w: Number(preferred.w), h: Number(preferred.h) };
  }
  return { w: 2, h: 2 };
}

function resolveMetricVariant(source = {}, size = {}) {
  if (source.key === "sun") return size.h <= 1 ? "weather-metric-wide" : "weather-metric-square";
  if (source.valueKind === "text") return "weather-metric-text-wide";
  return size.h <= 1 ? "weather-metric-compact" : "weather-metric-square";
}

function createMetricWidget({ pageId, source }) {
  const size = resolveMetricSize(source);
  return {
    id: `widget-weather-page-${pageId}-${source.key}`,
    kind: "weather-metric",
    type: "weather-metric",
    component: "weather-metric-widget",
    category: "climate",
    variant: resolveMetricVariant(source, size),
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

function createWeatherPageSeedFromSources({
  pageId = "weather",
  pageName = "Weather",
  sources = {},
} = {}) {
  const normalizedPageId = String(pageId || "weather").trim() || "weather";
  const entityId = sources.weatherEntityId || "";
  const metrics = Array.isArray(sources.metrics) ? sources.metrics : [];

  const widgets = [
    createWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-current`,
      pageName,
      entityId,
      displayMode: "current",
    }),
    createWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-hourly`,
      pageName,
      entityId,
      displayMode: "forecast",
      forecastType: "hourly",
    }),
    createWeatherWidget({
      id: `widget-weather-page-${normalizedPageId}-daily`,
      pageName,
      entityId,
      displayMode: "forecast",
      forecastType: "daily",
    }),
    ...metrics.map(source => createMetricWidget({
      pageId: normalizedPageId,
      source,
    })),
  ];

  return {
    weatherEntityId: entityId,
    config: {
      weatherEntityId: entityId,
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
