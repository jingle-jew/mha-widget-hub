import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { createWeatherIcon } from "./weather-icons.js";
import { buildWeatherModel } from "../ha/weather.js";
import { isWidgetKind } from "./widget-registry.js";

const WEATHER_SIZE_VARIANTS = new Set(["4x1", "2x2", "3x2", "4x2"]);

export function isWeatherWidget(widget = {}) {
  return isWidgetKind(widget, "weather");
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
