import { hexToRgb, hsvToRgb, rgbToHex, rgbToHsv } from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { createToggle } from "../ui/toggle.js";
import { createIconPickerControl } from "../widget-config/icon-picker.js";
import { cloneLightPopupConfig, normalizeHex } from "./light-popup-config.js";

function getSceneColor(scene) {
  if (scene.type === "rgb") return normalizeHex(scene.color);
  const kelvin = Math.min(6500, Math.max(2000, Number(scene.kelvin) || 2700));
  const ratio = (kelvin - 2000) / 4500;
  return rgbToHex([
    255,
    Math.round(150 + ratio * 105),
    Math.round(95 + ratio * 160),
  ]);
}

function setSceneHsv(scene, hue, saturation) {
  scene.type = "rgb";
  scene.color = rgbToHex(hsvToRgb(hue, saturation, 100));
}

function createSceneCard(scene, index, draft, rerender) {
  const card = document.createElement("article");
  card.className = "mha-light-config-scene-card";

  const header = document.createElement("div");
  header.className = "mha-light-config-scene-header";
  const iconPicker = createIconPickerControl({
    value: scene.icon,
    suggestedIcon: scene.icon || "sparkles",
    searchPlaceholder: t("widgets.config.iconSearch", "Search icons"),
    emptyLabel: t("widgets.config.iconEmpty", "No icons found"),
    t,
    onChange: (nextIcon) => {
      scene.icon = nextIcon === "auto" ? "sparkles" : nextIcon;
    },
  });
  iconPicker.classList.add("mha-widget-icon-picker--inline");
  iconPicker.querySelector(".mha-widget-icon-picker-trigger")?.setAttribute(
    "aria-label",
    t("lightPopup.chooseIcon", "Choose icon"),
  );
  const name = document.createElement("input");
  name.type = "text";
  name.className = "mha-light-config-input mha-light-config-scene-name";
  name.value = scene.name;
  name.setAttribute("aria-label", t("lightPopup.sceneName", "Ambience name"));
  name.oninput = () => { scene.name = name.value; };
  const enabled = createToggle({
    label: `${scene.name}: ${t("lightPopup.enabled", "Enabled")}`,
    checked: scene.enabled,
    onChange: (event) => { scene.enabled = Boolean(event.currentTarget.checked); },
  });
  header.append(iconPicker, name, enabled);

  const colorField = document.createElement("label");
  colorField.className = "mha-light-config-compact-field mha-light-config-color-field";
  const colorLabel = document.createElement("span");
  colorLabel.textContent = t("lightPopup.colorCode", "Color code");
  const colorPicker = document.createElement("input");
  colorPicker.type = "color";
  colorPicker.value = getSceneColor(scene);
  const colorCode = document.createElement("input");
  colorCode.type = "text";
  colorCode.className = "mha-light-config-input";
  colorCode.value = colorPicker.value;
  colorCode.setAttribute("aria-label", t("lightPopup.colorCode", "Color code"));
  colorField.append(colorLabel, colorPicker, colorCode);

  let hsv = rgbToHsv(hexToRgb(colorPicker.value));
  const saturationOutput = document.createElement("output");
  const hueOutput = document.createElement("output");
  const saturation = createSlider({
    label: t("lightPopup.saturation", "Saturation"),
    min: 0,
    max: 100,
    value: hsv.saturation,
    className: "mha-light-config-scene-slider",
    onInput: (event) => {
      hsv.saturation = Number(event.currentTarget.value);
      setSceneHsv(scene, hsv.hue, hsv.saturation);
      colorPicker.value = scene.color;
      colorCode.value = scene.color;
      saturationOutput.textContent = `${Math.round(hsv.saturation)} %`;
    },
  });
  const hue = createSlider({
    label: t("lightPopup.hue", "Hue"),
    min: 0,
    max: 360,
    value: hsv.hue,
    className: "mha-light-config-scene-slider mha-light-hue-slider",
    onInput: (event) => {
      hsv.hue = Number(event.currentTarget.value);
      setSceneHsv(scene, hsv.hue, hsv.saturation);
      colorPicker.value = scene.color;
      colorCode.value = scene.color;
      hueOutput.textContent = `${Math.round(hsv.hue)}°`;
    },
  });

  const syncFromColor = (value) => {
    const color = normalizeHex(value, getSceneColor(scene));
    scene.type = "rgb";
    scene.color = color;
    colorPicker.value = color;
    colorCode.value = color;
    hsv = rgbToHsv(hexToRgb(color));
    saturation.__mhaSliderApi?.setValue(hsv.saturation);
    hue.__mhaSliderApi?.setValue(hsv.hue);
    saturationOutput.textContent = `${hsv.saturation} %`;
    hueOutput.textContent = `${hsv.hue}°`;
  };
  colorPicker.oninput = () => syncFromColor(colorPicker.value);
  colorCode.onchange = () => syncFromColor(colorCode.value);

  const saturationField = document.createElement("label");
  saturationField.className = "mha-light-config-slider-field";
  saturationField.append(
    Object.assign(document.createElement("span"), { textContent: t("lightPopup.saturation", "Saturation") }),
    saturationOutput,
    saturation,
  );
  const hueField = document.createElement("label");
  hueField.className = "mha-light-config-slider-field";
  hueField.append(
    Object.assign(document.createElement("span"), { textContent: t("lightPopup.hue", "Hue") }),
    hueOutput,
    hue,
  );
  saturationOutput.textContent = `${hsv.saturation} %`;
  hueOutput.textContent = `${hsv.hue}°`;

  const details = document.createElement("div");
  details.className = "mha-light-config-scene-details";
  details.append(colorField, saturationField, hueField);

  const order = document.createElement("div");
  order.className = "mha-light-config-order";
  [
    ["arrow-up", -1, index === 0],
    ["arrow-down", 1, index === draft.scenes.length - 1],
  ].forEach(([iconName, direction, disabled]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = disabled;
    button.setAttribute("aria-label", direction < 0 ? t("common.moveUp", "Move up") : t("common.moveDown", "Move down"));
    button.append(createIconSymbol({ name: iconName }));
    button.onclick = () => {
      const [moved] = draft.scenes.splice(index, 1);
      draft.scenes.splice(index + direction, 0, moved);
      rerender();
    };
    order.append(button);
  });

  card.append(header, details, order);
  return card;
}

