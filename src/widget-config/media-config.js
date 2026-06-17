import { getEntityOptionsByDomain } from "./light-options.js";

export function createMediaConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    mediaEntityId: widget.mediaEntityId || widget.entityId || widget.entity_id || "",
    label: String(widget.label || "").trim(),
    labelCustomized: Boolean(String(widget.label || "").trim()),
  };
  return reconcileMediaConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileMediaConfigDraft(draft, hass, visibilityConfig) {
  const options = getEntityOptionsByDomain(hass, "media_player", visibilityConfig);
  if (!options.some(option => option.value === draft.mediaEntityId)) {
    draft.mediaEntityId = options[0]?.value || "";
  }
  const selected = options.find(option => option.value === draft.mediaEntityId) || null;
  if (!draft.labelCustomized) draft.label = selected?.label || "";
  return { draft, options, selected };
}

export function updateMediaEntity(draft, entityId, options = []) {
  draft.mediaEntityId = String(entityId || "");
  const selected = options.find(option => option.value === draft.mediaEntityId);
  if (!draft.labelCustomized) draft.label = selected?.label || "";
  return draft;
}

export function updateMediaLabel(draft, label) {
  draft.label = String(label || "");
  draft.labelCustomized = true;
  return draft;
}

export function buildMediaWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileMediaConfigDraft(draft, hass, visibilityConfig);
  const mediaEntityId = draft.mediaEntityId || "";
  return {
    ...widget,
    kind: "media",
    type: "media",
    component: "media-widget",
    entityId: mediaEntityId,
    mediaEntityId,
    label: String(draft.label || selected?.label || "").trim(),
  };
}
