import {
  buildNowBarTiles,
  fetchNowBarCalendarEvents,
  normalizeNowBarConfig,
} from "./nowbar-data.js";
import { getNowBarCalendarSignature } from "./screensaver-props.js";
import {
  createScreensaverElement,
  syncScreensaverElement,
} from "./screensaver-orchestrator.js";

export class ScreensaverCoordinator {
  constructor({
    getScreensaverState = () => ({}),
    getIsVisible = () => false,
    getHass = () => null,
    getNowBarConfig = () => ({}),
    onClockVariantChange = () => {},
    onOpenScreensaverSettings = () => {},
    onWake = () => {},
    onSyncVisibilityState = () => {},
    onCalendarEventsChange = () => {},
    now = Date.now,
    fetchCalendarEvents = fetchNowBarCalendarEvents,
    buildNowBarTilesFn = buildNowBarTiles,
    getCalendarSignature = getNowBarCalendarSignature,
    createElement = createScreensaverElement,
    syncElement = syncScreensaverElement,
  } = {}) {
    this.getScreensaverState = (...args) => getScreensaverState(...args);
    this.getIsVisible = (...args) => getIsVisible(...args);
    this.getHass = (...args) => getHass(...args);
    this.getNowBarConfig = (...args) => normalizeNowBarConfig(getNowBarConfig(...args));
    this.onClockVariantChange = (...args) => onClockVariantChange(...args);
    this.onOpenScreensaverSettings = (...args) => onOpenScreensaverSettings(...args);
    this.onWake = (...args) => onWake(...args);
    this.onSyncVisibilityState = (...args) => onSyncVisibilityState(...args);
    this.onCalendarEventsChange = (...args) => onCalendarEventsChange(...args);
    this.now = (...args) => now(...args);
    this.fetchCalendarEvents = (...args) => fetchCalendarEvents(...args);
    this.buildNowBarTilesFn = (...args) => buildNowBarTilesFn(...args);
    this.getCalendarSignature = (...args) => getCalendarSignature(...args);
    this.createElement = (...args) => createElement(...args);
    this.syncElement = (...args) => syncElement(...args);
    this.nowBarCalendarEvents = {};
    this.nowBarCalendarRequestId = 0;
    this.nowBarCalendarSignature = "";
    this.nowBarCalendarFetchedAt = 0;
  }

  getNowBarTiles() {
    return this.buildNowBarTilesFn({
      hass: this.getHass(),
      config: this.getNowBarConfig(),
      calendarEvents: this.nowBarCalendarEvents,
    });
  }

  buildProps() {
    return {
      isVisible: this.getIsVisible(),
      screensaverState: this.getScreensaverState(),
      nowBarTiles: this.getNowBarTiles(),
      onClockVariantChange: this.onClockVariantChange,
      onOpenScreensaverSettings: this.onOpenScreensaverSettings,
      onWake: this.onWake,
    };
  }

  requestNowBarCalendarEvents({ force = false } = {}) {
    const config = this.getNowBarConfig();
    const signature = this.getCalendarSignature(config);
    const hass = this.getHass();

    if (!hass || !config.tiles.calendar || !signature) {
      this.nowBarCalendarEvents = {};
      this.nowBarCalendarSignature = signature;
      this.nowBarCalendarFetchedAt = 0;
      return Promise.resolve(false);
    }

    const timestamp = this.now();
    const recentlyFetched = timestamp - this.nowBarCalendarFetchedAt < 60000;
    if (!force && signature === this.nowBarCalendarSignature && recentlyFetched) {
      return Promise.resolve(false);
    }

    this.nowBarCalendarSignature = signature;
    this.nowBarCalendarFetchedAt = timestamp;
    const requestId = ++this.nowBarCalendarRequestId;

    return Promise.resolve(this.fetchCalendarEvents(hass, config)).then((events) => {
      if (requestId !== this.nowBarCalendarRequestId) return false;
      this.nowBarCalendarEvents = events;
      this.onCalendarEventsChange(events);
      return true;
    });
  }

  syncDom(root, { force = false } = {}) {
    this.onSyncVisibilityState();
    const existing = root?.querySelector?.(".mha-screensaver");
    return this.syncElement({
      root,
      existing,
      force,
      props: this.buildProps(),
    });
  }

  createDomElement() {
    return this.createElement(this.buildProps());
  }
}

export function createScreensaverCoordinator(options = {}) {
  return new ScreensaverCoordinator(options);
}
