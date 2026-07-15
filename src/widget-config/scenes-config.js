import { filterEntitiesForCurrentUser } from "../admin/entity-permissions.js";
import { getEntityDomain } from "../ha/entity.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { createIconPickerControl, normalizeIconPickerValue } from "./icon-picker.js";
import { createInlineIconNameRow } from "./icon-picker-field.js";
import { getEntityDisplayName, humanizeEntityId } from "./light-options.js";

const SCENES_BUTTON_COUNT = 4;

export const SCENES_BUTTON_TYPES = Object.freeze([
  Object.freeze({ value: "mode", label: "Mode" }),
  Object.freeze({ value: "routine", label: "Routine" }),
]);

const SCENES_BUTTON_DOMAINS = Object.freeze({
  mode: Object.freeze(["scene"]),
  routine: Object.freeze(["automation", "script"]),
});

function normalizeButtonType(value, entityId = "") {
  if (value === "mode" || value === "routine") return value;
  return getEntityDomain(entityId) === "scene" ? "mode" : "routine";
}

function normalizeButtonIcon(type, value) {
  return normalizeIconPickerValue(value || "auto");
}

function createButtonDraft(button = {}) {
  const entityId = String(button.entityId || button.entity_id || "").trim();
  const label = String(button.label || "").trim();
  const type = normalizeButtonType(button.type, entityId);
  return {
    type,
    entityId,
    label,
    labelCustomized: Boolean(label),
    icon: normalizeButtonIcon(type, button.icon),
  };
}

function ensureButtonCount(buttons = []) {
  const normalized = Array.from({ length: SCENES_BUTTON_COUNT }, (_, index) => (
    createButtonDraft(buttons[index])
  ));
  return normalized;
}

function isSceneRoutineEntityAvailable(entityState) {
  if (!entityState) return false;
  return !["unavailable", "none"].includes(String(entityState.state || "").toLowerCase());
}

function getSceneRoutineOptions(hass, type, visibilityConfig) {
  const allowedDomains = SCENES_BUTTON_DOMAINS[normalizeButtonType(type)];
  const options = Object.entries(hass?.states || {})
    .filter(([entityId, entityState]) => (
      allowedDomains.includes(getEntityDomain(entityId))
      && isSceneRoutineEntityAvailable(entityState)
    ))
    .map(([entityId, entityState]) => ({
      value: entityId,
      label: getEntityDisplayName(entityState, entityId),
      entityState,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
  return filterEntitiesForCurrentUser(hass, options, visibilityConfig);
}

function createMissingOption(entityId) {
  const normalizedEntityId = String(entityId || "").trim();
  if (!normalizedEntityId) return null;
  return {
    value: normalizedEntityId,
    label: `${humanizeEntityId(normalizedEntityId)} (missing)`,
    entityState: null,
    missing: true,
  };
}

function reconcileButtonDraft(button, hass, visibilityConfig) {
  button.type = normalizeButtonType(button.type, button.entityId);
  button.icon = normalizeButtonIcon(button.type, button.icon);
  const options = getSceneRoutineOptions(hass, button.type, visibilityConfig);
  const selected = options.find(option => option.value === button.entityId) || null;
  const resolvedOptions = selected || !button.entityId
    ? options
    : [createMissingOption(button.entityId), ...options];
  const resolvedSelection = selected || resolvedOptions.find(option => option?.value === button.entityId) || null;
  if (!button.labelCustomized) {
    button.label = resolvedSelection?.label?.replace(/\s+\(missing\)$/u, "") || "";
  }
  return {
    draft: button,
    options: resolvedOptions.filter(Boolean),
    selected: resolvedSelection,
  };
}

function normalizeScenesDraft(draft = {}) {
  draft.buttons = ensureButtonCount(draft.buttons);
  return draft;
}

export function createScenesConfigDraft(widget = {}, hass, visibilityConfig) {
  const draft = {
    buttons: Array.isArray(widget.buttons) ? widget.buttons : [],
  };
  normalizeScenesDraft(draft);
  return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
}

export function reconcileScenesConfigDraft(draft, hass, visibilityConfig) {
  const normalized = normalizeScenesDraft(draft);
  return {
    draft: normalized,
    buttons: normalized.buttons.map(button => reconcileButtonDraft(button, hass, visibilityConfig)),
  };
}

export function updateScenesButtonType(draft, index, type, hass, visibilityConfig) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
  button.type = normalizeButtonType(type, "");
  button.entityId = "";
  button.icon = normalizeButtonIcon(button.type, "");
  if (!button.labelCustomized) button.label = "";
  return reconcileScenesConfigDraft(draft, hass, visibilityConfig);
}

export function updateScenesButtonEntity(draft, index, entityId, options = []) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return draft;
  button.entityId = String(entityId || "").trim();
  const selected = options.find(option => option.value === button.entityId) || null;
  button.type = normalizeButtonType(button.type, button.entityId);
  button.icon = normalizeButtonIcon(button.type, button.icon);
  if (!button.labelCustomized) {
    button.label = selected?.label?.replace(/\s+\(missing\)$/u, "") || "";
  }
  return draft;
}

export function updateScenesButtonLabel(draft, index, label) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return draft;
  button.label = String(label || "");
  button.labelCustomized = true;
  return draft;
}

