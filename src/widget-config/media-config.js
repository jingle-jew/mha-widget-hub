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

export function renderMediaConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, createSelectControl, t } = helpers;
  const reconciled = reconcileMediaConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || t("widgets.config.placeholderRoom", "Living room");
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", (event) => {
    updateMediaLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const mediaPlayerLabel = t("widgets.config.mediaPlayer", "Media player");
  const mediaSelect = createSelectControl({
    label: mediaPlayerLabel,
    value: draft.mediaEntityId,
    disabled: !reconciled.options.length,
    options: reconciled.options.length
      ? reconciled.options
      : [{
        value: "",
        label: t("widgets.config.noMediaPlayer", "No authorized and available media player."),
      }],
    onChange: (value) => {
      updateMediaEntity(draft, value, reconciled.options);
      onChange?.({ rerender: true });
    },
  });

  fields.append(
    createField(t("widgets.modesRoutines.displayName", "Display name"), nameInput),
    createField(mediaPlayerLabel, mediaSelect),
  );

  return { fields, canSave: Boolean(reconciled.selected) };
}
