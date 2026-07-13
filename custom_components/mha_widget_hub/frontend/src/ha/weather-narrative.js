import { t } from "../i18n/index.js";

const HOUR_MS = 60 * 60 * 1000;
const FORECAST_WINDOW_MS = 24 * HOUR_MS;

function finite(value) {
  return Number.isFinite(value) ? value : null;
}

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toCelsius(value, unit = "") {
  if (!Number.isFinite(value)) return null;
  return String(unit || "").toLowerCase().includes("f")
    ? (value - 32) * (5 / 9)
    : value;
}

function toKmh(value, unit = "") {
  if (!Number.isFinite(value)) return null;
  const normalized = String(unit || "").toLowerCase();
  if (normalized.includes("m/s")) return value * 3.6;
  if (normalized.includes("mph")) return value * 1.60934;
  if (normalized.includes("kn") || normalized.includes("kt")) return value * 1.852;
  return value;
}

function dateOf(item = {}) {
  const timestamp = new Date(item?.datetime || "");
  return Number.isNaN(timestamp.getTime()) ? null : timestamp;
}

function isWithinForecastWindow(item, now, windowMs = FORECAST_WINDOW_MS) {
  const date = dateOf(item);
  if (!date) return false;
  const delta = date.getTime() - now.getTime();
  return delta >= -HOUR_MS && delta <= windowMs;
}

function getPeriodKey(date, now) {
  if (!date) return "today";
  const sameDay = date.toDateString() === now.toDateString();
  const hour = date.getHours();
  if (!sameDay && date.getTime() > now.getTime() && hour < 12) return "tomorrowMorning";
  if (hour < 5 || hour >= 22) return "night";
  if (hour < 11) return "morning";
  if (hour < 14) return "lateMorning";
  if (hour < 18) return "afternoon";
  if (hour < 22) return "evening";
  return "night";
}

function getPeriodLabel(date, now) {
  const key = getPeriodKey(date, now);
  return t(`widgets.weatherNarrative.periods.${key}`, key === "tomorrowMorning" ? "tomorrow morning" : "today");
}

function getTimeLabel(date) {
  if (!date) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).replace(/\s/g, "");
}

function getForecast(weather = {}, now = new Date()) {
  const hourly = Array.isArray(weather.hourlyForecast) ? weather.hourlyForecast : [];
  const daily = Array.isArray(weather.dailyForecast) ? weather.dailyForecast : [];
  const source = hourly.length ? hourly : daily;
  return source.filter(item => isWithinForecastWindow(item, now));
}

function conditionIncludes(condition, terms) {
  const normalized = normalizeText(condition).replace(/[_-]+/g, " ");
  return terms.some(term => normalized.includes(term));
}

function getPrecipitationScore(item = {}) {
  return Math.max(item.precipitationProbability ?? -1, (item.precipitation ?? -1) * 20);
}

function getMinTemperature(items, weather = {}) {
  const values = items
    .map(item => toCelsius(item.temperatureValue ?? item.lowTemperatureValue, weather.temperatureUnit))
    .filter(Number.isFinite);
  return values.length ? Math.min(...values) : null;
}

function getMaxTemperature(items, weather = {}) {
  const values = items
    .map(item => toCelsius(item.temperatureValue, weather.temperatureUnit))
    .filter(Number.isFinite);
  return values.length ? Math.max(...values) : null;
}

function getStrongestWind(items, weather = {}) {
  return items.reduce((strongest, item) => {
    const gust = toKmh(item.windGustValue, item.windUnit || weather.windUnit);
    const speed = toKmh(item.windSpeedValue, item.windUnit || weather.windUnit);
    const value = Math.max(gust ?? -1, speed ?? -1);
    return value > (strongest?.value ?? -1) ? { item, value } : strongest;
  }, null);
}

function translateMessage(key, fallback, params = {}) {
  return t(`widgets.weatherNarrative.messages.${key}`, fallback, params);
}

function createEvent({
  kind,
  chartKind,
  target = null,
  period = "today",
  headline,
  secondary = "",
  mood = "neutral",
  icon = "weather",
  items = [],
  alert = "",
} = {}) {
  return {
    kind,
    chartKind,
    target,
    period,
    headline,
    secondary,
    mood,
    icon,
    items,
    alert,
  };
}

