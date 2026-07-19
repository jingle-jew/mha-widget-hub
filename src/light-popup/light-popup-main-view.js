import { createLatestValueAction } from "../ha/actions.js";
import {
  applyLightScene,
  getLightCapabilities,
  getLightSnapshot,
  hexToRgb,
  setLightBrightness,
  setLightColor,
  setLightPower,
  setLightTemperature,
} from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { createToggle } from "../ui/toggle.js";

const ACTION_INTERVAL_MS = 80;

function sectionTitle(text) {
  const title = document.createElement("h3");
  title.className = "mha-light-popup-section-title";
  title.textContent = text;
  return title;
}

function icon(name, className = "") {
  return createIconSymbol({ name, className });
}

function presetButton({ label, detail = "", iconName = "", color = "", className = "", onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["mha-light-preset", className].filter(Boolean).join(" ");
  button.setAttribute("aria-label", detail ? `${label}, ${detail}` : label);
  if (color) button.style.setProperty("--mha-light-preset-color", color);
  if (iconName) button.append(icon(iconName, "mha-light-preset-icon"));
  const copy = document.createElement("span");
  copy.className = "mha-light-preset-copy";
  copy.textContent = label;
  button.append(copy);
  if (detail) {
    const meta = document.createElement("small");
    meta.textContent = detail;
    button.append(meta);
  }
  button.onclick = onClick;
  return button;
}

function createControlRow({ title, value, iconName, control, className = "" }) {
  const row = document.createElement("div");
  row.className = ["mha-light-control-row", className].filter(Boolean).join(" ");
  const heading = document.createElement("div");
  heading.className = "mha-light-control-heading";
  const label = document.createElement("span");
  label.append(icon(iconName), document.createTextNode(title));
  const output = document.createElement("output");
  output.textContent = value;
  heading.append(label, output);
  row.append(heading, control);
  return { row, output };
}

function createPager(viewport) {
  const pager = document.createElement("nav");
  pager.className = "mha-light-popup-pager";
  pager.setAttribute("aria-label", t("lightPopup.pages", "Light control pages"));
  [0, 1].forEach((page) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mha-light-popup-page-dot";
    button.dataset.page = String(page);
    button.setAttribute("aria-label", page === 0
      ? t("lightPopup.controls", "Controls")
      : t("lightPopup.presets", "Light presets"));
    button.onclick = () => viewport.children[page]?.scrollIntoView?.({ behavior: "smooth", block: "start" });
    pager.append(button);
  });

  const sync = () => {
    const page = Math.round(viewport.scrollTop / Math.max(1, viewport.clientHeight));
    pager.querySelectorAll("button").forEach((button, index) => {
      button.dataset.active = String(index === page);
      button.setAttribute("aria-current", index === page ? "page" : "false");
    });
  };
  viewport.addEventListener("scroll", sync, { passive: true });
  sync();
  return pager;
}

