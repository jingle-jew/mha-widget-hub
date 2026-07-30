import assert from "node:assert/strict";
import test from "node:test";

import { createScreensaverCoordinator } from "../src/screensaver/screensaver-coordinator.js";

test("screensaver coordinator discovers and caches Now Bar areas", async () => {
  let discoveryCalls = 0;
  let changedCalls = 0;
  let currentTime = 1000;
  const hass = { connection: {}, states: {} };
  const coordinator = createScreensaverCoordinator({
    getHass: () => hass,
    getNowBarConfig: () => ({
      tiles: { now: true },
      now: { items: ["lightsOn"] },
    }),
    now: () => currentTime,
    discoverAreas: async () => {
      discoveryCalls += 1;
      return { areas: [{ id: "living", name: "Living room", entities: [] }] };
    },
    onAreaDataChange: () => {
      changedCalls += 1;
    },
  });

  assert.equal(await coordinator.requestNowBarAreas(), true);
  assert.equal(await coordinator.requestNowBarAreas(), false);
  assert.equal(discoveryCalls, 1);
  assert.equal(changedCalls, 1);

  currentTime += 60001;
  assert.equal(await coordinator.requestNowBarAreas(), false);
  assert.equal(discoveryCalls, 2);
  assert.equal(changedCalls, 1);
});

test("screensaver coordinator caches calendar fetches by signature and recency", async () => {
  let fetchCalls = 0;
  let currentTime = 1000;

  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: {}, clockVariant: "digital" }),
    getIsVisible: () => true,
    getHass: () => ({ states: {} }),
    getNowBarConfig: () => ({
      tiles: { calendar: true },
      entities: { calendar: ["calendar.family"] },
    }),
    now: () => currentTime,
    fetchCalendarEvents: async () => {
      fetchCalls += 1;
      return { "calendar.family": { events: [] } };
    },
  });

  assert.equal(await coordinator.requestNowBarCalendarEvents(), true);
  assert.equal(await coordinator.requestNowBarCalendarEvents(), false);
  assert.equal(fetchCalls, 1);

  currentTime += 60001;
  assert.equal(await coordinator.requestNowBarCalendarEvents(), true);
  assert.equal(fetchCalls, 2);
});

test("screensaver coordinator refetches when the calendar selection changes", async () => {
  let fetchCalls = 0;
  const config = {
    tiles: { calendar: true },
    entities: { calendar: ["calendar.family"] },
  };

  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: {}, clockVariant: "digital" }),
    getIsVisible: () => true,
    getHass: () => ({ states: {} }),
    getNowBarConfig: () => config,
    now: () => 1000,
    fetchCalendarEvents: async () => {
      fetchCalls += 1;
      return {};
    },
  });

  assert.equal(await coordinator.requestNowBarCalendarEvents(), true);
  config.entities.calendar = ["calendar.work"];
  assert.equal(await coordinator.requestNowBarCalendarEvents(), true);
  assert.equal(fetchCalls, 2);
});

test("screensaver coordinator no-ops without hass and clears fetch freshness", async () => {
  let fetchCalls = 0;
  let changedCalls = 0;
  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: {}, clockVariant: "digital" }),
    getIsVisible: () => false,
    getHass: () => null,
    getNowBarConfig: () => ({
      tiles: { calendar: true },
      entities: { calendar: ["calendar.family"] },
    }),
    fetchCalendarEvents: async () => {
      fetchCalls += 1;
      return {};
    },
    onCalendarEventsChange: () => {
      changedCalls += 1;
    },
  });

  assert.equal(await coordinator.requestNowBarCalendarEvents(), false);
  assert.equal(fetchCalls, 0);
  assert.equal(changedCalls, 0);
  assert.equal(coordinator.nowBarCalendarFetchedAt, 0);
  assert.equal(coordinator.nowBarCalendarSignature, "calendar.family");
});

