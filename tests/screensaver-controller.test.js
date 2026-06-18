import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NOW_BAR_ITEMS,
  createScreensaverController,
} from "../src/screensaver/screensaver-controller.js";
import { STORAGE_KEYS } from "../src/core/storage-keys.js";
import { createDefaultNowBarConfig } from "../src/screensaver/nowbar-data.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    values,
  };
}

function createTimerHarness() {
  const timers = new Map();
  let nextId = 1;
  return {
    setTimer(callback, delay) {
      const id = nextId;
      nextId += 1;
      timers.set(id, {
        callback() {
          timers.delete(id);
          callback();
        },
        delay,
      });
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
    timers,
  };
}

test("screensaver controller loads the existing storage contract", () => {
  const storage = createStorage({
    [STORAGE_KEYS.screensaverEnabled]: "false",
    [STORAGE_KEYS.screensaverDelay]: "120000",
    [STORAGE_KEYS.screensaverNowBar]: "false",
    [STORAGE_KEYS.legacyScreensaverClockVariant]: "analog",
  });
  const controller = createScreensaverController({ storage });

  assert.deepEqual(controller.load(), {
    preview: false,
    active: false,
    nowBar: false,
    nowBarItems: DEFAULT_NOW_BAR_ITEMS,
    nowBarConfig: createDefaultNowBarConfig(),
    clockVariant: "analog",
    enabled: false,
    delay: 120000,
  });
});

test("idle scheduling respects enabled and blocked states", () => {
  const timer = createTimerHarness();
  let blocked = false;
  let idleCalls = 0;
  const controller = createScreensaverController({
    storage: createStorage(),
    isBlocked: () => blocked,
    onIdle: () => {
      idleCalls += 1;
    },
    ...timer,
  });
  controller.load();

  assert.equal(controller.scheduleIdleTimer(), true);
  const [firstTimer] = timer.timers.values();
  assert.equal(firstTimer.delay, 30000);
  firstTimer.callback();
  assert.equal(idleCalls, 1);

  blocked = true;
  assert.equal(controller.scheduleIdleTimer(), false);
  assert.equal(timer.timers.size, 0);
});

test("native-style timers are called without rebinding their receiver", () => {
  const expectedReceiver = {};
  let timerId = 0;
  const setTimer = function(callback, delay) {
    assert.equal(this, undefined);
    assert.equal(delay, 30000);
    timerId = 42;
    return timerId;
  };
  const clearTimer = function(id) {
    assert.equal(this, undefined);
    assert.ok(id === 0 || id === timerId);
  };
  const controller = createScreensaverController({
    storage: createStorage(),
    setTimer,
    clearTimer,
  });

  controller.load();
  assert.equal(controller.scheduleIdleTimer(), true);
  controller.clearIdleTimer();
  assert.notEqual(expectedReceiver, controller);
});

test("active and preview visibility follow blocking rules", () => {
  let blocked = true;
  const timer = createTimerHarness();
  const controller = createScreensaverController({
    storage: createStorage(),
    isBlocked: () => blocked,
    ...timer,
  });
  controller.load();

  assert.equal(controller.setActive(true), false);
  assert.equal(controller.isVisible(), false);
  blocked = false;
  assert.equal(controller.setActive(true), true);
  assert.equal(controller.isVisible(), true);

  controller.setActive(false);
  controller.setPreview(true);
  assert.equal(controller.isVisible(), true);
});

test("settings persist normalized state and keep the legacy clock key", () => {
  const storage = createStorage();
  const timer = createTimerHarness();
  const controller = createScreensaverController({
    storage,
    normalizeClockVariant: value => (
      value === "analog" ? "analog" : "digital"
    ),
    ...timer,
  });
  controller.load();

  assert.equal(controller.setDelay(45000), true);
  assert.equal(controller.read().delay, 30000);
  assert.equal(controller.setEnabled(false), true);
  assert.equal(controller.setNowBar(false), true);
  assert.equal(controller.setNowBarItem("media", false), true);
  assert.equal(controller.setClockVariant("invalid"), true);

  assert.equal(storage.getItem(STORAGE_KEYS.screensaverDelay), "30000");
  assert.equal(storage.getItem(STORAGE_KEYS.screensaverEnabled), "false");
  assert.equal(storage.getItem(STORAGE_KEYS.screensaverNowBar), "false");
  assert.deepEqual(
    JSON.parse(storage.getItem(STORAGE_KEYS.screensaverNowBarItems)),
    {
      ...DEFAULT_NOW_BAR_ITEMS,
      media: false,
    },
  );
  assert.equal(
    storage.getItem(STORAGE_KEYS.screensaverClockVariant),
    "digital",
  );
  assert.equal(
    storage.getItem(STORAGE_KEYS.legacyScreensaverClockVariant),
    "digital",
  );
});

test("preview-only state changes do not persist settings", () => {
  const storage = createStorage();
  const controller = createScreensaverController({
    storage,
    normalizeClockVariant: value => value,
  });
  controller.load();

  controller.setPreviewState(true);
  controller.setNowBarState(false);
  controller.setClockVariantState("analog");

  assert.deepEqual(controller.read(), {
    preview: true,
    active: false,
    nowBar: false,
    nowBarItems: DEFAULT_NOW_BAR_ITEMS,
    nowBarConfig: createDefaultNowBarConfig(),
    clockVariant: "analog",
    enabled: true,
    delay: 30000,
  });
  assert.equal(storage.values.size, 0);
});

test("now bar detailed settings persist selected entities and internal items", () => {
  const storage = createStorage();
  const controller = createScreensaverController({ storage });
  controller.load();

  assert.equal(controller.setNowBarTileEnabled("calendar", false), true);
  assert.equal(controller.setNowBarEntitySelection("media", "media_player.salon", true), true);
  assert.equal(controller.setNowBarEntitySelection("weather", "weather.home", true), true);
  assert.equal(controller.setNowBarNowItem("lightsOn", false), true);

  const config = JSON.parse(storage.getItem(STORAGE_KEYS.screensaverNowBarConfig));
  assert.equal(config.tiles.calendar, false);
  assert.deepEqual(config.entities.media, ["media_player.salon"]);
  assert.deepEqual(config.entities.weather, ["weather.home"]);
  assert.deepEqual(config.now.items, []);
});

test("now bar item settings fall back for old and partial configs", () => {
  const controller = createScreensaverController({
    storage: createStorage({
      [STORAGE_KEYS.screensaverNowBarItems]: JSON.stringify({
        weather: false,
      }),
    }),
  });

  assert.deepEqual(controller.load().nowBarItems, {
    ...DEFAULT_NOW_BAR_ITEMS,
    weather: false,
  });
});

test("user activity wakes an active screensaver and restarts its timer", () => {
  const timer = createTimerHarness();
  const controller = createScreensaverController({
    storage: createStorage(),
    ...timer,
  });
  controller.load();
  controller.setActive(true);

  assert.equal(controller.handleActivity(), true);
  assert.equal(controller.read().active, false);
  assert.equal(timer.timers.size, 1);
  assert.equal(
    controller.handleActivity({ settingsOpen: true }),
    false,
  );
});
