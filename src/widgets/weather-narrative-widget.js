import { buildWeatherModel, fetchWeatherForecastBundle } from "../ha/weather.js";
import { buildWeatherNarrativeModel } from "../ha/weather-narrative.js";
import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import {
  buildWeatherWidgetConfig,
  createWeatherConfigDraft,
  renderWeatherConfigFields,
} from "../widget-config/weather-config.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { t } from "../i18n/index.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const FORECAST_REFRESH_MS = 10 * 60 * 1000;

export function isWeatherNarrativeWidget(widget = {}) {
  return isLocalWidgetKind(widget, "weather-narrative", ["weather-narrative-widget"]);
}

function createText(className, text = "") {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text == null ? "" : String(text);
  return element;
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function createNarrativeIcon(event, weather) {
  if (event.kind === "alert") {
    return createIconSymbol({
      name: "warning",
      label: event.headline,
      className: "mha-weather-narrative-icon mha-weather-narrative-icon--alert",
    });
  }
  return createCurrentWeatherIcon(weather.condition || "unknown", {
    label: event.headline || weather.summary || t("weatherPage.current.title", "Current conditions"),
    className: "mha-weather-narrative-icon",
  });
}

function getChartSeries(event, weather) {
  const items = (event.items || []).filter(item => item?.datetime);
  const definitions = {
    temperature: {
      key: "temperatureValue",
      label: t("weatherNarrative.charts.temperature", "Temperature"),
      unit: weather.temperatureUnit || "°",
      className: "temperature",
    },
    precipitation: {
      key: "precipitationProbability",
      fallbackKey: "precipitation",
      label: t("weatherNarrative.charts.precipitation", "Precipitation probability"),
      unit: "%",
      className: "precipitation",
    },
    wind: {
      key: "windGustValue",
      fallbackKey: "windSpeedValue",
      label: t("weatherNarrative.charts.wind", "Wind gusts"),
      unit: weather.windUnit || "",
      className: "wind",
    },
  };
  const primaryDefinition = event.chartKind === "precipitation-wind"
    ? definitions.precipitation
    : definitions[event.chartKind] || definitions.temperature;
  const series = [primaryDefinition];
  if (event.chartKind === "precipitation-wind") series.push(definitions.wind);

  return series.map(definition => {
    const values = items.map(item => {
      const value = item[definition.key] ?? item[definition.fallbackKey];
      return Number.isFinite(value) ? value : null;
    });
    return { ...definition, items, values };
  }).filter(seriesItem => seriesItem.values.filter(Number.isFinite).length >= 2);
}

function createChart(event, weather) {
  const series = getChartSeries(event, weather);
  if (!series.length) return null;

  const chart = document.createElement("div");
  chart.className = "mha-weather-narrative-chart";
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", series.map(item => item.label).join(" · "));

  const svg = createSvgElement("svg", {
    viewBox: "0 0 100 42",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  [10, 21, 32].forEach(y => svg.append(createSvgElement("line", {
    x1: 3,
    y1: y,
    x2: 97,
    y2: y,
    class: "mha-weather-narrative-grid-line",
  })));

  series.forEach(seriesItem => {
    const numericValues = seriesItem.values.filter(Number.isFinite);
    const min = Math.min(...numericValues);
    const max = Math.max(...numericValues);
    const range = Math.max(1, max - min);
    const points = seriesItem.values.map((value, index) => {
      const x = seriesItem.values.length <= 1 ? 50 : 4 + (index / (seriesItem.values.length - 1)) * 92;
      const y = Number.isFinite(value) ? 34 - ((value - min) / range) * 24 : 34;
      return { x, y, value };
    });
    const validPoints = points.filter(point => Number.isFinite(point.value));
    svg.append(createSvgElement("polyline", {
      points: validPoints.map(point => `${point.x},${point.y}`).join(" "),
      class: `mha-weather-narrative-line mha-weather-narrative-line--${seriesItem.className}`,
    }));
    validPoints.forEach(point => svg.append(createSvgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: series.length > 1 ? 1.15 : 1.55,
      class: `mha-weather-narrative-point mha-weather-narrative-point--${seriesItem.className}`,
    })));
  });
  chart.append(svg);

  const legend = document.createElement("div");
  legend.className = "mha-weather-narrative-chart-legend";
  series.forEach(seriesItem => legend.append(
    createText(`mha-weather-narrative-legend mha-weather-narrative-legend--${seriesItem.className}`, seriesItem.label),
  ));
  chart.append(legend);

  const labels = document.createElement("div");
  labels.className = "mha-weather-narrative-chart-labels";
  const labelItems = series[0].items.filter((item, index) => (
    Number.isFinite(series[0].values[index])
    && (index === 0 || index === series[0].items.length - 1 || index % 3 === 0)
  ));
  labelItems.slice(0, 5).forEach(item => {
    const date = new Date(item.datetime);
    if (Number.isNaN(date.getTime())) return;
    labels.append(createText("mha-weather-narrative-chart-label", date.toLocaleTimeString([], {
      hour: "2-digit",
    }).replace(/\s/g, "")));
  });
  chart.append(labels);
  return chart;
}

function createAlertVisual(event) {
  const visual = document.createElement("div");
  visual.className = "mha-weather-narrative-alert";
  visual.append(
    createIconSymbol({ name: "warning", label: event.headline }),
    createText("mha-weather-narrative-alert-text", event.alert),
  );
  return visual;
}

function createEmptyVisual(event, weather) {
  const visual = document.createElement("div");
  visual.className = "mha-weather-narrative-empty-visual";
  visual.append(
    createIconSymbol({ name: event.icon || "weather", label: event.headline }),
    createText("mha-weather-narrative-empty-label", weather.temperature || event.secondary || ""),
  );
  return visual;
}

function createNarrativeVisual(event, weather) {
  const visual = document.createElement("section");
  visual.className = "mha-weather-narrative-visual";
  visual.append(createText(
    "mha-weather-narrative-visual-title",
    t(`weatherNarrative.charts.${event.chartKind}`, event.chartKind === "empty" ? "Current conditions" : "Next hours"),
  ));
  if (event.chartKind === "alert") {
    visual.append(createAlertVisual(event));
  } else {
    visual.append(createChart(event, weather) || createEmptyVisual(event, weather));
  }
  return visual;
}

function renderWeatherNarrative(root, weather, widget, now = new Date()) {
  const event = buildWeatherNarrativeModel(weather, now);
  root.replaceChildren();
  root.dataset.entityAllowed = String(Boolean(weather.entityAllowed));
  root.dataset.entityAvailable = String(Boolean(weather.entityAvailable));
  root.dataset.weatherNarrativeMood = event.mood || "neutral";
  root.dataset.weatherNarrativeKind = event.kind || "summary";

  const header = document.createElement("section");
  header.className = "mha-weather-narrative-header";
  const copy = document.createElement("div");
  copy.className = "mha-weather-narrative-copy";
  copy.append(
    createText("mha-weather-narrative-location", weather.location || t("weatherNarrative.title", "Weather brief")),
    createText("mha-weather-narrative-headline", event.headline),
    createText("mha-weather-narrative-secondary", event.secondary),
  );
  const icon = createNarrativeIcon(event, weather);
  const temperature = createText("mha-weather-narrative-temperature", weather.temperature || "");
  header.append(copy, icon, temperature);
  root.append(header, createNarrativeVisual(event, weather));
  void widget;
}

export function createWeatherNarrativeWidgetContent(widget = {}, {
  hass,
  entityVisibilityConfig,
} = {}) {
  const context = {
    hass,
    forecastBundle: null,
    forecastEntityId: "",
    forecastCheckedAt: 0,
    forecastRequestId: 0,
    clock: null,
  };
  const root = document.createElement("div");
  root.className = "mha-weather-narrative-widget";
  root.dataset.widgetComponent = "weather-narrative";
  root.dataset.weatherSize = "4x2";

  const renderCurrent = () => {
    const weather = buildWeatherModel(context.hass, widget, entityVisibilityConfig, context.forecastBundle);
    renderWeatherNarrative(root, weather, widget);
  };

  const hydrateForecasts = nextHass => {
    const weather = buildWeatherModel(nextHass, widget, entityVisibilityConfig, context.forecastBundle);
    if (!weather.entityId || !weather.entityAllowed || !weather.entityAvailable) return;
    const now = Date.now();
    const sameEntity = context.forecastEntityId === weather.entityId;
    if (sameEntity && context.forecastBundle && now - context.forecastCheckedAt < FORECAST_REFRESH_MS) return;
    context.forecastEntityId = weather.entityId;
    context.forecastCheckedAt = now;
    const requestId = ++context.forecastRequestId;
    fetchWeatherForecastBundle(nextHass, weather.entityId).then(bundle => {
      if (requestId !== context.forecastRequestId) return;
      context.forecastBundle = bundle;
      renderCurrent();
    });
  };

  root.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    renderCurrent();
    hydrateForecasts(nextHass);
  };
  root.__mhaDestroy = () => {
    context.forecastRequestId += 1;
    if (context.clock != null) globalThis.clearInterval?.(context.clock);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaDestroy;
  };
  root.__mhaUpdateFromHass(hass);
  if (typeof globalThis.setInterval === "function") {
    context.clock = globalThis.setInterval(renderCurrent, 60 * 1000);
  }
  return root;
}

