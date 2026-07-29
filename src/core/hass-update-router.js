const ENTITY_KEY_PATTERN = /entity/i;
const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/i;

const WIDGET_DOMAIN_FALLBACKS = Object.freeze({
  camera: ["camera.*", "image.*"],
  "clock-weather": ["weather.*"],
  calendar: ["calendar.*"],
  media: ["media_player.*"],
  weather: ["weather.*"],
  "weather-metric": ["weather.*", "sensor.*"],
  "weather-narrative": ["weather.*"],
  "weather-radar": ["camera.*", "image.*"],
});

function appendEntityValue(target, value) {
  if (typeof value === "string" && ENTITY_ID_PATTERN.test(value.trim())) {
    target.add(value.trim());
    return;
  }
  if (Array.isArray(value)) value.forEach(item => appendEntityValue(target, item));
}

function visitEntityConfig(target, value, depth = 0) {
  if (!value || typeof value !== "object" || depth > 4) return;
  Object.entries(value).forEach(([key, item]) => {
    if (ENTITY_KEY_PATTERN.test(key)) appendEntityValue(target, item);
    if (item && typeof item === "object") visitEntityConfig(target, item, depth + 1);
  });
}

export function getWidgetEntityDependencies(widget = {}) {
  const dependencies = new Set();
  visitEntityConfig(dependencies, widget);
  if (dependencies.size) return dependencies;
  const kind = String(widget.kind || widget.type || widget.component || "").trim();
  (WIDGET_DOMAIN_FALLBACKS[kind] || []).forEach(dependency => dependencies.add(dependency));
  return dependencies;
}

export function collectChangedEntityIds(previousHass, nextHass) {
  if (!previousHass) return null;
  const previousStates = previousHass?.states || {};
  const nextStates = nextHass?.states || {};
  if (previousStates === nextStates) return new Set();
  const changed = new Set();
  Object.entries(nextStates).forEach(([entityId, state]) => {
    if (previousStates[entityId] !== state) changed.add(entityId);
  });
  Object.keys(previousStates).forEach((entityId) => {
    if (!Object.hasOwn(nextStates, entityId)) changed.add(entityId);
  });
  return changed;
}

function dependencyMatchesEntity(dependency, entityId) {
  if (dependency === "*") return true;
  if (!dependency.endsWith(".*")) return dependency === entityId;
  return entityId.startsWith(`${dependency.slice(0, -2)}.`);
}

export function dependenciesIntersectChanges(dependencies, changedEntityIds) {
  if (changedEntityIds === null) return true;
  if (!dependencies?.size || !changedEntityIds.size) return false;
  return [...changedEntityIds].some(entityId => (
    [...dependencies].some(dependency => dependencyMatchesEntity(dependency, entityId))
  ));
}

function getDependencyStates(hass, dependency) {
  const states = hass?.states || {};
  if (!dependency.endsWith(".*")) return [[dependency, states[dependency] || null]];
  const domainPrefix = `${dependency.slice(0, -2)}.`;
  return Object.entries(states).filter(([entityId]) => entityId.startsWith(domainPrefix));
}

function getVisualStateSignature(entityId, state) {
  if (!state) return [entityId, null];
  return [entityId, state.state, state.attributes || {}];
}

export function createHassDependencySignature(hass, dependencies = new Set()) {
  const entries = [...dependencies]
    .flatMap(dependency => getDependencyStates(hass, dependency))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([entityId, state]) => getVisualStateSignature(entityId, state));
  return JSON.stringify(entries);
}

export function bindComponentHassContract(component, widget = {}) {
  if (!component) return false;
  const dependencies = getWidgetEntityDependencies(widget);
  component.__mhaEntityDependencies = dependencies;
  if (typeof component.__mhaGetHassRenderSignature !== "function") {
    component.__mhaGetHassRenderSignature = hass => createHassDependencySignature(hass, dependencies);
  }
  return true;
}

export function shouldUpdateComponent(component, hass, changedEntityIds, { force = false } = {}) {
  if (!component || typeof component.__mhaUpdateFromHass !== "function") return false;
  if (force || component.__mhaHassUpdatePolicy === "always") return true;
  const dependencies = component.__mhaEntityDependencies;
  if (dependencies instanceof Set && !dependenciesIntersectChanges(dependencies, changedEntityIds)) return false;
  const getSignature = component.__mhaGetHassRenderSignature;
  if (typeof getSignature !== "function") return true;
  const signature = getSignature(hass);
  if (component.__mhaLastHassRenderSignature === signature) return false;
  component.__mhaLastHassRenderSignature = signature;
  return true;
}

export function routeHassUpdate({
  root,
  previousHass,
  nextHass,
  force = false,
} = {}) {
  const changedEntityIds = force ? null : collectChangedEntityIds(previousHass, nextHass);
  let updateCount = 0;
  root?.querySelectorAll?.("[data-widget-component]")?.forEach((component) => {
    if (!shouldUpdateComponent(component, nextHass, changedEntityIds, { force })) return;
    component.__mhaUpdateFromHass(nextHass);
    updateCount += 1;
  });
  return { changedEntityIds, updateCount };
}
