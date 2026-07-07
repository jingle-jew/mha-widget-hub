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

function appendTextIfAny(parent, className, text) {
  if (!text) return null;
  const el = createText(className, text);
  parent.append(el);
  return el;
}

function createWeatherGlyph(condition = "partly-cloudy") {
  return createCurrentWeatherIcon(condition, {
    label: "Current conditions",
    className: "mha-weather-widget-icon",
  });
}

function createMetricChip({ icon = "", label = "", value = "" } = {}) {
  const chip = document.createElement("span");
  chip.className = "mha-weather-widget-chip";
  chip.append(
    createText("mha-weather-widget-chip-icon", icon),
    createText("mha-weather-widget-chip-text", `${label ? `${label} ` : ""}${value}`.trim()),
  );
  return chip;
}

function createCurrentPane(data, { className = "", variant = "2x2", details = null } = {}) {
  const pane = document.createElement("section");
  pane.className = ["mha-weather-widget-current", className].filter(Boolean).join(" ");
  pane.dataset.weatherVariant = variant;
  appendTextIfAny(pane, "mha-weather-widget-location", data.location);
  pane.append(
    createText("mha-weather-widget-temp", data.temperature),
    createWeatherGlyph(data.condition),
  );
  appendTextIfAny(pane, "mha-weather-widget-range", data.temperatureRange);
  pane.append(
    createText("mha-weather-widget-summary", data.summary),
  );
  if (details?.childNodes?.length) {
    pane.append(details);
  }
  return pane;
}

function createDetails(data) {
  const details = document.createElement("div");
  details.className = "mha-weather-widget-details";
  if (data.humidity) details.append(createMetricChip({ icon: "💧", value: data.humidity }));
  if (data.wind) details.append(createMetricChip({ icon: "↗", value: data.wind }));
  return details.childNodes.length ? details : null;
}

function createForecastStack(forecast = []) {
  const stack = document.createElement("section");
  stack.className = "mha-weather-widget-forecast";
  if (!forecast.length) {
    stack.dataset.empty = "true";
    stack.append(createText("mha-weather-widget-forecast-empty", "Forecasts unavailables"));
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

function renderWeather(root, data, variant) {
  root.replaceChildren();
  root.dataset.entityAllowed = String(data.entityAllowed);
  root.dataset.entityAvailable = String(data.entityAvailable);
  if (!data.entityId || !data.entityAllowed || !data.entityAvailable) {
    const fallback = {
      condition: "unknown",
      temperature: "--",
      summary: !data.entityId
        ? "Weather not configured"
        : data.entityAllowed ? "Weather unavailable" : "Weather unauthorized",
      humidity: "",
      wind: "",
      forecast: [],
    };
    root.append(createCurrentPane(fallback));
    return;
  }

  if (variant === "4x1" || variant === "2x2") {
    root.append(createCurrentPane(data, {
      variant,
      className: variant === "4x1" ? "mha-weather-widget-current--horizontal" : "",
    }));
  } else if (variant === "3x2") {
    root.append(createCurrentPane(data, {
      variant,
      className: "mha-weather-widget-current--split",
      details: createDetails(data),
    }));
  } else {
    const left = createCurrentPane(data, {
      variant,
      className: "mha-weather-widget-current--split",
      details: createDetails(data),
    });
    root.append(left, createForecastStack(data.forecast));
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
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: widget.entityId || widget.entity_id || "",
      forecastType: widget.forecastType === "hourly" ? "hourly" : "daily",
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
