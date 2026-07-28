import {
  fetchCalendarEvents,
  normalizeCalendarEntityIdsForRuntime,
} from "../ha/calendar.js";
import { t } from "../i18n/index.js";
import {
  buildCalendarWidgetConfig,
  createCalendarConfigDraft,
  normalizeCalendarEntityIds,
  renderCalendarConfigFields,
} from "../widget-config/calendar-config.js";
import {
  css,
  freezeSize,
  isLocalWidgetKind,
  variant,
} from "./widget-definition-utils.js";

export const CALENDAR_WIDGET_KIND = "calendar";
export const CALENDAR_WIDGET_VARIANTS = Object.freeze([
  "calendar-date",
  "calendar-month",
  "calendar-next-event",
  "calendar-compact-agenda",
  "calendar-agenda",
  "calendar-timeline",
]);

export const EVENT_CALENDAR_WIDGET_VARIANTS = Object.freeze([
  "calendar-next-event",
  "calendar-compact-agenda",
  "calendar-agenda",
  "calendar-timeline",
]);

const EVENT_VARIANT_SET = new Set(EVENT_CALENDAR_WIDGET_VARIANTS);

export function normalizeCalendarWidgetVariant(value = CALENDAR_WIDGET_VARIANTS[0]) {
  return CALENDAR_WIDGET_VARIANTS.includes(value) ? value : CALENDAR_WIDGET_VARIANTS[0];
}

export function calendarVariantNeedsEvents(value = "") {
  return EVENT_VARIANT_SET.has(normalizeCalendarWidgetVariant(value));
}

export function getCalendarVariantSize(value = "") {
  const variantName = normalizeCalendarWidgetVariant(value);
  if (variantName === "calendar-compact-agenda") return freezeSize(4, 2);
  if (["calendar-agenda", "calendar-timeline"].includes(variantName)) return freezeSize(4, 4);
  return freezeSize(2, 2);
}

function getLocale(hass) {
  return String(hass?.locale?.language || hass?.language || "").trim() || undefined;
}

function getTimeZone(hass) {
  return String(hass?.config?.time_zone || "").trim() || undefined;
}

function startOfDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, count) {
  const date = new Date(value);
  date.setDate(date.getDate() + count);
  return date;
}

