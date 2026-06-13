/*
 * MHA Clock Widget
 *
 * Shared 2x2 clock variants for dashboard widgets and screensaver clocks.
 */

import { isWidgetKind } from "./widget-registry.js";

export const CLOCK_WIDGET_VARIANTS = Object.freeze([
  "digital",
  "digital-weather",
  "analog",
  "ios-analog",
]);

export function normalizeClockWidgetVariant(value = "digital") {
  return CLOCK_WIDGET_VARIANTS.includes(value) ? value : "digital";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getTimeParts(now = new Date()) {
  return {
    hours24: now.getHours(),
    hours12: now.getHours() % 12,
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
    milliseconds: now.getMilliseconds(),
  };
}

function setHandRotations(root, now = new Date()) {
  const { hours12, minutes, seconds } = getTimeParts(now);

  root?.querySelectorAll?.(".mha-clock-hand--hour").forEach((hand) => {
    hand.style.setProperty("--mha-clock-rotation", `${(hours12 * 30) + (minutes * .5)}deg`);
  });

  root?.querySelectorAll?.(".mha-clock-hand--minute").forEach((hand) => {
    hand.style.setProperty("--mha-clock-rotation", `${(minutes * 6) + (seconds * .1)}deg`);
  });

  root?.querySelectorAll?.(".mha-clock-hand--second").forEach((hand) => {
    hand.style.setProperty("--mha-clock-rotation", `${seconds * 6}deg`);
  });
}

const CLOCK_WEATHER_SUMMARY_LABELS = new Map([
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

function getClockWeatherText(widget = {}) {
  const temperature = widget.temperature || widget.weatherTemperature || "22°";
  const explicitSummary = widget.summary || widget.weatherSummary || widget.conditionText || widget.conditionLabel;
  const condition = String(widget.condition || "partly-cloudy").trim().toLowerCase();
  const summary = explicitSummary || CLOCK_WEATHER_SUMMARY_LABELS.get(condition) || "Météo";
  return `${temperature} · ${summary}`;
}

function updateDigital(root, now = new Date()) {
  const time = root?.querySelector?.(".mha-clock-time");
  const date = root?.querySelector?.(".mha-clock-date");
  const weather = root?.querySelector?.(".mha-clock-weather");
  const second = root?.querySelector?.(".mha-clock-seconds");
  const separator = root?.querySelector?.(".mha-clock-separator");

  if (time) {
    const hh = pad(now.getHours());
    const mm = pad(now.getMinutes());
    time.textContent = `${hh}:${mm}`;
  }

  if (separator) {
    separator.dataset.tick = String(now.getSeconds() % 2);
  }

  if (second) {
    second.textContent = pad(now.getSeconds());
  }

  if (date) {
    date.textContent = now.toLocaleDateString([], {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  }

  if (weather) {
    weather.textContent = weather.dataset.weatherText || "22° · Part. nuageux";
  }
}

export function updateClockWidget(root, variant = root?.dataset?.clockVariant || "digital", now = new Date()) {
  const normalized = normalizeClockWidgetVariant(variant);

  if (normalized === "digital" || normalized === "digital-weather") {
    updateDigital(root, now);
    return;
  }


  setHandRotations(root, now);
}

export function updateClockWidgets(root = document, now = new Date()) {
  root?.querySelectorAll?.(".mha-clock-widget").forEach((clock) => {
    updateClockWidget(clock, clock.dataset.clockVariant, now);
  });
}

function createAnalogMarks({ numbers = false } = {}) {
  const frag = document.createDocumentFragment();

  for (let index = 0; index < 60; index += 1) {
    const mark = document.createElement("span");
    mark.className = "mha-clock-mark";
    mark.dataset.major = String(index % 5 === 0);
    mark.style.setProperty("--mha-clock-mark-rotation", `${index * 6}deg`);
    frag.append(mark);
  }

  if (numbers) {
    for (let index = 1; index <= 12; index += 1) {
      const number = document.createElement("span");
      number.className = "mha-clock-number";
      number.style.setProperty("--mha-clock-number-rotation", `${index * 30}deg`);

      const inner = document.createElement("span");
      inner.className = "mha-clock-number-inner";
      inner.style.setProperty("--mha-clock-number-upright", `${index * -30}deg`);
      inner.textContent = String(index);

      number.append(inner);
      frag.append(number);
    }
  }

  return frag;
}

function createAnalogFace({ variant = "analog", numbers = false } = {}) {
  const face = document.createElement("div");
  face.className = [
    "mha-clock-face",
    `mha-clock-face--${variant}`,
    numbers ? "mha-clock-face--numbers" : "",
  ].filter(Boolean).join(" ");

  face.append(createAnalogMarks({ numbers }));

  const hour = document.createElement("span");
  hour.className = "mha-clock-hand mha-clock-hand--hour";

  const minute = document.createElement("span");
  minute.className = "mha-clock-hand mha-clock-hand--minute";

  const second = document.createElement("span");
  second.className = "mha-clock-hand mha-clock-hand--second";

  const dot = document.createElement("span");
  dot.className = "mha-clock-center-dot";

  face.append(hour, minute, second, dot);
  return face;
}

function createDigitalClock(now = new Date()) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--digital";
  clock.dataset.clockVariant = "digital";

  const time = document.createElement("div");
  time.className = "mha-clock-time";

  const date = document.createElement("div");
  date.className = "mha-clock-date";

  clock.append(time, date);
  updateClockWidget(clock, "digital", now);
  return clock;
}

function createDigitalWeatherClock(widget = {}, now = new Date()) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--digital mha-clock-widget--digital-weather";
  clock.dataset.clockVariant = "digital-weather";

  const time = document.createElement("div");
  time.className = "mha-clock-time";

  const date = document.createElement("div");
  date.className = "mha-clock-date";

  const weather = document.createElement("div");
  weather.className = "mha-clock-date mha-clock-weather";
  weather.dataset.weatherText = getClockWeatherText(widget);

  clock.append(time, date, weather);
  updateClockWidget(clock, "digital-weather", now);
  return clock;
}

function createAnalogClock(now = new Date()) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--analog";
  clock.dataset.clockVariant = "analog";
  clock.append(createAnalogFace({ variant: "analog" }));
  updateClockWidget(clock, "analog", now);
  return clock;
}

function createIosAnalogClock(now = new Date()) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--ios-analog";
  clock.dataset.clockVariant = "ios-analog";
  clock.append(createAnalogFace({ variant: "ios", numbers: true }));
  updateClockWidget(clock, "ios-analog", now);
  return clock;
}

export function createClockWidgetContent({ variant = "digital", className = "", screensaver = false, widget = {} } = {}) {
  const normalized = normalizeClockWidgetVariant(variant);
  const clock = normalized === "analog"
    ? createAnalogClock()
    : normalized === "ios-analog"
      ? createIosAnalogClock()
      : normalized === "digital-weather"
        ? createDigitalWeatherClock(widget)
        : createDigitalClock();

  clock.className = [clock.className, className, screensaver ? "mha-clock-widget--screensaver" : ""]
    .filter(Boolean)
    .join(" ");

  clock.dataset.clockVariant = normalized;
  clock.dataset.screensaverClock = String(Boolean(screensaver));
  return clock;
}

export function isClockWidget(widget) {
  return isWidgetKind(widget, "clock");
}
