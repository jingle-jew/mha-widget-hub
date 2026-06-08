/*
 * MHA Weather Widget
 *
 * Migrated to the Internal Widget Grid System.
 *
 * Size variants:
 * - 2x2: compact current conditions;
 * - 3x2: wide current conditions;
 * - 4x2: split current conditions + 5-day forecast stack.
 *
 * No hourly forecast.
 */

import { createWidgetContentGrid, createWidgetContentRegion } from "./widget-layout.js";

export const WEATHER_WIDGET_KIND = "weather";
export const WEATHER_WIDGET_VARIANTS = Object.freeze(["current", "forecast"]);
export const WEATHER_WIDGET_SIZE_SEQUENCE = Object.freeze([
  { w: 2, h: 2 },
  { w: 3, h: 2 },
  { w: 4, h: 2 },
]);

export function normalizeWeatherWidgetVariant(value = "current") {
  return WEATHER_WIDGET_VARIANTS.includes(value) ? value : "current";
}

export function isWeatherWidget(widget = {}) {
  const kind = widget?.kind || widget?.type || widget?.component;
  const variant = widget?.variant || "";

  return kind === "weather"
    || kind === "weather-widget"
    || widget?.component === "weather-widget"
    || (widget?.category === "weather" && (variant === "current" || variant === "forecast" || variant === "weather-current" || variant === "weather-forecast"));
}

export function getWeatherWidgetLayout(size = {}) {
  const w = Number(size?.w) || 2;
  if (w >= 4) return "split";
  if (w >= 3) return "wide";
  return "compact";
}

function getFallbackWeatherData(widget = {}) {
  return {
    location: widget.location || "Maison",
    condition: widget.condition || "Partiellement nuageux",
    temperature: widget.temperature || "21°",
    high: widget.high || "24°",
    low: widget.low || "14°",
    feelsLike: widget.feelsLike || "Ressenti 22°",
    humidity: widget.humidity || "62%",
    wind: widget.wind || "9 km/h",
    forecast: widget.forecast || [
      { day: "Lun", icon: "sun", high: "24°", low: "14°" },
      { day: "Mar", icon: "cloud", high: "22°", low: "13°" },
      { day: "Mer", icon: "rain", high: "19°", low: "11°" },
      { day: "Jeu", icon: "sun", high: "23°", low: "12°" },
      { day: "Ven", icon: "cloud", high: "21°", low: "10°" },
    ],
  };
}

function createIcon() {
  const icon = document.createElement("div");
  icon.className = "mha-weather-icon";
  icon.setAttribute("aria-hidden", "true");

  const sun = document.createElement("span");
  sun.className = "mha-weather-icon-sun";

  const cloud = document.createElement("span");
  cloud.className = "mha-weather-icon-cloud";

  const cloudSmall = document.createElement("span");
  cloudSmall.className = "mha-weather-icon-cloud-small";

  icon.append(sun, cloud, cloudSmall);
  return icon;
}

function createForecastGlyph(type = "sun") {
  const glyph = document.createElement("span");
  glyph.className = "mha-weather-forecast-glyph";
  glyph.dataset.condition = type;
  glyph.setAttribute("aria-hidden", "true");
  glyph.textContent = type === "rain" ? "☂" : type === "cloud" ? "☁" : "☀";
  return glyph;
}

function meta(label, value) {
  const item = document.createElement("span");
  item.className = "mha-weather-meta-item";

  const labelEl = document.createElement("span");
  labelEl.className = "mha-weather-meta-label";
  labelEl.textContent = label;

  const valueEl = document.createElement("strong");
  valueEl.className = "mha-weather-meta-value";
  valueEl.textContent = value;

  item.append(labelEl, valueEl);
  return item;
}

function createHeader(data) {
  const header = createWidgetContentRegion({
    region: "header",
    className: "mha-weather-header",
  });

  const text = document.createElement("div");
  text.className = "mha-weather-header-text";

  const location = document.createElement("div");
  location.className = "mha-weather-location";
  location.textContent = data.location;

  const condition = document.createElement("div");
  condition.className = "mha-weather-condition";
  condition.textContent = data.condition;

  text.append(location, condition);
  header.append(text, createIcon());
  return header;
}

function createHero(data) {
  const hero = createWidgetContentRegion({
    region: "hero",
    className: "mha-weather-hero",
  });

  const temperature = document.createElement("div");
  temperature.className = "mha-weather-temperature";
  temperature.textContent = data.temperature;

  hero.append(temperature);
  return hero;
}

function createFooter(data) {
  const footer = createWidgetContentRegion({
    region: "footer",
    className: "mha-weather-range",
  });
  footer.textContent = `H:${data.high}  B:${data.low}`;
  return footer;
}

function createMeta(data) {
  const metaGrid = createWidgetContentRegion({
    region: "meta",
    className: "mha-weather-meta",
  });
  metaGrid.append(
    meta("Ressenti", data.feelsLike),
    meta("Humidité", data.humidity),
    meta("Vent", data.wind),
  );
  return metaGrid;
}

function createCurrentGrid(data, layout = "compact") {
  const current = createWidgetContentGrid({
    layout: layout === "split" ? "compact" : layout,
    density: layout === "compact" ? "normal" : "comfortable",
    className: "mha-weather-current",
  });

  current.append(
    createHeader(data),
    createHero(data),
    createFooter(data),
  );

  if (layout !== "compact") {
    current.append(createMeta(data));
  }

  return current;
}

function createForecastStack(data) {
  const stack = createWidgetContentRegion({
    region: "secondary",
    className: "mha-weather-forecast",
  });
  stack.setAttribute("aria-label", "Prévisions 5 jours");

  const title = document.createElement("div");
  title.className = "mha-weather-forecast-title";
  title.textContent = "5 jours";

  const list = document.createElement("div");
  list.className = "mha-weather-forecast-list";

  data.forecast.slice(0, 5).forEach((item) => {
    const row = document.createElement("div");
    row.className = "mha-weather-forecast-row";

    const day = document.createElement("span");
    day.className = "mha-weather-forecast-day";
    day.textContent = item.day;

    const glyph = createForecastGlyph(item.icon);

    const temps = document.createElement("span");
    temps.className = "mha-weather-forecast-temps";
    temps.textContent = `${item.high} / ${item.low}`;

    row.append(day, glyph, temps);
    list.append(row);
  });

  stack.append(title, list);
  return stack;
}

export function createWeatherWidgetContent(widget = {}, { className = "" } = {}) {
  const data = getFallbackWeatherData(widget);
  const layout = getWeatherWidgetLayout(widget);
  const root = createWidgetContentGrid({
    layout,
    density: layout === "compact" ? "normal" : "comfortable",
    className: ["mha-weather-widget", className].filter(Boolean).join(" "),
  });

  root.dataset.weatherVariant = normalizeWeatherWidgetVariant(widget.variant);
  root.dataset.weatherLayout = layout;
  root.setAttribute("aria-label", `Météo ${data.location}: ${data.temperature}, ${data.condition}`);

  if (layout === "split") {
    root.append(
      createWidgetContentRegion({
        region: "body",
        className: "mha-weather-current-region",
        children: createCurrentGrid(data, "split"),
      }),
      createForecastStack(data),
    );
    return root;
  }

  root.append(...createCurrentGrid(data, layout).children);
  return root;
}
