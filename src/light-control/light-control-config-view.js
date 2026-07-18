import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createMhaCheckbox, createMhaRadio } from "../ui/form-controls.js";
import { createIconPickerControl } from "../widget-config/icon-picker.js";
import { normalizeHexColor } from "./light-control-config.js";

function createSectionTitle(text) {
  const title = document.createElement("h3");
  title.className = "mha-light-control-section-title";
  title.textContent = text;
  return title;
}

function createField(label, input) {
  const field = document.createElement("label");
  field.className = "mha-light-control-config-field";
  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  field.append(labelNode, input);
  return field;
}

function createNumberInput(value, { min, max, step = 1, label = "" } = {}) {
  const input = document.createElement("input");
  input.className = "mha-light-control-config-input";
  input.type = "number";
  input.value = String(value);
  input.min = String(min);
  input.max = String(max);
  input.step = String(step);
  if (label) input.setAttribute("aria-label", label);
  return input;
}

function createColorInput(value, label) {
  const input = document.createElement("input");
  input.className = "mha-light-control-config-color";
  input.type = "color";
  input.value = normalizeHexColor(value);
  input.setAttribute("aria-label", label);
  return input;
}

function createMoveButton({ label, icon, disabled, onClick }) {
  const button = document.createElement("button");
  button.className = "mha-light-control-config-move";
  button.type = "button";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", label);
  button.append(createIconSymbol({ name: icon }));
  button.addEventListener("click", onClick);
  return button;
}

function createOrientationSection(configDraft) {
  const section = document.createElement("section");
  section.className = "mha-light-control-config-section";
  const choices = document.createElement("div");
  choices.className = "mha-light-control-config-choices";
  [
    ["vertical", t("lightControl.vertical", "Vertical")],
    ["horizontal", t("lightControl.horizontal", "Horizontal")],
  ].forEach(([value, label]) => {
    choices.append(createMhaRadio({
      name: "mha-light-control-orientation",
      value,
      label,
      checked: configDraft.orientation === value,
      className: "mha-light-control-config-choice",
      onChange: checked => {
        if (checked) configDraft.orientation = value;
      },
    }));
  });
  section.append(
    createSectionTitle(t("lightControl.controlOrientation", "Control orientation")),
    choices,
  );
  return section;
}

function createWhitesSection(configDraft) {
  const section = document.createElement("section");
  section.className = "mha-light-control-config-section";
  const fields = document.createElement("div");
  fields.className = "mha-light-control-config-temperature-grid";
  configDraft.whiteTemperatures.forEach((temperature, index) => {
    const input = createNumberInput(temperature, {
      min: 1500,
      max: 9000,
      step: 50,
      label: `${t("lightControl.whitePreset", "White preset")} ${index + 1}`,
    });
    input.addEventListener("input", () => {
      configDraft.whiteTemperatures[index] = Number(input.value);
    });
    fields.append(createField(`${index + 1}`, input));
  });
  section.append(createSectionTitle(t("lightControl.whites", "Whites")), fields);
  return section;
}

function createAmbienceModeChoices(preset) {
  const choices = document.createElement("div");
  choices.className = "mha-light-control-config-mode-choices";
  [
    ["temperature", t("lightControl.temperature", "Temperature")],
    ["color", t("lightControl.color", "Color")],
  ].forEach(([value, label]) => {
    choices.append(createMhaRadio({
      name: `mha-light-control-mode-${preset.id}`,
      value,
      label,
      checked: preset.mode === value,
      className: "mha-light-control-config-choice",
      onChange: checked => {
        if (checked) preset.mode = value;
      },
    }));
  });
  return choices;
}

