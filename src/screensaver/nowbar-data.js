import { filterEntitiesForCurrentUser } from "../admin/entity-permissions.js";
import { getFriendlyEntityName } from "../ha/entity-filters.js";
import { getEntityDomain, isEntityAvailable, normalizeEntityStateValue } from "../ha/entity.js";
import { buildMediaDisplayModel } from "../ha/media.js";
import { getWeatherSummary } from "../ha/weather.js";
import { t } from "../i18n/index.js";

export const NOW_BAR_TILE_KEYS = Object.freeze(["now", "weather", "calendar", "media"]);
export const NOW_BAR_NOW_ITEMS = Object.freeze(["lightsOn", "rooms"]);

const CALENDAR_LOOKAHEAD_MS = 24 * 60 * 60 * 1000;

function normalizeStringList(value) {
  return Array.isArray(value)
    ? value.map(item => String(item || "").trim()).filter(Boolean)
    : [];
}

export function normalizeNowBarConfig(value = {}) {
  const source = value && typeof value === "object" ? value : {};
  const tiles = source.tiles && typeof source.tiles === "object" ? source.tiles : {};
  return {
    tiles: {
      media: tiles.media !== false,
      weather: tiles.weather !== false,
      calendar: tiles.calendar !== false,
      now: tiles.now !== false,
    },
    entities: {
      media: normalizeStringList(source.entities?.media),
      weather: normalizeStringList(source.entities?.weather),
      calendar: normalizeStringList(source.entities?.calendar),
    },
    now: {
      items: normalizeStringList(source.now?.items).filter(item => NOW_BAR_NOW_ITEMS.includes(item)),
    },
  };
}

export function createDefaultNowBarConfig() {
  return normalizeNowBarConfig({
    now: { items: ["lightsOn"] },
  });
}

export function mergeNowBarConfig(value = {}, legacyItems = {}) {
  const config = normalizeNowBarConfig(value);
  const legacy = legacyItems && typeof legacyItems === "object" ? legacyItems : {};
  return normalizeNowBarConfig({
    ...config,
    tiles: {
      ...config.tiles,
      media: legacy.media !== false && config.tiles.media !== false,
      weather: legacy.weather !== false && config.tiles.weather !== false,
      calendar: legacy.calendar !== false && config.tiles.calendar !== false,
      now: legacy.now !== false && config.tiles.now !== false,
    },
  });
}

