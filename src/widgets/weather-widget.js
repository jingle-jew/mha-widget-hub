import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { createWeatherIcon } from "./weather-icons.js";
import {
  buildWeatherModel,
  fetchWeatherForecastBundle,
} from "../ha/weather.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import {
  buildWeatherWidgetConfig,
  createWeatherConfigDraft,
  renderWeatherConfigFields,
} from "../widget-config/weather-config.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { t } from "../i18n/index.js";

const SVG_NS = "http://www.w3.org/2000/svg";
const WEATHER_SIZE_VARIANTS = new Set(["4x1", "2x2", "3x2", "4x2"]);
const WEATHER_FORECAST_REFRESH_MS = 10 * 60 * 1000;

export function isWeatherWidget(widget = {}) {
  return isLocalWidgetKind(widget, "weather", ["weather-widget"]);
}

function sizeKey({ widgetW = 2, widgetH = 2 } = {}) {
  const key = `${Number(widgetW) || 2}x${Number(widgetH) || 2}`;
  return WEATHER_SIZE_VARIANTS.has(key) ? key : "2x2";
}

function createText(className, text) {
  const el = document.createElement("span");
  el.className = className;
  el.textContent = text;
  return el;
}

function createSvgElement(name, attributes = {}) {
  const create = typeof document.createElementNS === "function"
    ? document.createElementNS.bind(document, SVG_NS)
    : document.createElement.bind(document);
  const element = create(name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function appendTextIfAny(parent, className, text) {
  if (!text) return null;
  const el = createText(className, text);
  parent.append(el);
  return el;
}

function createWeatherGlyph(condition = "partly-cloudy") {
  return createCurrentWeatherIcon(condition, {
    label: t("weatherPage.current.title", "Current conditions"),
    className: "mha-weather-widget-icon",
  });
}

function createMetricChip({ icon = "", label = "", value = "" } = {}) {
  const chip = document.createElement("span");
  chip.className = "mha-weather-widget-chip";
  chip.append(
    createIconSymbol({ name: icon, label }),
    createText("mha-weather-widget-chip-text", `${label ? `${label} ` : ""}${value}`.trim()),
  );
  return chip;
}

function getCurrentWeatherDescription(data) {
  if (!data?.entityAvailable && data?.temperature === "--") return "";
  if (Number.isFinite(data.windSpeedValue) && data.windSpeedValue >= 30) {
    return t("weatherPage.current.windy", "Windy conditions");
  }
  if (Number.isFinite(data.humidityValue) && data.humidityValue >= 70) {
    return t("weatherPage.current.humid", "Humid air");
  }
  return t("weatherPage.current.calm", "Comfortable conditions");
}

function createCurrentPane(data, { className = "", variant = "2x2", details = null } = {}) {
  const pane = document.createElement("section");
  pane.className = ["mha-weather-widget-current", className].filter(Boolean).join(" ");
  pane.dataset.weatherVariant = variant;
  appendTextIfAny(
    pane,
    "mha-weather-widget-eyebrow",
    t("weatherPage.current.title", "Current conditions"),
  );
  pane.append(
    createText("mha-weather-widget-temp", data.temperature),
    createWeatherGlyph(data.condition),
  );
  appendTextIfAny(pane, "mha-weather-widget-range", data.temperatureRange);
  pane.append(createText("mha-weather-widget-summary", data.summary));
  appendTextIfAny(
    pane,
    "mha-weather-widget-context",
    getCurrentWeatherDescription(data),
  );
  if (details?.childNodes?.length) {
    pane.append(details);
  }
  return pane;
}

function createDetails(data) {
  const details = document.createElement("div");
  details.className = "mha-weather-widget-details";
  if (data.humidity) {
    details.append(createMetricChip({
      icon: "humidity",
      label: t("weatherPage.metrics.humidity", "Humidity"),
      value: data.humidity,
    }));
  }
  if (data.wind) {
    details.append(createMetricChip({
      icon: "wind",
      label: t("weatherPage.metrics.wind", "Wind"),
      value: data.wind,
    }));
  }
  return details.childNodes.length ? details : null;
}

function createClassicCurrentPane(data) {
  const pane = document.createElement("section");
  pane.className = "mha-weather-widget-current mha-weather-widget-current--split";
  pane.dataset.weatherVariant = "4x2";
  appendTextIfAny(pane, "mha-weather-widget-location", data.location);
  pane.append(
    createText("mha-weather-widget-temp", data.temperature),
    createWeatherGlyph(data.condition),
  );
  appendTextIfAny(pane, "mha-weather-widget-range", data.temperatureRange);
  pane.append(createText("mha-weather-widget-summary", data.summary));
  const details = createDetails(data);
  if (details?.childNodes?.length) pane.append(details);
  return pane;
}

function createClassicForecastStack(forecast = []) {
  const stack = document.createElement("section");
  stack.className = "mha-weather-widget-forecast mha-weather-widget-forecast--classic";
  if (!forecast.length) {
    stack.dataset.empty = "true";
    stack.append(createText(
      "mha-weather-widget-forecast-empty",
      t("widgets.weather.forecastUnavailable", "Forecast unavailable"),
    ));
    return stack;
  }
  forecast.slice(0, 5).forEach((item) => {
    const row = document.createElement("div");
    row.className = "mha-weather-widget-forecast-row";
    row.append(
      createText("mha-weather-widget-forecast-day", item.day),
      createWeatherIcon(item.condition || "partly-cloudy", {
        label: item.day,
        className: "mha-weather-widget-forecast-icon",
      }),
      createText("mha-weather-widget-forecast-temp", item.temp),
    );
    stack.append(row);
  });
  return stack;
}

function getForecastChartValue(item = {}) {
  if (Number.isFinite(item.temperatureValue)) return item.temperatureValue;
  if (Number.isFinite(item.lowTemperatureValue)) return item.lowTemperatureValue;
  return null;
}

function createForecastChart(forecast = []) {
  const values = forecast.map(getForecastChartValue);
  const numericValues = values.filter(Number.isFinite);
  if (numericValues.length < 2) return null;

  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = forecast.length <= 1 ? 50 : 5 + (index / (forecast.length - 1)) * 90;
    const normalized = Number.isFinite(value) ? (value - min) / range : .5;
    const y = 26 - normalized * 18;
    return { x, y, value };
  });

  const chart = document.createElement("div");
  chart.className = "mha-weather-widget-forecast-chart";
  const svg = createSvgElement("svg", {
    viewBox: "0 0 100 32",
    preserveAspectRatio: "none",
    "aria-hidden": "true",
  });
  const linePoints = points.map(point => `${point.x},${point.y}`).join(" ");
  const areaPoints = `5,30 ${linePoints} 95,30`;
  svg.append(
    createSvgElement("polygon", {
      points: areaPoints,
      class: "mha-weather-widget-forecast-area",
    }),
    createSvgElement("polyline", {
      points: linePoints,
      class: "mha-weather-widget-forecast-line",
    }),
  );
  points.forEach(point => {
    svg.append(createSvgElement("circle", {
      cx: point.x,
      cy: point.y,
      r: 1.65,
      class: "mha-weather-widget-forecast-point",
    }));
  });
  chart.append(svg);
  return chart;
}

