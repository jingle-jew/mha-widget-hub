import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { createWeatherIcon } from "./weather-icons.js";
import { buildWeatherModel } from "../ha/weather.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { buildWeatherWidgetConfig, createWeatherConfigDraft } from "../widget-config/weather-config.js";

const WEATHER_SIZE_VARIANTS = new Set(["4x1", "2x2", "3x2", "4x2"]);

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

function createWeatherGlyph(condition = "partly-cloudy") {
  return createCurrentWeatherIcon(condition, {
    label: "Conditions actuelles",
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

function createCurrentPane(data, { className = "" } = {}) {
  const pane = document.createElement("section");
  pane.className = ["mha-weather-widget-current", className].filter(Boolean).join(" ");
  pane.append(
    createText("mha-weather-widget-temp", data.temperature),
    createWeatherGlyph(data.condition),
    createText("mha-weather-widget-summary", data.summary),
  );
  return pane;
}

function createDetails(data) {
  const details = document.createElement("div");
  details.className = "mha-weather-widget-details";
  if (data.humidity) details.append(createMetricChip({ icon: "💧", value: data.humidity }));
  if (data.wind) details.append(createMetricChip({ icon: "↗", value: data.wind }));
  return details;
}

function createForecastStack(forecast = []) {
  const stack = document.createElement("section");
  stack.className = "mha-weather-widget-forecast";
  forecast.slice(0, 4).forEach((item) => {
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
        ? "Météo non configurée"
        : data.entityAllowed ? "Météo indisponible" : "Météo non autorisée",
      humidity: "",
      wind: "",
      forecast: [],
    };
    root.append(createCurrentPane(fallback));
    return;
  }

  if (variant === "4x1" || variant === "2x2") {
    root.append(createCurrentPane(data));
  } else if (variant === "3x2") {
    root.append(createCurrentPane(data), createDetails(data));
  } else {
    const left = createCurrentPane(data, { className: "mha-weather-widget-current--split" });
    left.append(createDetails(data));
    root.append(left, createForecastStack(data.forecast));
  }
}

export function createWeatherWidgetContent(widget = {}, {
  widgetW = 2,
  widgetH = 2,
  hass,
  entityVisibilityConfig,
} = {}) {
  const variant = sizeKey({ widgetW, widgetH });
  const root = document.createElement("div");
  root.className = "mha-weather-widget";
  root.dataset.widgetComponent = "weather";
  root.dataset.weatherSize = variant;

  root.__mhaUpdateFromHass = nextHass => {
    renderWeather(root, buildWeatherModel(nextHass, widget, entityVisibilityConfig), variant);
  };
  root.__mhaDestroy = () => {
    delete root.__mhaUpdateFromHass;
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
  title: "Configurer la météo",
  hint: "Choisis l’entité météo à afficher.",
  createDraft: createWeatherConfigDraft,
  build: buildWeatherWidgetConfig,
});

export const WEATHER_WIDGET_DEFINITION = Object.freeze({
  component: "weather-widget",
  category: "climate",
  manager: Object.freeze({
    entries: Object.freeze([
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo horizontale", size: freezeSize(4, 1), description: "Icône et température.", order: 10 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo compacte", size: freezeSize(2, 2), description: "Icône et température.", order: 20 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo détails", size: freezeSize(3, 2), description: "Humidité et vent.", order: 30 }),
      Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo prévisions", size: freezeSize(4, 2), description: "Prévisions verticales.", order: 40 }),
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
  variants: [
    variant("adaptive-weather", "Horizontal 4×1", 4, 1),
    variant("adaptive-weather", "Compact 2×2", 2, 2),
    variant("adaptive-weather", "Détails 3×2", 3, 2),
    variant("adaptive-weather", "Prévisions 4×2", 4, 2),
  ],
});

export const WIDGET_MODULE = Object.freeze({
  kind: "weather",
  definition: WEATHER_WIDGET_DEFINITION,
  renderer: WEATHER_WIDGET_CONTENT_RENDERER,
  config: WEATHER_WIDGET_CONFIG_MANIFEST,
});
