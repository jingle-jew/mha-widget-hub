import { createCloseButton } from "../system/system-buttons.js";
import {
  buildToggleSliderWidgetConfig,
  createToggleSliderConfigDraft,
  reconcileToggleSliderConfigDraft,
  updateToggleSliderLabel,
  updateToggleSliderLight,
} from "./toggle-slider-config.js";
import {
  buildSliderWidgetConfig,
  createSliderConfigDraft,
  reconcileSliderConfigDraft,
  SLIDER_ACTIONS,
  updateSliderAction,
  updateSliderEntity,
  updateSliderLabel,
} from "./slider-config.js";
import {
  buildToggleWidgetConfig,
  createToggleConfigDraft,
  reconcileToggleConfigDraft,
  TOGGLE_DEVICE_TYPES,
  updateToggleConfigLabel,
  updateToggleDeviceType,
  updateToggleEntity,
} from "./toggle-config.js";
import { getWidgetDefinition } from "../widgets/widget-registry.js";

export function supportsWidgetConfiguration(widget = {}) {
  return Boolean(getWidgetDefinition(widget)?.config);
}

export function createWidgetConfigSession(widget, hass, {
  mode = "create",
  visibilityConfig,
} = {}) {
  const configType = getWidgetDefinition(widget)?.config;
  if (!configType) return null;
  return {
    mode,
    widget,
    configType,
    draft: configType === "slider"
      ? createSliderConfigDraft(widget, hass, visibilityConfig).draft
      : configType === "toggle"
        ? createToggleConfigDraft(widget, hass, visibilityConfig).draft
        : createToggleSliderConfigDraft(widget, hass, visibilityConfig).draft,
  };
}

export function buildConfiguredWidget(session, hass, visibilityConfig) {
  if (!session) return null;
  return session.configType === "slider"
    ? buildSliderWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
    : session.configType === "toggle"
      ? buildToggleWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
      : buildToggleSliderWidgetConfig(session.widget, session.draft, hass, visibilityConfig);
}

function createField(labelText, control, { hint = "" } = {}) {
  const field = document.createElement("label");
  field.className = "mha-widget-config-field";

  const label = document.createElement("span");
  label.className = "mha-widget-config-label";
  label.textContent = labelText;
  field.append(label, control);

  if (hint) {
    const note = document.createElement("small");
    note.className = "mha-widget-config-note";
    note.textContent = hint;
    field.append(note);
  }
  return field;
}

function createToggleSliderFields(session, hass, visibilityConfig, onChange) {
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
  nameInput.placeholder = selected?.label || "Salon";
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", event => {
    updateToggleSliderLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const lightSelect = document.createElement("select");
  lightSelect.className = "mha-widget-config-control";
  lightSelect.disabled = !options.length;
  if (!options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Aucune lumière compatible avec la luminosité trouvée.";
    lightSelect.append(empty);
  } else {
    options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.lightEntityId;
      lightSelect.append(item);
    });
  }
  lightSelect.addEventListener("change", event => {
    updateToggleSliderLight(draft, event.currentTarget.value, options);
    onChange?.({ rerender: true });
  });

  const modeSelect = document.createElement("select");
  modeSelect.className = "mha-widget-config-control";
  const brightness = document.createElement("option");
  brightness.value = "brightness";
  brightness.textContent = "Luminosité";
  modeSelect.append(brightness);
  modeSelect.value = "brightness";

  fields.append(
    createField("Nom affiché", nameInput),
    createField("Lumière", lightSelect),
    createField("Contrôle du curseur", modeSelect),
  );
  return { fields, canSave: Boolean(selected) };
}

function createSliderFields(session, hass, visibilityConfig, onChange) {
  const reconciled = reconcileSliderConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const actionSelect = document.createElement("select");
  actionSelect.className = "mha-widget-config-control";
  SLIDER_ACTIONS.forEach(action => {
    const item = document.createElement("option");
    item.value = action.value;
    item.textContent = action.label;
    item.selected = action.value === draft.sliderAction;
    actionSelect.append(item);
  });
  actionSelect.addEventListener("change", event => {
    updateSliderAction(draft, event.currentTarget.value, hass, visibilityConfig);
    onChange?.({ rerender: true });
  });

  const deviceSelect = document.createElement("select");
  deviceSelect.className = "mha-widget-config-control";
  deviceSelect.disabled = !reconciled.options.length;
  if (!reconciled.options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = reconciled.action.emptyLabel;
    deviceSelect.append(empty);
  } else {
    reconciled.options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      deviceSelect.append(item);
    });
  }
  deviceSelect.addEventListener("change", event => {
    updateSliderEntity(draft, event.currentTarget.value, reconciled.options);
    onChange?.({ rerender: true });
  });

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || "Salon";
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", event => {
    updateSliderLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  fields.append(
    createField("Action", actionSelect),
    createField("Appareil", deviceSelect),
    createField("Nom affiché", nameInput),
  );
  return { fields, canSave: Boolean(reconciled.selected) };
}

