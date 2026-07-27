export const OVERVIEW_DEFAULT_INACTIVITY_SECONDS = 15;
export const OVERVIEW_MIN_INACTIVITY_SECONDS = 10;
export const OVERVIEW_MAX_INACTIVITY_SECONDS = 120;

export const OVERVIEW_VARIANTS = Object.freeze({
  BUTTON: "button-2x1",
  TOGGLE: "toggle-4x1",
  MEDIA_COMPACT: "media-2x2",
  MEDIA_WIDE: "media-4x2",
});

const ALL_VARIANTS = new Set(Object.values(OVERVIEW_VARIANTS));

function uniqueStrings(value) {
  return [...new Set(
    (Array.isArray(value) ? value : [])
      .map(item => String(item || "").trim())
      .filter(Boolean),
  )];
}

function normalizeInactivitySeconds(value) {
  const seconds = Math.round(Number(value));
  if (!Number.isFinite(seconds)) return OVERVIEW_DEFAULT_INACTIVITY_SECONDS;
  return Math.max(
    OVERVIEW_MIN_INACTIVITY_SECONDS,
    Math.min(OVERVIEW_MAX_INACTIVITY_SECONDS, seconds),
  );
}

function normalizeAreaConfig(config = {}) {
  const variants = {};
  if (config?.variants && typeof config.variants === "object" && !Array.isArray(config.variants)) {
    Object.entries(config.variants).forEach(([entityId, variant]) => {
      const normalizedEntityId = String(entityId || "").trim();
      if (!normalizedEntityId || !ALL_VARIANTS.has(variant)) return;
      variants[normalizedEntityId] = variant;
    });
  }

  return {
    entityOrder: uniqueStrings(config?.entityOrder),
    hiddenEntityIds: uniqueStrings(config?.hiddenEntityIds),
    variants,
  };
}

export function createDefaultOverviewPageConfig() {
  return {
    inactivitySeconds: OVERVIEW_DEFAULT_INACTIVITY_SECONDS,
    roomOrder: [],
    hiddenRoomIds: [],
    areas: {},
  };
}

export function normalizeOverviewPageConfig(config = {}) {
  const sourceAreas = config?.areas && typeof config.areas === "object" && !Array.isArray(config.areas)
    ? config.areas
    : {};
  const areas = {};
  Object.entries(sourceAreas).forEach(([areaId, areaConfig]) => {
    const normalizedAreaId = String(areaId || "").trim();
    if (!normalizedAreaId) return;
    areas[normalizedAreaId] = normalizeAreaConfig(areaConfig);
  });

  return {
    inactivitySeconds: normalizeInactivitySeconds(config?.inactivitySeconds),
    roomOrder: uniqueStrings(config?.roomOrder || config?.areaOrder),
    hiddenRoomIds: uniqueStrings(config?.hiddenRoomIds || config?.hiddenAreaIds),
    areas,
  };
}

export function getAllowedOverviewVariants(domain = "") {
  if (["light", "switch", "input_boolean"].includes(domain)) {
    return [OVERVIEW_VARIANTS.TOGGLE, OVERVIEW_VARIANTS.BUTTON];
  }
  if (domain === "button") return [OVERVIEW_VARIANTS.BUTTON];
  if (domain === "media_player") {
    return [OVERVIEW_VARIANTS.MEDIA_COMPACT, OVERVIEW_VARIANTS.MEDIA_WIDE];
  }
  return [];
}

export function getDefaultOverviewVariant(domain = "") {
  return getAllowedOverviewVariants(domain)[0] || "";
}

export function normalizeOverviewVariant(domain = "", variant = "") {
  const allowed = getAllowedOverviewVariants(domain);
  return allowed.includes(variant) ? variant : (allowed[0] || "");
}

function appendMissingIds(order = [], discoveredIds = []) {
  const next = uniqueStrings(order);
  discoveredIds.forEach((id) => {
    if (id && !next.includes(id)) next.push(id);
  });
  return next;
}

export function reconcileOverviewPageConfig(config = {}, discoveredAreas = []) {
  const normalized = normalizeOverviewPageConfig(config);
  const areas = Array.isArray(discoveredAreas) ? discoveredAreas : [];
  const nextAreas = { ...normalized.areas };

  areas.forEach((area) => {
    const areaId = String(area?.id || area?.area_id || "").trim();
    if (!areaId) return;
    const current = normalizeAreaConfig(nextAreas[areaId]);
    const entities = Array.isArray(area?.entities) ? area.entities : [];
    const entityIds = entities
      .map(entity => String(entity?.entityId || entity?.entity_id || "").trim())
      .filter(Boolean);
    const variants = { ...current.variants };
    entities.forEach((entity) => {
      const entityId = String(entity?.entityId || entity?.entity_id || "").trim();
      if (!entityId) return;
      const domain = String(entity?.domain || entityId.split(".")[0] || "");
      variants[entityId] = normalizeOverviewVariant(domain, variants[entityId]);
    });
    nextAreas[areaId] = {
      entityOrder: appendMissingIds(current.entityOrder, entityIds),
      hiddenEntityIds: current.hiddenEntityIds,
      variants,
    };
  });

  return {
    ...normalized,
    roomOrder: appendMissingIds(
      normalized.roomOrder,
      areas.map(area => String(area?.id || area?.area_id || "").trim()).filter(Boolean),
    ),
    areas: nextAreas,
  };
}

export function orderOverviewAreas(discoveredAreas = [], config = {}) {
  const normalized = reconcileOverviewPageConfig(config, discoveredAreas);
  const byId = new Map(
    discoveredAreas.map(area => [String(area?.id || area?.area_id || ""), area]),
  );
  return normalized.roomOrder.map(id => byId.get(id)).filter(Boolean);
}

export function orderOverviewEntities(area = {}, config = {}) {
  const areaId = String(area?.id || area?.area_id || "");
  const normalized = reconcileOverviewPageConfig(config, [area]);
  const areaConfig = normalized.areas[areaId] || normalizeAreaConfig();
  const byId = new Map(
    (area?.entities || []).map(entity => [String(entity?.entityId || entity?.entity_id || ""), entity]),
  );
  return areaConfig.entityOrder.map(id => byId.get(id)).filter(Boolean);
}

export function moveOverviewItem(order = [], itemId = "", direction = 0, movableIds = null) {
  const next = uniqueStrings(order);
  const from = next.indexOf(itemId);
  if (from < 0) return next;
  const step = Number(direction) < 0 ? -1 : 1;
  const movable = Array.isArray(movableIds) ? new Set(uniqueStrings(movableIds)) : null;
  let to = from + step;
  while (movable && to >= 0 && to < next.length && !movable.has(next[to])) {
    to += step;
  }
  if (to < 0 || to >= next.length) return next;
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

export function setOverviewItemHidden(ids = [], itemId = "", hidden = true) {
  const next = uniqueStrings(ids).filter(id => id !== itemId);
  if (hidden && itemId) next.push(itemId);
  return next;
}

export function updateOverviewAreaConfig(config = {}, areaId = "", updater) {
  const normalized = normalizeOverviewPageConfig(config);
  const id = String(areaId || "").trim();
  if (!id || typeof updater !== "function") return normalized;
  const current = normalized.areas[id] || normalizeAreaConfig();
  return {
    ...normalized,
    areas: {
      ...normalized.areas,
      [id]: normalizeAreaConfig(updater(current)),
    },
  };
}