export function updateScenesButtonIcon(draft, index, icon) {
  draft.buttons = ensureButtonCount(draft.buttons);
  const button = draft.buttons[index];
  if (!button) return draft;
  button.icon = normalizeButtonIcon(button.type, icon);
  return draft;
}

export function buildScenesWidgetConfig(widget, draft, hass, visibilityConfig) {
  const reconciled = reconcileScenesConfigDraft(draft, hass, visibilityConfig);
  return {
    ...widget,
    kind: "scenes",
    buttons: reconciled.draft.buttons.map((button, index) => {
      const selection = reconciled.buttons[index];
      const fallbackLabel = selection?.selected?.label?.replace(/\s+\(missing\)$/u, "") || "";
      return {
        type: normalizeButtonType(button.type, button.entityId),
        entityId: String(button.entityId || "").trim(),
        label: String(button.label || fallbackLabel).trim(),
        icon: normalizeButtonIcon(button.type, button.icon),
      };
    }),
  };
}

export function getScenesConfigTitle(session, { t } = {}) {
  return Number.isInteger(session?.buttonIndex)
    ? t("widgets.config.configureButton", "Configure button")
    : t("widgets.config.configureModesRoutines", "Configure Modes & Routines");
}

export function getScenesConfigHint(session, { t } = {}) {
  return Number.isInteger(session?.buttonIndex)
    ? t("widgets.config.scenesButtonHint", "Configure only this button with a Mode or Routine.")
    : t("widgets.config.scenesHint", "Configure the 4 internal shortcuts with Modes or Routines.");
}

export function renderScenesConfigFields(session, hass, visibilityConfig, onChange, helpers) {
  const { createField, createSelectControl, t } = helpers;
  const emptySlotLabel = t("widgets.modesRoutines.add", "Add");
  const reconciled = reconcileScenesConfigDraft(session.draft, hass, visibilityConfig);
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";
  fields.dataset.configType = "scenes";
  const focusedButtonIndex = Number.isInteger(session?.buttonIndex)
    ? Math.max(0, Math.min(session.buttonIndex, reconciled.buttons.length - 1))
    : null;
  const buttonEntries = focusedButtonIndex === null
    ? reconciled.buttons.map((entry, index) => [entry, index])
    : [[reconciled.buttons[focusedButtonIndex], focusedButtonIndex]];

  buttonEntries.forEach(([{ draft, options, selected }, index]) => {
    const group = document.createElement("section");
    group.className = "mha-widget-config-group";

    const heading = document.createElement("h3");
    heading.className = "mha-widget-config-group-title";
    heading.textContent = t("widgets.config.buttonIndex", "Button {count}", { count: index + 1 });
    group.append(heading);

    const typeLabel = "Type";
    const typeSelect = createSelectControl({
      label: typeLabel,
      value: draft.type,
      options: SCENES_BUTTON_TYPES.map(type => ({
        value: type.value,
        label: type.value === "mode"
          ? t("widgets.modesRoutines.mode", type.label)
          : t("widgets.modesRoutines.routine", type.label),
      })),
      onChange: (value) => {
        updateScenesButtonType(reconciled.draft, index, value, hass, visibilityConfig);
        onChange?.({ rerender: true });
      },
    });

    const entityLabel = t("widgets.modesRoutines.modeOrRoutine", "Mode or routine");
    const emptyEntityLabel = draft.type === "mode"
      ? t("widgets.config.noModeSelected", "No Mode selected")
      : t("widgets.config.noRoutineSelected", "No Routine selected");
    const entitySelect = createSelectControl({
      label: entityLabel,
      value: draft.entityId,
      options: [{ value: "", label: emptyEntityLabel }, ...options],
      onChange: (value) => {
        updateScenesButtonEntity(reconciled.draft, index, value, options);
        onChange?.({ rerender: true });
      },
    });

    const nameInput = document.createElement("input");
    nameInput.className = "mha-widget-config-control";
    nameInput.type = "text";
    nameInput.value = draft.label;
    nameInput.placeholder = selected?.label?.replace(/\s+\(missing\)$/u, "") || emptySlotLabel;
    nameInput.autocomplete = "off";
    nameInput.addEventListener("input", (event) => {
      updateScenesButtonLabel(reconciled.draft, index, event.currentTarget.value);
      onChange?.();
    });

    const suggestedIcon = resolveWidgetIconName({
      explicitIcon: "auto",
      label: draft.label,
      entityId: draft.entityId,
      domain: getEntityDomain(draft.entityId),
      kind: draft.type === "mode" ? "scene" : "routine",
      fallback: draft.type === "mode" ? "home" : "play",
    });
    const iconPicker = createIconPickerControl({
      value: draft.icon,
      suggestedIcon,
      searchPlaceholder: t("widgets.config.searchIcon", "Search icons"),
      emptyLabel: t("widgets.config.noIconFound", "No icons found"),
      onChange: (value) => {
        updateScenesButtonIcon(reconciled.draft, index, value);
        onChange?.();
      },
      t,
    });
    const iconNameRow = createInlineIconNameRow(nameInput, iconPicker);

    group.append(
      createField(typeLabel, typeSelect),
      createField(entityLabel, entitySelect),
      createField(t("widgets.modesRoutines.displayName", "Display name"), iconNameRow),
    );
    fields.append(group);
  });

  return {
    fields,
    canSave: true,
  };
}