export const WEATHER_NARRATIVE_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, entityVisibilityConfig }) => createWeatherNarrativeWidgetContent(widget, {
    hass,
    entityVisibilityConfig,
  }),
});

export const WEATHER_NARRATIVE_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "weather-narrative",
  title: "Configure weather brief",
  hint: "Choose the weather entity used for the narrative brief.",
  titleKey: "weatherNarrative.config.title",
  hintKey: "weatherNarrative.config.hint",
  createDraft: createWeatherConfigDraft,
  build: buildWeatherWidgetConfig,
  renderFields: renderWeatherConfigFields,
});

export const WEATHER_NARRATIVE_WIDGET_DEFINITION = Object.freeze({
  component: "weather-narrative-widget",
  category: "climate",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({
        category: "climate",
        variant: "weather-narrative",
        label: "Weather brief",
        size: freezeSize(4, 2),
        description: "A contextual weather brief with an adaptive chart.",
        order: 45,
      }),
    ]),
  }),
  renderer: "weather-narrative",
  css: css("styles/widgets/weather-narrative-widget.css"),
  preview: "weather",
  config: "weather-narrative",
  aliases: ["weather-narrative-widget"],
  variantAliases: ["weather-narrative"],
  defaultVariant: "weather-narrative",
  defaultSize: freezeSize(4, 2),
  normalizeSize: () => ({ w: 4, h: 2 }),
  capabilities: Object.freeze({
    configurable: true,
    resizable: false,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: widget.entityId || widget.entity_id || "",
    }),
  }),
  shell: Object.freeze({ configureMode: "config" }),
  placementFlow: "configure-first",
  variants: [variant("weather-narrative", "Weather brief 4×2", 4, 2)],
});

function createWeatherNarrativePreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.weather;
  return {
    ...item,
    kind: "weather-narrative",
    type: "weather-narrative",
    component: WEATHER_NARRATIVE_WIDGET_DEFINITION.component,
    variant: item.variant || WEATHER_NARRATIVE_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "weather-narrative",
  definition: WEATHER_NARRATIVE_WIDGET_DEFINITION,
  renderer: WEATHER_NARRATIVE_WIDGET_CONTENT_RENDERER,
  config: WEATHER_NARRATIVE_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "static",
  }),
});
