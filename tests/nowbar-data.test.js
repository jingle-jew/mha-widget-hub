import test from "node:test";
import assert from "node:assert/strict";
import {
  buildNowBarTiles,
  fetchNowBarCalendarEvents,
  normalizeNowBarConfig,
} from "../src/screensaver/nowbar-data.js";

function entity(entityId, state, attributes = {}) {
  return { entity_id: entityId, state, attributes };
}

test("now bar config normalizes legacy-safe defaults without auto-selecting entities", () => {
  assert.deepEqual(normalizeNowBarConfig({}), {
    tiles: {
      media: true,
      weather: true,
      calendar: true,
      now: true,
    },
    entities: {
      media: [],
      weather: [],
      calendar: [],
    },
    now: {
      items: [],
    },
  });
});

test("now bar tiles use selected Home Assistant media, weather and light states", () => {
  const hass = {
    config: { unit_system: { temperature: "°C" } },
    states: {
      "media_player.kitchen": entity("media_player.kitchen", "paused", {
        friendly_name: "Kitchen speaker",
        media_title: "Paused Song",
        media_artist: "Artist A",
      }),
      "media_player.living_room": entity("media_player.living_room", "playing", {
        friendly_name: "Living room",
        media_title: "Ocean Drive",
        media_artist: "Duke Dumont",
      }),
      "weather.home": entity("weather.home", "sunny", {
        friendly_name: "Home",
        temperature: 22,
        temperature_unit: "°C",
      }),
      "light.kitchen": entity("light.kitchen", "on"),
      "light.hall": entity("light.hall", "off"),
    },
  };

  const tiles = buildNowBarTiles({
    hass,
    config: {
      entities: {
        media: ["media_player.kitchen", "media_player.living_room"],
        weather: ["weather.home"],
      },
      now: { items: ["lightsOn"] },
      tiles: { calendar: false },
    },
  });

  assert.deepEqual(
    tiles.map(tile => [tile.key, tile.title, tile.subtitle]),
    [
      ["now", "Now Bar", "1 lights on"],
      ["weather", "Home", "22°C · Sunny"],
      ["media", "Ocean Drive", "Duke Dumont"],
    ],
  );
});

test("now bar calendar tile uses fetched events and handles empty selections", () => {
  const hass = {
    states: {
      "calendar.family": entity("calendar.family", "on", {
        friendly_name: "Family",
      }),
    },
  };
  const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const [calendarTile] = buildNowBarTiles({
    hass,
    config: {
      tiles: { now: false, weather: false, media: false, calendar: true },
      entities: { calendar: ["calendar.family"] },
    },
    calendarEvents: {
      "calendar.family": {
        events: [{ summary: "Dentist", start: { dateTime: start } }],
      },
    },
  });

  assert.equal(calendarTile.key, "calendar");
  assert.equal(calendarTile.title, "Dentist");

  const [emptyCalendarTile] = buildNowBarTiles({
    hass,
    config: {
      tiles: { now: false, weather: false, media: false, calendar: true },
    },
  });
  assert.equal(emptyCalendarTile.subtitle, "No calendar selected");
});

test("now bar calendar event fetch calls the Home Assistant calendar service", async () => {
  const calls = [];
  const hass = {
    async callWS(payload) {
      calls.push(payload);
      return {
        response: {
          "calendar.family": {
            events: [{ summary: "Dentist", start: { dateTime: "2026-06-18T14:00:00-04:00" } }],
          },
        },
      };
    },
  };

  const result = await fetchNowBarCalendarEvents(hass, {
    entities: { calendar: ["calendar.family"] },
  }, {
    now: () => new Date("2026-06-18T12:00:00-04:00"),
  });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    type: "call_service",
    domain: "calendar",
    service: "get_events",
    service_data: {
      start_date_time: "2026-06-18T16:00:00.000Z",
      end_date_time: "2026-06-19T16:00:00.000Z",
    },
    target: { entity_id: "calendar.family" },
    return_response: true,
  });
  assert.equal(result["calendar.family"].events[0].summary, "Dentist");
});
