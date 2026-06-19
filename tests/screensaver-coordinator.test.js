import assert from "node:assert/strict";
import test from "node:test";

import { createScreensaverCoordinator } from "../src/screensaver/screensaver-coordinator.js";

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
