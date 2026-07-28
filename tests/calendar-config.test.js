import test from "node:test";
import assert from "node:assert/strict";

import {
  buildCalendarWidgetConfig,
  createCalendarConfigDraft,
  normalizeCalendarEntityIds,
  updateCalendarSelection,
} from "../src/widget-config/calendar-config.js";

const hass = {
  states: {
    "calendar.family": {
      entity_id: "calendar.family",
      state: "on",
      attributes: { friendly_name: "Family" },
    },
    "calendar.work": {
      entity_id: "calendar.work",
      state: "on",
      attributes: { friendly_name: "Work" },
    },
  },
};

test("calendar config supports a stable multi-entity selection", () => {
  const { draft, options } = createCalendarConfigDraft({
    calendarEntityIds: ["calendar.work", "calendar.work", "sensor.invalid"],
  }, hass);

  assert.deepEqual(options.map(option => option.value), ["calendar.family", "calendar.work"]);
  assert.deepEqual(draft.calendarEntityIds, ["calendar.work"]);
  updateCalendarSelection(draft, "calendar.family", true);
  updateCalendarSelection(draft, "calendar.work", false);
  assert.deepEqual(draft.calendarEntityIds, ["calendar.family"]);

  const widget = buildCalendarWidgetConfig({ variant: "calendar-agenda" }, draft, hass);
  assert.equal(widget.kind, "calendar");
  assert.equal(widget.component, "calendar-widget");
  assert.deepEqual(widget.calendarEntityIds, ["calendar.family"]);
});

test("calendar config selects the first authorized calendar for a new widget", () => {
  const { draft } = createCalendarConfigDraft({}, hass);
  assert.deepEqual(draft.calendarEntityIds, ["calendar.family"]);
  assert.deepEqual(normalizeCalendarEntityIds("calendar.work"), ["calendar.work"]);
});
