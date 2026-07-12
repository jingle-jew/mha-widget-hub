import { buildWeatherMetricModel } from "../ha/weather-page-data.js";
import { buildWeatherModel } from "../ha/weather.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";

const SVG_NS = "http://www.w3.org/2000/svg";

const METRIC_LABELS = Object.freeze({
  humidity: Object.freeze(["weatherPage.metrics.humidity", "Humidity"]),
  "apparent-temperature": Object.freeze(["weatherPage.metrics.apparentTemperature", "Feels like"]),
  "dew-point": Object.freeze(["weatherPage.metrics.dewPoint", "Dew point"]),
  "precipitation-probability": Object.freeze(["weatherPage.metrics.precipitationProbability", "Precipitation probability"]),
  precipitation: Object.freeze(["weatherPage.metrics.precipitation", "Precipitation"]),
  "precipitation-rate": Object.freeze(["weatherPage.metrics.precipitationRate", "Precipitation rate"]),
  "snow-depth": Object.freeze(["weatherPage.metrics.snowDepth", "Snow depth"]),
  wind: Object.freeze(["weatherPage.metrics.wind", "Wind"]),
  "wind-gust": Object.freeze(["weatherPage.metrics.windGust", "Wind gusts"]),
  pressure: Object.freeze(["weatherPage.metrics.pressure", "Pressure"]),
  "pressure-tendency": Object.freeze(["weatherPage.metrics.pressureTendency", "Pressure tendency"]),
  visibility: Object.freeze(["weatherPage.metrics.visibility", "Visibility"]),
  "cloud-coverage": Object.freeze(["weatherPage.metrics.cloudCoverage", "Cloud coverage"]),
  uv: Object.freeze(["weatherPage.metrics.uv", "UV index"]),
  ozone: Object.freeze(["weatherPage.metrics.ozone", "Ozone"]),
  "solar-radiation": Object.freeze(["weatherPage.metrics.solarRadiation", "Solar radiation"]),
  illuminance: Object.freeze(["weatherPage.metrics.illuminance", "Illuminance"]),
  "sunshine-duration": Object.freeze(["weatherPage.metrics.sunshineDuration", "Sunshine duration"]),
  "air-quality": Object.freeze(["weatherPage.metrics.airQuality", "Air quality"]),
  "air-quality-pm1": Object.freeze(["weatherPage.metrics.pm1", "PM1"]),
  "air-quality-pm25": Object.freeze(["weatherPage.metrics.pm25", "PM2.5"]),
  "air-quality-pm10": Object.freeze(["weatherPage.metrics.pm10", "PM10"]),
  "air-quality-co": Object.freeze(["weatherPage.metrics.carbonMonoxide", "Carbon monoxide"]),
  "air-quality-co2": Object.freeze(["weatherPage.metrics.carbonDioxide", "Carbon dioxide"]),
  "air-quality-no2": Object.freeze(["weatherPage.metrics.nitrogenDioxide", "Nitrogen dioxide"]),
  "air-quality-so2": Object.freeze(["weatherPage.metrics.sulfurDioxide", "Sulfur dioxide"]),
  "air-quality-voc": Object.freeze(["weatherPage.metrics.voc", "Volatile organic compounds"]),
  summary: Object.freeze(["weatherPage.metrics.summary", "Weather summary"]),
  alerts: Object.freeze(["weatherPage.metrics.alerts", "Weather alerts"]),
  sun: Object.freeze(["weatherPage.metrics.sun", "Sunrise & sunset"]),
});

const WEATHER_METRIC_SQUARE_VARIANT = variant("weather-metric-square", "Metric 2×2", 2, 2);
const WEATHER_METRIC_COMPACT_VARIANT = variant("weather-metric-compact", "Metric 2×1", 2, 1);
const WEATHER_METRIC_WIDE_VARIANT = variant("weather-metric-wide", "Metric 4×1", 4, 1);
const WEATHER_METRIC_TEXT_WIDE_VARIANT = variant("weather-metric-text-wide", "Text 4×1", 4, 1);
const WEATHER_METRIC_TEXT_TALL_VARIANT = variant("weather-metric-text-tall", "Text 4×2", 4, 2);
const WEATHER_METRIC_VARIANTS = Object.freeze([
  WEATHER_METRIC_SQUARE_VARIANT,
  WEATHER_METRIC_COMPACT_VARIANT,
]);
const WEATHER_SUN_VARIANTS = Object.freeze([
  WEATHER_METRIC_SQUARE_VARIANT,
  WEATHER_METRIC_WIDE_VARIANT,
]);
const WEATHER_SUMMARY_VARIANTS = Object.freeze([
  WEATHER_METRIC_TEXT_TALL_VARIANT,
  WEATHER_METRIC_TEXT_WIDE_VARIANT,
]);
const WEATHER_TENDENCY_VARIANTS = Object.freeze([
  WEATHER_METRIC_COMPACT_VARIANT,
  WEATHER_METRIC_TEXT_WIDE_VARIANT,
]);