export function createLightPopupMainView({
  hass,
  entityState,
  config,
  onOpenColor,
} = {}) {
  const context = { hass, entityState };
  const root = document.createElement("div");
  root.className = "mha-light-popup-main-view";
  root.dataset.view = "main";

  const viewport = document.createElement("div");
  viewport.className = "mha-light-popup-main-pages";

  const controls = document.createElement("section");
  controls.className = "mha-light-popup-panel mha-light-popup-controls";
  controls.dataset.orientation = config.orientation;
  controls.append(sectionTitle(t("lightPopup.controls", "Controls")));

  const powerRow = document.createElement("div");
  powerRow.className = "mha-light-power-row";
  const powerCopy = document.createElement("div");
  const powerTitle = document.createElement("strong");
  powerTitle.textContent = t("lightPopup.power", "On / Off");
  const powerState = document.createElement("span");
  powerCopy.append(powerTitle, powerState);
  const powerToggle = createToggle({
    label: t("lightPopup.power", "On / Off"),
    checked: getLightSnapshot(entityState).on,
    onChange: (event) => setLightPower(context.hass, context.entityState, Boolean(event.currentTarget.checked)),
  });
  powerRow.append(powerCopy, powerToggle);

  const brightnessAction = createLatestValueAction(
    (value) => setLightBrightness(context.hass, context.entityState, value),
    { intervalMs: ACTION_INTERVAL_MS },
  );
  const brightnessSlider = createSlider({
    min: 0,
    max: 100,
    value: getLightSnapshot(entityState).brightness,
    className: "mha-light-popup-slider",
    onInput: (event) => {
      brightnessOutput.textContent = `${Math.round(Number(event.currentTarget.value))} %`;
      brightnessAction.update(Number(event.currentTarget.value));
    },
    onChange: (event) => brightnessAction.commit(Number(event.currentTarget.value)),
  });
  const { row: brightnessRow, output: brightnessOutput } = createControlRow({
    title: t("lightPopup.brightness", "Brightness"),
    value: `${getLightSnapshot(entityState).brightness} %`,
    iconName: "sun",
    control: brightnessSlider,
  });

  const snapshot = getLightSnapshot(entityState);
  const temperatureAction = createLatestValueAction(
    (value) => setLightTemperature(context.hass, context.entityState, value),
    { intervalMs: ACTION_INTERVAL_MS },
  );
  const temperatureSlider = createSlider({
    min: snapshot.minKelvin,
    max: snapshot.maxKelvin,
    value: snapshot.kelvin,
    className: "mha-light-popup-slider mha-light-popup-temperature-slider",
    onInput: (event) => {
      temperatureOutput.textContent = `${Math.round(Number(event.currentTarget.value))} K`;
      temperatureAction.update(Number(event.currentTarget.value));
    },
    onChange: (event) => temperatureAction.commit(Number(event.currentTarget.value)),
  });
  const { row: temperatureRow, output: temperatureOutput } = createControlRow({
    title: t("lightPopup.temperature", "Color temperature"),
    value: `${snapshot.kelvin} K`,
    iconName: "temperature",
    control: temperatureSlider,
  });

  const controlList = document.createElement("div");
  controlList.className = "mha-light-control-list";
  controlList.append(powerRow, brightnessRow, temperatureRow);
  controls.append(controlList);

  const presets = document.createElement("section");
  presets.className = "mha-light-popup-panel mha-light-popup-presets";
  presets.append(sectionTitle(t("lightPopup.presets", "Light presets")));

  const whitesTitle = document.createElement("h4");
  whitesTitle.textContent = t("lightPopup.whites", "Whites");
  const whites = document.createElement("div");
  whites.className = "mha-light-white-presets";
  config.whites.forEach((kelvin) => {
    const button = presetButton({
      label: `${kelvin} K`,
      className: "mha-light-white-preset",
      onClick: () => setLightTemperature(context.hass, context.entityState, kelvin),
    });
    button.style.setProperty("--mha-light-white", `rgb(255 ${Math.round(150 + Math.min(100, (kelvin - 2000) / 45))} ${Math.round(95 + Math.min(160, (kelvin - 2000) / 20))})`);
    button.dataset.kelvin = String(kelvin);
    whites.append(button);
  });

  const scenesTitle = document.createElement("h4");
  scenesTitle.textContent = t("lightPopup.scenes", "Ambiences");
  const scenes = document.createElement("div");
  scenes.className = "mha-light-scene-presets";
  config.scenes.filter((scene) => scene.enabled).forEach((scene) => {
    scenes.append(presetButton({
      label: scene.name,
      iconName: scene.icon,
      color: scene.color || "",
      className: "mha-light-scene-preset",
      onClick: () => applyLightScene(context.hass, context.entityState, scene),
    }));
  });

  const colorsTitle = document.createElement("h4");
  colorsTitle.textContent = t("lightPopup.colors", "Colors");
  const colors = document.createElement("div");
  colors.className = "mha-light-color-presets";
  config.colors.forEach((color) => {
    const button = presetButton({
      label: color,
      color,
      className: "mha-light-color-preset",
      onClick: () => setLightColor(context.hass, context.entityState, hexToRgb(color)),
    });
    colors.append(button);
  });

  const customColor = document.createElement("button");
  customColor.type = "button";
  customColor.className = "mha-light-custom-color-button";
  customColor.append(icon("eyedropper"), document.createTextNode(t("lightPopup.customColor", "Custom color")));
  customColor.onclick = () => onOpenColor?.();

  presets.append(whitesTitle, whites, scenesTitle, scenes, colorsTitle, colors, customColor);
  viewport.append(controls, presets);
  root.append(viewport, createPager(viewport));

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    context.entityState = nextHass?.states?.[context.entityState?.entity_id] || context.entityState;
    const capabilities = getLightCapabilities(context.entityState);
    const next = getLightSnapshot(context.entityState);
    const input = powerToggle.querySelector(".mha-toggle-input");
    if (input) {
      input.checked = next.on;
      input.disabled = !capabilities.available;
    }
    powerState.textContent = next.on ? t("states.on", "On") : t("states.off", "Off");
    controls.dataset.available = String(capabilities.available);
    brightnessRow.hidden = !capabilities.brightness;
    temperatureRow.hidden = !capabilities.colorTemperature;
    whitesTitle.hidden = !capabilities.colorTemperature;
    whites.hidden = !capabilities.colorTemperature;
    colorsTitle.hidden = !capabilities.color;
    colors.hidden = !capabilities.color;
    customColor.hidden = !capabilities.color;
    if (!brightnessSlider.classList.contains("is-slider-dragging")) {
      brightnessSlider.__mhaSliderApi?.setValue(next.brightness);
      brightnessOutput.textContent = `${next.brightness} %`;
    }
    if (!temperatureSlider.classList.contains("is-slider-dragging")) {
      temperatureSlider.__mhaSliderApi?.setValue(next.kelvin);
      temperatureOutput.textContent = `${next.kelvin} K`;
    }
  };
  root.__mhaDestroy = () => {
    brightnessAction.clear();
    temperatureAction.clear();
    delete root.__mhaUpdateFromHass;
  };
  root.__mhaUpdateFromHass(hass);
  return root;
}
