import { createCloseButton } from "../system/system-buttons.js";
import {
  reconcileToggleSliderConfigDraft,
  updateToggleSliderLabel,
  updateToggleSliderLight,
} from "./toggle-slider-config.js";
import {
  reconcileSliderConfigDraft,
  SLIDER_ACTIONS,
  updateSliderAction,
  updateSliderEntity,
  updateSliderLabel,
} from "./slider-config.js";
import {
  reconcileToggleConfigDraft,
  TOGGLE_DEVICE_TYPES,
  updateToggleConfigLabel,
  updateToggleDeviceType,
  updateToggleEntity,
} from "./toggle-config.js";
import {
  BUTTON_TYPES,
  reconcileButtonConfigDraft,
  updateButtonEntity,
  updateButtonLabel,
  updateButtonType,
} from "./button-config.js";
import {
  reconcileWeatherConfigDraft,
  WEATHER_FORECAST_OPTIONS,
  updateWeatherEntity,
  updateWeatherForecastType,
} from "./weather-config.js";
import {
  reconcileMediaConfigDraft,
  updateMediaEntity,
  updateMediaLabel,
} from "./media-config.js";
import {
  SCENES_BUTTON_TYPES,
  reconcileScenesConfigDraft,
  updateScenesButtonEntity,
  updateScenesButtonLabel,
  updateScenesButtonType,
} from "./scenes-config.js";
import {
  getWidgetConfigDefinition,
  getWidgetConfigType,
} from "./widget-config-registry.js";

export function supportsWidgetConfiguration(widget = {}) {
  return Boolean(getWidgetConfigType(widget));
}

export function createWidgetConfigSession(widget, hass, {
  mode = "create",
  visibilityConfig,
  ...sessionMetadata
} = {}) {
  const configType = getWidgetConfigType(widget);
  const configDefinition = getWidgetConfigDefinition(configType);
  if (!configDefinition) return null;
  return {
    mode,
    widget,
    configType,
    ...sessionMetadata,
    draft: configDefinition.createDraft(widget, hass, visibilityConfig).draft,
  };
}

export function buildConfiguredWidget(session, hass, visibilityConfig) {
  if (!session) return null;
  const configDefinition = getWidgetConfigDefinition(session.configType);
  return configDefinition?.build(session.widget, session.draft, hass, visibilityConfig) || null;
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

  const forecastSelect = document.createElement("select");
  forecastSelect.className = "mha-widget-config-control";
  WEATHER_FORECAST_OPTIONS.forEach(option => {
    const item = document.createElement("option");
    item.value = option.value;
    item.textContent = option.label;
    item.selected = option.value === draft.forecastType;
    forecastSelect.append(item);
  });
  forecastSelect.addEventListener("change", event => {
    updateWeatherForecastType(draft, event.currentTarget.value);
    onChange?.();
  });

  fields.append(
    createField("Entité météo", select),
    createField("Prévisions", forecastSelect),
  );
  return { fields, canSave: Boolean(selected) };
}

function createMediaFields(session, hass, visibilityConfig, onChange) {
  const reconciled = reconcileMediaConfigDraft(session.draft, hass, visibilityConfig);
  const { draft } = reconciled;
  const fields = document.createElement("div");
  fields.className = "mha-widget-config-fields";

  const nameInput = document.createElement("input");
  nameInput.className = "mha-widget-config-control";
  nameInput.type = "text";
  nameInput.value = draft.label;
  nameInput.placeholder = reconciled.selected?.label || "Salon";
  nameInput.autocomplete = "off";
  nameInput.addEventListener("input", event => {
    updateMediaLabel(draft, event.currentTarget.value);
    onChange?.();
  });

  const mediaSelect = document.createElement("select");
  mediaSelect.className = "mha-widget-config-control";
  mediaSelect.disabled = !reconciled.options.length;
  if (!reconciled.options.length) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Aucun lecteur média autorisé et disponible.";
    mediaSelect.append(empty);
  } else {
    reconciled.options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.mediaEntityId;
      mediaSelect.append(item);
    });
  }
  mediaSelect.addEventListener("change", event => {
    updateMediaEntity(draft, event.currentTarget.value, reconciled.options);
    onChange?.({ rerender: true });
  });

  fields.append(
    createField("Nom affiché", nameInput),
    createField("Lecteur média", mediaSelect),
  );

  return { fields, canSave: Boolean(reconciled.selected) };
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

function createScenesFields(session, hass, visibilityConfig, onChange) {
  const emptySlotLabel = "Ajouter";
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
    heading.textContent = `Bouton ${index + 1}`;
    group.append(heading);

    const typeSelect = document.createElement("select");
    typeSelect.className = "mha-widget-config-control";
    SCENES_BUTTON_TYPES.forEach(type => {
      const item = document.createElement("option");
      item.value = type.value;
      item.textContent = type.label;
      item.selected = type.value === draft.type;
      typeSelect.append(item);
    });
    typeSelect.addEventListener("change", event => {
      updateScenesButtonType(reconciled.draft, index, event.currentTarget.value, hass, visibilityConfig);
      onChange?.({ rerender: true });
    });

    const entitySelect = document.createElement("select");
    entitySelect.className = "mha-widget-config-control";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = draft.type === "mode"
      ? "Aucun Mode sélectionné"
      : "Aucune Routine sélectionnée";
    empty.selected = !draft.entityId;
    entitySelect.append(empty);
    options.forEach(option => {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === draft.entityId;
      entitySelect.append(item);
    });
    entitySelect.addEventListener("change", event => {
      updateScenesButtonEntity(reconciled.draft, index, event.currentTarget.value, options);
      onChange?.({ rerender: true });
    });

    const nameInput = document.createElement("input");
    nameInput.className = "mha-widget-config-control";
    nameInput.type = "text";
    nameInput.value = draft.label;
    nameInput.placeholder = selected?.label?.replace(/\s+\(introuvable\)$/u, "") || emptySlotLabel;
    nameInput.autocomplete = "off";
    nameInput.addEventListener("input", event => {
      updateScenesButtonLabel(reconciled.draft, index, event.currentTarget.value);
      onChange?.();
    });

    group.append(
      createField("Type", typeSelect),
      createField("Mode ou routine", entitySelect),
      createField("Nom affiché", nameInput),
    );
    fields.append(group);
  });

  return {
    fields,
    canSave: true,
  };
}

const WIDGET_CONFIG_FIELD_RENDERERS = Object.freeze({
  slider: createSliderFields,
  toggle: createToggleFields,
  "toggle-slider": createToggleSliderFields,
});

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
  const isMedia = session?.configType === "media";
  const isScenes = session?.configType === "scenes";
  const isScenesButton = isScenes && Number.isInteger(session?.buttonIndex);
  title.textContent = isSlider
    ? "Configurer le slider"
    : isToggle
      ? "Configurer le toggle"
      : isButton
        ? "Configurer le bouton"
        : isWeather
          ? "Configurer la météo"
          : isMedia
            ? "Configurer le média"
            : isScenes
              ? isScenesButton
                ? "Configurer le bouton"
                : "Configurer les modes & routines"
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
          : isMedia
            ? "Choisis le lecteur média et le nom à afficher."
            : isScenes
              ? isScenesButton
                ? "Configure uniquement ce bouton avec un Mode ou une Routine."
                : "Configure les 4 raccourcis internes avec des Modes ou des Routines."
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
            : isMedia
              ? createMediaFields(session, hass, visibilityConfig, onChange)
              : isScenes
                ? createScenesFields(session, hass, visibilityConfig, onChange)
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
