import {
  readBoolean,
  readNumberOption,
  writeStorageValue,
} from "../core/storage.js";
import { STORAGE_KEYS } from "../core/storage-keys.js";
import {
  createDefaultNowBarConfig,
  mergeNowBarConfig,
  normalizeNowBarConfig,
} from "./nowbar-data.js";

export const DEFAULT_NOW_BAR_ITEMS = Object.freeze({
  media: true,
  weather: true,
  calendar: true,
  now: true,
});

export function normalizeNowBarItems(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  return {
    media: source.media !== false,
    weather: source.weather !== false,
    calendar: source.calendar !== false,
    now: source.now !== false,
  };
}

export const SCREENSAVER_DELAYS = Object.freeze([
  15000,
  30000,
  120000,
  300000,
]);

export class ScreensaverController {
  constructor({
    storage = localStorage,
    normalizeClockVariant = value => value,
    isBlocked = () => false,
    onIdle = () => {},
    setTimer = (callback, delay) => globalThis.setTimeout(callback, delay),
    clearTimer = timer => globalThis.clearTimeout(timer),
  } = {}) {
    this.storage = storage;
    this.normalizeClockVariant = normalizeClockVariant;
    this.isBlocked = isBlocked;
    this.onIdle = onIdle;
    this.setTimer = (...args) => setTimer(...args);
    this.clearTimer = (...args) => clearTimer(...args);
    this.timer = 0;
    this.state = {
      preview: false,
      active: false,
      nowBar: true,
      nowBarItems: normalizeNowBarItems(),
      nowBarConfig: createDefaultNowBarConfig(),
      clockVariant: "digital",
      enabled: true,
      delay: 30000,
    };
  }

  load({ enabledFallback = true } = {}) {
    let storedNowBarItems = null;
    const rawNowBarItems = this.storage.getItem(STORAGE_KEYS.screensaverNowBarItems);
    if (rawNowBarItems !== null) {
      try {
        storedNowBarItems = JSON.parse(rawNowBarItems);
      } catch {
        storedNowBarItems = null;
      }
    }
    let storedNowBarConfig = null;
    const rawNowBarConfig = this.storage.getItem(STORAGE_KEYS.screensaverNowBarConfig);
    if (rawNowBarConfig !== null) {
      try {
        storedNowBarConfig = JSON.parse(rawNowBarConfig);
      } catch {
        storedNowBarConfig = null;
      }
    }
    const nowBarItems = normalizeNowBarItems(storedNowBarItems);

    this.state = {
      ...this.state,
      nowBar: readBoolean(
        STORAGE_KEYS.screensaverNowBar,
        true,
        this.storage,
      ),
      nowBarItems,
      nowBarConfig: mergeNowBarConfig(storedNowBarConfig || createDefaultNowBarConfig(), nowBarItems),
      clockVariant: this.storage.getItem(STORAGE_KEYS.screensaverClockVariant)
        || this.storage.getItem(STORAGE_KEYS.legacyScreensaverClockVariant)
        || "digital",
      enabled: readBoolean(
        STORAGE_KEYS.screensaverEnabled,
        Boolean(enabledFallback),
        this.storage,
      ),
      delay: readNumberOption(
        STORAGE_KEYS.screensaverDelay,
        30000,
        SCREENSAVER_DELAYS,
        this.storage,
      ),
    };
    return this.read();
  }

  read() {
    return {
      ...this.state,
      nowBarItems: { ...this.state.nowBarItems },
      nowBarConfig: normalizeNowBarConfig(this.state.nowBarConfig),
    };
  }

  isVisible() {
    return Boolean(this.state.preview || this.state.active);
  }

  setActive(active = false) {
    const next = (
      Boolean(active)
      && this.state.enabled
      && !this.isBlocked()
    );
    const changed = this.state.active !== next;
    this.state.active = next;
    return changed;
  }

  clearIdleTimer() {
    this.clearTimer(this.timer);
    this.timer = 0;
  }

  scheduleIdleTimer() {
    this.clearIdleTimer();
    if (!this.state.enabled || this.isBlocked()) return false;

    this.timer = this.setTimer(() => {
      this.timer = 0;
      this.onIdle();
    }, this.state.delay);
    return true;
  }

  handleActivity({ settingsOpen = false } = {}) {
    if (settingsOpen) return false;
    const wasActive = this.state.active;
    this.state.active = false;
    this.scheduleIdleTimer();
    return wasActive;
  }

