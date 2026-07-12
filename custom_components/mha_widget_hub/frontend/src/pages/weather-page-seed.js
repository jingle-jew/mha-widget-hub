import { resolveWeatherPageSources } from "../ha/weather-page-data.js";

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

function createMetricWidget({ pageId, source }) {
  const isSun = source.key === "sun";
  return {
    id: `widget-weather-page-${pageId}-${source.key}`,
    kind: "weather-metric",
    type: "weather-metric",
    component: "weather-metric-widget",
    category: "climate",
    variant: isSun ? "weather-metric-wide" : "weather-metric-square",
    w: isSun ? 4 : 2,
    h: isSun ? 1 : 2,
    metricKey: source.key,
    icon: source.icon,
    sourceType: source.sourceType,
    weatherEntityId: source.weatherEntityId || "",
    entityId: source.entityId || "",
    entity_id: source.entityId || "",
    attribute: source.attribute || "",
    unit: source.unit || "",
  };
}

export function createWeatherPageSeed({
  pageId = "weather",
  pageName = "Weather",
  hass,
  visibilityConfig,
} = {}) {
  const normalizedPageId = String(pageId || "weather").trim() || "weather";
  const sources = resolveWeatherPageSources(hass, visibilityConfig);
  const entityId = sources.weatherEntityId;

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
    ...sources.metrics.map(source => createMetricWidget({
      pageId: normalizedPageId,
      source,
    })),
  ];

  return {
    weatherEntityId: entityId,
    config: {
      weatherEntityId: entityId,
      autoDetectedMetricKeys: sources.metrics.map(source => source.key),
    },
    widgets,
  };
}
