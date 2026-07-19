import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { createToggle } from "../ui/toggle.js";
import { cloneLightPopupConfig, normalizeHex } from "./light-popup-config.js";

const TABS = Object.freeze([
  ["whites", "lightPopup.whites", "Whites"],
  ["scenes", "lightPopup.scenes", "Ambiences"],
  ["colors", "lightPopup.colors", "Colors"],
  ["display", "lightPopup.display", "Display"],
]);

function removeButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-light-config-remove";
  button.setAttribute("aria-label", label);
  button.textContent = "×";
  button.onclick = onClick;
  return button;
}

function createWhitesPanel(draft, rerender) {
  const panel = document.createElement("div");
  panel.className = "mha-light-config-tab-panel";
  const note = document.createElement("p");
  note.textContent = t("lightPopup.whiteHint", "Suggested temperatures (up to 4)");
  const chips = document.createElement("div");
  chips.className = "mha-light-config-chips";
  draft.whites.forEach((kelvin, index) => {
    const chip = document.createElement("span");
    chip.className = "mha-light-config-chip";
    chip.append(document.createTextNode(`${kelvin} K`), removeButton(
      t("lightPopup.removeWhite", "Remove white preset"),
      () => {
        draft.whites.splice(index, 1);
        rerender();
      },
    ));
    chips.append(chip);
  });

  const add = document.createElement("div");
  add.className = "mha-light-config-add-row";
  const input = document.createElement("input");
  input.type = "number";
  input.min = "1500";
  input.max = "9000";
  input.step = "100";
  input.value = "3000";
  input.className = "mha-light-config-input";
  input.setAttribute("aria-label", t("lightPopup.temperature", "Color temperature"));
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-light-config-add";
  button.textContent = "+";
  button.disabled = draft.whites.length >= 4;
  button.setAttribute("aria-label", t("common.add", "Add"));
  button.onclick = () => {
    const value = Math.round(Math.min(9000, Math.max(1500, Number(input.value) || 3000)));
    if (draft.whites.length >= 4 || draft.whites.includes(value)) return;
    draft.whites.push(value);
    draft.whites.sort((a, b) => a - b);
    rerender();
  };
  add.append(input, button);
  panel.append(note, chips, add);
  return panel;
}

function sceneTypeValue(scene) {
  return scene.type === "rgb" ? scene.color : `${scene.kelvin} K`;
}

function createScenesPanel(draft, rerender) {
  const panel = document.createElement("div");
  panel.className = "mha-light-config-tab-panel";
  const table = document.createElement("div");
  table.className = "mha-light-config-scenes";
  table.setAttribute("role", "table");

  draft.scenes.forEach((scene, index) => {
    const row = document.createElement("div");
    row.className = "mha-light-config-scene-row";
    row.setAttribute("role", "row");
    const icon = createIconSymbol({ name: scene.icon, className: "mha-light-config-scene-icon" });
    const name = document.createElement("input");
    name.type = "text";
    name.className = "mha-light-config-input mha-light-config-scene-name";
    name.value = scene.name;
    name.setAttribute("aria-label", t("lightPopup.sceneName", "Ambience name"));
    name.oninput = () => { scene.name = name.value; };
    const value = document.createElement("span");
    value.className = "mha-light-config-scene-value";
    value.textContent = sceneTypeValue(scene);
    if (scene.type === "rgb") value.style.setProperty("--mha-light-scene-color", scene.color);

    const brightness = createSlider({
      min: 1,
      max: 100,
      value: scene.brightness,
      className: "mha-light-config-scene-slider",
      onInput: (event) => {
        scene.brightness = Math.round(Number(event.currentTarget.value));
        output.textContent = `${scene.brightness} %`;
      },
    });
    const output = document.createElement("output");
    output.textContent = `${scene.brightness} %`;
    const enabled = createToggle({
      label: `${scene.name}: ${t("lightPopup.enabled", "Enabled")}`,
      checked: scene.enabled,
      onChange: (event) => { scene.enabled = Boolean(event.currentTarget.checked); },
    });
    const order = document.createElement("div");
    order.className = "mha-light-config-order";
    [
      ["↑", -1, index === 0],
      ["↓", 1, index === draft.scenes.length - 1],
    ].forEach(([glyph, direction, disabled]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = glyph;
      button.disabled = disabled;
      button.setAttribute("aria-label", direction < 0 ? t("common.moveUp", "Move up") : t("common.moveDown", "Move down"));
      button.onclick = () => {
        const [moved] = draft.scenes.splice(index, 1);
        draft.scenes.splice(index + direction, 0, moved);
        rerender();
      };
      order.append(button);
    });
    row.append(icon, name, value, brightness, output, enabled, order);
    table.append(row);
  });
  panel.append(table);
  return panel;
}