function createForecastItem(item = {}) {
  const column = document.createElement("div");
  column.className = "mha-weather-widget-forecast-item";
  column.append(
    createText("mha-weather-widget-forecast-day", item.day),
    createWeatherIcon(item.condition || "partly-cloudy", {
      label: item.day,
      className: "mha-weather-widget-forecast-icon",
    }),
    createText("mha-weather-widget-forecast-temp", item.temp),
  );
  if (Number.isFinite(item.precipitationProbability)) {
    const precipitation = document.createElement("span");
    precipitation.className = "mha-weather-widget-forecast-precipitation";
    precipitation.append(
      createIconSymbol({
        name: "humidity",
        label: t("weatherPage.forecast.precipitation", "Precipitation"),
      }),
      createText("mha-weather-widget-forecast-precipitation-value", `${item.precipitationProbability}%`),
    );
    column.append(precipitation);
  }
  return column;
}

function createForecastStack(forecast = [], title = "", forecastType = "daily") {
  const stack = document.createElement("section");
  stack.className = "mha-weather-widget-forecast";
  const header = document.createElement("div");
  header.className = "mha-weather-widget-forecast-header";
  header.append(
    createIconSymbol({
      name: forecastType === "hourly" ? "clock" : "calendar",
      label: title,
    }),
    createText("mha-weather-widget-forecast-title", title),
    createText(
      "mha-weather-widget-forecast-subtitle",
      forecastType === "hourly"
        ? t("weatherPage.forecast.nextHours", "Next hours")
        : t("weatherPage.forecast.nextDays", "Next days"),
    ),
  );
  stack.append(header);

  if (!forecast.length) {
    stack.dataset.empty = "true";
    stack.append(createText(
      "mha-weather-widget-forecast-empty",
      t("widgets.weather.forecastUnavailable", "Forecast unavailable"),
    ));
    return stack;
  }

  const chart = createForecastChart(forecast);
  if (chart) stack.append(chart);

  const timeline = document.createElement("div");
  timeline.className = "mha-weather-widget-forecast-timeline";
  timeline.style.setProperty("--mha-weather-forecast-count", String(forecast.length));
  forecast.slice(0, 5).forEach(item => timeline.append(createForecastItem(item)));
  stack.append(timeline);
  return stack;
}

