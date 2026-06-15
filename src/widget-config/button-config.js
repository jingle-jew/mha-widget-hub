import { getEntityDomain } from "../ha/entity.js";
import { getEntityOptionsByDomain } from "./light-options.js";

export const BUTTON_TYPES = Object.freeze([
  Object.freeze({ value: "light", label: "Lumière" }),
  Object.freeze({ value: "switch", label: "Interrupteur" }),
  Object.freeze({ value: "input_boolean", label: "Booléen" }),
  Object.freeze({ value: "button", label: "Bouton HA" }),
  Object.freeze({ value: "action", label: "Action personnalisée" }),
]);

function getButtonType(value) {
  return BUTTON_TYPES.find(type => type.value === value) || BUTTON_TYPES[0];
}

export function createButtonConfigDraft(widget = {}, hass, visibilityConfig) {
  const entityId = widget.entityId || widget.entity_id || "";
  const hasConfiguredAction = Boolean(
    widget.buttonType === "action"
    || widget.action?.domain
    || widget.actionDomain
    || widget.action?.service
    || widget.actionService
    || widget.service,
  );
  const configuredType = hasConfiguredAction
    ? "action"
    : getEntityDomain(entityId);
  const draft = {
    buttonType: getButtonType(configuredType).value,
    entityId,
    label: String(widget.label || "").trim(),
    labelCustomized: Boolean(String(widget.label || "").trim()),
    actionDomain: String(widget.action?.domain || widget.actionDomain || "").trim(),
    actionService: String(widget.action?.service || widget.actionService || widget.service || "").trim(),
    actionData: widget.action?.data || widget.actionData || {},
    actionDataValid: true,
  };
  return reconcileButtonConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileButtonConfigDraft(draft, hass, visibilityConfig) {
  const buttonType = getButtonType(draft.buttonType);
  const options = buttonType.value === "action"
    ? []
    : getEntityOptionsByDomain(hass, buttonType.value, visibilityConfig);
  if (buttonType.value !== "action" && !options.some(option => option.value === draft.entityId)) {
    draft.entityId = options[0]?.value || "";
  }
  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) draft.label = selected?.label || "";
  return { draft, buttonType, options, selected };
}

export function updateButtonType(draft, buttonType, hass, visibilityConfig) {
  draft.buttonType = getButtonType(buttonType).value;
  draft.entityId = "";
  return reconcileButtonConfigDraft(draft, hass, visibilityConfig);
}

export function updateButtonEntity(draft, entityId, options = []) {
  draft.entityId = String(entityId || "");
  const selected = options.find(option => option.value === draft.entityId);
  if (!draft.labelCustomized) draft.label = selected?.label || "";
  return draft;
}

export function updateButtonLabel(draft, label) {
  draft.label = String(label || "");
  draft.labelCustomized = true;
  return draft;
}

export function buildButtonWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { buttonType, selected } = reconcileButtonConfigDraft(draft, hass, visibilityConfig);
  if (buttonType.value === "action") {
    return {
      ...widget,
      kind: "button",
      buttonType: "action",
      entityId: "",
      label: String(draft.label || "Action").trim(),
      action: {
        domain: String(draft.actionDomain || "").trim(),
        service: String(draft.actionService || "").trim(),
        data: draft.actionData && typeof draft.actionData === "object" ? draft.actionData : {},
      },
    };
  }
  return {
    ...widget,
    kind: "button",
    buttonType: buttonType.value,
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
  };
}