function getAuthorizedDomainEntities(hass, domain, visibilityConfig, {
  availableOnly = false,
} = {}) {
  const options = Object.entries(hass?.states || {})
    .filter(([entityId, entityState]) => (
      getEntityDomain(entityId) === domain
      && (!availableOnly || isEntityAvailable(entityState))
    ))
    .map(([entityId, entityState]) => ({
      entity_id: entityId,
      name: getFriendlyEntityName(entityState, entityId),
      state: entityState,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));

  return visibilityConfig
    ? filterEntitiesForCurrentUser(hass, options, visibilityConfig)
    : options;
}

export function getNowBarEntityOptions(hass, visibilityConfig) {
  return {
    calendar: getAuthorizedDomainEntities(hass, "calendar", visibilityConfig),
    media: getAuthorizedDomainEntities(hass, "media_player", visibilityConfig, { availableOnly: true }),
    weather: getAuthorizedDomainEntities(hass, "weather", visibilityConfig),
  };
}

function buildNowTile(hass, config) {
  const enabled = new Set(config.now.items);
  const lines = [];

  if (enabled.has("lightsOn")) {
    const lightsOn = Object.values(hass?.states || {})
      .filter(entity => getEntityDomain(entity?.entity_id) === "light")
      .filter(entity => normalizeEntityStateValue(entity?.state) === "on")
      .length;
    lines.push(t(
      "settings.nowBarData.lightsOn",
      "{count} lights on",
      { count: lightsOn },
    ));
  }

  if (enabled.has("rooms")) {
    lines.push(t("settings.nowBarData.roomsUnavailable", "Room states unavailable"));
  }

  return {
    key: "now",
    title: t("settings.nowBarPreview.now.title", "Now bar"),
    subtitle: lines.length
      ? lines.join(" · ")
      : t("settings.nowBarData.noNowItems", "No Now items selected"),
  };
}

function getSelectedAvailableEntities(hass, ids, domain) {
  return ids
    .map(entityId => hass?.states?.[entityId])
    .filter(entity => entity && getEntityDomain(entity.entity_id) === domain);
}

function buildWeatherTile(hass, config) {
  const selected = getSelectedAvailableEntities(hass, config.entities.weather, "weather");
  if (!config.entities.weather.length) {
    return {
      key: "weather",
      title: t("settings.nowBarPreview.weather.title", "Weather"),
      subtitle: t("settings.nowBarData.noWeatherSelected", "No weather entity selected"),
    };
  }

  const entity = selected.find(isEntityAvailable) || selected[0];
  if (!entity) {
    return {
      key: "weather",
      title: t("settings.nowBarPreview.weather.title", "Weather"),
      subtitle: t("settings.nowBarData.weatherMissing", "Selected weather entity unavailable"),
    };
  }

  if (!isEntityAvailable(entity)) {
    return {
      key: "weather",
      title: getFriendlyEntityName(entity, entity.entity_id) || t("settings.nowBarPreview.weather.title", "Weather"),
      subtitle: t("states.unavailable", "Unavailable"),
    };
  }

  const attributes = entity.attributes || {};
  const unit = attributes.temperature_unit || hass?.config?.unit_system?.temperature || "°";
  const temperature = attributes.temperature == null || attributes.temperature === ""
    ? ""
    : `${attributes.temperature}${String(unit).startsWith("°") ? unit : ` ${unit}`}`;
  return {
    key: "weather",
    title: getFriendlyEntityName(entity, entity.entity_id) || t("settings.nowBarPreview.weather.title", "Weather"),
    subtitle: [temperature, getWeatherSummary(entity.state)].filter(Boolean).join(" · ")
      || t("settings.nowBarData.weatherNoData", "No weather data"),
  };
}

function getMediaPriority(entity) {
  const state = normalizeEntityStateValue(entity?.state);
  if (state === "playing") return 0;
  if (state === "paused") return 1;
  if (state === "idle") return 2;
  return 3;
}

function buildMediaTile(hass, config) {
  const selected = getSelectedAvailableEntities(hass, config.entities.media, "media_player");
  if (!config.entities.media.length) {
    return {
      key: "media",
      title: t("settings.nowBarPreview.media.title", "Now Playing"),
      subtitle: t("settings.nowBarData.noMediaSelected", "No media player selected"),
    };
  }

  const entity = selected
    .filter(entityState => normalizeEntityStateValue(entityState.state) !== "off")
    .sort((a, b) => getMediaPriority(a) - getMediaPriority(b))[0] || selected[0];
  if (!entity) {
    return {
      key: "media",
      title: t("settings.nowBarPreview.media.title", "Now Playing"),
      subtitle: t("settings.nowBarData.mediaMissing", "Selected media player unavailable"),
    };
  }

  if (!isEntityAvailable(entity) || normalizeEntityStateValue(entity.state) === "off") {
    return {
      key: "media",
      title: getFriendlyEntityName(entity, entity.entity_id) || t("settings.nowBarPreview.media.title", "Now Playing"),
      subtitle: t("states.unavailable", "Unavailable"),
    };
  }

  const model = buildMediaDisplayModel(entity, {}, {
    entityId: entity.entity_id,
    name: getFriendlyEntityName(entity, entity.entity_id),
  });
  return {
    key: "media",
    title: model.title || getFriendlyEntityName(entity, entity.entity_id) || t("settings.nowBarPreview.media.title", "Now Playing"),
    subtitle: model.subtitle || model.stateLabel || t("settings.nowBarData.mediaNoData", "No media data"),
  };
}

function parseCalendarDate(value) {
  if (!value) return null;
  const raw = typeof value === "object" ? value.dateTime || value.date : value;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeCalendarEvent(event = {}, entityId = "") {
  const start = parseCalendarDate(event.start || event.start_time || event.startDate);
  const summary = String(event.summary || event.message || event.title || "").trim();
  if (!start || !summary) return null;
  return {
    entityId,
    summary,
    start,
  };
}

export function normalizeCalendarEvents(value = {}, entityId = "") {
  const candidates = Array.isArray(value)
    ? value
    : Array.isArray(value.events)
      ? value.events
      : Array.isArray(value.calendarEvents)
        ? value.calendarEvents
        : [];
  return candidates
    .map(event => normalizeCalendarEvent(event, entityId))
    .filter(Boolean);
}

export function buildCalendarTile(hass, config, calendarEvents = {}) {
  if (!config.entities.calendar.length) {
    return {
      key: "calendar",
      title: t("settings.nowBarPreview.calendar.title", "Calendar"),
      subtitle: t("settings.nowBarData.noCalendarsSelected", "No calendar selected"),
    };
  }

  const selected = getSelectedAvailableEntities(hass, config.entities.calendar, "calendar");
  if (!selected.length) {
    return {
      key: "calendar",
      title: t("settings.nowBarPreview.calendar.title", "Calendar"),
      subtitle: t("settings.nowBarData.calendarMissing", "Selected calendars unavailable"),
    };
  }

  const now = Date.now();
  const events = selected
    .flatMap(entity => [
      ...normalizeCalendarEvents(entity.attributes, entity.entity_id),
      ...normalizeCalendarEvents(calendarEvents[entity.entity_id], entity.entity_id),
    ])
    .filter(event => event.start.getTime() >= now - 60 * 1000)
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  if (!events.length) {
    const hasAvailableCalendar = selected.some(isEntityAvailable);
    return {
      key: "calendar",
      title: t("settings.nowBarPreview.calendar.title", "Calendar"),
      subtitle: hasAvailableCalendar
        ? t("settings.nowBarData.noUpcomingEvents", "No upcoming events")
        : t("states.unavailable", "Unavailable"),
    };
  }

  const event = events[0];
  return {
    key: "calendar",
    title: event.summary,
    subtitle: event.start.toLocaleString([], {
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function buildNowBarTiles({
  hass,
  config = createDefaultNowBarConfig(),
  calendarEvents = {},
} = {}) {
  const normalized = normalizeNowBarConfig(config);
  const builders = {
    now: () => buildNowTile(hass, normalized),
    weather: () => buildWeatherTile(hass, normalized),
    calendar: () => buildCalendarTile(hass, normalized, calendarEvents),
    media: () => buildMediaTile(hass, normalized),
  };

  return NOW_BAR_TILE_KEYS
    .filter(key => normalized.tiles[key] !== false)
    .map(key => builders[key]());
}

export async function fetchNowBarCalendarEvents(hass, config = {}, {
  now = () => new Date(),
} = {}) {
  const normalized = normalizeNowBarConfig(config);
  if (!normalized.entities.calendar.length || typeof hass?.callWS !== "function") return {};

  const start = now();
  const end = new Date(start.getTime() + CALENDAR_LOOKAHEAD_MS);
  const results = await Promise.all(normalized.entities.calendar.map(async entityId => {
    try {
      const response = await hass.callWS({
        type: "call_service",
        domain: "calendar",
        service: "get_events",
        service_data: {
          start_date_time: start.toISOString(),
          end_date_time: end.toISOString(),
        },
        target: { entity_id: entityId },
        return_response: true,
      });
      const payload = response?.response || response || {};
      return [entityId, payload?.[entityId] || payload];
    } catch (error) {
      console.warn(`[mha-widget-hub] Calendar events unavailable for ${entityId}.`, error);
      return [entityId, { events: [] }];
    }
  }));

  return Object.fromEntries(results);
}
