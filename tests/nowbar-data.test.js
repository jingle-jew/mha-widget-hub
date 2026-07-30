import test, { beforeEach } from "node:test";
import assert from "node:assert/strict";
import { installDeterministicI18n } from "../tools/i18n-deterministic.mjs";
import { setLanguage, t } from "../src/i18n/index.js";
import {
  buildNowBarTiles,
  fetchNowBarCalendarEvents,
  getNowBarEntityOptions,
  normalizeCalendarEvents,
  normalizeNowBarConfig,
  resolveNowBarWeatherEntity,
} from "../src/screensaver/nowbar-data.js";

function entity(entityId, state, attributes = {}) {
  return { entity_id: entityId, state, attributes };
}

function lightArea(id, name, entityIds) {
  return {
    id,
    name,
    entities: entityIds.map(entityId => ({ entityId, domain: "light" })),
  };
}

installDeterministicI18n(beforeEach);

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

test("now bar media options include only available authorized media players", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "media_player.available": entity("media_player.available", "idle", {
        friendly_name: "Available speaker",
      }),
      "media_player.blocked": entity("media_player.blocked", "playing", {
        friendly_name: "Blocked speaker",
      }),
      "media_player.unavailable": entity("media_player.unavailable", "unavailable", {
        friendly_name: "Unavailable speaker",
      }),
      "media_player.unknown": entity("media_player.unknown", "unknown", {
        friendly_name: "Unknown speaker",
      }),
      "weather.home": entity("weather.home", "sunny", {
        friendly_name: "Home",
      }),
    },
  };
  const visibilityConfig = {
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          media_player: [
            "media_player.available",
            "media_player.unavailable",
            "media_player.unknown",
          ],
        },
      },
    },
  };

  const options = getNowBarEntityOptions(hass, visibilityConfig);

  assert.deepEqual(
    options.media.map(option => option.entity_id),
    ["media_player.available"],
  );
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
        media_image_url: "https://ha.example/ocean-drive.jpg",
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
    areas: [
      lightArea("kitchen", "Kitchen", ["light.kitchen"]),
      lightArea("hall", "Hall", ["light.hall"]),
    ],
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
      ["now", "Now Bar", "Lit room: Kitchen."],
      ["weather", "Home", "22°C · Sunny"],
      ["media", "Ocean Drive", "Duke Dumont"],
    ],
  );
  assert.deepEqual(tiles.find(tile => tile.key === "now")?.visual, {
    type: "icon",
    icon: "bulb",
    category: "lighting",
  });
  assert.deepEqual(tiles.find(tile => tile.key === "weather")?.visual, {
    type: "weather",
    condition: "sunny",
  });
  assert.deepEqual(tiles.find(tile => tile.key === "media")?.visual, {
    type: "artwork",
    artworkUrl: "https://ha.example/ocean-drive.jpg",
  });

  const [pausedMediaTile] = buildNowBarTiles({
    hass,
    config: {
      entities: { media: ["media_player.kitchen"] },
      tiles: { now: false, weather: false, calendar: false, media: true },
    },
  });
  assert.deepEqual(pausedMediaTile.visual, {
    type: "icon",
    icon: "music",
    category: "media_player",
  });
});

test("now bar weather source prefers the first available selected entity", () => {
  const hass = {
    states: {
      "weather.unavailable": entity("weather.unavailable", "unavailable"),
      "weather.home": entity("weather.home", "sunny"),
    },
  };
  const config = {
    entities: {
      weather: ["weather.unavailable", "weather.home"],
    },
  };

  assert.equal(resolveNowBarWeatherEntity(hass, config)?.entity_id, "weather.home");
  assert.equal(buildNowBarTiles({ hass, config })[1]?.title, "Home");
});

test("now bar summarizes lit rooms without double-counting lights in the same area", () => {
  const areas = [
    lightArea("bedroom", "Bedroom", ["light.bedside", "light.ceiling"]),
    lightArea("hall", "Hall", ["light.hall"]),
    lightArea("kitchen", "Kitchen", ["light.kitchen"]),
    lightArea("living", "Living room", ["light.floor", "light.table"]),
    lightArea("office", "Office", ["light.office"]),
  ];
  const hass = {
    states: Object.fromEntries(areas.flatMap(area => area.entities).map(({ entityId }) => [
      entityId,
      entity(entityId, "off"),
    ])),
  };
  const config = {
    now: { items: ["lightsOn"] },
    tiles: { now: true, weather: false, calendar: false, media: false },
  };
  const subtitle = () => buildNowBarTiles({ hass, areas, config })[0].subtitle;

  assert.equal(subtitle(), "All lights are off.");

  hass.states["light.floor"].state = "on";
  hass.states["light.table"].state = "on";
  assert.equal(subtitle(), "Lit room: Living room.");

  hass.states["light.kitchen"].state = "on";
  assert.equal(subtitle(), "Lit rooms: Kitchen and Living room.");

  hass.states["light.hall"].state = "on";
  assert.equal(subtitle(), "Lights are on in 3 rooms.");

  hass.states["light.bedside"].state = "on";
  hass.states["light.office"].state = "on";
  assert.equal(subtitle(), "All rooms are lit.");
});

test("now bar exposes the agreed French room-lighting copy", () => {
  setLanguage("fr");

  assert.equal(t("settings.nowBarData.allLightsOff"), "Toutes les lumières sont éteintes.");
  assert.equal(
    t("settings.nowBarData.oneLitRoom", "", { room: "Salon" }),
    "Pièce éclairée : Salon.",
  );
  assert.equal(
    t("settings.nowBarData.twoLitRooms", "", { first: "Cuisine", second: "Salon" }),
    "Pièces éclairées : Cuisine et Salon.",
  );
  assert.equal(
    t("settings.nowBarData.litRoomCount", "", { count: 3 }),
    "Les lumières sont allumées dans 3 pièces.",
  );
  assert.equal(t("settings.nowBarData.allRoomsLit"), "Toutes les pièces sont éclairées.");
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
  const eventDate = new Date(start);
  assert.deepEqual(calendarTile.visual, {
    type: "date",
    day: String(eventDate.getDate()),
    month: eventDate.toLocaleDateString("en", { month: "short" }),
  });

  const [emptyCalendarTile] = buildNowBarTiles({
    hass,
    config: {
      tiles: { now: false, weather: false, media: false, calendar: true },
    },
  });
  assert.equal(emptyCalendarTile.subtitle, "No calendar selected");
});

test("now bar calendar reads the entity next event and keeps all-day dates local", () => {
  const date = "2099-07-30";
  const [normalizedEvent] = normalizeCalendarEvents({
    message: "Family day",
    start: { date },
  }, "calendar.family");
  const expectedStart = new Date(2099, 6, 30);

  assert.equal(normalizedEvent.start.getTime(), expectedStart.getTime());
  assert.equal(normalizedEvent.start.getHours(), 0);

  const [calendarTile] = buildNowBarTiles({
    hass: {
      states: {
        "calendar.family": entity("calendar.family", "off", {
          friendly_name: "Family",
          message: "Family day",
          start: { date },
        }),
      },
    },
    config: {
      tiles: { now: false, weather: false, media: false, calendar: true },
      entities: { calendar: ["calendar.family"] },
    },
  });

  assert.equal(calendarTile.title, "Family day");
  assert.deepEqual(calendarTile.visual, {
    type: "date",
    day: "30",
    month: expectedStart.toLocaleDateString("en", { month: "short" }),
  });
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
