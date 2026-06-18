import { filterEntitiesForCurrentUser } from "../admin/entity-permissions.js";
import { getEntityDomain } from "../ha/entity.js";
import { getEntityDisplayName, humanizeEntityId } from "./light-options.js";

const SCENES_BUTTON_COUNT = 4;

export const SCENES_BUTTON_TYPES = Object.freeze([
  Object.freeze({ value: "mode", label: "Mode" }),
  Object.freeze({ value: "routine", label: "Routine" }),
]);

const SCENES_BUTTON_DOMAINS = Object.freeze({
  mode: Object.freeze(["scene"]),
  routine: Object.freeze(["automation", "script"]),
});

function normalizeButtonType(value, entityId = "") {
  if (value === "mode" || value === "routine") return value;
  return getEntityDomain(entityId) === "scene" ? "mode" : "routine";
}

function normalizeButtonIcon(type, value) {
  const icon = String(value || "").trim();
  if (icon) return icon;
  return type === "mode" ? "home" : "play";
}

function createButtonDraft(button = {}) {
  const entityId = String(button.entityId || button.entity_id || "").trim();
  const label = String(button.label || "").trim();
  const type = normalizeButtonType(button.type, entityId);
  return {
    type,
    entityId,
    label,
    labelCustomized: Boolean(label),
    icon: normalizeButtonIcon(type, button.icon),
  };
}

function ensureButtonCount(buttons = []) {
  const normalized = Array.from({ length: SCENES_BUTTON_COUNT }, (_, index) => (
    createButtonDraft(buttons[index])
  ));
  return normalized;
}

function isSceneRoutineEntityAvailable(entityState) {
  if (!entityState) return false;
  return !["unavailable", "none"].includes(String(entityState.state || "").toLowerCase());
}

function getSceneRoutineOptions(hass, type, visibilityConfig) {
  const allowedDomains = SCENES_BUTTON_DOMAINS[normalizeButtonType(type)];
  const options = Object.entries(hass?.states || {})
    .filter(([entityId, entityState]) => (
      allowedDomains.includes(getEntityDomain(entityId))
      && isSceneRoutineEntityAvailable(entityState)
    ))
    .map(([entityId, entityState]) => ({
      value: entityId,
      label: getEntityDisplayName(entityState, entityId),
      entityState,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return filterEntitiesForCurrentUser(hass, options, visibilityConfig);
}

function createMissingOption(entityId) {
  const normalizedEntityId = String(entityId || "").trim();
  if (!normalizedEntityId) return null;
  return {
    value: normalizedEntityId,
    label: `${humanizeEntityId(normalizedEntityId)} (missing)`,
    entityState: null,
    missing: true,
  };
}

function reconcileButtonDraft(button, hass, visibilityConfig) {
  button.type = normalizeButtonType(button.type, button.entityId);
  button.icon = normalizeButtonIcon(button.type, button.icon);
  const options = getSceneRoutineOptions(hass, button.type, visibilityConfig);
  const selected = options.find(option => option.value === button.entityId) || null;
  const resolvedOptions = selected || !button.entityId
    ? options
    : [createMissingOption(button.entityId), ...options];
  const resolvedSelection = selected || resolvedOptions.find(option => option?.value === button.entityId) || null;
  if (!button.labelCustomized) {
    button.label = resolvedSelection?.label?.replace(/\s+\(missing\)$/u, "") || "";
  }
  return {
    draft: button,
    options: resolvedOptions.filter(Boolean),
    selected: resolvedSelection,
  };
}

function normalizeScenesDraft(draft = {}) {
  draft.buttons = ensureButtonCount(draft.buttons);
  return draft;
}

export function createScenesConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    buttons: Array.isArray(widget.buttons) ? widget.buttons : [],
  };
  normalizeScenesDraft(draft);
  return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileScenesConfigDraft(draft, hass, visibilityConfig) {
  const normalized = normalizeScenesDraft(draft);
  return {
    draft: normalized,
    buttons: normalized.buttons.map(button => reconcileButtonDraft(button, hass, visibilityConfig)),
  };
}

export function updateScenesButtonType(draft, index, type, hass, visibilityConfig) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
  button.type = normalizeButtonType(type, "");
  button.entityId = "";
  button.icon = normalizeButtonIcon(button.type, "");
  if (!button.labelCustomized) button.label = "";
  return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
}

export function updateScenesButtonEntity(draft, index, entityId, options = []) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return draft;
  button.entityId = String(entityId || "").trim();
  const selected = options.find(option => option.value === button.entityId) || null;
  button.type = normalizeButtonType(button.type, button.entityId);
  button.icon = normalizeButtonIcon(button.type, button.icon);
  if (!button.labelCustomized) {
    button.label = selected?.label?.replace(/\s+\(missing\)$/u, "") || "";
  }
  return draft;
}

export function updateScenesButtonLabel(draft, index, label) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return draft;
  button.label = String(label || "");
  button.labelCustomized = true;
  return draft;
}

export function buildScenesWidgetConfig(widget, draft, hass, visibilityConfig) {
  const reconciled = reconcileScenesConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    kind: "scenes",
    buttons: reconciled.draft.buttons.map((button, index) => {
      const selection = reconciled.buttons[index];
      const fallbackLabel = selection?.selected?.label?.replace(/\s+\(missing\)$/u, "") || "";
      return {
        type: normalizeButtonType(button.type, button.entityId),
        entityId: String(button.entityId || "").trim(),
        label: String(button.label || fallbackLabel).trim(),
        icon: normalizeButtonIcon(button.type, button.icon),
      };
    }),
  };
}