function resolveWeatherMetricVariants(widget = {}) {
  if (widget.metricKey === "sun") return WEATHER_SUN_VARIANTS;
  if (widget.metricKey === "summary") return WEATHER_SUMMARY_VARIANTS;
  if (widget.metricKey === "pressure-tendency") return WEATHER_TENDENCY_VARIANTS;
  if (widget.valueKind === "text") return Object.freeze([WEATHER_METRIC_TEXT_WIDE_VARIANT]);
  return WEATHER_METRIC_VARIANTS;
}

function normalizeWeatherMetricSize(size = {}, { widget = {} } = {}) {
  if (widget.metricKey === "sun") {
    return size.h <= 1 ? { w: 4, h: 1 } : { w: 2, h: 2 };
  }
  if (widget.metricKey === "summary") {
    return size.h <= 1 ? { w: 4, h: 1 } : { w: 4, h: 2 };
  }
  if (widget.metricKey === "pressure-tendency") {
    return size.w >= 4 ? { w: 4, h: 1 } : { w: 2, h: 1 };
  }
  if (widget.valueKind === "text") return { w: 4, h: 1 };
  return size.h <= 1 ? { w: 2, h: 1 } : { w: 2, h: 2 };
}

export function isWeatherMetricWidget(widget = {}) {
  return isLocalWidgetKind(widget, "weather-metric", ["weather-metric-widget"]);
}

function createText(className, text) {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS(SVG_NS, name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, String(value)));
  return element;
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function getMetricLabel(metricKey = "metric", fallback = "Weather") {
  const [key, defaultLabel] = METRIC_LABELS[metricKey] || ["", fallback];
  return key ? t(key, defaultLabel) : fallback;
}

function getCompactWeatherLocation(location = "") {
  const raw = String(location || "").trim();
  if (!raw) return "";
  const compact = raw.replace(
    /\s+(?:prévisions?|previsions?|forecasts?|weather|météo|meteo)\s*$/iu,
    "",
  ).trim();
  return compact || raw;
}

function normalizeWindKmh(value, unit = "") {
  if (!Number.isFinite(value)) return null;
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit.includes("m/s")) return value * 3.6;
  if (normalizedUnit.includes("mph")) return value * 1.60934;
  if (normalizedUnit.includes("kn") || normalizedUnit.includes("kt")) return value * 1.852;
  return value;
}

function normalizePressureHpa(value, unit = "") {
  if (!Number.isFinite(value)) return null;
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit.includes("kpa")) return value * 10;
  if (normalizedUnit.includes("pa") && !normalizedUnit.includes("hpa")) return value / 100;
  return value;
}

function normalizeVisibilityKm(value, unit = "") {
  if (!Number.isFinite(value)) return null;
  const normalizedUnit = String(unit || "").toLowerCase();
  if (normalizedUnit === "m" || normalizedUnit.includes("meter")) return value / 1000;
  if (normalizedUnit.includes("mi")) return value * 1.60934;
  return value;
}

function supportsAirQualityProfile(model) {
  return ["aqhi", "aqi", "pm25", "pm10"].includes(model.measurementType);
}

function getAirQualityProfile(model) {
  const value = model.valueNumber;
  if (!Number.isFinite(value)) return { level: "unknown", progress: 0 };
  if (model.measurementType === "aqhi") {
    const level = value <= 3 ? "low" : value <= 6 ? "moderate" : value <= 10 ? "high" : "veryHigh";
    return { level, progress: clamp(value / 11) };
  }
  if (model.measurementType === "pm25") {
    const level = value <= 12 ? "low" : value <= 35 ? "moderate" : value <= 55 ? "high" : value <= 150 ? "veryHigh" : "hazardous";
    return { level, progress: clamp(value / 250) };
  }
  if (model.measurementType === "pm10") {
    const level = value <= 54 ? "low" : value <= 154 ? "moderate" : value <= 254 ? "high" : value <= 354 ? "veryHigh" : "hazardous";
    return { level, progress: clamp(value / 500) };
  }
  const level = value <= 50 ? "low" : value <= 100 ? "moderate" : value <= 150 ? "high" : value <= 200 ? "veryHigh" : "hazardous";
  return { level, progress: clamp(value / 300) };
}