function sameDay(a, b) {
  return a?.getFullYear?.() === b?.getFullYear?.()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

function capitalize(value = "") {
  return value ? `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}` : "";
}

function abbreviated(value = "") {
  return `${String(value).replace(/[.\s]+$/g, "")}.`;
}

function formatDate(date, hass, options) {
  return new Intl.DateTimeFormat(getLocale(hass), {
    ...options,
    timeZone: getTimeZone(hass),
  }).format(date);
}

function formatWeekday(date, hass, length = "long") {
  return capitalize(formatDate(date, hass, { weekday: length }));
}

function formatMonth(date, hass, length = "long") {
  return capitalize(formatDate(date, hass, { month: length }));
}

function formatTime(date, hass) {
  const timeFormat = String(hass?.locale?.time_format || "").toLowerCase();
  return formatDate(date, hass, {
    hour: "2-digit",
    minute: "2-digit",
    ...(timeFormat === "12" ? { hour12: true } : timeFormat === "24" ? { hour12: false } : {}),
  });
}

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayHeading(date, now, hass) {
  if (sameDay(date, now)) return t("widgets.calendar.today", "Today");
  if (sameDay(date, addDays(now, 1))) return t("widgets.calendar.tomorrow", "Tomorrow");
  return `${formatWeekday(date, hass, "long")} ${date.getDate()} ${formatMonth(date, hass, "short")}`;
}

function createNode(tag, className = "", text = "") {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function createDateNumber(date, hass, { compact = false } = {}) {
  const block = createNode("div", compact ? "mha-calendar-date-block is-compact" : "mha-calendar-date-block");
  block.append(
    createNode("span", "mha-calendar-date-weekday", formatWeekday(date, hass)),
    createNode("strong", "mha-calendar-date-number", String(date.getDate())),
  );
  return block;
}

function createEventPill(event, hass, { showTime = false, condensed = false } = {}) {
  const pill = createNode("div", [
    "mha-calendar-event",
    event.allDay ? "is-all-day" : "",
    condensed ? "is-condensed" : "",
  ].filter(Boolean).join(" "));
  pill.style.setProperty(
    "--mha-calendar-event-color",
    `var(--mha-calendar-color-${(Number(event.calendarIndex) || 0) % 6 + 1})`,
  );
  pill.title = event.summary;

  const marker = createNode("span", "mha-calendar-event-marker");
  marker.setAttribute("aria-hidden", "true");
  const summary = createNode("span", "mha-calendar-event-summary", event.summary);
  pill.append(marker, summary);

  if (showTime) {
    pill.append(createNode(
      "time",
      "mha-calendar-event-time",
      event.allDay ? t("widgets.calendar.allDay", "all day") : formatTime(event.start, hass),
    ));
  }
  return pill;
}

export function buildCalendarMonthDays(now = new Date(), { weekStartsMonday = true } = {}) {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const weekday = monthStart.getDay();
  const leading = weekStartsMonday ? (weekday + 6) % 7 : weekday;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const cellCount = Math.max(35, Math.ceil((leading + daysInMonth) / 7) * 7);
  const gridStart = addDays(monthStart, -leading);
  return Array.from({ length: cellCount }, (_, index) => {
    const date = addDays(gridStart, index);
    return Object.freeze({
      date,
      day: date.getDate(),
      currentMonth: date.getMonth() === now.getMonth(),
      today: sameDay(date, now),
    });
  });
}

function createDateWidget(now, hass) {
  const root = createNode("div", "mha-calendar-date-hero");
  const title = createNode("div", "mha-calendar-date-hero-title");
  title.append(
    createNode("span", "mha-calendar-date-hero-weekday", abbreviated(formatWeekday(now, hass, "short"))),
    createNode("span", "mha-calendar-date-hero-month", abbreviated(formatMonth(now, hass, "short"))),
  );
  root.append(title, createNode("strong", "mha-calendar-date-hero-number", String(now.getDate())));
  return root;
}

function createMonthWidget(now, hass) {
  const weekStartsMonday = !["sunday", 7].includes(hass?.locale?.first_weekday);
  const root = createNode("div", "mha-calendar-month");
  root.append(createNode("strong", "mha-calendar-month-title", formatMonth(now, hass, "long")));

  const weekdays = createNode("div", "mha-calendar-month-weekdays");
  const weekdayBase = weekStartsMonday ? new Date(2026, 0, 5) : new Date(2026, 0, 4);
  for (let index = 0; index < 7; index += 1) {
    weekdays.append(createNode("span", "mha-calendar-month-weekday", formatWeekday(addDays(weekdayBase, index), hass, "narrow")));
  }

  const days = createNode("div", "mha-calendar-month-days");
  buildCalendarMonthDays(now, { weekStartsMonday }).forEach((item) => {
    const day = createNode("time", "mha-calendar-month-day", String(item.day));
    day.dateTime = dayKey(item.date);
    day.dataset.currentMonth = String(item.currentMonth);
    day.dataset.today = String(item.today);
    days.append(day);
  });
  root.append(weekdays, days);
  return root;
}

function upcomingEvents(events, now) {
  return events.filter(event => event.end > now).sort((a, b) => a.start - b.start);
}

function eventsStartingOnDay(events, date) {
  return events.filter(event => sameDay(event.start, date));
}

function createEmptyMessage(text = t("widgets.calendar.noEvent", "No event")) {
  return createNode("p", "mha-calendar-empty", text);
}

function createNextEventWidget(events, now, hass, status) {
  const root = createNode("div", "mha-calendar-next-event");
  root.append(createDateNumber(now, hass, { compact: true }));
  const content = createNode("div", "mha-calendar-next-event-content");
  const next = upcomingEvents(events, now)[0];
  if (status === "loading") {
    content.append(createEmptyMessage(t("widgets.calendar.loading", "Loading events…")));
  } else if (!next) {
    content.append(createNode("strong", "mha-calendar-section-title", t("widgets.calendar.upcoming", "Upcoming")));
    content.append(createEmptyMessage());
  } else {
    content.append(createNode("strong", "mha-calendar-section-title", dayHeading(next.start, now, hass)));
    content.append(createEventPill(next, hass));
  }
  root.append(content);
  return root;
}

function createDayEventList(events, date, now, hass, { limit = 2, showTime = false } = {}) {
  const section = createNode("section", "mha-calendar-agenda-group");
  section.append(createNode("strong", "mha-calendar-section-title", dayHeading(date, now, hass)));
  const daily = eventsStartingOnDay(events, date).slice(0, limit);
  if (!daily.length) section.append(createEmptyMessage());
  else daily.forEach(event => section.append(createEventPill(event, hass, { showTime, condensed: true })));
  return section;
}

function createCompactAgendaWidget(events, now, hass, status) {
  const root = createNode("div", "mha-calendar-compact-agenda");
  const today = createNode("section", "mha-calendar-compact-today");
  today.append(createDateNumber(now, hass, { compact: true }));
  const todayEvents = eventsStartingOnDay(events, now);
  if (status === "loading") today.append(createEmptyMessage(t("widgets.calendar.loading", "Loading events…")));
  else if (!todayEvents.length) today.append(createEmptyMessage());
  else today.append(createEventPill(todayEvents[0], hass, { showTime: true, condensed: true }));

  const upcoming = createNode("div", "mha-calendar-compact-upcoming");
  const daysWithEvents = [];
  for (let offset = 1; offset < 14 && daysWithEvents.length < 3; offset += 1) {
    const date = addDays(now, offset);
    if (eventsStartingOnDay(events, date).length) daysWithEvents.push(date);
  }
  if (!daysWithEvents.length && status !== "loading") upcoming.append(createEmptyMessage());
  else daysWithEvents.forEach(date => upcoming.append(createDayEventList(events, date, now, hass, { limit: 1 })));
  root.append(today, upcoming);
  return root;
}

function createAgendaWidget(events, now, hass, status) {
  const root = createNode("div", "mha-calendar-agenda");
  const header = createNode("header", "mha-calendar-agenda-header");
  header.append(createNode(
    "strong",
    "mha-calendar-agenda-heading",
    `${formatWeekday(now, hass, "long")} ${now.getDate()} ${formatMonth(now, hass, "short")}`,
  ));
  root.append(header);

  if (status === "loading") {
    root.append(createEmptyMessage(t("widgets.calendar.loading", "Loading events…")));
    return root;
  }

  root.append(createDayEventList(events, now, now, hass, { limit: 2, showTime: true }));
  let groupCount = 0;
  for (let offset = 1; offset < 14 && groupCount < 4; offset += 1) {
    const date = addDays(now, offset);
    if (!eventsStartingOnDay(events, date).length) continue;
    root.append(createDayEventList(events, date, now, hass, { limit: 2, showTime: true }));
    groupCount += 1;
  }
  return root;
}

function eventOccursOnDay(event, date) {
  const dayStart = startOfDay(date);
  const dayEnd = addDays(dayStart, 1);
  return event.start < dayEnd && event.end > dayStart;
}

function createTimelineColumn(events, date, now, hass, {
  startHour,
  hourCount,
  current = false,
} = {}) {
  const column = createNode("section", "mha-calendar-timeline-column");
  const heading = createNode("header", "mha-calendar-timeline-header");
  heading.append(createNode("strong", "mha-calendar-timeline-day", dayHeading(date, now, hass)));
  if (current) heading.append(createNode("span", "mha-calendar-timeline-date", String(date.getDate())));

  const allDayEvents = events.filter(event => event.allDay && eventOccursOnDay(event, date)).slice(0, 1);
  allDayEvents.forEach(event => heading.append(createEventPill(event, hass, { condensed: true })));
  column.append(heading);

  const hours = createNode("div", "mha-calendar-timeline-hours");
  for (let index = 0; index < hourCount; index += 1) {
    const hour = (startHour + index) % 24;
    const row = createNode("div", "mha-calendar-timeline-hour");
    row.append(createNode("time", "mha-calendar-timeline-hour-label", `${String(hour).padStart(2, "0")}:00`));
    const track = createNode("div", "mha-calendar-timeline-track");
    const timedEvents = events.filter(event => (
      !event.allDay
      && sameDay(event.start, date)
      && event.start.getHours() === hour
    )).slice(0, 1);
    timedEvents.forEach(event => track.append(createEventPill(event, hass, { condensed: true })));
    if (current && hour === now.getHours()) {
      const line = createNode("span", "mha-calendar-now-line");
      line.style.setProperty("--mha-calendar-minute-offset", `${now.getMinutes() / 60}`);
      track.append(line);
    }
    row.append(track);
    hours.append(row);
  }
  column.append(hours);
  return column;
}

function createTimelineWidget(events, now, hass) {
  const root = createNode("div", "mha-calendar-timeline");
  const todayStartHour = Math.max(0, now.getHours() - 1);
  root.append(
    createTimelineColumn(events, now, now, hass, {
      startHour: todayStartHour,
      hourCount: 6,
      current: true,
    }),
    createTimelineColumn(events, addDays(now, 1), now, hass, {
      startHour: 9,
      hourCount: 8,
    }),
  );
  return root;
}

function createPreviewEvents(now) {
  return [
    {
      summary: t("widgets.calendar.previewCelebration", "Celebration"),
      start: addDays(startOfDay(now), 1),
      end: addDays(startOfDay(now), 2),
      allDay: true,
      calendarIndex: 0,
    },
    {
      summary: t("widgets.calendar.previewAppointment", "Appointment"),
      start: new Date(addDays(startOfDay(now), 3).setHours(11, 0, 0, 0)),
      end: new Date(addDays(startOfDay(now), 3).setHours(12, 0, 0, 0)),
      allDay: false,
      calendarIndex: 1,
    },
  ];
}

function renderCalendarVariant(root, variantName, events, now, hass, status) {
  const builders = {
    "calendar-date": () => createDateWidget(now, hass),
    "calendar-month": () => createMonthWidget(now, hass),
    "calendar-next-event": () => createNextEventWidget(events, now, hass, status),
    "calendar-compact-agenda": () => createCompactAgendaWidget(events, now, hass, status),
    "calendar-agenda": () => createAgendaWidget(events, now, hass, status),
    "calendar-timeline": () => createTimelineWidget(events, now, hass),
  };
  root.replaceChildren(builders[variantName]());
  root.dataset.loading = String(status === "loading");
}

export function createCalendarWidgetContent(widget = {}, {
  hass,
  entityVisibilityConfig,
  preview = false,
  now = () => new Date(),
} = {}) {
  const variantName = normalizeCalendarWidgetVariant(widget.variant);
  const root = createNode("div", "mha-calendar-widget");
  root.dataset.widgetComponent = "calendar";
  root.dataset.calendarVariant = variantName;

  let currentHass = hass;
  let currentEvents = preview ? createPreviewEvents(now()) : [];
  let destroyed = false;
  let requestId = 0;

  const render = (status = "ready") => {
    if (destroyed) return;
    renderCalendarVariant(root, variantName, currentEvents, now(), currentHass, status);
  };

  const load = async (nextHass = currentHass) => {
    currentHass = nextHass;
    if (!calendarVariantNeedsEvents(variantName) || preview) {
      render("ready");
      return;
    }

    const entityIds = normalizeCalendarEntityIdsForRuntime(
      currentHass,
      normalizeCalendarEntityIds(widget.calendarEntityIds || widget.entityIds || widget.entityId),
      entityVisibilityConfig,
    );
    if (!entityIds.length) {
      currentEvents = [];
      render("ready");
      return;
    }

    const activeRequest = ++requestId;
    if (!currentEvents.length) render("loading");
    const windowStart = startOfDay(now());
    const events = await fetchCalendarEvents(currentHass, entityIds, {
      start: windowStart,
      end: addDays(windowStart, 14),
    });
    if (destroyed || activeRequest !== requestId) return;
    currentEvents = events;
    render("ready");
  };

  root.__mhaUpdateFromHass = nextHass => {
    void load(nextHass);
  };

  let clock = null;
  if (!preview && typeof globalThis.setInterval === "function") {
    clock = globalThis.setInterval(() => {
      void load(currentHass);
    }, 60 * 1000);
    clock?.unref?.();
  }

  root.__mhaDestroy = () => {
    destroyed = true;
    requestId += 1;
    if (clock != null) globalThis.clearInterval?.(clock);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaDestroy;
  };

  if (preview) render("ready");
  else void load(hass);
  return root;
}

export function isCalendarWidget(widget = {}) {
  return isLocalWidgetKind(widget, CALENDAR_WIDGET_KIND, ["calendar-widget"]);
}

export const CALENDAR_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, entityVisibilityConfig, preview }) => createCalendarWidgetContent(widget, {
    hass,
    entityVisibilityConfig,
    preview,
  }),
});