function createColorsPanel(draft, rerender) {
  const panel = document.createElement("div");
  panel.className = "mha-light-config-tab-panel";
  const colors = document.createElement("div");
  colors.className = "mha-light-config-colors";
  draft.colors.forEach((color, index) => {
    const chip = document.createElement("span");
    chip.className = "mha-light-config-color-chip";
    chip.style.setProperty("--mha-light-config-color", color);
    chip.append(removeButton(t("lightPopup.removeColor", "Remove color"), () => {
      draft.colors.splice(index, 1);
      rerender();
    }));
    colors.append(chip);
  });
  const add = document.createElement("label");
  add.className = "mha-light-config-color-add";
  add.textContent = t("lightPopup.addColor", "Add a color");
  const input = document.createElement("input");
  input.type = "color";
  input.value = "#ff2d55";
  input.onchange = () => {
    const color = normalizeHex(input.value);
    if (!draft.colors.includes(color) && draft.colors.length < 10) draft.colors.push(color);
    rerender();
  };
  add.append(input);
  panel.append(colors, add);
  return panel;
}

function createDisplayPanel(draft) {
  const panel = document.createElement("div");
  panel.className = "mha-light-config-tab-panel";
  const title = document.createElement("p");
  title.textContent = t("lightPopup.orientation", "Control orientation");
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
  panel.append(title, choices);
  return panel;
}

export function createLightPopupConfigView({ config, onSave, onCancel } = {}) {
  const draft = cloneLightPopupConfig(config);
  let activeTab = "whites";
  const root = document.createElement("div");
  root.className = "mha-light-popup-config-view";
  root.dataset.view = "config";
  const tabs = document.createElement("div");
  tabs.className = "mha-light-config-tabs";
  tabs.setAttribute("role", "tablist");
  const content = document.createElement("div");
  content.className = "mha-light-config-content";

  const render = () => {
    tabs.replaceChildren();
    TABS.forEach(([id, key, fallback]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.role = "tab";
      button.dataset.active = String(activeTab === id);
      button.setAttribute("aria-selected", String(activeTab === id));
      button.textContent = t(key, fallback);
      button.onclick = () => {
        activeTab = id;
        render();
      };
      tabs.append(button);
    });
    const panel = activeTab === "scenes" ? createScenesPanel(draft, render)
      : activeTab === "colors" ? createColorsPanel(draft, render)
        : activeTab === "display" ? createDisplayPanel(draft)
          : createWhitesPanel(draft, render);
    content.replaceChildren(panel);
  };

  const actions = document.createElement("div");
  actions.className = "mha-light-config-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mha-button mha-light-config-cancel";
  cancel.textContent = t("common.cancel", "Cancel");
  cancel.onclick = () => onCancel?.();
  const save = document.createElement("button");
  save.type = "button";
  save.className = "mha-button mha-light-config-save";
  save.textContent = t("common.save", "Save");
  save.onclick = () => onSave?.(cloneLightPopupConfig(draft));
  actions.append(cancel, save);
  root.append(tabs, content, actions);
  render();
  return root;
}
