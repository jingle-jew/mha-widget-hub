import test from "node:test";
import assert from "node:assert/strict";

import {
  clearCalendarEventCache,
  fetchCalendarEvents,
  normalizeCalendarEntityIdsForRuntime,
  normalizeCalendarEvent,
  normalizeCalendarResponse,
} from "../src/ha/calendar.js";

test("calendar events normalize all-day and timed Home Assistant payloads", () => {
  const allDay = normalizeCalendarEvent({
    summary: "Holiday",
    start: { date: "2026-07-28" },
    end: { date: "2026-07-29" },
  }, { calendarId: "calendar.family", calendarName: "Family", calendarIndex: 1 });
  const timed = normalizeCalendarResponse({
    response: {
      "calendar.family": {
        events: [{
          summary: "Dentist",
          start: "2026-07-30T10:00:00-04:00",
          end: "2026-07-30T11:00:00-04:00",
        }],
      },
    },
  }, { calendarId: "calendar.family", calendarName: "Family" })[0];

  assert.equal(allDay.allDay, true);
  assert.equal(allDay.start.getFullYear(), 2026);
  assert.equal(allDay.start.getMonth(), 6);
  assert.equal(allDay.start.getDate(), 28);
  assert.equal(allDay.calendarIndex, 1);
  assert.equal(timed.summary, "Dentist");
  assert.equal(timed.allDay, false);
  assert.equal(timed.calendarId, "calendar.family");
});

test("calendar event fetching is shared by source and time window", async () => {
  const calls = [];
  const hass = {
    connection: {},
    states: {
      "calendar.family": { attributes: { friendly_name: "Family" } },
      "calendar.work": { attributes: { friendly_name: "Work" } },
    },
    async callWS(message) {
      calls.push(message);
      const entityId = message.target.entity_id;
      return {
        response: {
          [entityId]: {
            events: [{
              summary: entityId,
              start: entityId === "calendar.work"
                ? "2026-07-28T09:00:00-04:00"
                : "2026-07-29T09:00:00-04:00",
              end: entityId === "calendar.work"
                ? "2026-07-28T10:00:00-04:00"
                : "2026-07-29T10:00:00-04:00",
            }],
          },
        },
      };
    },
  };
  const options = {
    start: new Date("2026-07-27T00:00:00-04:00"),
    end: new Date("2026-08-10T00:00:00-04:00"),
    now: () => 1000,
  };

  const first = await fetchCalendarEvents(hass, ["calendar.family", "calendar.work"], options);
  const second = await fetchCalendarEvents(hass, ["calendar.family", "calendar.work"], options);

  assert.equal(calls.length, 2);
  assert.equal(first, second);
  assert.deepEqual(first.map(event => event.calendarId), ["calendar.work", "calendar.family"]);
  assert.deepEqual(calls[0], {
    type: "call_service",
    domain: "calendar",
    service: "get_events",
    service_data: {
      start_date_time: options.start.toISOString(),
      end_date_time: options.end.toISOString(),
    },
    target: { entity_id: "calendar.family" },
    return_response: true,
  });
  clearCalendarEventCache(hass);
});

test("runtime calendar selection keeps only existing MHA-authorized entities", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "calendar.family": {},
      "calendar.work": {},
      "sensor.outside": {},
    },
  };
  const visibilityConfig = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: { calendar: ["calendar.family"] },
      },
    },
  };

  assert.deepEqual(normalizeCalendarEntityIdsForRuntime(hass, [
    "calendar.family",
    "calendar.work",
    "calendar.missing",
    "sensor.outside",
  ], visibilityConfig), ["calendar.family"]);
});
