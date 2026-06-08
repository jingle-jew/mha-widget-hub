/*
 * MHA Weather Widget
 *
 * First dashboard weather widget.
 * 2x2 current-conditions card only; no hourly forecast.
 *
 * The widget is intentionally data-ready but currently uses safe demo/fallback
 * weather data until Home Assistant entity binding is introduced.
 */

export const WEATHER_WIDGET_KIND = "weather";
export const WEATHER_WIDGET_VARIANTS = Object.freeze(["current"]);

export function normalizeWeatherWidgetVariant(value = "current") {
  return WEATHER_WIDGET_VARIANTS.includes(value) ? value : "current";
}

export function isWeatherWidget(widget = {}) {
  const kind = widget?.kind || widget?.type || widget?.component;
  const variant = widget?.variant || "";

  return kind === "weather"
    || kind === "weather-widget"
    || widget?.component === "weather-widget"
    || (widget?.category === "weather" && (variant === "current" || variant === "weather-current"));
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

export function createWeatherWidgetContent(widget = {}, { className = "" } = {}) {
  const data = getFallbackWeatherData(widget);
  const root = document.createElement("section");
  root.className = ["mha-weather-widget", className].filter(Boolean).join(" ");
  root.dataset.weatherVariant = normalizeWeatherWidgetVariant(widget.variant);
  root.setAttribute("aria-label", `Météo ${data.location}: ${data.temperature}, ${data.condition}`);

  const header = document.createElement("div");
  header.className = "mha-weather-header";

  const location = document.createElement("div");
  location.className = "mha-weather-location";
  location.textContent = data.location;

  const condition = document.createElement("div");
  condition.className = "mha-weather-condition";
  condition.textContent = data.condition;

  header.append(location, condition);

  const hero = document.createElement("div");
  hero.className = "mha-weather-hero";

  const temperature = document.createElement("div");
  temperature.className = "mha-weather-temperature";
  temperature.textContent = data.temperature;

  const icon = createIcon();

  hero.append(temperature, icon);

  const range = document.createElement("div");
  range.className = "mha-weather-range";
  range.textContent = `H:${data.high}  B:${data.low}`;

  const metaGrid = document.createElement("div");
  metaGrid.className = "mha-weather-meta";
  metaGrid.append(
    meta("Ressenti", data.feelsLike),
    meta("Humidité", data.humidity),
    meta("Vent", data.wind),
  );

  root.append(header, hero, range, metaGrid);
  return root;
}
