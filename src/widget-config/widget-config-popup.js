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
import {
  buildButtonWidgetConfig,
  BUTTON_TYPES,
  createButtonConfigDraft,
  reconcileButtonConfigDraft,
  updateButtonEntity,
  updateButtonLabel,
  updateButtonType,
} from "./button-config.js";
import {
  buildWeatherWidgetConfig,
  createWeatherConfigDraft,
  reconcileWeatherConfigDraft,
  updateWeatherEntity,
} from "./weather-config.js";
import { getWidgetConfigType } from "../widgets/widget-registry.js";

export function supportsWidgetConfiguration(widget = {}) {
  return Boolean(getWidgetConfigType(widget));
}

export function createWidgetConfigSession(widget, hass, {
  mode = "create",
  visibilityConfig,
} = {}) {
  const configType = getWidgetConfigType(widget);
  if (!configType) return null;
  return {
    mode,
    widget,
    configType,
    draft: configType === "slider"
      ? createSliderConfigDraft(widget, hass, visibilityConfig).draft
      : configType === "toggle"
        ? createToggleConfigDraft(widget, hass, visibilityConfig).draft
        : configType === "button"
          ? createButtonConfigDraft(widget, hass, visibilityConfig).draft
          : configType === "weather"
            ? createWeatherConfigDraft(widget, hass, visibilityConfig).draft
            : createToggleSliderConfigDraft(widget, hass, visibilityConfig).draft,
  };
}

export function buildConfiguredWidget(session, hass, visibilityConfig) {
  if (!session) return null;
  return session.configType === "slider"
    ? buildSliderWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
    : session.configType === "toggle"
      ? buildToggleWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
      : session.configType === "button"
        ? buildButtonWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
        : session.configType === "weather"
          ? buildWeatherWidgetConfig(session.widget, session.draft, hass, visibilityConfig)
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

function createWeatherFields(session, hass, visibilityConfig, onChange) {
  const { draft, options, selected } = reconcileWeatherConfigDraft(
    session.draft,
    hass,
    visibilityConfig,
  );
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";
  const select = document.createElement("select");
  select.className = "mha-widget-config-control";
  select.disabled = !options.length;
  if (!options.length) {
    const empty = document.createElement("option");
    empty.textContent = "Aucune entité météo autorisée et disponible.";
    select.append(empty);
  } else {
    options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      select.append(item);
    });
  }
  select.addEventListener("change", event => {
    updateWeatherEntity(draft, event.currentTarget.value);
    onChange?.({ rerender: true });
  });
  fields.append(createField("Entité météo", select));
  return { fields, canSave: Boolean(selected) };
}

function createButtonFields(session, hass, visibilityConfig, onChange) {
  const reconciled = reconcileButtonConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const typeSelect = document.createElement("select");
  typeSelect.className = "mha-widget-config-control";
  BUTTON_TYPES.forEach(type => {
    const item = document.createElement("option");
    item.value = type.value;
    item.textContent = type.label;
    item.selected = type.value === draft.buttonType;
    typeSelect.append(item);
  });
  typeSelect.addEventListener("change", event => {
    updateButtonType(draft, event.currentTarget.value, hass, visibilityConfig);
    onChange?.({ rerender: true });
  });
  fields.append(createField("Type d’action", typeSelect));

  if (draft.buttonType === "action") {
    const domain = document.createElement("input");
    domain.className = "mha-widget-config-control";
    domain.value = draft.actionDomain;
    domain.placeholder = "script";
    domain.addEventListener("input", event => {
      draft.actionDomain = event.currentTarget.value;
      onChange?.();
    });
    const service = document.createElement("input");
    service.className = "mha-widget-config-control";
    service.value = draft.actionService;
    service.placeholder = "turn_on";
    service.addEventListener("input", event => {
      draft.actionService = event.currentTarget.value;
      onChange?.();
    });
    const data = document.createElement("textarea");
    data.className = "mha-widget-config-control";
    data.rows = 4;
    data.value = Object.keys(draft.actionData || {}).length
      ? JSON.stringify(draft.actionData, null, 2)
      : "";
    data.placeholder = '{\n  "entity_id": "scene.soiree"\n}';
    data.addEventListener("input", event => {
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
      createField("Domaine HA", domain),
      createField("Service HA", service),
      createField("Données JSON", data, {
        hint: "Les entity_id sont soumis aux permissions MHA Admin.",
      }),
    );
  } else {
    const entitySelect = document.createElement("select");
    entitySelect.className = "mha-widget-config-control";
    entitySelect.disabled = !reconciled.options.length;
    if (!reconciled.options.length) {
      const empty = document.createElement("option");
      empty.textContent = "Aucune entité autorisée et disponible.";
      entitySelect.append(empty);
    } else {
      reconciled.options.forEach(option => {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        item.selected = option.value === draft.entityId;
        entitySelect.append(item);
      });
    }
    entitySelect.addEventListener("change", event => {
      updateButtonEntity(draft, event.currentTarget.value, reconciled.options);
      onChange?.({ rerender: true });
    });
    fields.append(createField("Entité", entitySelect));
  }

  const label = document.createElement("input");
  label.className = "mha-widget-config-control";
  label.value = draft.label;
  label.placeholder = reconciled.selected?.label || "Action";
  label.addEventListener("input", event => {
    updateButtonLabel(draft, event.currentTarget.value);
    onChange?.();
  });
  fields.append(createField("Nom affiché", label));

  return {
    fields,
    canSave: draft.buttonType === "action"
      ? Boolean(draft.actionDomain.trim() && draft.actionService.trim() && draft.actionDataValid)
      : Boolean(reconciled.selected),
    isValid: () => draft.buttonType === "action"
      ? Boolean(draft.actionDomain.trim() && draft.actionService.trim() && draft.actionDataValid)
      : Boolean(reconciled.selected),
  };
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
  const isButton = session?.configType === "button";
  const isWeather = session?.configType === "weather";
  title.textContent = isSlider
    ? "Configurer le slider"
    : isToggle
      ? "Configurer le toggle"
      : isButton
        ? "Configurer le bouton"
        : isWeather
          ? "Configurer la météo"
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
      : isButton
        ? "Choisis une entité autorisée ou un service Home Assistant."
        : isWeather
          ? "Choisis l’entité weather autorisée à afficher."
          : "Choisis la lumière et le contrôle à afficher.";

  const content = session
    ? isSlider
      ? createSliderFields(session, hass, visibilityConfig, onChange)
      : isToggle
        ? createToggleFields(session, hass, visibilityConfig, onChange)
        : isButton
          ? createButtonFields(session, hass, visibilityConfig, onChange)
          : isWeather
            ? createWeatherFields(session, hass, visibilityConfig, onChange)
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
  content.fields.addEventListener("input", () => {
    if (content.isValid) save.disabled = !content.isValid();
  });
  save.onclick = () => onSave?.();
  actions.append(cancel, save);

  sheet.append(header, hint, content.fields, actions);
  panel.append(scrim, sheet);
  return panel;
}