export const CALENDAR_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: CALENDAR_WIDGET_KIND,
  title: "Configure calendar",
  hint: "Choose one or more calendars to display.",
  titleKey: "widgets.config.configureCalendar",
  hintKey: "widgets.config.calendarHint",
  createDraft: createCalendarConfigDraft,
  build: buildCalendarWidgetConfig,
  renderFields: renderCalendarConfigFields,
});

const MANAGER_ENTRIES = Object.freeze([
  Object.freeze({ category: "calendar", catalogKey: "calendar-date", variant: "calendar-date", label: "Large date", size: freezeSize(2, 2), description: "Day and monumental date.", order: 10 }),
  Object.freeze({ category: "calendar", catalogKey: "calendar-month", variant: "calendar-month", label: "Mini month", size: freezeSize(2, 2), description: "Compact monthly grid.", order: 20 }),
  Object.freeze({ category: "calendar", catalogKey: "calendar-next-event", variant: "calendar-next-event", label: "Date and next event", size: freezeSize(2, 2), description: "Current date and next event.", order: 30 }),
  Object.freeze({ category: "calendar", catalogKey: "calendar-compact-agenda", variant: "calendar-compact-agenda", label: "Compact agenda", size: freezeSize(4, 2), description: "Today and the next scheduled days.", order: 40 }),
  Object.freeze({ category: "calendar", catalogKey: "calendar-agenda", variant: "calendar-agenda", label: "Detailed agenda", size: freezeSize(4, 4), description: "Events grouped chronologically by day.", order: 50 }),
  Object.freeze({ category: "calendar", catalogKey: "calendar-timeline", variant: "calendar-timeline", label: "Two-day timeline", size: freezeSize(4, 4), description: "Today and tomorrow on an hourly grid.", order: 60 }),
]);

