import { getLightOptions } from "./light-options.js";
import { getEntityDomain } from "../ha/entity.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { createIconPickerControl, normalizeIconPickerValue } from "./icon-picker.js";
import { createInlineIconNameRow } from "./icon-picker-field.js";

export function createToggleSliderConfigDraft(widget = {}, hass, visibilityConfig) {
  const lightEntityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
  const configuredLabel = String(widget.label || "").trim();
  const draft = {
    lightEntityId,
    label: configuredLabel,
    icon: normalizeIconPickerValue(widget.icon || "auto"),
    labelCustomized: Boolean(configuredLabel),
    sliderMode: "brightness",
  };

  return reconcileToggleSliderConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileToggleSliderConfigDraft(draft, hass, visibilityConfig) {
  const options = getLightOptions(hass, visibilityConfig);
  const currentIsValid = options.some(option => option.value === draft.lightEntityId);
  if (!currentIsValid) {
    draft.lightEntityId = options[0]?.value || "";
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

export function buildToggleSliderWidgetConfig(widget, draft, hass, visibilityConfig) {
  const { selected } = reconcileToggleSliderConfigDraft(draft, hass, visibilityConfig);
  const lightEntityId = draft.lightEntityId || "";
  const resolvedIcon = normalizeIconPickerValue(draft.icon || widget.icon || "auto");
  return {
    ...widget,
    lightEntityId,
    entityId: lightEntityId,
    label: String(draft.label || selected?.label || "").trim(),
    ...(resolvedIcon && resolvedIcon !== "auto" ? { icon: resolvedIcon } : {}),
    sliderMode: "brightness",
  };
}

export function renderToggleSliderConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, t } = helpers;
  const { draft, options, selected } = reconcileToggleSliderConfigDraft(
    session.draft,
    hass,
    visibilityConfig,
  );
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = selected?.label || t("widgets.config.placeholderRoom", "Living room");
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", (event) => {
    updateToggleSliderLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const suggestedIcon = resolveWidgetIconName({
    explicitIcon: "auto",
    label: draft.label,
    entityId: draft.lightEntityId,
    domain: getEntityDomain(draft.lightEntityId),
    kind: "toggle",
    fallback: "lamp",
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

  const lightSelect = document.createElement("select");
  lightSelect.className = "mha-widget-config-control";
  lightSelect.disabled = !options.length;
  if (!options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = t("widgets.config.noBrightnessLight", "No brightness-compatible light found.");
    lightSelect.append(empty);
  } else {
    options.forEach((option) => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.lightEntityId;
      lightSelect.append(item);
    });
  }
  lightSelect.addEventListener("change", (event) => {
    updateToggleSliderLight(draft, event.currentTarget.value, options);
    onChange?.({ rerender: true });
  });

  const modeSelect = document.createElement("select");
  modeSelect.className = "mha-widget-config-control";
  const brightness = document.createElement("option");
  brightness.value = "brightness";
  brightness.textContent = t("widgets.config.brightness", "Brightness");
  modeSelect.append(brightness);
  modeSelect.value = "brightness";

  fields.append(
    createField(t("widgets.modesRoutines.displayName", "Display name"), iconNameRow),
    createField(t("widgets.config.light", "Light"), lightSelect),
    createField(t("widgets.config.sliderControl", "Slider control"), modeSelect),
  );
  return { fields, canSave: Boolean(selected) };
}
