import { getEntityDomain } from "../ha/entity.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { createIconPickerControl, normalizeIconPickerValue } from "./icon-picker.js";
import { createInlineIconNameRow } from "./icon-picker-field.js";
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
    icon: normalizeIconPickerValue(widget.icon || "auto"),
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
  const resolvedIcon = normalizeIconPickerValue(draft.icon || widget.icon || "auto");
  return {
    ...widget,
    kind: "toggle",
    entityId: draft.entityId || "",
    label: String(draft.label || selected?.label || "").trim(),
    ...(resolvedIcon ? { icon: resolvedIcon } : {}),
  };
}

export function renderToggleConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, createSelectControl, configOptionLabel, emptyLabelForConfigOption, t } = helpers;
  const reconciled = reconcileToggleConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const deviceTypeLabel = t("widgets.config.deviceType", "Device type");
  const typeSelect = createSelectControl({
    label: deviceTypeLabel,
    value: draft.deviceType,
    options: TOGGLE_DEVICE_TYPES.map(deviceType => ({
      value: deviceType.value,
      label: configOptionLabel("widgets.config.deviceTypes", deviceType),
    })),
    onChange: (value) => {
      updateToggleDeviceType(draft, value, hass, visibilityConfig);
      onChange?.({ rerender: true });
    },
  });

  const deviceLabel = t("widgets.config.device", "Device");
  const deviceSelect = createSelectControl({
    label: deviceLabel,
    value: draft.entityId,
    disabled: !reconciled.options.length,
    options: reconciled.options.length
      ? reconciled.options
      : [{
        value: "",
        label: emptyLabelForConfigOption("widgets.config.emptyLabels", reconciled.deviceType),
      }],
    onChange: (value) => {
      updateToggleEntity(draft, value, reconciled.options);
      onChange?.({ rerender: true });
    },
  });

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || t("widgets.config.placeholderRoom", "Living room");
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", (event) => {
    updateToggleConfigLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const suggestedIcon = resolveWidgetIconName({
    explicitIcon: "auto",
    label: draft.label,
    entityId: draft.entityId,
    domain: getEntityDomain(draft.entityId),
    kind: "toggle",
    fallback: "toggle",
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
    createField(deviceTypeLabel, typeSelect),
    createField(deviceLabel, deviceSelect),
    createField(t("widgets.modesRoutines.displayName", "Display name"), iconNameRow),
  );
  return { fields, canSave: Boolean(reconciled.selected) };
}
