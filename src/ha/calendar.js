import { getEntityDomain } from "./entity.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";

export const CALENDAR_EVENT_CACHE_TTL_MS = 60 * 1000;

const cacheByOwner = new WeakMap();

function getCacheOwner(hass) {
  const owner = hass?.connection || hass;
  return owner && (typeof owner === "object" || typeof owner === "function") ? owner : null;
}

function getOwnerCache(hass) {
  const owner = getCacheOwner(hass);
  if (!owner) return null;
  if (!cacheByOwner.has(owner)) cacheByOwner.set(owner, new Map());
  return cacheByOwner.get(owner);
}

function parseLocalDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function readCalendarDate(value) {
  const source = value && typeof value === "object" ? value : {};
  const raw = source.dateTime || source.date || value;
  const allDay = Boolean(source.date) || /^\d{4}-\d{2}-\d{2}$/.test(String(raw || ""));
  const date = allDay ? parseLocalDate(raw) : new Date(raw);
  return {
    allDay,
    date: date instanceof Date && Number.isFinite(date.getTime()) ? date : null,
  };
}

export function normalizeCalendarEntityIdsForRuntime(hass, entityIds = [], visibilityConfig) {
  return [...new Set((Array.isArray(entityIds) ? entityIds : [entityIds])
    .map(entityId => String(entityId || "").trim())
    .filter(entityId => (
      getEntityDomain(entityId) === "calendar"
      && Boolean(hass?.states?.[entityId])
      && isEntityAllowedForCurrentUser(hass, entityId, visibilityConfig)
    )))];
}

export function normalizeCalendarEvent(event = {}, {
  calendarId = "",
  calendarName = "",
  calendarIndex = 0,
} = {}) {
  const startValue = readCalendarDate(event.start);
  if (!startValue.date) return null;
  const endValue = readCalendarDate(event.end);
  const fallbackEnd = new Date(startValue.date.getTime() + (startValue.allDay ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000));
  const end = endValue.date && endValue.date > startValue.date ? endValue.date : fallbackEnd;
  return Object.freeze({
    summary: String(event.summary || event.title || "").trim() || "—",
    description: String(event.description || "").trim(),
    location: String(event.location || "").trim(),
    start: startValue.date,
    end,
    allDay: startValue.allDay || endValue.allDay,
    calendarId,
    calendarName,
    calendarIndex,
  });
}

export function normalizeCalendarResponse(response, source = {}) {
  const payload = response?.response || response || {};
  const scoped = payload?.[source.calendarId] || payload;
  const events = Array.isArray(scoped) ? scoped : scoped?.events;
  return (Array.isArray(events) ? events : [])
    .map(event => normalizeCalendarEvent(event, source))
    .filter(Boolean)
    .sort((a, b) => a.start - b.start || Number(b.allDay) - Number(a.allDay));
}

function calendarName(hass, entityId) {
  return String(hass?.states?.[entityId]?.attributes?.friendly_name || entityId.split(".").at(-1) || entityId);
}

async function fetchCalendarSource(hass, entityId, calendarIndex, start, end) {
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
    return normalizeCalendarResponse(response, {
      calendarId: entityId,
      calendarName: calendarName(hass, entityId),
      calendarIndex,
    });
  } catch (error) {
    console.warn(`[mha-widget-hub] Calendar events unavailable for ${entityId}.`, error);
    return [];
  }
}

export async function fetchCalendarEvents(hass, entityIds = [], {
  start,
  end,
  now = Date.now,
  maxAgeMs = CALENDAR_EVENT_CACHE_TTL_MS,
} = {}) {
  if (!entityIds.length || typeof hass?.callWS !== "function" || !(start instanceof Date) || !(end instanceof Date)) {
    return [];
  }

  const key = `${entityIds.join("|")}::${start.toISOString()}::${end.toISOString()}`;
  const cache = getOwnerCache(hass);
  const timestamp = Number(now()) || Date.now();
  const cached = cache?.get(key);
  if (cached && timestamp - cached.fetchedAt < maxAgeMs) return cached.promise;

  const promise = Promise.all(entityIds.map((entityId, calendarIndex) => (
    fetchCalendarSource(hass, entityId, calendarIndex, start, end)
  ))).then(results => results.flat().sort((a, b) => (
    a.start - b.start || Number(b.allDay) - Number(a.allDay) || a.calendarIndex - b.calendarIndex
  )));
  cache?.set(key, { fetchedAt: timestamp, promise });
  return promise;
}

export function clearCalendarEventCache(hass) {
  const owner = getCacheOwner(hass);
  if (owner) cacheByOwner.delete(owner);
}
