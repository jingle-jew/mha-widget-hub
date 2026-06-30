import { getEntityOptionsByDomain } from "./light-options.js";
import { getEntityDomain } from "../ha/entity.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { createIconPickerControl, normalizeIconPickerValue } from "./icon-picker.js";
import { createInlineIconNameRow } from "./icon-picker-field.js";

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
    icon: normalizeIconPickerValue(widget.icon || "auto"),
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
  const resolvedIcon = normalizeIconPickerValue(draft.icon || widget.icon || "auto");
  return {
    ...widget,
    kind: "slider",
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
    ...(resolvedIcon && resolvedIcon !== "auto" ? { icon: resolvedIcon } : {}),
    sliderAction: draft.sliderAction,
  };
}

export function renderSliderConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, configOptionLabel, emptyLabelForConfigOption, t } = helpers;
  const reconciled = reconcileSliderConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const actionSelect = document.createElement("select");
  actionSelect.className = "mha-widget-config-control";
  SLIDER_ACTIONS.forEach((action) => {
    const item = document.createElement("option");
    item.value = action.value;
    item.textContent = configOptionLabel("widgets.config.sliderActions", action);
    item.selected = action.value === draft.sliderAction;
    actionSelect.append(item);
  });
  actionSelect.addEventListener("change", (event) => {
    updateSliderAction(draft, event.currentTarget.value, hass, visibilityConfig);
    onChange?.({ rerender: true });
  });

  const deviceSelect = document.createElement("select");
  deviceSelect.className = "mha-widget-config-control";
  deviceSelect.disabled = !reconciled.options.length;
  if (!reconciled.options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = emptyLabelForConfigOption("widgets.config.emptyLabels", reconciled.action);
    deviceSelect.append(empty);
  } else {
    reconciled.options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      deviceSelect.append(item);
    });
  }
  deviceSelect.addEventListener("change", (event) => {
    updateSliderEntity(draft, event.currentTarget.value, reconciled.options);
    onChange?.({ rerender: true });
  });

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || t("widgets.config.placeholderRoom", "Living room");
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", (event) => {
    updateSliderLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const suggestedIcon = resolveWidgetIconName({
    explicitIcon: "auto",
    label: draft.label,
    entityId: draft.entityId,
    domain: getEntityDomain(draft.entityId),
    kind: "slider",
    fallback: draft.sliderAction === "volume" ? "speaker-volume" : "globe",
  });
  const iconPicker = createIconPickerControl({
    value: draft.icon,
    suggestedIcon,
    searchPlaceholder: t("widgets.config.searchIcon", "Search icons"),
    emptyLabel: t("widgets.config.noIconFound", "No icons found"),
    onChange: (value) => {
      draft.icon = value;
      onChange?.();
    },
    t,
  });
  const iconNameRow = createInlineIconNameRow(nameInput, iconPicker);

  fields.append(
    createField(t("widgets.config.action", "Action"), actionSelect),
    createField(t("widgets.config.device", "Device"), deviceSelect),
    createField(t("widgets.modesRoutines.displayName", "Display name"), iconNameRow),
  );
  return { fields, canSave: Boolean(reconciled.selected) };
}
