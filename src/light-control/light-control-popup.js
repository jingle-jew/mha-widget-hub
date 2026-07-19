import { callHomeAssistantService, createLatestValueAction } from "../ha/actions.js";
import { getEntityDomain, getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import {
  buildLightControlServiceCall,
  getLightBrightnessPercent,
  getLightCapabilities,
  getLightColorTemperature,
  getLightColorTemperatureRange,
  getLightRgbColor,
  hexToRgb,
  hsvToRgb,
  kelvinToRgb,
  rgbToHex,
  rgbToHsv,
} from "../ha/light.js";
import { isToggleEntityOn } from "../ha/toggle.js";
import { t } from "../i18n/index.js";
import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { createSlider } from "../ui/slider.js";
import { createSlider2 } from "../ui/slider2.js";
import {
  cloneLightControlConfig,
  normalizeLightControlConfig,
} from "./light-control-config.js";
import { renderLightControlConfigFields } from "./light-control-config-view.js";

const SERVICE_INTERVAL_MS = 100;
const LIGHT_CONTROL_VIEWS = new Set(["presets", "color", "config"]);
const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function createButton({ className = "", label = "", icon = "", text = "", onClick } = {}) {
  const button = document.createElement("button");
  button.className = className;
  button.type = "button";
  if (label) button.setAttribute("aria-label", label);
  if (icon) button.append(createIconSymbol({ name: icon }));
  if (text) {
    const textNode = document.createElement("span");
    textNode.textContent = text;
    button.append(textNode);
  }
  if (onClick) button.addEventListener("click", onClick);
  return button;
}

const COLOR_WHEEL_INDICATOR_DISTANCE = 46;

function createControlRow({ icon, label, valueElement, control, className = "" }) {
  const row = document.createElement("div");
  row.className = ["mha-light-control-control-row", className].filter(Boolean).join(" ");

  const heading = document.createElement("div");
  heading.className = "mha-light-control-control-heading";
  heading.append(createIconSymbol({ name: icon }));

  const labelNode = document.createElement("span");
  labelNode.textContent = label;
  heading.append(labelNode);
  if (valueElement) heading.append(valueElement);

  row.append(heading, control);
  return row;
}

function createLightControlSliderVariants({ className = "", label = "", ...options } = {}) {
  const slot = document.createElement("div");
  slot.className = "mha-light-control-slider-slot";
  const sharedClassName = ["mha-light-control-slider", className].filter(Boolean).join(" ");
  const standard = createSlider({
    ...options,
    className: `${sharedClassName} mha-light-control-slider--default`,
  });
  const ios = createSlider2({
    ...options,
    className: `${sharedClassName} mha-light-control-slider--ios`,
  });
  slot.append(standard, ios);
  const inputs = [standard, ios].map(slider => slider.querySelector(".mha-slider-input"));
  inputs.forEach(input => input?.setAttribute("aria-label", label || "Slider"));
  return {
    slot,
    sliders: [standard, ios],
    inputs,
  };
}

function createSectionTitle(text) {
  const title = document.createElement("h3");
  title.className = "mha-light-control-section-title";
  title.textContent = text;
  return title;
}

function getFriendlyName(widget, entityState) {
  return String(widget?.label || widget?.title || entityState?.attributes?.friendly_name || getWidgetEntityId(widget) || "Light");
}

function getAmbienceName(preset = {}) {
  return preset.name || t(`lightControl.ambienceNames.${preset.id}`, preset.id || "Ambience");
}

export function getAmbienceDisplayColor(preset = {}) {
  return preset.mode === "color"
    ? rgbToHex(hexToRgb(preset.color) || [255, 255, 255])
    : rgbToHex(kelvinToRgb(preset.colorTemperature));
}

export function getLightDisplayColor(entityState) {
  const rgb = getLightRgbColor(entityState);
  if (rgb) return rgbToHex(rgb);
  const temperature = getLightColorTemperature(entityState);
  return temperature != null
    ? rgbToHex(kelvinToRgb(temperature))
    : "#ffd27a";
}

export function getColorWheelSelection(deltaX, deltaY, radius) {
  const safeRadius = Math.max(1, Number(radius) || 0);
  return {
    hue: (Math.atan2(deltaY, deltaX) * 180 / Math.PI + 450) % 360,
    saturation: Math.min(1, Math.hypot(deltaX, deltaY) / safeRadius),
  };
}

export function getColorWheelIndicatorPosition(hue, saturation = 1) {
  const angle = (Number(hue) - 90) * Math.PI / 180;
  const distance = Math.min(1, Math.max(0, Number(saturation) || 0))
    * COLOR_WHEEL_INDICATOR_DISTANCE;
  return {
    x: 50 + Math.cos(angle) * distance,
    y: 50 + Math.sin(angle) * distance,
  };
}

function dispatchConfigChange(source, config) {
  source?.dispatchEvent?.(new CustomEvent("mha-update-widget-config", {
    bubbles: true,
    composed: true,
    detail: { patch: { lightControl: normalizeLightControlConfig(config) } },
  }));
}

export function canOpenLightControlPopup(widget = {}, {
  interactive = true,
  entityAllowed = true,
} = {}) {
  return Boolean(
    interactive
    && entityAllowed
    && getEntityDomain(getWidgetEntityId(widget)) === "light",
  );
}

export function normalizeLightControlView(value) {
  return LIGHT_CONTROL_VIEWS.has(value) ? value : "presets";
}

export function buildAmbienceLightPatch(preset = {}) {
  return {
    brightness: preset.brightness,
    ...(preset.mode === "color"
      ? { color: preset.color }
      : { colorTemperature: preset.colorTemperature }),
  };
}

export function createLightControlPopup({
  widget = {},
  hass,
  source,
  opener,
  onClose,
} = {}) {
  let currentHass = hass;
  let entityState = getEntityState(currentHass, widget);
  let config = normalizeLightControlConfig(widget.lightControl);
  let configDraft = cloneLightControlConfig(config);
  let currentView = "presets";
  let destroyed = false;
  let lastStateSignature = "";
  let customColor = rgbToHex(getLightRgbColor(entityState) || [255, 153, 52]);
  let customHue = 32;
  let customSaturation = .9;

  const brightnessAction = createLatestValueAction((value) => applyPatch({ brightness: value }), {
    intervalMs: SERVICE_INTERVAL_MS,
  });
  const temperatureAction = createLatestValueAction((value) => applyPatch({ colorTemperature: value }), {
    intervalMs: SERVICE_INTERVAL_MS,
  });

  const root = document.createElement("section");
  root.className = "mha-light-control-popup";
  root.dataset.lightControlPopup = "true";
  root.dataset.open = "true";

  const scrim = document.createElement("button");
  scrim.className = "mha-light-control-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", t("lightControl.close", "Close light controls"));

  const dialog = document.createElement("div");
  dialog.className = "mha-light-control-dialog";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-label", t("lightControl.title", "Light controls"));

  const header = document.createElement("header");
  header.className = "mha-light-control-header";

  const identity = document.createElement("div");
  identity.className = "mha-light-control-identity";

  const entityIcon = document.createElement("span");
  entityIcon.className = "mha-light-control-entity-icon";
  entityIcon.append(createIconSymbol({
    name: resolveWidgetIconName({
      explicitIcon: widget.icon,
      label: getFriendlyName(widget, entityState),
      entityId: getWidgetEntityId(widget),
      domain: "light",
      kind: widget.kind,
      fallback: "bulb",
    }),
  }));

  const identityText = document.createElement("div");
  identityText.className = "mha-light-control-identity-text";
  const title = document.createElement("h2");
  title.textContent = getFriendlyName(widget, entityState);
  const status = document.createElement("p");
  status.className = "mha-light-control-status";
  identityText.append(title, status);
  identity.append(entityIcon, identityText);

  const headerActions = document.createElement("div");
  headerActions.className = "mha-light-control-header-actions";
  const backButton = createButton({
    className: "mha-light-control-header-button mha-light-control-back",
    label: t("common.back", "Back"),
    icon: "arrow-left",
    onClick: () => setView("presets"),
  });
  const gearButton = createButton({
    className: "mha-light-control-header-button mha-light-control-gear",
    label: t("lightControl.configure", "Configure presets"),
    icon: "settings",
    onClick: () => setView("config"),
  });
  const closeButton = createButton({
    className: "mha-light-control-header-button mha-light-control-close",
    label: t("common.close", "Close"),
    icon: "x",
    onClick: close,
  });
  headerActions.append(backButton, gearButton, closeButton);
  const headerViewTitle = document.createElement("h2");
  headerViewTitle.className = "mha-light-control-view-title";
  headerViewTitle.textContent = t("lightControl.configure", "Configure presets");
  headerViewTitle.hidden = true;
  header.append(identity, headerViewTitle, headerActions);

  const content = document.createElement("div");
  content.className = "mha-light-control-content";

  const mainView = document.createElement("div");
  mainView.className = "mha-light-control-view mha-light-control-main-view";
  mainView.dataset.view = "presets";

  const controlsSection = document.createElement("section");
  controlsSection.className = "mha-light-control-section mha-light-control-controls";
  controlsSection.dataset.orientation = config.orientation;

  const powerGroup = document.createElement("div");
  powerGroup.className = "mha-light-control-power-group";
  const offButton = createButton({
    className: "mha-light-control-power-button",
    label: t("lightControl.turnOff", "Turn off"),
    icon: "power",
    text: t("common.off", "Off"),
    onClick: () => applyPatch({ on: false }),
  });
  const onButton = createButton({
    className: "mha-light-control-power-button",
    label: t("lightControl.turnOn", "Turn on"),
    icon: "power",
    text: t("common.on", "On"),
    onClick: () => applyPatch({ on: true }),
  });
  powerGroup.append(offButton, onButton);

  const brightnessValue = document.createElement("strong");
  const brightnessControls = createLightControlSliderVariants({
    label: t("lightControl.brightness", "Brightness"),
    min: 1,
    max: 100,
    value: getLightBrightnessPercent(entityState) ?? 100,
    orientation: config.orientation,
    className: "mha-light-control-brightness-slider",
    onInput: (event) => {
      const value = Number(event.currentTarget.value);
      brightnessValue.textContent = `${Math.round(value)}%`;
      brightnessAction.update(value);
    },
    onChange: (event) => brightnessAction.commit(Number(event.currentTarget.value)),
  });
  const brightnessRow = createControlRow({
    icon: "brightness-up",
    label: t("lightControl.brightness", "Brightness"),
    valueElement: brightnessValue,
    control: brightnessControls.slot,
    className: "mha-light-control-brightness-row",
  });

  const temperatureValue = document.createElement("strong");
  const initialRange = getLightColorTemperatureRange(entityState);
  const temperatureControls = createLightControlSliderVariants({
    label: t("lightControl.temperature", "Temperature"),
    min: initialRange.min,
    max: initialRange.max,
    value: getLightColorTemperature(entityState) ?? 3500,
    orientation: config.orientation,
    className: "mha-light-control-temperature-slider",
    onInput: (event) => {
      const value = Number(event.currentTarget.value);
      temperatureValue.textContent = `${Math.round(value)} K`;
      temperatureAction.update(value);
    },
    onChange: (event) => temperatureAction.commit(Number(event.currentTarget.value)),
  });
  const temperatureRow = createControlRow({
    icon: "temperature",
    label: t("lightControl.temperature", "Temperature"),
    valueElement: temperatureValue,
    control: temperatureControls.slot,
    className: "mha-light-control-temperature-row",
  });

  controlsSection.append(powerGroup, brightnessRow, temperatureRow);

  const presetsSection = document.createElement("section");
  presetsSection.className = "mha-light-control-section mha-light-control-presets";
  const presetsHeading = document.createElement("div");
  presetsHeading.className = "mha-light-control-presets-heading";
  presetsHeading.append(createIconSymbol({ name: "palette" }));
  const presetsHeadingText = document.createElement("div");
  const presetsTitle = document.createElement("h3");
  presetsTitle.textContent = t("lightControl.lightColor", "Light color");
  const presetsHint = document.createElement("p");
  presetsHint.textContent = t("lightControl.lightColorHint", "Choose an ambience or color");
  presetsHeadingText.append(presetsTitle, presetsHint);
  presetsHeading.append(presetsHeadingText);

  const whitesGroup = document.createElement("div");
  whitesGroup.className = "mha-light-control-preset-group mha-light-control-whites";
  const whitesList = document.createElement("div");
  whitesList.className = "mha-light-control-whites-list";
  whitesGroup.append(createSectionTitle(t("lightControl.whites", "Whites")), whitesList);

  const ambiencesGroup = document.createElement("div");
  ambiencesGroup.className = "mha-light-control-preset-group mha-light-control-ambiences";
  const ambiencesList = document.createElement("div");
  ambiencesList.className = "mha-light-control-ambiences-list";
  ambiencesGroup.append(createSectionTitle(t("lightControl.ambiences", "Ambiences")), ambiencesList);

  const colorsGroup = document.createElement("div");
  colorsGroup.className = "mha-light-control-preset-group mha-light-control-colors";
  const colorsList = document.createElement("div");
  colorsList.className = "mha-light-control-colors-list";
  colorsGroup.append(createSectionTitle(t("lightControl.colors", "Colors")), colorsList);

  const customColorButton = createButton({
    className: "mha-light-control-custom-color-button",
    label: t("lightControl.customColor", "Custom color"),
    icon: "color-picker",
    text: t("lightControl.customColor", "Custom color"),
    onClick: () => setView("color"),
  });
  customColorButton.append(createIconSymbol({ name: "chevron-right" }));
  presetsSection.append(
    presetsHeading,
    whitesGroup,
    ambiencesGroup,
    colorsGroup,
    customColorButton,
  );
  mainView.append(controlsSection, presetsSection);

  const colorView = document.createElement("div");
  colorView.className = "mha-light-control-view mha-light-control-color-view";
  colorView.dataset.view = "color";
  colorView.hidden = true;

  const colorWheel = document.createElement("div");
  colorWheel.className = "mha-light-control-color-wheel";
  colorWheel.tabIndex = 0;
  colorWheel.setAttribute("role", "slider");
  colorWheel.setAttribute("aria-label", t("lightControl.colorWheel", "Color wheel"));
  colorWheel.setAttribute("aria-valuemin", "0");
  colorWheel.setAttribute("aria-valuemax", "360");
  const colorWheelIndicator = document.createElement("span");
  colorWheelIndicator.className = "mha-light-control-color-wheel-indicator";
  colorWheel.append(colorWheelIndicator);

  const colorPreview = document.createElement("span");
  colorPreview.className = "mha-light-control-color-preview";
  const colorValue = document.createElement("strong");
  colorValue.className = "mha-light-control-color-value";
  const applyColorButton = createButton({
    className: "mha-button mha-light-control-apply-color",
    label: t("lightControl.applyColor", "Apply color"),
    text: t("lightControl.applyColor", "Apply color"),
    onClick: () => applyPatch({ color: customColor }),
  });
  applyColorButton.dataset.variant = "primary";
  const colorActions = document.createElement("div");
  colorActions.className = "mha-light-control-color-actions";
  colorActions.append(colorPreview, colorValue, applyColorButton);
  colorView.append(
    createSectionTitle(t("lightControl.customColor", "Custom color")),
    colorWheel,
    colorActions,
  );

  const configView = document.createElement("div");
  configView.className = "mha-light-control-view mha-light-control-config-view";
  configView.dataset.view = "config";
  configView.hidden = true;

  const configBody = document.createElement("div");
  configBody.className = "mha-light-control-config-body";
  const configActions = document.createElement("div");
  configActions.className = "mha-light-control-config-actions";
  const cancelConfig = createButton({
    className: "mha-button mha-light-control-config-cancel",
    label: t("common.cancel", "Cancel"),
    text: t("common.cancel", "Cancel"),
    onClick: () => {
      configDraft = cloneLightControlConfig(config);
      renderConfigFields();
      setView("presets");
    },
  });
  cancelConfig.dataset.variant = "default";
  const saveConfig = createButton({
    className: "mha-button mha-light-control-config-save",
    label: t("common.save", "Save"),
    text: t("common.save", "Save"),
    onClick: () => {
      config = normalizeLightControlConfig(configDraft);
      configDraft = cloneLightControlConfig(config);
      controlsSection.dataset.orientation = config.orientation;
      const sliderOrientation = config.orientation;
      [...brightnessControls.sliders, ...temperatureControls.sliders].forEach((slider) => {
        slider.dataset.orientationMode = sliderOrientation;
      });
      syncPresetDefinitions();
      lastStateSignature = "";
      syncFromHass(currentHass);
      dispatchConfigChange(source, config);
      setView("presets");
    },
  });
  saveConfig.dataset.variant = "primary";
  configActions.append(cancelConfig, saveConfig);
  configView.append(configBody, configActions);

  content.append(mainView, colorView, configView);
  dialog.append(header, content);
  root.append(scrim, dialog);

  function applyPatch(patch) {
    const serviceCall = buildLightControlServiceCall(entityState, patch);
    if (!serviceCall) return Promise.resolve(false);
    return callHomeAssistantService(currentHass, serviceCall);
  }

  function setView(view) {
    currentView = normalizeLightControlView(view);
    root.dataset.view = currentView;
    mainView.hidden = currentView !== "presets";
    colorView.hidden = currentView !== "color";
    configView.hidden = currentView !== "config";
    backButton.hidden = currentView === "presets";
    gearButton.hidden = currentView !== "presets";
    identity.hidden = currentView === "config";
    headerViewTitle.hidden = currentView !== "config";
    if (currentView === "config") renderConfigFields();
    const nextFocus = currentView === "presets"
      ? gearButton
      : currentView === "color"
        ? colorWheel
        : configBody.querySelector(FOCUSABLE_SELECTOR);
    nextFocus?.focus?.({ preventScroll: true });
  }

  function selectWheelColorFromPoint(clientX, clientY) {
    const rect = colorWheel.getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    const x = clientX - (rect.left + rect.width / 2);
    const y = clientY - (rect.top + rect.height / 2);
    const { hue, saturation } = getColorWheelSelection(x, y, radius);
    setCustomColor(hue, saturation);
  }

  function setCustomColor(hue, saturation = 1) {
    customHue = ((Number(hue) % 360) + 360) % 360;
    customSaturation = Math.min(1, Math.max(0, Number(saturation) || 0));
    customColor = rgbToHex(hsvToRgb(customHue, customSaturation, 1));
    const indicator = getColorWheelIndicatorPosition(customHue, customSaturation);
    colorWheel.style.setProperty("--mha-light-wheel-x", `${indicator.x}%`);
    colorWheel.style.setProperty("--mha-light-wheel-y", `${indicator.y}%`);
    colorWheel.setAttribute("aria-valuenow", String(Math.round(customHue)));
    colorWheel.setAttribute("aria-valuetext", customColor.toUpperCase());
    colorView.style.setProperty("--mha-light-selected-color", customColor);
    colorValue.textContent = customColor.toUpperCase();
  }

  function syncPresetDefinitions() {
    whitesList.replaceChildren();
    config.whiteTemperatures.forEach((temperature) => {
      const button = createButton({
        className: "mha-light-control-white-preset",
        label: `${temperature} K`,
        onClick: () => applyPatch({ colorTemperature: temperature }),
      });
      button.dataset.temperature = String(temperature);
      const swatch = document.createElement("span");
      swatch.className = "mha-light-control-white-swatch";
      swatch.style.setProperty("--mha-light-temperature", String(temperature));
      swatch.style.setProperty("--mha-light-temperature-color", rgbToHex(kelvinToRgb(temperature)));
      const label = document.createElement("span");
      label.textContent = `${temperature} K`;
      button.append(swatch, label);
      whitesList.append(button);
    });

    ambiencesList.replaceChildren();
    config.ambiences.filter(preset => preset.enabled).forEach((preset) => {
      const presetName = getAmbienceName(preset);
      const button = createButton({
        className: "mha-light-control-ambience-preset",
        label: presetName,
        onClick: () => applyPatch(buildAmbienceLightPatch(preset)),
      });
      button.dataset.presetId = preset.id;
      button.style.setProperty("--mha-light-preset-color", getAmbienceDisplayColor(preset));
      button.append(createIconSymbol({ name: preset.icon }));
      const label = document.createElement("span");
      label.textContent = presetName;
      button.append(label);
      ambiencesList.append(button);
    });

    colorsList.replaceChildren();
    config.quickColors.forEach((color) => {
      const button = createButton({
        className: "mha-light-control-color-preset",
        label: color,
        onClick: () => applyPatch({ color }),
      });
      button.dataset.color = color;
      button.style.setProperty("--mha-light-preset-color", color);
      colorsList.append(button);
    });
  }

  function renderConfigFields() {
    renderLightControlConfigFields(configBody, configDraft);
  }

  function syncFromHass(nextHass) {
    if (destroyed) return;
    currentHass = nextHass;
    entityState = getEntityState(currentHass, widget);
    const available = isEntityAvailable(entityState);
    const capabilities = getLightCapabilities(entityState);
    const on = available && isToggleEntityOn(entityState);
    const brightness = getLightBrightnessPercent(entityState);
    const temperature = getLightColorTemperature(entityState);
    const temperatureLimits = getLightColorTemperatureRange(entityState);
    const rgb = getLightRgbColor(entityState);
    const displayColor = getLightDisplayColor(entityState);
    const nextStateSignature = JSON.stringify({
      available,
      capabilities,
      on,
      brightness,
      temperature,
      temperatureLimits,
      rgb,
      name: getFriendlyName(widget, entityState),
    });
    if (nextStateSignature === lastStateSignature) return;
    lastStateSignature = nextStateSignature;

    root.dataset.entityAvailable = String(available);
    root.dataset.lightOn = String(on);
    entityIcon.style.setProperty("--mha-light-entity-color", displayColor);
    entityIcon.dataset.active = String(on);
    title.textContent = getFriendlyName(widget, entityState);
    status.textContent = available
      ? `${on ? t("states.on", "On") : t("states.off", "Off")}${brightness != null ? ` · ${brightness}%` : ""}`
      : t("states.unavailable", "Unavailable");
    status.dataset.active = String(on);

    offButton.setAttribute("aria-pressed", String(!on));
    onButton.setAttribute("aria-pressed", String(on));
    [offButton, onButton].forEach(button => { button.disabled = !available; });

    brightnessRow.hidden = !capabilities.brightness;
    brightnessControls.sliders.forEach((slider) => {
      slider.__mhaSliderApi?.setDisabled(!available || !capabilities.brightness);
    });
    if (!brightnessControls.inputs.some(input => input?.matches?.(":active")) && brightness != null) {
      brightnessControls.sliders.forEach(slider => slider.__mhaSliderApi?.setValue(brightness));
      brightnessValue.textContent = `${brightness}%`;
    }

    temperatureRow.hidden = !capabilities.colorTemperature;
    temperatureControls.sliders.forEach((slider) => {
      slider.__mhaSliderApi?.setDisabled(!available || !capabilities.colorTemperature);
      slider.__mhaSliderApi?.setRange(temperatureLimits.min, temperatureLimits.max);
    });
    if (!temperatureControls.inputs.some(input => input?.matches?.(":active")) && temperature != null) {
      temperatureControls.sliders.forEach(slider => slider.__mhaSliderApi?.setValue(temperature));
      temperatureValue.textContent = `${temperature} K`;
    }

    whitesGroup.hidden = !capabilities.colorTemperature;
    ambiencesGroup.hidden = !capabilities.color && !capabilities.colorTemperature;
    colorsGroup.hidden = !capabilities.color;
    customColorButton.hidden = !capabilities.color;
    presetsSection.hidden = !capabilities.color && !capabilities.colorTemperature;
    colorView.dataset.disabled = String(!available || !capabilities.color);
    applyColorButton.disabled = !available || !capabilities.color;

    whitesList.querySelectorAll(".mha-light-control-white-preset").forEach((button) => {
      const presetTemperature = Number(button.dataset.temperature);
      const supported = presetTemperature >= temperatureLimits.min
        && presetTemperature <= temperatureLimits.max;
      const selected = supported && temperature != null
        && Math.abs(presetTemperature - temperature) <= 75;
      button.setAttribute("aria-pressed", String(selected));
      button.disabled = !available || !supported;
    });
    colorsList.querySelectorAll(".mha-light-control-color-preset").forEach((button) => {
      const selected = rgb && rgbToHex(rgb) === button.dataset.color;
      button.setAttribute("aria-pressed", String(Boolean(selected)));
      button.disabled = !available;
    });
    ambiencesList.querySelectorAll(".mha-light-control-ambience-preset").forEach((button) => {
      button.disabled = !available;
      const preset = config.ambiences.find(item => item.id === button.dataset.presetId);
      const brightnessMatches = preset && brightness != null
        && Math.abs(preset.brightness - brightness) <= 2;
      const appearanceMatches = preset?.mode === "color"
        ? rgb && rgbToHex(rgb) === preset.color
        : temperature != null && Math.abs(
          Math.min(temperatureLimits.max, Math.max(temperatureLimits.min, preset?.colorTemperature))
          - temperature,
        ) <= 75;
      button.setAttribute("aria-pressed", String(Boolean(brightnessMatches && appearanceMatches)));
    });
    if (currentView !== "color") {
      const hsv = rgbToHsv(hexToRgb(displayColor));
      setCustomColor(hsv.hue, hsv.saturation);
    }
  }

  function close() {
    if (destroyed) return;
    root.dataset.open = "false";
    destroy();
    root.remove();
    opener?.focus?.({ preventScroll: true });
    onClose?.();
  }

  function handleKeyDown(event) {
    if (event.defaultPrevented) return;
    if (event.key === "Escape") {
      event.preventDefault();
      if (currentView !== "presets") setView("presets");
      else close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter(node => !node.hidden);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const activeElement = dialog.getRootNode?.()?.activeElement || document.activeElement;
    if (event.shiftKey && activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    brightnessAction.clear();
    temperatureAction.clear();
    root.removeEventListener("keydown", handleKeyDown);
    destroyDomSubtree(content);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaClose;
    delete root.__mhaDestroy;
  }

  scrim.addEventListener("click", close);
  root.addEventListener("keydown", handleKeyDown);
  colorWheel.addEventListener("pointerdown", (event) => {
    colorWheel.setPointerCapture?.(event.pointerId);
    selectWheelColorFromPoint(event.clientX, event.clientY);
  });
  colorWheel.addEventListener("pointermove", (event) => {
    if (!colorWheel.hasPointerCapture?.(event.pointerId)) return;
    selectWheelColorFromPoint(event.clientX, event.clientY);
  });
  colorWheel.addEventListener("keydown", (event) => {
    const currentHue = Number(colorWheel.getAttribute("aria-valuenow")) || 0;
    const direction = event.key === "ArrowRight" || event.key === "ArrowUp" ? 1
      : event.key === "ArrowLeft" || event.key === "ArrowDown" ? -1
        : 0;
    if (!direction) return;
    event.preventDefault();
    setCustomColor(currentHue + direction * (event.shiftKey ? 15 : 3), customSaturation);
  });

  root.__mhaUpdateFromHass = syncFromHass;
  root.__mhaClose = close;
  root.__mhaDestroy = destroy;
  syncPresetDefinitions();
  setCustomColor(32, .9);
  syncFromHass(currentHass);
  setView("presets");
  requestAnimationFrame(() => closeButton.focus?.({ preventScroll: true }));
  return root;
}

export function openLightControlPopup({ widget, hass, source, opener, onClose } = {}) {
  const renderRoot = source?.getRootNode?.();
  if (!renderRoot || typeof renderRoot.append !== "function") return null;

  const existing = renderRoot.querySelector?.("[data-light-control-popup='true']");
  if (existing) {
    if (existing.__mhaClose) existing.__mhaClose();
    else {
      existing.__mhaDestroy?.();
      existing.remove?.();
    }
  }

  const popup = createLightControlPopup({ widget, hass, source, opener, onClose });
  renderRoot.append(popup);
  return popup;
}