export function buildWeatherNarrativeModel(weather = {}, now = new Date()) {
  const currentTime = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date();
  if (!weather.entityId || !weather.entityAllowed || !weather.entityAvailable) {
    return createEvent({
      kind: "unavailable",
      chartKind: "empty",
      headline: weather.entityId
        ? t("common.unavailable", "Weather unavailable")
        : t("widgets.config.noWeatherEntity", "Weather not configured"),
      mood: "unknown",
    });
  }

  const items = getForecast(weather, currentTime);
  const first = items[0] || null;
  const alert = weather.alerts?.[0] || "";
  if (alert) {
    return createEvent({
      kind: "alert",
      chartKind: "alert",
      headline: translateMessage("alert", "Weather alert: {message}", { message: alert }),
      secondary: translateMessage("alertSecondary", "Follow the official advisory for details."),
      mood: "storm",
      icon: "warning",
      items,
      alert,
    });
  }

  const dangerous = items.find(item => (
    conditionIncludes(item.condition, ["thunder", "lightning", "hail", "freezing rain", "exceptional"])
  ));
  if (dangerous) {
    const period = getPeriodLabel(dateOf(dangerous), currentTime);
    return createEvent({
      kind: "danger",
      chartKind: "precipitation-wind",
      target: dateOf(dangerous),
      period,
      headline: translateMessage("storm", "Take care {period}. Severe thunderstorms are possible.", { period }),
      secondary: translateMessage("stormSecondary", "Weather conditions may change quickly."),
      mood: "storm",
      icon: conditionIncludes(dangerous.condition, ["hail"]) ? "hail" : "storm",
      items,
    });
  }

  const minTemperature = getMinTemperature(items, weather);
  const freezeItem = items.find(item => (
    toCelsius(item.temperatureValue ?? item.lowTemperatureValue, weather.temperatureUnit) <= 1
  ));
  if (freezeItem || (minTemperature != null && minTemperature <= 1 && currentTime.getHours() >= 16)) {
    const target = dateOf(freezeItem) || dateOf(first);
    const period = getPeriodLabel(target, currentTime);
    return createEvent({
      kind: "freeze",
      chartKind: "temperature",
      target,
      period,
      headline: translateMessage("freeze", "Protect your plants {period}. Frost is possible.", { period }),
      secondary: translateMessage("freezeSecondary", "Temperatures may approach the freezing point."),
      mood: "cold",
      icon: "snow",
      items,
    });
  }

  const strongestWind = getStrongestWind(items, weather);
  if (strongestWind?.value >= 45) {
    const target = dateOf(strongestWind.item);
    const period = getPeriodLabel(target, currentTime);
    return createEvent({
      kind: "wind",
      chartKind: "wind",
      target,
      period,
      headline: translateMessage("wind", "Winds will strengthen {period}.", { period }),
      secondary: translateMessage("windSecondary", "Peak gusts: {value} km/h", { value: Math.round(strongestWind.value) }),
      mood: "wind",
      icon: "wind",
      items,
    });
  }

  const precipitation = items.find(item => (
    getPrecipitationScore(item) >= 55
    || conditionIncludes(item.condition, ["rain", "snow", "pouring"])
  ));
  if (precipitation) {
    const target = dateOf(precipitation);
    const period = getPeriodLabel(target, currentTime);
    const isSnow = conditionIncludes(precipitation.condition, ["snow"]);
    return createEvent({
      kind: isSnow ? "snow" : "rain",
      chartKind: "precipitation",
      target,
      period,
      headline: translateMessage(
        isSnow ? "snow" : "rain",
        isSnow ? "Snow is expected {period}." : "Rain is expected {period}.",
        { period },
      ),
      secondary: precipitation.precipitationProbability != null
        ? translateMessage("precipitationSecondary", "Probability: {value}%", { value: Math.round(precipitation.precipitationProbability) })
        : translateMessage("precipitationSecondaryUnavailable", "The forecast indicates a change in conditions."),
      mood: isSnow ? "snow" : "rain",
      icon: isSnow ? "snow" : "rain",
      items,
    });
  }

  const maxTemperature = getMaxTemperature(items, weather);
  const currentCelsius = toCelsius(weather.temperatureValue, weather.temperatureUnit);
  if ((maxTemperature != null && maxTemperature >= 30) || (currentCelsius != null && currentCelsius >= 30)) {
    const target = dateOf(items.find(item => toCelsius(item.temperatureValue, weather.temperatureUnit) >= 30));
    const period = getPeriodLabel(target, currentTime);
    return createEvent({
      kind: "heat",
      chartKind: "temperature",
      target,
      period,
      headline: translateMessage("heat", "Heat will build {period}.", { period }),
      secondary: translateMessage("heatSecondary", "Stay hydrated and limit strenuous activity."),
      mood: "hot",
      icon: "sun",
      items,
    });
  }

  const temperatures = items
    .map(item => ({ item, value: toCelsius(item.temperatureValue, weather.temperatureUnit) }))
    .filter(entry => Number.isFinite(entry.value));
  const firstTemperature = currentCelsius ?? temperatures[0]?.value;
  const lastTemperature = temperatures.at(-1)?.value;
  const temperatureDelta = Number.isFinite(firstTemperature) && Number.isFinite(lastTemperature)
    ? lastTemperature - firstTemperature
    : 0;
  if (Math.abs(temperatureDelta) >= 5 && temperatures.length >= 2) {
    const target = dateOf(temperatures.at(-1).item);
    const period = getPeriodLabel(target, currentTime);
    const warming = temperatureDelta > 0;
    return createEvent({
      kind: warming ? "warming" : "cooling",
      chartKind: "temperature",
      target,
      period,
      headline: translateMessage(warming ? "warming" : "cooling", "Temperatures will change quickly {period}.", { period }),
      secondary: translateMessage("temperatureSecondary", "A change of {value}° is expected.", { value: Math.round(Math.abs(temperatureDelta)) }),
      mood: warming ? "hot" : "cold",
      icon: "thermometer",
      items,
    });
  }

  const currentCondition = normalizeText(weather.condition);
  const isClear = conditionIncludes(currentCondition, ["sunny", "clear"]);
  const period = getPeriodLabel(dateOf(first), currentTime);
  return createEvent({
    kind: "summary",
    chartKind: items.length >= 2 ? "temperature" : "empty",
    target: dateOf(first),
    period,
    headline: isClear
      ? translateMessage("clear", "The sky will stay clear {period}.", { period })
      : translateMessage("calm", "A generally calm day with mild conditions."),
    secondary: weather.summary || t("widgets.weather.title", "Weather"),
    mood: isClear ? "clear" : "neutral",
    icon: weather.condition || "weather",
    items,
  });
}
