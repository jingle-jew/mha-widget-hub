/*
 * MHA Weather Widget
 *
 * Current weather widget with size variants:
 * - 2x2: compact current conditions;
 * - 3x2: wider current conditions, hidden from widget manager;
 * - 4x2: current conditions + 5-day forecast stack.
 *
 * No hourly forecast.
 */

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
  if (w >= 4) return "forecast";
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

function createIcon({ small = false } = {}) {
  const icon = document.createElement("div");
  icon.className = ["mha-weather-icon", small ? "mha-weather-icon--small" : ""].filter(Boolean).join(" ");
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

function createCurrentPane(data, layout = "compact") {
  const current = document.createElement("div");
  current.className = "mha-weather-current";

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

  current.append(header, hero, range);
  if (layout !== "compact") {
    current.append(metaGrid);
  }
  return current;
}

function createForecastStack(data) {
  const stack = document.createElement("div");
  stack.className = "mha-weather-forecast";
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
  const root = document.createElement("section");
  root.className = ["mha-weather-widget", className].filter(Boolean).join(" ");
  root.dataset.weatherVariant = normalizeWeatherWidgetVariant(widget.variant);
  root.dataset.weatherLayout = layout;
  root.setAttribute("aria-label", `Météo ${data.location}: ${data.temperature}, ${data.condition}`);

  root.append(createCurrentPane(data, layout));

  if (layout === "forecast") {
    root.append(createForecastStack(data));
  }

  return root;
}
