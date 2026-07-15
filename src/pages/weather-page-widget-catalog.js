import {
  discoverWeatherPageSources,
  resolveWeatherPageSources,
} from "../ha/weather-page-data.js";
import {
  createWeatherPageMetricWidget,
  createWeatherPageRadarWidget,
  createWeatherPageWeatherWidget,
} from "./weather-page-seed.js";

export const WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID = "weather-page";

const WEATHER_METRIC_LABEL_KEYS = Object.freeze({
  humidity: "weatherPage.metrics.humidity",
  "apparent-temperature": "weatherPage.metrics.apparentTemperature",
  "dew-point": "weatherPage.metrics.dewPoint",
  "precipitation-probability": "weatherPage.metrics.precipitationProbability",
  precipitation: "weatherPage.metrics.precipitation",
  "precipitation-rate": "weatherPage.metrics.precipitationRate",
  "snow-depth": "weatherPage.metrics.snowDepth",
  wind: "weatherPage.metrics.wind",
  "wind-gust": "weatherPage.metrics.windGust",
  pressure: "weatherPage.metrics.pressure",
  "pressure-tendency": "weatherPage.metrics.pressureTendency",
  visibility: "weatherPage.metrics.visibility",
  "cloud-coverage": "weatherPage.metrics.cloudCoverage",
  uv: "weatherPage.metrics.uv",
  ozone: "weatherPage.metrics.ozone",
  "solar-radiation": "weatherPage.metrics.solarRadiation",
  illuminance: "weatherPage.metrics.illuminance",
  "sunshine-duration": "weatherPage.metrics.sunshineDuration",
  "air-quality": "weatherPage.metrics.airQuality",
  "air-quality-pm1": "weatherPage.metrics.pm1",
  "air-quality-pm25": "weatherPage.metrics.pm25",
  "air-quality-pm10": "weatherPage.metrics.pm10",
  "air-quality-co": "weatherPage.metrics.carbonMonoxide",
  "air-quality-co2": "weatherPage.metrics.carbonDioxide",
  "air-quality-no2": "weatherPage.metrics.nitrogenDioxide",
  "air-quality-so2": "weatherPage.metrics.sulfurDioxide",
  "air-quality-voc": "weatherPage.metrics.voc",
  summary: "widgets.weatherManager.narrative",
  alerts: "weatherPage.metrics.alerts",
  sun: "weatherPage.metrics.sun",
});

const WEATHER_PAGE_BASE_WIDGETS = Object.freeze([
  Object.freeze({
    key: "current",
    label: "Current conditions",
    labelKey: "widgets.weatherManager.current",
    description: "Current weather from the selected integration.",
    descriptionKey: "widgets.weatherManager.currentDescription",
    displayMode: "current",
    forecastType: "daily",
    order: 10,
  }),
  Object.freeze({
    key: "hourly",
    label: "Hourly forecast",
    labelKey: "widgets.weatherManager.hourlyForecast",
    description: "Next hours from the selected integration.",
    descriptionKey: "widgets.weatherManager.hourlyForecastDescription",
    displayMode: "forecast",
    forecastType: "hourly",
    order: 20,
  }),
  Object.freeze({
    key: "daily",
    label: "Daily forecast",
    labelKey: "widgets.weatherManager.dailyForecast",
    description: "Next days from the selected integration.",
    descriptionKey: "widgets.weatherManager.dailyForecastDescription",
    displayMode: "forecast",
    forecastType: "daily",
    order: 30,
  }),
]);

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

function metricOrder(source = {}, index = 0) {
  return 100 + (WEATHER_METRIC_DISPLAY_ORDER[source.key] ?? 1000) + index / 100;
}

function createWeatherCatalogItem(definition, weatherEntityId = "") {
  const widget = createWeatherPageWeatherWidget({
    id: `weather-page-catalog-${definition.key}`,
    pageName: definition.label,
    entityId: weatherEntityId,
    displayMode: definition.displayMode,
    forecastType: definition.forecastType,
  });
  return {
    ...widget,
    label: definition.label,
    labelKey: definition.labelKey,
    description: definition.description,
    descriptionKey: definition.descriptionKey,
    size: { w: widget.w, h: widget.h },
    order: definition.order,
  };
}

function createRadarCatalogItem(source = {}) {
  const widget = createWeatherPageRadarWidget({
    pageId: "catalog",
    source,
  });
  return {
    ...widget,
    label: "Radar map",
    labelKey: "widgets.weatherManager.radar",
    description: "Live radar image from Home Assistant.",
    descriptionKey: "widgets.weatherManager.radarDescription",
    size: { w: 4, h: 3 },
    order: 35,
  };
}

function createMetricCatalogItem(source = {}, index = 0) {
  const widget = createWeatherPageMetricWidget({
    pageId: "catalog",
    source,
  });
  return {
    ...widget,
    label: source.label || widget.label,
    labelKey: WEATHER_METRIC_LABEL_KEYS[source.key] || "",
    description: source.sourceType === "weather-attribute"
      ? "Provided by the selected weather entity."
      : "Provided by a related Home Assistant entity.",
    descriptionKey: source.sourceType === "weather-attribute"
      ? "widgets.weatherManager.weatherAttributeDescription"
      : "widgets.weatherManager.relatedEntityDescription",
    size: { w: widget.w, h: widget.h },
    order: metricOrder(source, index),
  };
}

export function buildWeatherPageWidgetManagerCategoryFromSources(sources = {}, {
  weatherEntityId = "",
} = {}) {
  const entityId = sources.weatherEntityId || weatherEntityId || "";
  const metricItems = (Array.isArray(sources.metrics) ? sources.metrics : [])
    .map((source, index) => createMetricCatalogItem(source, index));
  const widgets = entityId
    ? [
        ...WEATHER_PAGE_BASE_WIDGETS.map(definition => createWeatherCatalogItem(definition, entityId)),
        ...(sources.radar ? [createRadarCatalogItem(sources.radar)] : []),
        ...metricItems,
      ].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  return {
    id: WEATHER_PAGE_WIDGET_MANAGER_CATEGORY_ID,
    label: "Weather widgets",
    labelKey: "widgets.weatherManager.title",
    description: "Widgets available for this weather integration.",
    descriptionKey: "widgets.weatherManager.description",
    icon: "weather",
    widgets,
    weatherEntityId: entityId,
    discoveryMode: sources.discoveryMode || "state-fallback",
    registryLinked: sources.registryLinked === true,
  };
}

export function buildWeatherPageWidgetManagerCategory({
  hass,
  visibilityConfig,
  weatherEntityId = "",
} = {}) {
  return buildWeatherPageWidgetManagerCategoryFromSources(
    resolveWeatherPageSources(hass, visibilityConfig, { weatherEntityId }),
    { weatherEntityId },
  );
}

export async function discoverWeatherPageWidgetManagerCategory({
  hass,
  visibilityConfig,
  weatherEntityId = "",
} = {}) {
  return buildWeatherPageWidgetManagerCategoryFromSources(
    await discoverWeatherPageSources(hass, visibilityConfig, { weatherEntityId }),
    { weatherEntityId },
  );
}