export const CALENDAR_WIDGET_DEFINITION = Object.freeze({
  component: "calendar-widget",
  category: "calendar",
  manager: Object.freeze({ hidden: false, entries: MANAGER_ENTRIES }),
  renderer: "calendar",
  css: css("styles/widgets/calendar-widget.css"),
  preview: "calendar",
  config: "calendar",
  aliases: ["calendar-widget"],
  variantAliases: CALENDAR_WIDGET_VARIANTS,
  defaultVariant: "calendar-date",
  defaultSize: freezeSize(2, 2),
  normalizeSize: (size, { widget }) => getCalendarVariantSize(widget.variant),
  capabilities: Object.freeze({
    configurable: widget => calendarVariantNeedsEvents(widget.variant),
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      variant: normalizeCalendarWidgetVariant(widget.variant),
      calendarEntityIds: normalizeCalendarEntityIds(
        widget.calendarEntityIds || widget.entityIds || widget.entityId || widget.entity_id,
      ),
    }),
  }),
  shell: Object.freeze({
    configureMode: widget => (calendarVariantNeedsEvents(widget.variant) ? "config" : "variant"),
  }),
  placementFlow: widget => (calendarVariantNeedsEvents(widget.variant) ? "configure-first" : "direct"),
  variants: CALENDAR_WIDGET_VARIANTS.map(name => {
    const size = getCalendarVariantSize(name);
    return variant(name, name, size.w, size.h);
  }),
});

function createCalendarPreviewWidget(item = {}) {
  return {
    ...item,
    kind: CALENDAR_WIDGET_KIND,
    type: CALENDAR_WIDGET_KIND,
    component: CALENDAR_WIDGET_DEFINITION.component,
    variant: normalizeCalendarWidgetVariant(item.variant),
    calendarEntityIds: ["calendar.preview"],
  };
}

export const CALENDAR_WIDGET_PREVIEW = Object.freeze({
  mode: "live",
  createWidget: createCalendarPreviewWidget,
});

export const WIDGET_MODULE = Object.freeze({
  kind: CALENDAR_WIDGET_KIND,
  definition: CALENDAR_WIDGET_DEFINITION,
  renderer: CALENDAR_WIDGET_CONTENT_RENDERER,
  config: CALENDAR_WIDGET_CONFIG_MANIFEST,
  preview: CALENDAR_WIDGET_PREVIEW,
});