function getMetricDescription(model) {
  const value = model.valueNumber;
  let level = "unknown";

  if (model.metricKey === "humidity" && Number.isFinite(value)) {
    level = value < 30 ? "veryDry" : value < 40 ? "dry" : value <= 60 ? "comfortable" : value <= 75 ? "humid" : "veryHumid";
  } else if (
    (model.metricKey === "precipitation-probability"
      || (model.metricKey === "precipitation" && String(model.unit || "").includes("%")))
    && Number.isFinite(value)
  ) {
    level = value < 10 ? "none" : value < 35 ? "low" : value < 65 ? "possible" : "likely";
  } else if (model.metricKey === "wind") {
    const windKmh = normalizeWindKmh(value, model.unit);
    level = !Number.isFinite(windKmh) ? "unknown" : windKmh < 5 ? "calm" : windKmh < 15 ? "light" : windKmh < 30 ? "breezy" : windKmh < 50 ? "windy" : "strong";
  } else if (model.metricKey === "pressure") {
    const pressureHpa = normalizePressureHpa(value, model.unit);
    level = !Number.isFinite(pressureHpa) ? "unknown" : pressureHpa < 1000 ? "low" : pressureHpa <= 1025 ? "normal" : "high";
  } else if (model.metricKey === "uv" && Number.isFinite(value)) {
    level = value < 3 ? "low" : value < 6 ? "moderate" : value < 8 ? "high" : value < 11 ? "veryHigh" : "extreme";
  } else if (model.metricKey.startsWith("air-quality") && supportsAirQualityProfile(model)) {
    level = getAirQualityProfile(model).level;
  } else if (model.metricKey === "visibility") {
    const visibilityKm = normalizeVisibilityKm(value, model.unit);
    level = !Number.isFinite(visibilityKm) ? "unknown" : visibilityKm < 1 ? "poor" : visibilityKm < 5 ? "reduced" : visibilityKm < 15 ? "good" : "excellent";
  } else if (model.metricKey === "sun") {
    level = model.isDay ? "day" : "night";
  }

  if (level === "unknown") return "";
  const descriptionKey = model.metricKey.startsWith("air-quality")
    ? "air-quality"
    : model.metricKey === "precipitation-probability"
      ? "precipitation"
      : model.metricKey;
  return t(`weatherPage.descriptions.${descriptionKey}.${level}`, level);
}

function createProgressVisual({ kind = "generic", progress = 0, segmented = false } = {}) {
  const visual = document.createElement("div");
  visual.className = "mha-weather-metric-progress";
  visual.dataset.progressKind = kind;
  visual.style.setProperty("--mha-weather-metric-progress", `${Math.round(clamp(progress) * 100)}%`);

  const track = document.createElement("div");
  track.className = "mha-weather-metric-progress-track";
  if (segmented) {
    track.dataset.segmented = "true";
    for (let index = 0; index < 5; index += 1) {
      track.append(document.createElement("span"));
    }
  }

  const fill = document.createElement("span");
  fill.className = "mha-weather-metric-progress-fill";
  const marker = document.createElement("span");
  marker.className = "mha-weather-metric-progress-marker";
  visual.append(track, fill, marker);
  return visual;
}

function createCompassVisual(model) {
  if (!Number.isFinite(model.windBearing)) {
    const windKmh = normalizeWindKmh(model.valueNumber, model.unit);
    return createProgressVisual({
      kind: "wind",
      progress: Number.isFinite(windKmh) ? windKmh / 60 : 0,
    });
  }

  const visual = document.createElement("div");
  visual.className = "mha-weather-metric-compass";
  const svg = createSvgElement("svg", { viewBox: "0 0 120 120", role: "img", "aria-label": getMetricLabel("wind", "Wind") });
  svg.append(
    createSvgElement("circle", { cx: 60, cy: 60, r: 47, class: "mha-weather-metric-compass-ring" }),
    createSvgElement("line", { x1: 60, y1: 16, x2: 60, y2: 24, class: "mha-weather-metric-compass-tick" }),
    createSvgElement("line", { x1: 60, y1: 96, x2: 60, y2: 104, class: "mha-weather-metric-compass-tick" }),
    createSvgElement("line", { x1: 16, y1: 60, x2: 24, y2: 60, class: "mha-weather-metric-compass-tick" }),
    createSvgElement("line", { x1: 96, y1: 60, x2: 104, y2: 60, class: "mha-weather-metric-compass-tick" }),
  );
  const pointer = createSvgElement("path", {
    d: "M60 18l7 35l-7 11l-7-11z",
    class: "mha-weather-metric-compass-pointer",
  });
  pointer.style.transformOrigin = "60px 60px";
  pointer.style.transform = `rotate(${model.windBearing}deg)`;
  svg.append(pointer);
  visual.append(svg);
  return visual;
}

