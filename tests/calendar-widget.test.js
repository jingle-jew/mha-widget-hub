import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  buildCalendarMonthDays,
  CALENDAR_WIDGET_DEFINITION,
  CALENDAR_WIDGET_VARIANTS,
  calendarVariantNeedsEvents,
  EVENT_CALENDAR_WIDGET_VARIANTS,
  getCalendarVariantSize,
  createCalendarWidgetContent,
} from "../src/widgets/calendar-widget.js";
import {
  getWidgetCapabilities,
  getWidgetPlacementFlow,
  getWidgetShellBehavior,
} from "../src/widgets/widget-registry.js";

test("calendar family exposes only the six confirmed variants", () => {
  assert.deepEqual(CALENDAR_WIDGET_VARIANTS, [
    "calendar-date",
    "calendar-month",
    "calendar-next-event",
    "calendar-compact-agenda",
    "calendar-agenda",
    "calendar-timeline",
  ]);
  assert.equal(CALENDAR_WIDGET_DEFINITION.manager.entries.length, 6);
  assert.ok(CALENDAR_WIDGET_DEFINITION.manager.entries.every(entry => (
    entry.size.w <= 4 && entry.size.h <= 4
  )));
  assert.equal(CALENDAR_WIDGET_VARIANTS.some(name => name.includes("week")), false);
  assert.equal(CALENDAR_WIDGET_VARIANTS.some(name => name.includes("extended")), false);
  assert.deepEqual(getCalendarVariantSize("calendar-date"), { w: 2, h: 2 });
  assert.deepEqual(getCalendarVariantSize("calendar-compact-agenda"), { w: 4, h: 2 });
  assert.deepEqual(getCalendarVariantSize("calendar-timeline"), { w: 4, h: 4 });
});

test("only event-backed calendar variants require configuration", () => {
  assert.deepEqual(EVENT_CALENDAR_WIDGET_VARIANTS, [
    "calendar-next-event",
    "calendar-compact-agenda",
    "calendar-agenda",
    "calendar-timeline",
  ]);
  assert.equal(calendarVariantNeedsEvents("calendar-date"), false);
  assert.equal(getWidgetCapabilities({ kind: "calendar", variant: "calendar-month" }).configurable, false);
  assert.equal(getWidgetPlacementFlow({ kind: "calendar", variant: "calendar-date" }), "direct");
  assert.equal(getWidgetCapabilities({ kind: "calendar", variant: "calendar-agenda" }).configurable, true);
  assert.equal(getWidgetPlacementFlow({ kind: "calendar", variant: "calendar-agenda" }), "configure-first");
  assert.equal(getWidgetShellBehavior({ kind: "calendar", variant: "calendar-agenda" }).configureMode, "config");
});

test("mini-month builds a complete Monday-first grid and marks today", () => {
  const now = new Date(2026, 6, 27, 12, 0, 0);
  const days = buildCalendarMonthDays(now, { weekStartsMonday: true });

  assert.equal(days.length, 35);
  assert.equal(days[0].date.getDay(), 1);
  assert.equal(days.filter(day => day.currentMonth).length, 31);
  assert.deepEqual(days.filter(day => day.today).map(day => day.day), [27]);
});

test("all six calendar previews render native DOM content", () => {
  class FakeNode {}
  const createNode = (tag) => {
    const node = new FakeNode();
    node.tagName = tag.toUpperCase();
    node.childNodes = [];
    node.dataset = {};
    node.style = { setProperty(name, value) { this[name] = value; } };
    node.className = "";
    node.setAttribute = (name, value) => { node[name] = value; };
    node.append = (...children) => node.childNodes.push(...children);
    node.replaceChildren = (...children) => { node.childNodes = [...children]; };
    return node;
  };
  globalThis.Node = FakeNode;
  globalThis.document = { createElement: createNode };

  CALENDAR_WIDGET_VARIANTS.forEach((variantName) => {
    const content = createCalendarWidgetContent({ variant: variantName }, {
      preview: true,
      hass: { locale: { language: "fr", first_weekday: "monday" } },
      now: () => new Date(2026, 6, 27, 21, 17, 0),
    });
    assert.equal(content.dataset.calendarVariant, variantName);
    assert.equal(content.childNodes.length, 1);
    content.__mhaDestroy();
  });
});

test("Frosted calendar references change only the outer shell material", () => {
  const css = readFileSync(new URL("../styles/widgets/calendar-widget.css", import.meta.url), "utf8");
  const frostedBlocks = [...css.matchAll(
    /:host\([^)]*data-ios-glass="frosted"[^)]*\) \.mha-widget\[data-widget-kind="calendar"\] \{([\s\S]*?)\n\}/g,
  )];

  assert.equal(frostedBlocks.length, 2);
  frostedBlocks.forEach(([, block]) => {
    assert.match(block, /--mha-widget-shell-surface:/);
    assert.match(block, /--mha-widget-shell-border:/);
    assert.match(block, /--mha-widget-shell-filter:/);
    assert.doesNotMatch(block, /--mha-(?:primary|secondary|tertiary)-text:/);
  });
});
