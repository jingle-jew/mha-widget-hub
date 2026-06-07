/*
 * MHA Clock Widget
 *
 * Shared 2x2 clock variants for dashboard widgets and screensaver clocks.
 */

export const CLOCK_WIDGET_VARIANTS = Object.freeze([
  "digital",
  "analog",
  "ios-analog",
  "scientific",
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

function updateDigital(root, now = new Date()) {
  const time = root?.querySelector?.(".mha-clock-time");
  const date = root?.querySelector?.(".mha-clock-date");
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
}

function updateScientific(root, now = new Date()) {
  updateDigital(root, now);

  const day = root?.querySelector?.(".mha-clock-science-day");
  const epoch = root?.querySelector?.(".mha-clock-science-epoch");
  const beat = root?.querySelector?.(".mha-clock-science-beat");

  if (day) {
    day.textContent = `DOY ${pad(Math.ceil((now - new Date(now.getFullYear(), 0, 0)) / 86400000))}`;
  }

  if (epoch) {
    epoch.textContent = `UTC ${now.toISOString().slice(11, 19)}`;
  }

  if (beat) {
    const seconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    beat.textContent = `T+${String(seconds).padStart(5, "0")}`;
  }
}

export function updateClockWidget(root, variant = root?.dataset?.clockVariant || "digital", now = new Date()) {
  const normalized = normalizeClockWidgetVariant(variant);

  if (normalized === "digital") {
    updateDigital(root, now);
    return;
  }

  if (normalized === "scientific") {
    updateScientific(root, now);
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

function createAnalogFace({ variant = "analog", numbers = false, scientific = false } = {}) {
  const face = document.createElement("div");
  face.className = [
    "mha-clock-face",
    `mha-clock-face--${variant}`,
    numbers ? "mha-clock-face--numbers" : "",
    scientific ? "mha-clock-face--scientific" : "",
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

function createScientificClock(now = new Date()) {
  const clock = document.createElement("div");
  clock.className = "mha-clock-widget mha-clock-widget--scientific";
  clock.dataset.clockVariant = "scientific";

  const scope = document.createElement("div");
  scope.className = "mha-clock-science-scope";
  scope.append(createAnalogFace({ variant: "scientific", scientific: true }));

  const data = document.createElement("div");
  data.className = "mha-clock-science-data";

  const time = document.createElement("div");
  time.className = "mha-clock-time";

  const seconds = document.createElement("div");
  seconds.className = "mha-clock-seconds";

  const day = document.createElement("div");
  day.className = "mha-clock-science-day";

  const epoch = document.createElement("div");
  epoch.className = "mha-clock-science-epoch";

  const beat = document.createElement("div");
  beat.className = "mha-clock-science-beat";

  data.append(time, seconds, day, epoch, beat);
  clock.append(scope, data);
  updateClockWidget(clock, "scientific", now);
  return clock;
}

export function createClockWidgetContent({ variant = "digital", className = "", screensaver = false } = {}) {
  const normalized = normalizeClockWidgetVariant(variant);
  const clock = normalized === "analog"
    ? createAnalogClock()
    : normalized === "ios-analog"
      ? createIosAnalogClock()
      : normalized === "scientific"
        ? createScientificClock()
        : createDigitalClock();

  clock.className = [clock.className, className, screensaver ? "mha-clock-widget--screensaver" : ""]
    .filter(Boolean)
    .join(" ");

  clock.dataset.clockVariant = normalized;
  clock.dataset.screensaverClock = String(Boolean(screensaver));
  return clock;
}

export function isClockWidget(widget) {
  const variant = widget?.variant || "";
  const category = widget?.category || "";

  return widget?.type === "clock"
    || widget?.kind === "clock"
    || widget?.component === "clock-widget"
    || (category === "utilities" && CLOCK_WIDGET_VARIANTS.includes(variant));
}