function createVisibilityVisual(model) {
  const visibilityKm = normalizeVisibilityKm(model.valueNumber, model.unit);
  const visual = createProgressVisual({
    kind: "visibility",
    progress: Number.isFinite(visibilityKm) ? visibilityKm / 30 : 0,
  });
  visual.classList.add("mha-weather-metric-horizon");
  return visual;
}

function createSunVisual(model) {
  const visual = document.createElement("div");
  visual.className = "mha-weather-metric-sun-arc";
  visual.style.setProperty("--mha-weather-sun-progress", `${Math.round(clamp(model.progress) * 100)}%`);
  const svg = createSvgElement("svg", { viewBox: "0 0 240 64", "aria-hidden": "true" });
  svg.append(
    createSvgElement("path", { d: "M12 56 Q120 -28 228 56", class: "mha-weather-metric-sun-path" }),
    createSvgElement("line", { x1: 12, y1: 56, x2: 228, y2: 56, class: "mha-weather-metric-sun-horizon" }),
  );
  visual.append(svg, createIconSymbol({
    name: model.isDay ? "sun" : "moon",
    label: getMetricDescription(model),
    className: "mha-weather-metric-sun-marker",
  }));
  return visual;
}

function createMetricVisual(model) {
  const value = model.valueNumber;
  if (model.metricKey === "humidity") {
    return createProgressVisual({ kind: "humidity", progress: Number.isFinite(value) ? value / 100 : 0 });
  }
  if (
    model.metricKey === "precipitation-probability"
    || (model.metricKey === "precipitation" && String(model.unit || "").includes("%"))
  ) {
    return createProgressVisual({ kind: "precipitation", progress: Number.isFinite(value) ? value / 100 : 0 });
  }
  if (model.metricKey === "wind") return createCompassVisual(model);
  if (model.metricKey === "pressure") {
    const pressureHpa = normalizePressureHpa(value, model.unit);
    return createProgressVisual({ kind: "pressure", progress: Number.isFinite(pressureHpa) ? (pressureHpa - 970) / 80 : 0 });
  }
  if (model.metricKey === "uv") {
    return createProgressVisual({ kind: "uv", progress: Number.isFinite(value) ? value / 11 : 0, segmented: true });
  }
  if (model.metricKey.startsWith("air-quality") && supportsAirQualityProfile(model)) {
    return createProgressVisual({ kind: "air-quality", progress: getAirQualityProfile(model).progress, segmented: true });
  }
  if (model.metricKey === "visibility") return createVisibilityVisual(model);
  return null;
}

function createValueBlock(model) {
  const block = document.createElement("div");
  block.className = "mha-weather-metric-value-block";
  const number = model.rawValue == null || model.rawValue === "" ? "--" : String(model.rawValue);
  block.append(createText("mha-weather-metric-value", number));
  if (model.unit) block.append(createText("mha-weather-metric-unit", model.unit));
  return block;
}

function renderCompactMetric(root, iconBubble, labelElement, valueElement) {
  const textStack = document.createElement("span");
  textStack.className = "mha-weather-metric-compact-text";
  textStack.append(labelElement, valueElement);
  root.append(iconBubble, textStack);
}

function createSummaryWeatherHeader(weather = {}) {
  const header = document.createElement("div");
  header.className = "mha-weather-summary-overview";

  header.append(createCurrentWeatherIcon(weather.condition || "unknown", {
    className: "mha-weather-summary-icon",
    label: weather.summary || t("weatherPage.current.title", "Current conditions"),
  }));

  const primary = document.createElement("div");
  primary.className = "mha-weather-summary-primary";
  primary.append(
    createText("mha-weather-summary-temperature", weather.temperature || "--"),
    createText("mha-weather-summary-location", getCompactWeatherLocation(weather.location)),
  );

  const secondary = document.createElement("div");
  secondary.className = "mha-weather-summary-secondary";
  secondary.append(createText(
    "mha-weather-summary-condition",
    weather.summary || t("common.unavailable", "Unavailable"),
  ));
  const metadata = weather.temperatureRange
    || [weather.humidity, weather.wind].filter(Boolean).join(" · ");
  if (metadata) {
    secondary.append(createText("mha-weather-summary-metadata", metadata));
  }

  header.append(primary, secondary);
  return header;
}

