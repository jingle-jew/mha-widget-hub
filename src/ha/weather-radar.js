import {
  getAvailableEntitiesForDomain,
  getFriendlyEntityName,
} from "./entity-filters.js";

const RADAR_DOMAINS = Object.freeze(["camera", "image"]);
const RADAR_TERMS = Object.freeze([
  "radar",
  "weather map",
  "rain map",
  "precipitation map",
  "carte meteo",
  "carte météo",
  "carte des precipitations",
  "carte des précipitations",
]);

function normalizeText(value = "") {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getRadarSearchText(entity = {}, registryEntry = {}) {
  return normalizeText([
    entity.entity_id,
    entity.name,
    entity.state?.attributes?.friendly_name,
    registryEntry.name,
    registryEntry.original_name,
    registryEntry.translation_key,
  ].filter(Boolean).join(" "));
}

function scoreRadarEntity(entity = {}, registryEntry = {}) {
  const searchText = getRadarSearchText(entity, registryEntry);
  const matchedTerms = RADAR_TERMS.filter(term => searchText.includes(normalizeText(term)));
  if (!matchedTerms.length) return 0;

  const objectId = normalizeText(String(entity.entity_id || "").split(".").slice(1).join("."));
  const friendlyName = normalizeText(entity.state?.attributes?.friendly_name || entity.name || "");
  return (objectId.includes("radar") ? 300 : 0)
    + (friendlyName.includes("radar") ? 240 : 0)
    + matchedTerms.length * 40
    + (String(entity.entity_id || "").startsWith("image.") ? 10 : 0);
}

export function resolveWeatherRadarSource(
  hass,
  visibilityConfig,
  { registryEntries = [] } = {},
) {
  const registryByEntityId = new Map(
    (Array.isArray(registryEntries) ? registryEntries : [])
      .map(entry => [entry.entity_id, entry]),
  );
  const candidates = RADAR_DOMAINS.flatMap(domain => (
    getAvailableEntitiesForDomain(hass, domain, visibilityConfig)
  ));

  const match = candidates
    .map(entity => ({
      entity,
      score: scoreRadarEntity(entity, registryByEntityId.get(entity.entity_id)),
    }))
    .filter(candidate => candidate.score > 0)
    .sort((left, right) => right.score - left.score || left.entity.entity_id.localeCompare(right.entity.entity_id))[0];

  if (!match) return null;
  const entityId = match.entity.entity_id;
  return {
    entityId,
    domain: entityId.split(".")[0] || "",
    label: getFriendlyEntityName(match.entity.state, entityId) || "Radar",
    sourceType: "radar-entity",
  };
}

export function resolveWeatherRadarImageUrl(hass, entityState) {
  const entityId = String(entityState?.entity_id || "").trim();
  const attributes = entityState?.attributes || {};
  let url = String(attributes.entity_picture || "").trim();

  if (!url && entityId.startsWith("camera.") && attributes.access_token) {
    url = `/api/camera_proxy/${entityId}?token=${encodeURIComponent(attributes.access_token)}`;
  }
  if (!url) return "";
  if (/^(?:https?:)?\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return url;
  if (typeof hass?.hassUrl === "function") return hass.hassUrl(url);
  if (url.startsWith("/")) return `${globalThis.window?.location?.origin || ""}${url}`;
  return url;
}

export function buildWeatherRadarModel(hass, widget = {}) {
  const entityId = String(widget.entityId || widget.entity_id || "").trim();
  const entity = entityId ? hass?.states?.[entityId] : null;
  return {
    entityId,
    entity,
    label: getFriendlyEntityName(entity, entityId) || "Radar",
    imageUrl: resolveWeatherRadarImageUrl(hass, entity),
    available: Boolean(entity && !["unavailable", "unknown"].includes(entity.state)),
  };
}