  setEnabled(enabled = false) {
    this.state.enabled = Boolean(enabled);
    const success = writeStorageValue(
      STORAGE_KEYS.screensaverEnabled,
      this.state.enabled,
      this.storage,
    );
    if (!this.state.enabled) this.state.active = false;
    this.scheduleIdleTimer();
    return success;
  }

  setDelay(delay = 30000) {
    const numeric = Number(delay);
    this.state.delay = SCREENSAVER_DELAYS.includes(numeric)
      ? numeric
      : 30000;
    const success = writeStorageValue(
      STORAGE_KEYS.screensaverDelay,
      this.state.delay,
      this.storage,
    );
    this.scheduleIdleTimer();
    return success;
  }

  setPreview(enabled = false) {
    this.state.preview = Boolean(enabled);
    this.scheduleIdleTimer();
  }

  setPreviewState(enabled = false) {
    this.state.preview = Boolean(enabled);
  }

  setNowBarState(enabled = true) {
    this.state.nowBar = Boolean(enabled);
  }

  setNowBar(enabled = true) {
    this.setNowBarState(enabled);
    return writeStorageValue(
      STORAGE_KEYS.screensaverNowBar,
      this.state.nowBar,
      this.storage,
    );
  }

  setNowBarItem(item, enabled = true) {
    if (!Object.hasOwn(DEFAULT_NOW_BAR_ITEMS, item)) return false;
    this.state.nowBarItems = normalizeNowBarItems({
      ...this.state.nowBarItems,
      [item]: Boolean(enabled),
    });
    return writeStorageValue(
      STORAGE_KEYS.screensaverNowBarItems,
      JSON.stringify(this.state.nowBarItems),
      this.storage,
    ) && this.setNowBarConfig({
      ...this.state.nowBarConfig,
      tiles: {
        ...this.state.nowBarConfig.tiles,
        [item]: Boolean(enabled),
      },
    });
  }

  setNowBarConfig(config = {}) {
    this.state.nowBarConfig = normalizeNowBarConfig(config);
    this.state.nowBarItems = normalizeNowBarItems(this.state.nowBarConfig.tiles);
    return writeStorageValue(
      STORAGE_KEYS.screensaverNowBarConfig,
      JSON.stringify(this.state.nowBarConfig),
      this.storage,
    );
  }

  setNowBarTileEnabled(tile, enabled = true) {
    if (!Object.hasOwn(DEFAULT_NOW_BAR_ITEMS, tile)) return false;
    return this.setNowBarConfig({
      ...this.state.nowBarConfig,
      tiles: {
        ...this.state.nowBarConfig.tiles,
        [tile]: Boolean(enabled),
      },
    }) && writeStorageValue(
      STORAGE_KEYS.screensaverNowBarItems,
      JSON.stringify(this.state.nowBarItems),
      this.storage,
    );
  }

  setNowBarEntitySelection(section, entityId, selected = true) {
    if (!["calendar", "media", "weather"].includes(section) || !entityId) return false;
    const current = new Set(this.state.nowBarConfig.entities?.[section] || []);
    if (selected) current.add(entityId);
    else current.delete(entityId);
    return this.setNowBarConfig({
      ...this.state.nowBarConfig,
      entities: {
        ...this.state.nowBarConfig.entities,
        [section]: [...current],
      },
    });
  }

  setNowBarNowItem(item, selected = true) {
    if (!item) return false;
    const current = new Set(this.state.nowBarConfig.now?.items || []);
    if (selected) current.add(item);
    else current.delete(item);
    return this.setNowBarConfig({
      ...this.state.nowBarConfig,
      now: {
        ...this.state.nowBarConfig.now,
        items: [...current],
      },
    });
  }

  setClockVariantState(variant = "digital") {
    this.state.clockVariant = this.normalizeClockVariant(variant);
  }

  setClockVariant(variant = "digital") {
    this.setClockVariantState(variant);
    return (
      writeStorageValue(
        STORAGE_KEYS.screensaverClockVariant,
        this.state.clockVariant,
        this.storage,
      )
      && writeStorageValue(
        STORAGE_KEYS.legacyScreensaverClockVariant,
        this.state.clockVariant,
        this.storage,
      )
    );
  }

  destroy() {
    this.clearIdleTimer();
  }
}

export function createScreensaverController(options) {
  return new ScreensaverController(options);
}