function renderSummaryMetric(root, model, weather = {}) {
  root.dataset.metricLayout = "summary";

  const divider = document.createElement("span");
  divider.className = "mha-weather-summary-divider";
  divider.setAttribute("aria-hidden", "true");

  const body = document.createElement("section");
  body.className = "mha-weather-summary-body";
  body.append(
    createText(
      "mha-weather-summary-eyebrow",
      getMetricLabel("summary", model.title || "Weather summary"),
    ),
    createText("mha-weather-summary-text", model.value || "--"),
  );

  root.append(createSummaryWeatherHeader(weather), divider, body);
}

function renderSunMetric(root, model, header) {
  const sunValues = document.createElement("div");
  sunValues.className = "mha-weather-metric-sun-values";
  const sunrise = document.createElement("span");
  sunrise.append(
    createIconSymbol({ name: "sunrise", label: t("weatherPage.sunrise", "Sunrise") }),
    createText("mha-weather-metric-sun-label", t("weatherPage.sunrise", "Sunrise")),
    createText("mha-weather-metric-sun-time", model.value),
  );
  const sunset = document.createElement("span");
  sunset.append(
    createIconSymbol({ name: "sunset", label: t("weatherPage.sunset", "Sunset") }),
    createText("mha-weather-metric-sun-label", t("weatherPage.sunset", "Sunset")),
    createText("mha-weather-metric-sun-time", model.secondaryValue),
  );
  sunValues.append(sunrise, sunset);
  root.append(
    header,
    createText("mha-weather-metric-description", getMetricDescription(model)),
    createSunVisual(model),
    sunValues,
  );
}

function renderMetric(root, model, { weatherModel = null } = {}) {
  root.replaceChildren();
  root.dataset.metricKey = model.metricKey;
  root.dataset.metricKind = model.valueKind || "number";
  root.dataset.metricLayout = "unavailable";
  root.dataset.entityAllowed = String(model.entityAllowed);
  root.dataset.entityAvailable = String(model.entityAvailable);

  const header = document.createElement("div");
  header.className = "mha-weather-metric-header";
  const label = getMetricLabel(model.metricKey, model.title || "Weather");
  const labelElement = createText("mha-weather-metric-label", label);
  const iconBubble = document.createElement("span");
  iconBubble.className = "mha-weather-metric-icon-bubble";
  iconBubble.append(createIconSymbol({
    name: model.icon || "weather",
    label,
    className: "mha-weather-metric-glyph",
  }));
  header.append(iconBubble, labelElement);

  const isCompact = root.dataset.weatherMetricSize === "2x1";
  if (isCompact) root.dataset.metricLayout = "compact";

  if (!model.entityId || !model.entityAllowed || !model.entityAvailable) {
    if (isCompact) {
      renderCompactMetric(root, iconBubble, labelElement, createValueBlock(model));
      return;
    }

    root.append(
      header,
      createText("mha-weather-metric-value", "--"),
      createText(
        "mha-weather-metric-description",
        !model.entityId
          ? t("weatherPage.notDetected", "No matching Home Assistant entity detected")
          : model.entityAllowed
            ? t("common.unavailable", "Unavailable")
            : t("common.unauthorized", "Unauthorized"),
      ),
    );
    return;
  }

  if (model.metricKey === "sun") {
    root.dataset.metricLayout = "sun";
    renderSunMetric(root, model, header);
    return;
  }

  if (model.metricKey === "summary") {
    renderSummaryMetric(root, model, weatherModel || {});
    return;
  }

  if (model.valueKind === "text") {
    const textValue = createText("mha-weather-metric-text-value", model.value || "--");
    if (isCompact) {
      renderCompactMetric(root, iconBubble, labelElement, textValue);
    } else {
      root.dataset.metricLayout = "text";
      root.append(header, textValue);
    }
    return;
  }

  const valueBlock = createValueBlock(model);
  if (isCompact) {
    renderCompactMetric(root, iconBubble, labelElement, valueBlock);
    return;
  }

  const description = getMetricDescription(model);
  const visual = createMetricVisual(model);
  root.dataset.metricLayout = visual ? "visual" : "value-only";
  root.append(header);
  if (description) root.append(createText("mha-weather-metric-description", description));
  root.append(valueBlock);
  if (visual) root.append(visual);
}