function createToggleFields(session, hass, visibilityConfig, onChange) {
  const reconciled = reconcileToggleConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const typeSelect = document.createElement("select");
  typeSelect.className = "mha-widget-config-control";
  TOGGLE_DEVICE_TYPES.forEach(deviceType => {
    const item = document.createElement("option");
    item.value = deviceType.value;
    item.textContent = deviceType.label;
    item.selected = deviceType.value === draft.deviceType;
    typeSelect.append(item);
  });
  typeSelect.addEventListener("change", event => {
    updateToggleDeviceType(draft, event.currentTarget.value, hass, visibilityConfig);
    onChange?.({ rerender: true });
  });

  const deviceSelect = document.createElement("select");
  deviceSelect.className = "mha-widget-config-control";
  deviceSelect.disabled = !reconciled.options.length;
  if (!reconciled.options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = reconciled.deviceType.emptyLabel;
    deviceSelect.append(empty);
  } else {
    reconciled.options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      deviceSelect.append(item);
    });
  }
  deviceSelect.addEventListener("change", event => {
    updateToggleEntity(draft, event.currentTarget.value, reconciled.options);
    onChange?.({ rerender: true });
  });

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || "Salon";
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", event => {
    updateToggleConfigLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  fields.append(
    createField("Type d’appareil", typeSelect),
    createField("Appareil", deviceSelect),
    createField("Nom affiché", nameInput),
  );
  return { fields, canSave: Boolean(reconciled.selected) };
}

export function createWidgetConfigPopup({
  session,
  hass,
  visibilityConfig,
  onCancel,
  onSave,
  onChange,
} = {}) {
  const panel = document.createElement("section");
  panel.className = "mha-widget-config-popup mha-page-creator";
  panel.dataset.open = String(Boolean(session));
  panel.setAttribute("aria-hidden", String(!session));

  const scrim = document.createElement("button");
  scrim.className = "mha-widget-config-scrim mha-page-creator-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer la configuration");
  scrim.onclick = () => onCancel?.();

  const sheet = document.createElement("div");
  sheet.className = "mha-widget-config-sheet mha-page-creator-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Configurer le widget");

  const header = document.createElement("div");
  header.className = "mha-widget-config-header mha-page-creator-header";
  const title = document.createElement("h2");
  const isSlider = session?.configType === "slider";
  const isToggle = session?.configType === "toggle";
  title.textContent = isSlider
    ? "Configurer le slider"
    : isToggle
      ? "Configurer le toggle"
      : "Configurer la lumière";
  header.append(title, createCloseButton({
    label: "Fermer",
    className: "mha-widget-config-close mha-page-creator-close",
    onClick: () => onCancel?.(),
  }));

  const hint = document.createElement("p");
  hint.className = "mha-widget-config-hint mha-page-creator-hint";
  hint.textContent = isSlider
    ? "Choisis l’action, l’appareil et le nom à afficher."
    : isToggle
      ? "Choisis le type d’appareil, l’entité et le nom à afficher."
      : "Choisis la lumière et le contrôle à afficher.";

  const content = session
    ? isSlider
      ? createSliderFields(session, hass, visibilityConfig, onChange)
      : isToggle
        ? createToggleFields(session, hass, visibilityConfig, onChange)
        : createToggleSliderFields(session, hass, visibilityConfig, onChange)
    : { fields: document.createElement("div"), canSave: false };

  const actions = document.createElement("div");
  actions.className = "mha-widget-config-actions mha-page-creator-actions";
  const cancel = document.createElement("button");
  cancel.className = "mha-widget-config-secondary mha-page-creator-secondary";
  cancel.type = "button";
  cancel.textContent = "Annuler";
  cancel.onclick = () => onCancel?.();
  const save = document.createElement("button");
  save.className = "mha-widget-config-primary mha-page-creator-primary";
  save.type = "button";
  save.textContent = session?.mode === "edit" ? "Enregistrer" : "Continuer";
  save.disabled = !content.canSave;
  save.onclick = () => onSave?.();
  actions.append(cancel, save);

  sheet.append(header, hint, content.fields, actions);
  panel.append(scrim, sheet);
  return panel;
}
