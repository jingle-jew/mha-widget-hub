import { getEntityDomain } from "../ha/entity.js";
import { getEntityOptionsByDomain } from "./light-options.js";

export const TOGGLE_DEVICE_TYPES = Object.freeze([
  Object.freeze({
    value: "light",
    label: "Light",
    emptyLabel: "No light available",
  }),
  Object.freeze({
    value: "switch",
    label: "Switch",
    emptyLabel: "No switch available",
  }),
  Object.freeze({
    value: "input_boolean",
    label: "Boolean",
    emptyLabel: "No boolean available",
  }),
]);

function getToggleDeviceType(domain) {
  return TOGGLE_DEVICE_TYPES.find(option => option.value === domain) || TOGGLE_DEVICE_TYPES[0];
}

export function createToggleConfigDraft(widget = {}, hass, visibilityConfig) {
  const entityId = widget.entityId || widget.entity_id || "";
  const configuredLabel = String(widget.label || "").trim();
  const draft = {
    deviceType: getToggleDeviceType(getEntityDomain(entityId)).value,
    entityId,
    label: configuredLabel,
    labelCustomized: Boolean(configuredLabel),
  };

  return reconcileToggleConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileToggleConfigDraft(draft, hass, visibilityConfig) {
  const deviceType = getToggleDeviceType(draft.deviceType);
  const options = getEntityOptionsByDomain(hass, deviceType.value, visibilityConfig);
  const currentIsValid = options.some(option => option.value === draft.entityId);

  if (!currentIsValid) {
    draft.entityId = options[0]?.value || "";
  }

  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) {
    draft.label = selected?.label || "";
  }

  return { draft, deviceType, options, selected };
}

export function updateToggleDeviceType(draft, deviceType, hass, visibilityConfig) {
  draft.deviceType = getToggleDeviceType(deviceType).value;
  draft.entityId = "";
  return reconcileToggleConfigDraft(draft, hass, visibilityConfig);
}

export function updateToggleEntity(draft, entityId, options = []) {
  draft.entityId = String(entityId || "");
  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) {
    draft.label = selected?.label || "";
  }
  return draft;
}

export function updateToggleConfigLabel(draft, label) {
  draft.label = String(label || "");
  draft.labelCustomized = true;
  return draft;
}

export function buildToggleWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileToggleConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    kind: "toggle",
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
  };
}
