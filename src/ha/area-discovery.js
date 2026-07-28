import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";
import { getFriendlyEntityName } from "./entity-filters.js";

export const AREA_REGISTRY_COMMANDS = Object.freeze({
  areas: "config/area_registry/list",
  devices: "config/device_registry/list",
  entities: "config/entity_registry/list",
});

export const AREA_REGISTRY_TIMEOUT_MS = 2200;
export const AREA_REGISTRY_CACHE_TTL_MS = 60_000;

const SUPPORTED_DOMAINS = new Set([
  "light",
  "switch",
  "input_boolean",
  "button",
  "media_player",
]);

const registryCache = new WeakMap();

function resolveCacheKey(hass) {
  const candidate = hass?.connection || hass;
  return candidate && (typeof candidate === "object" || typeof candidate === "function")
    ? candidate
    : null;
}

function withTimeout(promise, timeoutMs = AREA_REGISTRY_TIMEOUT_MS, label = "registry") {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      reject(new Error(`${label} discovery timeout`));
    }, Math.max(1, Number(timeoutMs) || AREA_REGISTRY_TIMEOUT_MS));
    Promise.resolve(promise).then(
      value => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      error => {
        globalThis.clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function serializeError(error) {
  return {
    message: error?.message || String(error || "Registry discovery failed"),
    code: error?.code || "",
  };
}

async function callRegistry(hass, command, timeoutMs) {
  if (typeof hass?.callWS !== "function") {
    throw new Error("Home Assistant connection unavailable");
  }
  return withTimeout(
    Promise.resolve().then(() => hass.callWS({ type: command })),
    timeoutMs,
    command,
  );
}

async function loadRegistryContext(hass, { timeoutMs = AREA_REGISTRY_TIMEOUT_MS } = {}) {
  const entries = Object.entries(AREA_REGISTRY_COMMANDS);
  const settled = await Promise.allSettled(
    entries.map(([, command]) => callRegistry(hass, command, timeoutMs)),
  );
  const context = {
    areas: [],
    devices: [],
    entities: [],
    errors: {},
    loadedAt: Date.now(),
  };

  settled.forEach((result, index) => {
    const [key] = entries[index];
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      context[key] = result.value;
      return;
    }
    context.errors[key] = serializeError(
      result.status === "rejected"
        ? result.reason
        : new Error(`Invalid ${key} registry response`),
    );
  });

  return context;
}

export function invalidateAreaRegistryCache(hass) {
  const key = resolveCacheKey(hass);
  if (!key) return false;
  return registryCache.delete(key);
}

export function loadAreaRegistryContext(hass, {
  timeoutMs = AREA_REGISTRY_TIMEOUT_MS,
  maxAgeMs = AREA_REGISTRY_CACHE_TTL_MS,
  force = false,
} = {}) {
  const key = resolveCacheKey(hass);
  if (!key) {
    return Promise.resolve({
      areas: [],
      devices: [],
      entities: [],
      errors: { connection: serializeError(new Error("Home Assistant connection unavailable")) },
      loadedAt: Date.now(),
    });
  }

  const cached = registryCache.get(key);
  const fresh = cached && (Date.now() - cached.loadedAt) < Math.max(0, Number(maxAgeMs) || 0);
  if (!force && fresh && cached.value) return Promise.resolve(cached.value);
  if (!force && cached?.promise) return cached.promise;

  const promise = loadRegistryContext(hass, { timeoutMs }).then((value) => {
    registryCache.set(key, { value, loadedAt: value.loadedAt, promise: null });
    return value;
  }).catch((error) => {
    const value = {
      areas: [],
      devices: [],
      entities: [],
      errors: { registry: serializeError(error) },
      loadedAt: Date.now(),
    };
    registryCache.set(key, { value, loadedAt: value.loadedAt, promise: null });
    return value;
  });
  registryCache.set(key, {
    value: cached?.value || null,
    loadedAt: cached?.loadedAt || 0,
    promise,
  });
  return promise;
}

function getDomain(entityId = "") {
  return String(entityId || "").split(".")[0] || "";
}

function normalizeRegistryIcon(icon = "") {
  const value = String(icon || "").trim();
  return value.startsWith("mdi:") ? value.slice(4) : value;
}

function isUsableEntityRegistryEntry(entry = {}) {
  return Boolean(entry.entity_id)
    && !entry.disabled_by
    && !entry.hidden_by
    && entry.entity_category !== "diagnostic"
    && SUPPORTED_DOMAINS.has(getDomain(entry.entity_id));
}

function resolveEntityAreaId(entry = {}, deviceById = new Map()) {
  const directAreaId = String(entry.area_id || "").trim();
  if (directAreaId) return directAreaId;
  return String(deviceById.get(entry.device_id)?.area_id || "").trim();
}

function createDiscoveredEntity(hass, entry = {}, device = null, areaId = "") {
  const entityId = String(entry.entity_id || "").trim();
  const state = hass?.states?.[entityId] || null;
  if (!state) return null;
  const domain = getDomain(entityId);
  const friendlyName = String(state.attributes?.friendly_name || "").trim();
  const registryName = String(entry.name || entry.original_name || "").trim();
  return {
    entityId,
    entity_id: entityId,
    domain,
    areaId,
    deviceId: String(entry.device_id || ""),
    deviceName: String(device?.name_by_user || device?.name || "").trim(),
    name: friendlyName || registryName || getFriendlyEntityName(state, entityId) || entityId,
    icon: normalizeRegistryIcon(entry.icon || state.attributes?.icon || ""),
  };
}

export function buildAreaDiscoveryModel(
  hass,
  registry = {},
  visibilityConfig,
) {
  const areas = Array.isArray(registry?.areas) ? registry.areas : [];
  const devices = Array.isArray(registry?.devices) ? registry.devices : [];
  const entities = Array.isArray(registry?.entities) ? registry.entities : [];
  const areaById = new Map(
    areas
      .filter(area => area?.area_id)
      .map(area => [String(area.area_id), area]),
  );
  const deviceById = new Map(
    devices
      .filter(device => device?.id)
      .map(device => [String(device.id), device]),
  );
  const entitiesByArea = new Map();

  entities.forEach((entry) => {
    if (!isUsableEntityRegistryEntry(entry)) return;
    const entityId = String(entry.entity_id);
    if (!isEntityAllowedForCurrentUser(hass, entityId, visibilityConfig)) return;
    const areaId = resolveEntityAreaId(entry, deviceById);
    if (!areaId || !areaById.has(areaId)) return;
    const entity = createDiscoveredEntity(
      hass,
      entry,
      deviceById.get(entry.device_id) || null,
      areaId,
    );
    if (!entity) return;
    if (!entitiesByArea.has(areaId)) entitiesByArea.set(areaId, []);
    entitiesByArea.get(areaId).push(entity);
  });

  return areas.map((area) => {
    const id = String(area?.area_id || "").trim();
    const areaEntities = entitiesByArea.get(id) || [];
    const devicesForArea = new Map();
    areaEntities.forEach((entity) => {
      if (!entity.deviceId) return;
      const device = deviceById.get(entity.deviceId);
      if (!device) return;
      if (!devicesForArea.has(entity.deviceId)) {
        devicesForArea.set(entity.deviceId, {
          id: entity.deviceId,
          name: String(device.name_by_user || device.name || entity.deviceName || "").trim(),
          entities: [],
        });
      }
      devicesForArea.get(entity.deviceId).entities.push(entity);
    });
    return {
      id,
      area_id: id,
      name: String(area?.name || id).trim() || id,
      icon: normalizeRegistryIcon(area?.icon || "") || "home",
      entities: areaEntities.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
      devices: [...devicesForArea.values()],
    };
  }).filter(area => area.id && area.entities.length > 0);
}

export async function discoverOverviewAreas({
  hass,
  visibilityConfig,
  timeoutMs = AREA_REGISTRY_TIMEOUT_MS,
  maxAgeMs = AREA_REGISTRY_CACHE_TTL_MS,
  force = false,
} = {}) {
  const registry = await loadAreaRegistryContext(hass, {
    timeoutMs,
    maxAgeMs,
    force,
  });
  return {
    areas: buildAreaDiscoveryModel(hass, registry, visibilityConfig),
    errors: registry.errors || {},
    loadedAt: registry.loadedAt || Date.now(),
    registry,
  };
}
