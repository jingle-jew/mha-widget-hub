import { getLightOptions } from "./light-options.js";

export function createToggleSliderConfigDraft(widget = {}, hass) {
  const lightEntityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
  const configuredLabel = String(widget.label || "").trim();
  const draft = {
    lightEntityId,
    label: configuredLabel,
    labelCustomized: Boolean(configuredLabel),
    sliderMode: "brightness",
  };

  return reconcileToggleSliderConfigDraft(draft, hass);
}

export function reconcileToggleSliderConfigDraft(draft, hass) {
  const options = getLightOptions(hass);
  if (!draft.lightEntityId && options.length) {
    draft.lightEntityId = options[0].value;
  }

  const selected = options.find(option => option.value === draft.lightEntityId) || null;
  if (!draft.labelCustomized && selected) {
    draft.label = selected.label;
  }
  return { draft, options, selected };
}

export function updateToggleSliderLight(draft, lightEntityId, options = []) {
  draft.lightEntityId = String(lightEntityId || "");
  const selected = options.find(option => option.value === draft.lightEntityId) || null;
  if (!draft.labelCustomized) {
    draft.label = selected?.label || "";
  }
  return draft;
}

export function updateToggleSliderLabel(draft, label) {
  draft.label = String(label || "");
  draft.labelCustomized = true;
  return draft;
}

export function buildToggleSliderWidgetConfig(widget, draft, hass) {
  const { selected } = reconcileToggleSliderConfigDraft(draft, hass);
  const lightEntityId = draft.lightEntityId || "";
  return {
    ...widget,
    lightEntityId,
    entityId: lightEntityId,
    label: String(draft.label || selected?.label || "").trim(),
    sliderMode: "brightness",
  };
}