function createAmbienceCard(configDraft, preset, index, rerender) {
  const displayName = preset.name
    || t(`lightControl.ambienceNames.${preset.id}`, `${t("lightControl.ambience", "Ambience")} ${index + 1}`);
  const card = document.createElement("article");
  card.className = "mha-light-control-config-ambience";

  const cardHeader = document.createElement("div");
  cardHeader.className = "mha-light-control-config-ambience-header";
  const enabled = createMhaCheckbox({
    label: displayName,
    checked: preset.enabled,
    onChange: checked => { preset.enabled = checked; },
  });
  const reorder = document.createElement("div");
  reorder.className = "mha-light-control-config-reorder";
  reorder.append(
    createMoveButton({
      label: t("widgets.tools.moveUp", "Move up"),
      icon: "arrow-up",
      disabled: index === 0,
      onClick: () => {
        if (index <= 0) return;
        [configDraft.ambiences[index - 1], configDraft.ambiences[index]] = [
          configDraft.ambiences[index],
          configDraft.ambiences[index - 1],
        ];
        rerender();
      },
    }),
    createMoveButton({
      label: t("widgets.tools.moveDown", "Move down"),
      icon: "arrow-down",
      disabled: index === configDraft.ambiences.length - 1,
      onClick: () => {
        if (index >= configDraft.ambiences.length - 1) return;
        [configDraft.ambiences[index + 1], configDraft.ambiences[index]] = [
          configDraft.ambiences[index],
          configDraft.ambiences[index + 1],
        ];
        rerender();
      },
    }),
  );
  cardHeader.append(enabled, reorder);

  const nameInput = document.createElement("input");
  nameInput.className = "mha-light-control-config-input";
  nameInput.type = "text";
  nameInput.maxLength = 32;
  nameInput.value = displayName;
  nameInput.addEventListener("input", () => { preset.name = nameInput.value; });

  const iconPicker = createIconPickerControl({
    value: preset.icon,
    suggestedIcon: preset.icon || "bulb",
    searchPlaceholder: t("widgets.config.searchIcon", "Search icons"),
    emptyLabel: t("widgets.config.noIconFound", "No icons found"),
    onChange: value => { preset.icon = value === "auto" ? "bulb" : value; },
    t,
  });
  iconPicker.classList.add("mha-light-control-config-icon-picker");

  const colorInput = createColorInput(preset.color, t("lightControl.color", "Color"));
  colorInput.addEventListener("input", () => { preset.color = colorInput.value; });
  const temperatureInput = createNumberInput(preset.colorTemperature, {
    min: 1500,
    max: 9000,
    step: 50,
    label: t("lightControl.temperature", "Temperature"),
  });
  temperatureInput.addEventListener("input", () => {
    preset.colorTemperature = Number(temperatureInput.value);
  });
  const brightnessInput = createNumberInput(preset.brightness, {
    min: 1,
    max: 100,
    label: t("lightControl.brightness", "Brightness"),
  });
  brightnessInput.addEventListener("input", () => {
    preset.brightness = Number(brightnessInput.value);
  });

  const values = document.createElement("div");
  values.className = "mha-light-control-config-ambience-values";
  values.append(
    createField(t("lightControl.color", "Color"), colorInput),
    createField(t("lightControl.temperature", "Temperature"), temperatureInput),
    createField(t("lightControl.brightness", "Brightness"), brightnessInput),
  );
  card.append(
    cardHeader,
    createField(t("lightControl.name", "Name"), nameInput),
    createField(t("lightControl.icon", "Icon"), iconPicker),
    createAmbienceModeChoices(preset),
    values,
  );
  return card;
}

function createAmbiencesSection(configDraft, rerender) {
  const section = document.createElement("section");
  section.className = "mha-light-control-config-section";
  const fields = document.createElement("div");
  fields.className = "mha-light-control-config-ambiences";
  configDraft.ambiences.forEach((preset, index) => {
    fields.append(createAmbienceCard(configDraft, preset, index, rerender));
  });
  section.append(createSectionTitle(t("lightControl.ambiences", "Ambiences")), fields);
  return section;
}

function createColorsSection(configDraft) {
  const section = document.createElement("section");
  section.className = "mha-light-control-config-section";
  const colors = document.createElement("div");
  colors.className = "mha-light-control-config-colors";
  configDraft.quickColors.forEach((color, index) => {
    const input = createColorInput(color, `${t("lightControl.quickColor", "Quick color")} ${index + 1}`);
    input.addEventListener("input", () => { configDraft.quickColors[index] = input.value; });
    colors.append(input);
  });
  section.append(createSectionTitle(t("lightControl.colors", "Colors")), colors);
  return section;
}

export function renderLightControlConfigFields(container, configDraft) {
  if (!container || !configDraft) return;
  const rerender = () => renderLightControlConfigFields(container, configDraft);
  container.replaceChildren(
    createOrientationSection(configDraft),
    createWhitesSection(configDraft),
    createAmbiencesSection(configDraft, rerender),
    createColorsSection(configDraft),
  );
}
