import {
  buildNowBarTiles,
  fetchNowBarCalendarEvents,
  normalizeNowBarConfig,
} from "./nowbar-data.js";
import { discoverOverviewAreas } from "../ha/area-discovery.js";
import { getNowBarCalendarSignature } from "./screensaver-props.js";
import {
  createScreensaverElement,
  syncScreensaverElement,
} from "./screensaver-orchestrator.js";
import { updateScreensaverState } from "./screensaver.js";

export class ScreensaverCoordinator {
  constructor({
    getScreensaverState = () => ({}),
    getIsVisible = () => false,
    getHass = () => null,
    getVisibilityConfig = () => null,
    getNowBarConfig = () => ({}),
    onClockVariantChange = () => {},
    onOpenScreensaverSettings = () => {},
    onWake = () => {},
    onSyncVisibilityState = () => {},
    onCalendarEventsChange = () => {},
    onAreaDataChange = () => {},
    now = Date.now,
    fetchCalendarEvents = fetchNowBarCalendarEvents,
    discoverAreas = discoverOverviewAreas,
    buildNowBarTilesFn = buildNowBarTiles,
    getCalendarSignature = getNowBarCalendarSignature,
    createElement = createScreensaverElement,
    syncElement = syncScreensaverElement,
    syncVisibility = updateScreensaverState,
  } = {}) {
    this.getScreensaverState = (...args) => getScreensaverState(...args);
    this.getIsVisible = (...args) => getIsVisible(...args);
    this.getHass = (...args) => getHass(...args);
    this.getVisibilityConfig = (...args) => getVisibilityConfig(...args);
    this.getNowBarConfig = (...args) => normalizeNowBarConfig(getNowBarConfig(...args));
    this.onClockVariantChange = (...args) => onClockVariantChange(...args);
    this.onOpenScreensaverSettings = (...args) => onOpenScreensaverSettings(...args);
    this.onWake = (...args) => onWake(...args);
    this.onSyncVisibilityState = (...args) => onSyncVisibilityState(...args);
    this.onCalendarEventsChange = (...args) => onCalendarEventsChange(...args);
    this.onAreaDataChange = (...args) => onAreaDataChange(...args);
    this.now = (...args) => now(...args);
    this.fetchCalendarEvents = (...args) => fetchCalendarEvents(...args);
    this.discoverAreas = (...args) => discoverAreas(...args);
    this.buildNowBarTilesFn = (...args) => buildNowBarTilesFn(...args);
    this.getCalendarSignature = (...args) => getCalendarSignature(...args);
    this.createElement = (...args) => createElement(...args);
    this.syncElement = (...args) => syncElement(...args);
    this.syncVisibility = (...args) => syncVisibility(...args);
    this.nowBarCalendarEvents = {};
    this.nowBarCalendarRequestId = 0;
    this.nowBarCalendarSignature = "";
    this.nowBarCalendarFetchedAt = 0;
    this.nowBarAreas = null;
    this.nowBarAreaRequestId = 0;
    this.nowBarAreaFetchedAt = 0;
    this.nowBarAreaCacheKey = null;
    this.nowBarAreaSignature = "";
  }

  getNowBarTiles() {
    return this.buildNowBarTilesFn({
      hass: this.getHass(),
      config: this.getNowBarConfig(),
      calendarEvents: this.nowBarCalendarEvents,
      areas: this.nowBarAreas,
    });
  }

  requestNowBarAreas({ force = false } = {}) {
    const hass = this.getHass();
    const config = this.getNowBarConfig();
    if (!hass || !config.tiles.now || !config.now.items.includes("lightsOn")) {
      return Promise.resolve(false);
    }

    const cacheKey = hass.connection || hass;
    if (cacheKey !== this.nowBarAreaCacheKey) {
      this.nowBarAreaCacheKey = cacheKey;
      this.nowBarAreaFetchedAt = 0;
      this.nowBarAreas = null;
      this.nowBarAreaSignature = "";
    }

    const timestamp = this.now();
    const recentlyFetched = this.nowBarAreaFetchedAt > 0
      && timestamp - this.nowBarAreaFetchedAt < 60000;
    if (!force && recentlyFetched) return Promise.resolve(false);

    this.nowBarAreaFetchedAt = timestamp;
    const requestId = ++this.nowBarAreaRequestId;
    return Promise.resolve(this.discoverAreas({
      hass,
      visibilityConfig: this.getVisibilityConfig(),
      force,
    })).then((result) => {
      if (requestId !== this.nowBarAreaRequestId) return false;
      const areas = Array.isArray(result?.areas) ? result.areas : [];
      const signature = JSON.stringify(areas.map(area => [
        area?.id || area?.area_id || "",
        area?.name || "",
        (Array.isArray(area?.entities) ? area.entities : [])
          .map(entity => entity?.entityId || entity?.entity_id || ""),
      ]));
      const changed = signature !== this.nowBarAreaSignature;
      this.nowBarAreas = areas;
      this.nowBarAreaSignature = signature;
      if (changed) this.onAreaDataChange(areas);
      return changed;
    }).catch(() => {
      if (requestId !== this.nowBarAreaRequestId) return false;
      const changed = this.nowBarAreas === null || this.nowBarAreaSignature !== "[]";
      this.nowBarAreas = [];
      this.nowBarAreaSignature = "[]";
      if (changed) this.onAreaDataChange([]);
      return changed;
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

    if (!force && !this.getIsVisible()) return Promise.resolve(false);

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
    const isVisible = this.getIsVisible();
    if (isVisible) void this.requestNowBarAreas();
    if (existing && !isVisible && !force) {
      this.syncVisibility(existing, { isVisible: false });
      return existing;
    }
    return this.syncElement({
      root,
      existing,
      force,
      props: {
        ...this.buildProps(),
        isVisible,
      },
    });
  }

  createDomElement() {
    return this.createElement(this.buildProps());
  }
}

export function createScreensaverCoordinator(options = {}) {
  return new ScreensaverCoordinator(options);
}
