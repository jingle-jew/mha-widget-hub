import { createLatestValueAction } from "../ha/actions.js";
import {
  applyLightScene,
  getLightCapabilities,
  getLightSnapshot,
  setLightBrightness,
  setLightPower,
  setLightTemperature,
} from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { createSlider2 } from "../ui/slider2.js";
import { createToggle } from "../ui/toggle.js";
import { createLightPopupColorView } from "./light-popup-color-view.js";

const ACTION_INTERVAL_MS = 80;

function sectionTitle(text) {
  const heading = document.createElement("div");
  heading.className = "mha-light-popup-section-heading";
  const title = document.createElement("h3");
  title.className = "mha-light-popup-section-title";
  title.textContent = text;
  heading.append(title);
  return heading;
}

function icon(name, className = "") {
  return createIconSymbol({ name, className });
}

function createPowerSegments({ checked, onChange }) {
  const group = document.createElement("div");
  group.className = "mha-light-power-segments";
  group.setAttribute("role", "group");
  group.setAttribute("aria-label", t("lightPopup.power", "On / Off"));

  const buttons = [
    [false, t("lightPopup.powerOff", "Off")],
    [true, t("lightPopup.powerOn", "On")],
  ].map(([value, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.value = String(value);
    button.onclick = () => {
      if (button.getAttribute("aria-pressed") === "true") return;
      onChange(value);
    };
    group.append(button);
    return button;
  });

  group.__mhaSetState = (nextChecked, disabled = false) => {
    buttons.forEach((button) => {
      const active = button.dataset.value === String(Boolean(nextChecked));
      button.dataset.active = String(active);
      button.setAttribute("aria-pressed", String(active));
      button.disabled = Boolean(disabled);
    });
  };
  group.__mhaSetState(checked);
  return group;
}

function createQuickControlSliders(options) {
  const wrapper = document.createElement("div");
  wrapper.className = "mha-light-control-sliders mha-light-slider-stack";
  const slider = createSlider(options);
  const slider2 = createSlider2(options);
  wrapper.append(slider, slider2);
  return { wrapper, slider, slider2 };
}

function presetButton({ scene, onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-light-preset mha-light-scene-preset";
  button.setAttribute("aria-label", scene.name);
  button.style.setProperty("--mha-light-preset-color", scene.color || "var(--mha-text-primary)");
  button.append(
    icon(scene.icon, "mha-light-preset-icon"),
    Object.assign(document.createElement("span"), {
      className: "mha-light-preset-copy",
      textContent: scene.name,
    }),
  );
  button.onclick = onClick;
  return button;
}

function createControl({ title, value, iconName, control, area }) {
  const field = document.createElement("article");
  field.className = "mha-light-control-field";
  field.dataset.area = area;
  const heading = document.createElement("div");
  heading.className = "mha-light-control-heading";
  const label = document.createElement("span");
  label.append(icon(iconName), document.createTextNode(title));
  const output = document.createElement("output");
  output.textContent = value;
  heading.append(label, output);
  field.append(heading, control);
  return { field, output };
}

export function createLightPopupMainView({
  hass,
  entityState,
  config,
  onOpenSettings,
} = {}) {
  const context = { hass, entityState };
  const root = document.createElement("div");
  root.className = "mha-light-popup-main-view";
  root.dataset.view = "main";
  root.dataset.orientation = config.orientation;

  const controlsSection = document.createElement("section");
  controlsSection.className = "mha-light-popup-section mha-light-popup-controls";
  controlsSection.append(sectionTitle(t("lightPopup.quickControls", "Quick controls")));

  const power = document.createElement("div");
  power.className = "mha-light-power-control";
  const powerLabel = document.createElement("strong");
  powerLabel.textContent = t("lightPopup.power", "On / Off");
  const powerState = document.createElement("span");
  const powerToggle = createToggle({
    label: t("lightPopup.power", "On / Off"),
    checked: getLightSnapshot(entityState).on,
    onChange: (event) => setLightPower(context.hass, context.entityState, Boolean(event.currentTarget.checked)),
  });
  const powerSegments = createPowerSegments({
    checked: getLightSnapshot(entityState).on,
    onChange: (nextOn) => {
      if (getLightSnapshot(context.entityState).on === nextOn) return;
      setLightPower(context.hass, context.entityState, nextOn);
    },
  });
  const powerCopy = document.createElement("span");
  powerCopy.append(powerLabel, powerState);
  power.append(powerCopy, powerToggle, powerSegments);

  const snapshot = getLightSnapshot(entityState);
  const brightnessAction = createLatestValueAction(
    (value) => setLightBrightness(context.hass, context.entityState, value),
    { intervalMs: ACTION_INTERVAL_MS },
  );
  const {
    wrapper: brightnessControls,
    slider: brightnessSlider,
    slider2: brightnessSlider2,
  } = createQuickControlSliders({
    label: t("lightPopup.brightness", "Brightness"),
    min: 0,
    max: 100,
    value: snapshot.brightness,
    orientation: config.orientation,
    className: "mha-light-popup-slider",
    onInput: (event) => {
      brightnessOutput.textContent = `${Math.round(Number(event.currentTarget.value))} %`;
      brightnessAction.update(Number(event.currentTarget.value));
    },
    onChange: (event) => brightnessAction.commit(Number(event.currentTarget.value)),
  });
  const { field: brightnessField, output: brightnessOutput } = createControl({
    title: t("lightPopup.brightness", "Brightness"),
    value: `${snapshot.brightness} %`,
    iconName: "sun",
    control: brightnessControls,
    area: "brightness",
  });

  const temperatureAction = createLatestValueAction(
    (value) => setLightTemperature(context.hass, context.entityState, value),
    { intervalMs: ACTION_INTERVAL_MS },
  );
  const {
    wrapper: temperatureControls,
    slider: temperatureSlider,
    slider2: temperatureSlider2,
  } = createQuickControlSliders({
    label: t("lightPopup.temperature", "Color temperature"),
    min: snapshot.minKelvin,
    max: snapshot.maxKelvin,
    value: snapshot.kelvin,
    orientation: config.orientation,
    className: "mha-light-popup-slider mha-light-popup-temperature-slider",
    onInput: (event) => {
      temperatureOutput.textContent = `${Math.round(Number(event.currentTarget.value))} K`;
      temperatureAction.update(Number(event.currentTarget.value));
    },
    onChange: (event) => temperatureAction.commit(Number(event.currentTarget.value)),
  });
  const { field: temperatureField, output: temperatureOutput } = createControl({
    title: t("lightPopup.temperatureShort", "Temp. / Color"),
    value: `${snapshot.kelvin} K`,
    iconName: "temperature",
    control: temperatureControls,
    area: "temperature",
  });

  const scenesField = document.createElement("section");
  scenesField.className = "mha-light-scenes-field";
  scenesField.dataset.area = "scenes";
  const scenesTitle = document.createElement("h4");
  scenesTitle.textContent = t("lightPopup.scenes", "Ambiences");
  const scenes = document.createElement("div");
  scenes.className = "mha-light-scene-presets";
  config.scenes.filter((scene) => scene.enabled).forEach((scene) => {
    scenes.append(presetButton({
      scene,
      onClick: () => applyLightScene(context.hass, context.entityState, scene),
    }));
  });
  scenesField.append(scenesTitle, scenes);

  const layout = document.createElement("div");
  layout.className = "mha-light-quick-controls-layout";
  layout.append(scenesField, temperatureField, brightnessField);
  controlsSection.append(power, layout);

  const colorSection = createLightPopupColorView({
    hass,
    entityState,
    onOpenSettings,
  });
  root.append(controlsSection, colorSection);

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
    powerSegments.__mhaSetState?.(next.on, !capabilities.available);
    powerState.textContent = next.on ? t("states.on", "On") : t("states.off", "Off");
    controlsSection.dataset.available = String(capabilities.available);
    brightnessField.hidden = !capabilities.brightness;
    temperatureField.hidden = !capabilities.colorTemperature;
    layout.dataset.hasBrightness = String(capabilities.brightness);
    layout.dataset.hasTemperature = String(capabilities.colorTemperature);
    const brightnessDragging = [brightnessSlider, brightnessSlider2]
      .some((slider) => slider.classList.contains("is-slider-dragging"));
    if (!brightnessDragging) {
      [brightnessSlider, brightnessSlider2]
        .forEach((slider) => slider.__mhaSliderApi?.setValue(next.brightness));
      brightnessOutput.textContent = `${next.brightness} %`;
    }
    const temperatureDragging = [temperatureSlider, temperatureSlider2]
      .some((slider) => slider.classList.contains("is-slider-dragging"));
    if (!temperatureDragging) {
      [temperatureSlider, temperatureSlider2]
        .forEach((slider) => slider.__mhaSliderApi?.setValue(next.kelvin));
      temperatureOutput.textContent = `${next.kelvin} K`;
    }
    colorSection.__mhaUpdateFromHass?.(nextHass);
  };
  root.__mhaDestroy = () => {
    brightnessAction.clear();
    temperatureAction.clear();
    delete root.__mhaUpdateFromHass;
  };
  root.__mhaUpdateFromHass(hass);
  return root;
}
