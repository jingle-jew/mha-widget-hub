import { getEntityOptionsByDomain } from "./light-options.js";

export const SLIDER_ACTIONS = Object.freeze([
  Object.freeze({
    value: "volume",
    label: "Volume",
    domain: "media_player",
    emptyLabel: "No media device available",
  }),
  Object.freeze({
    value: "brightness",
    label: "Light intensity",
    domain: "light",
    emptyLabel: "No light available",
  }),
]);

function getSliderActionDefinition(action) {
  return SLIDER_ACTIONS.find(option => option.value === action) || SLIDER_ACTIONS[1];
}

function inferSliderAction(widget = {}) {
  if (widget.sliderAction === "volume" || widget.sliderAction === "brightness") {
    return widget.sliderAction;
  }
  return widget.variant === "volume-slider" ? "volume" : "brightness";
}

export function createSliderConfigDraft(widget = {}, hass, visibilityConfig) {
  const configuredLabel = String(widget.label || "").trim();
  const draft = {
    entityId: widget.entityId || widget.entity_id || "",
    label: configuredLabel,
    labelCustomized: Boolean(configuredLabel),
    sliderAction: inferSliderAction(widget),
  };

  return reconcileSliderConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileSliderConfigDraft(draft, hass, visibilityConfig) {
  const action = getSliderActionDefinition(draft.sliderAction);
  const options = getEntityOptionsByDomain(hass, action.domain, visibilityConfig);
  const currentIsValid = options.some(option => option.value === draft.entityId);

  if (!currentIsValid) {
    draft.entityId = options[0]?.value || "";
  }

  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) {
    draft.label = selected?.label || "";
  }

  return { draft, action, options, selected };
}

export function updateSliderAction(draft, sliderAction, hass, visibilityConfig) {
  draft.sliderAction = getSliderActionDefinition(sliderAction).value;
  draft.entityId = "";
  return reconcileSliderConfigDraft(draft, hass, visibilityConfig);
}

export function updateSliderEntity(draft, entityId, options = []) {
  draft.entityId = String(entityId || "");
  const selected = options.find(option => option.value === draft.entityId) || null;
  if (!draft.labelCustomized) {
    draft.label = selected?.label || "";
  }
  return draft;
}

export function updateSliderLabel(draft, label) {
  draft.label = String(label || "");
  draft.labelCustomized = true;
  return draft;
}

export function buildSliderWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileSliderConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    kind: "slider",
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
    sliderAction: draft.sliderAction,
  };
}