test("screensaver coordinator syncs DOM with fetched now bar tiles", async () => {
  let syncCalls = 0;
  let changedCalls = 0;
  let syncedProps = null;

  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: { calendar: true }, clockVariant: "digital" }),
    getIsVisible: () => true,
    getHass: () => ({ states: {} }),
    getNowBarConfig: () => ({
      tiles: { calendar: true },
      entities: { calendar: ["calendar.family"] },
    }),
    fetchCalendarEvents: async () => ({
      "calendar.family": { events: [{ summary: "Dentist" }] },
    }),
    buildNowBarTilesFn: ({ calendarEvents }) => [
      { key: "calendar", title: "Calendar", subtitle: String(Boolean(calendarEvents["calendar.family"])) },
    ],
    onCalendarEventsChange: () => {
      changedCalls += 1;
    },
    syncElement: ({ props }) => {
      syncCalls += 1;
      syncedProps = props;
      return props;
    },
  });

  await coordinator.requestNowBarCalendarEvents();
  coordinator.syncDom({
    querySelector() {
      return null;
    },
  });

  assert.equal(changedCalls, 1);
  assert.equal(syncCalls, 1);
  assert.equal(syncedProps.nowBarTiles[0].subtitle, "true");
});

test("screensaver clock receives the same available weather entity as the Now Bar", () => {
  const hass = {
    states: {
      "weather.unavailable": {
        entity_id: "weather.unavailable",
        state: "unavailable",
        attributes: {},
      },
      "weather.home": {
        entity_id: "weather.home",
        state: "sunny",
        attributes: { friendly_name: "Home" },
      },
    },
  };
  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({
      nowBar: true,
      nowBarItems: { weather: true },
      clockVariant: "digital-weather",
    }),
    getIsVisible: () => true,
    getHass: () => hass,
    getNowBarConfig: () => ({
      entities: {
        weather: ["weather.unavailable", "weather.home"],
      },
    }),
  });

  const props = coordinator.buildProps();

  assert.equal(props.weatherEntityId, "weather.home");
  assert.equal(props.hass, hass);
  assert.equal(props.nowBarTiles.find(tile => tile.key === "weather")?.title, "Home");
});

test("visible screensaver sync requests calendar events immediately", async () => {
  let fetchCalls = 0;
  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: { calendar: true }, clockVariant: "digital" }),
    getIsVisible: () => true,
    getHass: () => ({ states: {} }),
    getNowBarConfig: () => ({
      tiles: { calendar: true },
      entities: { calendar: ["calendar.family"] },
    }),
    now: () => 1000,
    fetchCalendarEvents: async () => {
      fetchCalls += 1;
      return { "calendar.family": { events: [] } };
    },
    syncElement: () => ({}),
  });

  coordinator.syncDom({ querySelector: () => null });
  await Promise.resolve();
  coordinator.syncDom({ querySelector: () => null });

  assert.equal(fetchCalls, 1);
});

test("hidden screensaver updates neither calendar requests nor the now bar DOM", async () => {
  let fetchCalls = 0;
  let tileBuilds = 0;
  let fullSyncs = 0;
  let visibilitySyncs = 0;
  const existing = {};
  const coordinator = createScreensaverCoordinator({
    getScreensaverState: () => ({ nowBar: true, nowBarItems: {}, clockVariant: "digital" }),
    getIsVisible: () => false,
    getHass: () => ({ states: {} }),
    getNowBarConfig: () => ({
      tiles: { calendar: true },
      entities: { calendar: ["calendar.family"] },
    }),
    fetchCalendarEvents: async () => {
      fetchCalls += 1;
      return {};
    },
    buildNowBarTilesFn: () => {
      tileBuilds += 1;
      return [];
    },
    syncElement: () => {
      fullSyncs += 1;
    },
    syncVisibility: (_element, { isVisible }) => {
      assert.equal(isVisible, false);
      visibilitySyncs += 1;
    },
  });

  assert.equal(await coordinator.requestNowBarCalendarEvents(), false);
  assert.equal(coordinator.syncDom({ querySelector: () => existing }), existing);
  assert.deepEqual({ fetchCalls, tileBuilds, fullSyncs, visibilitySyncs }, {
    fetchCalls: 0,
    tileBuilds: 0,
    fullSyncs: 0,
    visibilitySyncs: 1,
  });
});