function renderWeather(root, data, variant, widget = {}) {
  root.replaceChildren();
  root.dataset.entityAllowed = String(data.entityAllowed);
  root.dataset.entityAvailable = String(data.entityAvailable);
  if (!data.entityId || !data.entityAllowed || !data.entityAvailable) {
    const fallback = {
      condition: "unknown",
      temperature: "--",
      summary: !data.entityId
        ? t("widgets.config.noWeatherEntity", "Weather not configured")
        : data.entityAllowed ? t("common.unavailable", "Unavailable") : t("common.unauthorized", "Unauthorized"),
      humidity: "",
      wind: "",
      forecast: [],
    };
    root.append(createCurrentPane(fallback));
    return;
  }

  if (variant === "4x1" || variant === "2x2") {
    delete root.dataset.weatherDisplay;
    root.append(createCurrentPane(data, {
      variant,
      className: variant === "4x1" ? "mha-weather-widget-current--horizontal" : "",
    }));
  } else if (variant === "3x2") {
    delete root.dataset.weatherDisplay;
    root.append(createCurrentPane(data, {
      variant,
      className: "mha-weather-widget-current--split",
      details: createDetails(data),
    }));
  } else {
    const forecastOnly = widget?.displayMode === "forecast";
    const forecastType = widget?.forecastType === "hourly" ? "hourly" : "daily";
    const title = forecastType === "hourly"
      ? t("widgets.weather.forecastHourly", "Hourly")
      : t("widgets.weather.forecastDaily", "Daily");
    if (forecastOnly) {
      root.dataset.weatherDisplay = "forecast";
      root.append(createForecastStack(data.forecast, title, forecastType));
      return;
    }
    root.dataset.weatherDisplay = "classic";
    root.append(
      createClassicCurrentPane(data),
      createClassicForecastStack(data.forecast),
    );
  }
}

