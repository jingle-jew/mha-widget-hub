/*
 * MHA Clock Widget
 *
 * Shared 2x2 clock variants for dashboard widgets and screensaver clocks.
 */

import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import { buildWeatherModel } from "../ha/weather.js";

export const CLOCK_WIDGET_VARIANTS = Object.freeze([
  "digital",
  "digital-weather",
  "analog",
  "ios-analog",
]);

export function normalizeClockWidgetVariant(value = "digital") {
  return CLOCK_WIDGET_VARIANTS.includes(value) ? value : "digital";
}

export function getClockWeatherText(model = {}) {
  return model.entityAllowed && model.entityAvailable
    ? [model.temperature, model.summary].filter(Boolean).join(" · ")
    : "";
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
    weather.textContent = weather.dataset.weatherText || "";
    weather.hidden = !weather.dataset.weatherText;
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

function createDigitalWeatherClock(widget = {}, now = new Date(), {
  hass,
  entityVisibilityConfig,
} = {}) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--digital mha-clock-widget--digital-weather";
  clock.dataset.widgetComponent = "clock-weather";
  clock.dataset.clockVariant = "digital-weather";

  const time = document.createElement("div");
  time.className = "mha-clock-time";

  const date = document.createElement("div");
  date.className = "mha-clock-date";

  const weather = document.createElement("div");
  weather.className = "mha-clock-date mha-clock-weather";
  weather.dataset.weatherText = "";

  clock.append(time, date, weather);
  clock.__mhaUpdateFromHass = nextHass => {
    const model = buildWeatherModel(nextHass, widget, entityVisibilityConfig);
    weather.dataset.weatherText = getClockWeatherText(model);
    clock.dataset.weatherAllowed = String(model.entityAllowed);
    clock.dataset.weatherAvailable = String(model.entityAvailable);
    updateClockWidget(clock, "digital-weather");
  };
  clock.__mhaDestroy = () => {
    delete clock.__mhaUpdateFromHass;
  };
  clock.__mhaUpdateFromHass(hass);
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

export function createClockWidgetContent({
  variant = "digital",
  className = "",
  screensaver = false,
  widget = {},
  hass,
  entityVisibilityConfig,
} = {}) {
  const normalized = normalizeClockWidgetVariant(variant);
  const clock = normalized === "analog"
    ? createAnalogClock()
    : normalized === "ios-analog"
      ? createIosAnalogClock()
      : normalized === "digital-weather"
        ? createDigitalWeatherClock(widget, new Date(), { hass, entityVisibilityConfig })
        : createDigitalClock();

  clock.className = [clock.className, className, screensaver ? "mha-clock-widget--screensaver" : ""]
    .filter(Boolean)
    .join(" ");

  clock.dataset.clockVariant = normalized;
  clock.dataset.screensaverClock = String(Boolean(screensaver));
  return clock;
}

export function isClockWidget(widget) {
  return isLocalWidgetKind(widget, "clock", ["clock-widget"]);
}


function createClockWidgetFrame(widget, { hass, entityVisibilityConfig } = {}) {
  const frame = document.createElement("div");
  frame.className = "mha-clock-widget-frame";
  frame.append(createClockWidgetContent({
    variant: widget.variant || "digital",
    widget,
    hass,
    entityVisibilityConfig,
  }));
  return frame;
}

export const CLOCK_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, entityVisibilityConfig }) => createClockWidgetFrame(widget, {
    hass,
    entityVisibilityConfig,
  }),
});

export const CLOCK_WIDGET_DEFINITION = Object.freeze({
  component: "clock-widget",
  category: "utilities",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({ category: "utilities", variant: "digital", label: "Digital clock", size: freezeSize(2, 2), description: "Time and date.", order: 10 }),
      Object.freeze({ category: "utilities", variant: "digital-weather", label: "Digital weather", size: freezeSize(2, 2), description: "Time, date, and current weather.", order: 20 }),
      Object.freeze({ category: "utilities", variant: "analog", label: "Analog clock", size: freezeSize(2, 2), description: "Simple dial.", order: 30 }),
      Object.freeze({ category: "utilities", variant: "ios-analog", label: "Analog iOS", size: freezeSize(2, 2), description: "Classic iOS dial.", order: 40 }),
    ]),
  }),
  renderer: "clock",
  css: css("styles/widgets/clock-widget.css"),
  preview: "clock",
  aliases: ["clock-widget"],
  variantAliases: ["digital", "digital-weather", "analog", "ios-analog"],
  defaultVariant: "digital",
  defaultSize: freezeSize(2, 2),
  normalizeSize: () => ({ w: 2, h: 2 }),
  capabilities: Object.freeze({
    configurable: false,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: (widget = {}) => widget.variant === "digital-weather",
  }),
  storage: Object.freeze({
    normalize: (widget = {}, { definition }) => (
      definition.variantAliases.includes(widget.variant)
        ? {
          variant: widget.variant,
          entityId: widget.entityId || widget.entity_id || "",
        }
        : {}
    ),
  }),
  shell: Object.freeze({
    configureMode: "variant",
  }),
  placementFlow: "direct",
  variants: [
    variant("digital", "Digital", 2, 2),
    variant("digital-weather", "Digital weather", 2, 2),
    variant("analog", "Analog", 2, 2),
    variant("ios-analog", "Analog iOS", 2, 2),
  ],
});


function createClockPreviewWidget(item = {}) {
  if (normalizeClockWidgetVariant(item.variant) !== "digital-weather") {
    return {
      ...item,
      kind: "clock",
      type: "clock",
      component: CLOCK_WIDGET_DEFINITION.component,
      variant: normalizeClockWidgetVariant(item.variant),
    };
  }

  const previewData = WIDGET_PREVIEW_DATA.weather;
  return {
    ...item,
    kind: "clock",
    type: "clock",
    component: CLOCK_WIDGET_DEFINITION.component,
    variant: "digital-weather",
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "clock",
  definition: CLOCK_WIDGET_DEFINITION,
  renderer: CLOCK_WIDGET_CONTENT_RENDERER,
  preview: Object.freeze({
    mode: "live",
    createWidget: createClockPreviewWidget,
  }),
});
