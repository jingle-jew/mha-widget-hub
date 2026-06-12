import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { createWeatherIcon } from "./weather-icons.js";

const WEATHER_SIZE_VARIANTS = new Set(["4x1", "2x2", "3x2", "4x2"]);

const WEATHER_SUMMARY_LABELS = new Map([
  ["sunny", "Ensoleillé"],
  ["clear-night", "Nuit claire"],
  ["clear", "Ensoleillé"],
  ["cloudy", "Nuageux"],
  ["cloud", "Nuageux"],
  ["partlycloudy", "Part. nuageux"],
  ["partly-cloudy", "Part. nuageux"],
  ["partly_cloudy", "Part. nuageux"],
  ["rainy", "Pluie"],
  ["rain", "Pluie"],
  ["pouring", "Forte pluie"],
  ["lightning", "Orage"],
  ["lightning-rainy", "Orage"],
  ["thunderstorm", "Orage"],
  ["snowy", "Neige"],
  ["snow", "Neige"],
  ["snowy-rainy", "Neige/pluie"],
  ["fog", "Brouillard"],
  ["foggy", "Brouillard"],
  ["windy", "Venteux"],
  ["windy-variant", "Venteux"],
  ["hail", "Grêle"],
  ["exceptional", "Météo active"],
  ["unknown", "Météo"],
  ["unavailable", "Météo"],
]);

function normalizeWeatherCondition(condition = "") {
  return String(condition || "unknown").trim().toLowerCase();
}

function getWeatherSummary(widget = {}) {
  const explicit = widget.summary || widget.weatherSummary || widget.conditionText || widget.conditionLabel;
  if (explicit) return String(explicit);
  return WEATHER_SUMMARY_LABELS.get(normalizeWeatherCondition(widget.condition)) || "Météo";
}

export function isWeatherWidget(widget = {}) {
  const kind = widget.kind || widget.type || widget.component || "";
  return kind === "weather" || kind === "weather-widget" || widget.variant === "adaptive-weather";
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

function getWeatherData(widget = {}) {
  return {
    condition: widget.condition || "partly-cloudy",
    temperature: widget.temperature || "22°",
    humidity: widget.humidity || "54%",
    wind: widget.wind || "12 km/h",
    summary: getWeatherSummary(widget),
    forecast: widget.forecast || [
      { day: "Lun", condition: "sunny", temp: "24°" },
      { day: "Mar", condition: "partly-cloudy", temp: "22°" },
      { day: "Mer", condition: "cloud", temp: "21°" },
      { day: "Jeu", condition: "rain", temp: "19°" },
    ],
  };
}

export function createWeatherWidgetContent(widget = {}, { widgetW = 2, widgetH = 2 } = {}) {
  const data = getWeatherData(widget);
  const variant = sizeKey({ widgetW, widgetH });
  const root = document.createElement("div");
  root.className = "mha-weather-widget";
  root.dataset.weatherSize = variant;

  if (variant === "4x1" || variant === "2x2") {
    root.append(createCurrentPane(data));
    return root;
  }

  if (variant === "3x2") {
    root.append(createCurrentPane(data), createDetails(data));
    return root;
  }

  const left = createCurrentPane(data, { className: "mha-weather-widget-current--split" });
  left.append(createDetails(data));
  root.append(left, createForecastStack(data.forecast));
  return root;
}