export function createWeatherWidgetContent(widget = {}, {
  widgetW = 2,
  widgetH = 2,
  hass,
  entityVisibilityConfig,
} = {}) {
  const context = {
    hass,
    variant: sizeKey({ widgetW, widgetH }),
    forecastBundle: null,
    forecastEntityId: "",
    forecastCheckedAt: 0,
    forecastRequestId: 0,
  };
  const root = document.createElement("div");
  root.className = "mha-weather-widget";
  root.dataset.widgetComponent = "weather";
  root.dataset.weatherSize = context.variant;

  const renderCurrentVariant = () => {
    root.dataset.weatherSize = context.variant;
    renderWeather(
      root,
      buildWeatherModel(context.hass, widget, entityVisibilityConfig, context.forecastBundle),
      context.variant,
      widget,
    );
  };

  const hydrateForecasts = nextHass => {
    if (context.variant !== "4x2") return;
    const model = buildWeatherModel(nextHass, widget, entityVisibilityConfig, context.forecastBundle);
    if (!model.entityId || !model.entityAllowed || !model.entityAvailable) return;
    const now = Date.now();
    const sameEntity = context.forecastEntityId === model.entityId;
    if (
      sameEntity
      && context.forecastBundle
      && now - context.forecastCheckedAt < WEATHER_FORECAST_REFRESH_MS
    ) {
      return;
    }
    context.forecastEntityId = model.entityId;
    context.forecastCheckedAt = now;
    const requestId = ++context.forecastRequestId;
    fetchWeatherForecastBundle(nextHass, model.entityId).then(bundle => {
      if (requestId !== context.forecastRequestId) return;
      context.forecastBundle = bundle;
      renderCurrentVariant();
    });
  };

  root.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    renderCurrentVariant();
    hydrateForecasts(nextHass);
  };
  root.__mhaUpdateWidgetSize = ({ widgetW: nextWidgetW = widgetW, widgetH: nextWidgetH = widgetH } = {}) => {
    const nextVariant = sizeKey({ widgetW: nextWidgetW, widgetH: nextWidgetH });
    if (nextVariant === context.variant) return;
    context.variant = nextVariant;
    renderCurrentVariant();
    hydrateForecasts(context.hass);
  };
  root.__mhaDestroy = () => {
    context.forecastRequestId += 1;
    delete root.__mhaUpdateFromHass;
    delete root.__mhaUpdateWidgetSize;
  };
  root.__mhaUpdateFromHass(hass);
  return root;
}

export const WEATHER_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => createWeatherWidgetContent(widget, {
    widgetW,
    widgetH,
    hass,
    entityVisibilityConfig,
  }),
});

export const WEATHER_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "weather",
  title: "Configure weather",
  hint: "Choose the weather entity to display.",
  titleKey: "widgets.config.configureWeather",
  hintKey: "widgets.config.weatherHint",
  createDraft: createWeatherConfigDraft,
  build: buildWeatherWidgetConfig,
  renderFields: renderWeatherConfigFields,
});

export const WEATHER_WIDGET_DEFINITION = Object.freeze({
  component: "weather-widget",
  category: "climate",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Horizontal weather", size: freezeSize(4, 1), description: "Icon and temperature.", order: 10 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Compact weather", size: freezeSize(2, 2), description: "Icon and temperature.", order: 20 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Weather details", size: freezeSize(3, 2), description: "Humidity and wind.", order: 30 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Weather forecast", size: freezeSize(4, 2), description: "Vertical forecasts.", order: 40 }),
    ]),
  }),
  renderer: "weather",
  css: css("styles/widgets/weather-widget.css"),
  preview: "weather",
  config: "weather",
  aliases: ["weather-widget"],
  variantAliases: ["adaptive-weather"],
  defaultVariant: "adaptive-weather",
  defaultSize: freezeSize(2, 2),
  normalizeSize: (size) => {
    if (size.h <= 1) return { w: 4, h: 1 };
    if (size.w >= 4) return { w: 4, h: 2 };
    if (size.w >= 3) return { w: 3, h: 2 };
    return { w: 2, h: 2 };
  },
  capabilities: Object.freeze({
    configurable: true,
    resizable: (widget = {}) => widget.displayMode !== "forecast",
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: widget.entityId || widget.entity_id || "",
      forecastType: widget.forecastType === "hourly" ? "hourly" : "daily",
      displayMode: widget.displayMode === "forecast" ? "forecast" : "current",
    }),
  }),
  shell: Object.freeze({
    configureMode: "config",
  }),
  placementFlow: "configure-first",
  variants: [
    variant("adaptive-weather", "Horizontal 4×1", 4, 1),
    variant("adaptive-weather", "Compact 2×2", 2, 2),
    variant("adaptive-weather", "Details 3×2", 3, 2),
    variant("adaptive-weather", "Forecasts 4×2", 4, 2),
  ],
});

function createWeatherPreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.weather;
  return {
    ...item,
    kind: "weather",
    type: "weather",
    component: WEATHER_WIDGET_DEFINITION.component,
    variant: item.variant || WEATHER_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "weather",
  definition: WEATHER_WIDGET_DEFINITION,
  renderer: WEATHER_WIDGET_CONTENT_RENDERER,
  config: WEATHER_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createWeatherPreviewWidget,
  }),
});
