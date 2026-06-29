import { getEntityDomain } from "../ha/entity.js";
import { getEntityOptionsByDomain } from "./light-options.js";

export const BUTTON_TYPES = Object.freeze([
  Object.freeze({ value: "light", label: "Light" }),
  Object.freeze({ value: "switch", label: "Switch" }),
  Object.freeze({ value: "input_boolean", label: "Boolean" }),
  Object.freeze({ value: "button", label: "Button HA" }),
  Object.freeze({ value: "action", label: "Custom action" }),
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
  const legacyIcon = String(widget.icon || "").trim() === "home"
    && ["", "home"].includes(String(widget.iconCategory || "").trim().toLowerCase());
  const resolvedIcon = legacyIcon
    ? "auto"
    : String(widget.icon || "").trim();
  if (buttonType.value === "action") {
    return {
      ...widget,
      kind: "button",
      buttonType: "action",
      entityId: "",
      label: String(draft.label || "Action").trim(),
      ...(resolvedIcon ? { icon: resolvedIcon } : {}),
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
    ...(resolvedIcon ? { icon: resolvedIcon } : {}),
  };
}

export function renderButtonConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, configOptionLabel, t } = helpers;
  const reconciled = reconcileButtonConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const typeSelect = document.createElement("select");
  typeSelect.className = "mha-widget-config-control";
  BUTTON_TYPES.forEach((type) => {
    const item = document.createElement("option");
    item.value = type.value;
    item.textContent = configOptionLabel("widgets.config.buttonTypes", type);
    item.selected = type.value === draft.buttonType;
    typeSelect.append(item);
  });
  typeSelect.addEventListener("change", (event) => {
    updateButtonType(draft, event.currentTarget.value, hass, visibilityConfig);
    onChange?.({ rerender: true });
  });
  fields.append(createField(t("widgets.config.actionType", "Action type"), typeSelect));

  if (draft.buttonType === "action") {
    const domain = document.createElement("input");
    domain.className = "mha-widget-config-control";
    domain.value = draft.actionDomain;
    domain.placeholder = "script";
    domain.addEventListener("input", (event) => {
      draft.actionDomain = event.currentTarget.value;
      onChange?.();
    });

    const service = document.createElement("input");
    service.className = "mha-widget-config-control";
    service.value = draft.actionService;
    service.placeholder = "turn_on";
    service.addEventListener("input", (event) => {
      draft.actionService = event.currentTarget.value;
      onChange?.();
    });

    const data = document.createElement("textarea");
    data.className = "mha-widget-config-control";
    data.rows = 4;
    data.value = Object.keys(draft.actionData || {}).length
      ? JSON.stringify(draft.actionData, null, 2)
      : "";
    data.placeholder = '{\n  "entity_id": "scene.movie_night"\n}';
    data.addEventListener("input", (event) => {
      const value = event.currentTarget.value.trim();
      try {
        draft.actionData = value ? JSON.parse(value) : {};
        draft.actionDataValid = Boolean(
          draft.actionData
          && typeof draft.actionData === "object"
          && !Array.isArray(draft.actionData),
        );
      } catch {
        draft.actionDataValid = false;
      }
      onChange?.();
    });

    fields.append(
      createField(t("widgets.config.haDomain", "HA domain"), domain),
      createField(t("widgets.config.haService", "HA service"), service),
      createField(t("widgets.config.jsonData", "JSON data"), data, {
        hint: t("widgets.config.jsonDataHint", "entity_id values are subject to MHA Admin permissions."),
      }),
    );
  } else {
    const entitySelect = document.createElement("select");
    entitySelect.className = "mha-widget-config-control";
    entitySelect.disabled = !reconciled.options.length;
    if (!reconciled.options.length) {
      const empty = document.createElement("option");
      empty.textContent = t("widgets.config.noEntity", "No authorized and available entity.");
      entitySelect.append(empty);
    } else {
      reconciled.options.forEach((option) => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        item.selected = option.value === draft.entityId;
        entitySelect.append(item);
      });
    }
    entitySelect.addEventListener("change", (event) => {
      updateButtonEntity(draft, event.currentTarget.value, reconciled.options);
      onChange?.({ rerender: true });
    });
    fields.append(createField(t("widgets.config.entity", "Entity"), entitySelect));
  }

  const label = document.createElement("input");
  label.className = "mha-widget-config-control";
  label.value = draft.label;
  label.placeholder = reconciled.selected?.label || t("common.action", "Action");
  label.addEventListener("input", (event) => {
    updateButtonLabel(draft, event.currentTarget.value);
    onChange?.();
  });
  fields.append(createField(t("widgets.modesRoutines.displayName", "Display name"), label));

  const isValid = () => (draft.buttonType === "action"
    ? Boolean(draft.actionDomain.trim() && draft.actionService.trim() && draft.actionDataValid)
    : Boolean(reconciled.selected));

  return {
    fields,
    canSave: isValid(),
    isValid,
  };
}