function getSummaryWeatherEntityId(widget = {}) {
  return widget.weatherEntityId
    || (widget.sourceType === "weather-attribute" ? widget.entityId || widget.entity_id || "" : "");
}

export function createWeatherMetricWidgetContent(widget = {}, {
  widgetW = 2,
  widgetH = 2,
  hass,
  entityVisibilityConfig,
} = {}) {
  const context = { hass, widgetW, widgetH };
  const root = document.createElement("div");
  root.className = "mha-weather-metric-widget";
  root.dataset.widgetComponent = "weather-metric";

  const renderCurrent = () => {
    if (widget.metricKey === "sun") {
      root.dataset.weatherMetricSize = context.widgetH <= 1 ? "4x1" : "2x2";
    } else if (widget.valueKind === "text") {
      root.dataset.weatherMetricSize = context.widgetH >= 2 && context.widgetW >= 4
        ? "4x2"
        : context.widgetW >= 4 ? "4x1" : "2x1";
    } else {
      root.dataset.weatherMetricSize = context.widgetH <= 1 ? "2x1" : "2x2";
    }
    const model = buildWeatherMetricModel(context.hass, widget, entityVisibilityConfig);
    const weatherModel = widget.metricKey === "summary"
      ? buildWeatherModel(context.hass, {
        entityId: getSummaryWeatherEntityId(widget),
      }, entityVisibilityConfig)
      : null;
    renderMetric(root, model, { weatherModel });
  };

  root.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    renderCurrent();
  };
  root.__mhaUpdateWidgetSize = ({ widgetW: nextW = widgetW, widgetH: nextH = widgetH } = {}) => {
    context.widgetW = nextW;
    context.widgetH = nextH;
    renderCurrent();
  };
  root.__mhaDestroy = () => {
    delete root.__mhaUpdateFromHass;
    delete root.__mhaUpdateWidgetSize;
  };
  renderCurrent();
  return root;
}

export const WEATHER_METRIC_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => (
    createWeatherMetricWidgetContent(widget, {
      widgetW,
      widgetH,
      hass,
      entityVisibilityConfig,
    })
  ),
});

export const WEATHER_METRIC_WIDGET_DEFINITION = Object.freeze({
  component: "weather-metric-widget",
  category: "climate",
  manager: Object.freeze({
    hidden: true,
    entries: Object.freeze([]),
  }),
  renderer: "weather-metric",
  css: css("styles/widgets/weather-metric-widget.css"),
  preview: "weather",
  aliases: ["weather-metric-widget"],
  variantAliases: ["weather-metric-square", "weather-metric-compact", "weather-metric-wide", "weather-metric-text-wide", "weather-metric-text-tall"],
  defaultVariant: "weather-metric-square",
  defaultSize: freezeSize(2, 2),
  normalizeSize: normalizeWeatherMetricSize,
  resolveVariants: resolveWeatherMetricVariants,
  capabilities: Object.freeze({
    configurable: false,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      metricKey: String(widget.metricKey || "metric"),
      icon: String(widget.icon || "weather"),
      label: String(widget.label || ""),
      sourceType: String(widget.sourceType || "entity"),
      valueKind: widget.valueKind === "text" ? "text" : "number",
      weatherEntityId: String(widget.weatherEntityId || ""),
      entityId: String(widget.entityId || widget.entity_id || ""),
      attribute: String(widget.attribute || ""),
      unit: String(widget.unit || ""),
    }),
  }),
  shell: Object.freeze({
    configureMode: "variant",
  }),
  placementFlow: "direct",
  variants: [
    WEATHER_METRIC_SQUARE_VARIANT,
    WEATHER_METRIC_COMPACT_VARIANT,
    WEATHER_METRIC_WIDE_VARIANT,
    WEATHER_METRIC_TEXT_WIDE_VARIANT,
    WEATHER_METRIC_TEXT_TALL_VARIANT,
  ],
});

export const WIDGET_MODULE = Object.freeze({
  kind: "weather-metric",
  definition: WEATHER_METRIC_WIDGET_DEFINITION,
  renderer: WEATHER_METRIC_WIDGET_CONTENT_RENDERER,
  preview: Object.freeze({ mode: "static" }),
});