function createAppearance(draft) {
  const section = document.createElement("section");
  section.className = "mha-light-config-column mha-light-config-appearance";
  const title = document.createElement("h3");
  title.textContent = t("settings.appearance", "Appearance");
  const orientationLabel = document.createElement("p");
  orientationLabel.textContent = t("lightPopup.quickControlsAlignment", "Quick controls alignment");
  const choices = document.createElement("div");
  choices.className = "mha-light-config-orientations";
  [
    ["vertical", "layout-rows", "lightPopup.vertical", "Vertical"],
    ["horizontal", "layout-columns", "lightPopup.horizontal", "Horizontal"],
  ].forEach(([value, iconName, key, fallback]) => {
    const choice = document.createElement("button");
    choice.type = "button";
    choice.dataset.selected = String(draft.orientation === value);
    choice.append(createIconSymbol({ name: iconName }), document.createTextNode(t(key, fallback)));
    choice.onclick = () => {
      draft.orientation = value;
      choices.querySelectorAll("button").forEach((button) => {
        button.dataset.selected = String(button === choice);
      });
    };
    choices.append(choice);
  });

  const tintRow = document.createElement("div");
  tintRow.className = "mha-light-config-tint-row";
  const tintLabel = document.createElement("span");
  tintLabel.textContent = t("lightPopup.tintPopup", "Tint the popup with the light color");
  const tint = createToggle({
    label: tintLabel.textContent,
    checked: draft.tintPopup,
    onChange: (event) => { draft.tintPopup = Boolean(event.currentTarget.checked); },
  });
  tintRow.append(tintLabel, tint);
  section.append(title, orientationLabel, choices, tintRow);
  return section;
}

export function createLightPopupConfigView({ config, onSave, onCancel } = {}) {
  const draft = cloneLightPopupConfig(config);
  const root = document.createElement("div");
  root.className = "mha-light-popup-config-view";
  root.dataset.view = "config";

  const columns = document.createElement("div");
  columns.className = "mha-light-config-columns";
  const scenesColumn = document.createElement("section");
  scenesColumn.className = "mha-light-config-column mha-light-config-presets";
  const scenesTitle = document.createElement("h3");
  scenesTitle.textContent = t("lightPopup.ambiencePresets", "Ambience presets");
  const scenes = document.createElement("div");
  scenes.className = "mha-light-config-scenes";
  scenesColumn.append(scenesTitle, scenes);

  const renderScenes = () => {
    const pages = [];
    for (let index = 0; index < draft.scenes.length; index += 2) {
      const page = document.createElement("div");
      page.className = "mha-light-config-scene-page";
      page.append(...draft.scenes.slice(index, index + 2).map((scene, offset) => (
        createSceneCard(scene, index + offset, draft, renderScenes)
      )));
      pages.push(page);
    }
    scenes.replaceChildren(...pages);
  };

  columns.append(scenesColumn, createAppearance(draft));
  const actions = document.createElement("div");
  actions.className = "mha-light-config-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mha-light-config-cancel";
  cancel.textContent = t("common.cancel", "Cancel");
  cancel.onclick = () => onCancel?.();
  const save = document.createElement("button");
  save.type = "button";
  save.className = "mha-light-config-save";
  save.append(
    createIconSymbol({ name: "back" }),
    document.createTextNode(t("lightPopup.saveAndReturn", "Save and return to light")),
  );
  save.onclick = () => onSave?.(cloneLightPopupConfig(draft));
  actions.append(cancel, save);
  root.append(columns, actions);
  renderScenes();
  return root;
}
