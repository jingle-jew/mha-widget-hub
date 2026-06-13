import { getEntityOptionsByDomain } from "./light-options.js";

export const SLIDER_ACTIONS = Object.freeze([
  Object.freeze({
    value: "volume",
    label: "Volume",
    domain: "media_player",
    emptyLabel: "Aucun appareil média disponible",
  }),
  Object.freeze({
    value: "brightness",
    label: "Intensité lumière",
    domain: "light",
    emptyLabel: "Aucune lumière disponible",
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

export function createSliderConfigDraft(widget = {}, hass) {
  const configuredLabel = String(widget.label || "").trim();
  const draft = {
    entityId: widget.entityId || widget.entity_id || "",
    label: configuredLabel,
    labelCustomized: Boolean(configuredLabel),
    sliderAction: inferSliderAction(widget),
  };

  return reconcileSliderConfigDraft(draft, hass);
}

export function reconcileSliderConfigDraft(draft, hass) {
  const action = getSliderActionDefinition(draft.sliderAction);
  const options = getEntityOptionsByDomain(hass, action.domain);
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

export function updateSliderAction(draft, sliderAction, hass) {
  draft.sliderAction = getSliderActionDefinition(sliderAction).value;
  draft.entityId = "";
  return reconcileSliderConfigDraft(draft, hass);
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

export function buildSliderWidgetConfig(widget, draft, hass) {
  const { selected } = reconcileSliderConfigDraft(draft, hass);
  return {
    ...widget,
    kind: "slider",
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
    sliderAction: draft.sliderAction,
  };
}
