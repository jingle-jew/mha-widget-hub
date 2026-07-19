import { createLatestValueAction } from "../ha/actions.js";
import {
  getLightCapabilities,
  getLightSnapshot,
  hsvToRgb,
  rgbToHsv,
  setLightColor,
} from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";

const ACTION_INTERVAL_MS = 80;

function createHeading() {
  const heading = document.createElement("div");
  heading.className = "mha-light-popup-section-heading";
  const title = document.createElement("h3");
  title.className = "mha-light-popup-section-title";
  title.textContent = t("lightPopup.color", "Color");
  heading.append(title);
  return heading;
}

function setWheelPoint(wheel, point, hue, saturation) {
  const angle = hue * Math.PI / 180;
  const radius = saturation / 100 * 50;
  point.style.left = `${50 + Math.cos(angle) * radius}%`;
  point.style.top = `${50 + Math.sin(angle) * radius}%`;
}

function createColorWheel(state, onInput, onCommit) {
  const wheel = document.createElement("div");
  wheel.className = "mha-light-color-wheel";
  wheel.tabIndex = 0;
  wheel.setAttribute("role", "slider");
  wheel.setAttribute("aria-label", t("lightPopup.colorWheel", "Color wheel"));
  wheel.setAttribute("aria-valuemin", "0");
  wheel.setAttribute("aria-valuemax", "360");

  const point = document.createElement("span");
  point.className = "mha-light-color-wheel-point";
  wheel.append(point);

  const updateFromPosition = (clientX, clientY) => {
    const rect = wheel.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;
    const radius = Math.max(1, Math.min(rect.width, rect.height) / 2);
    state.hue = Math.round((Math.atan2(y, x) * 180 / Math.PI + 360) % 360);
    state.saturation = Math.round(Math.min(1, Math.hypot(x, y) / radius) * 100);
    onInput();
  };

  let pointerId = null;
  wheel.addEventListener("pointerdown", (event) => {
    if (wheel.dataset.disabled === "true") return;
    pointerId = event.pointerId;
    state.interacting = true;
    wheel.setPointerCapture?.(pointerId);
    updateFromPosition(event.clientX, event.clientY);
    event.preventDefault();
  });
  wheel.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) return;
    updateFromPosition(event.clientX, event.clientY);
    event.preventDefault();
  });
  const finish = (event) => {
    if (event.pointerId !== pointerId) return;
    wheel.releasePointerCapture?.(pointerId);
    pointerId = null;
    state.interacting = false;
    onCommit();
  };
  wheel.addEventListener("pointerup", finish);
  wheel.addEventListener("pointercancel", finish);
  wheel.addEventListener("keydown", (event) => {
    if (wheel.dataset.disabled === "true") return;
    const delta = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") state.hue -= delta;
    else if (event.key === "ArrowRight") state.hue += delta;
    else if (event.key === "ArrowUp") state.saturation += delta;
    else if (event.key === "ArrowDown") state.saturation -= delta;
    else return;
    state.hue = (state.hue + 360) % 360;
    state.saturation = Math.min(100, Math.max(0, state.saturation));
    onCommit();
    event.preventDefault();
  });

  wheel.__mhaSync = () => {
    setWheelPoint(wheel, point, state.hue, state.saturation);
    wheel.setAttribute("aria-valuenow", String(Math.round(state.hue)));
    wheel.setAttribute("aria-valuetext", `${Math.round(state.hue)}°, ${Math.round(state.saturation)}%`);
  };
  return wheel;
}

function createSliderField({ title, output, slider, className = "" }) {
  const field = document.createElement("label");
  field.className = ["mha-light-color-slider-field", className].filter(Boolean).join(" ");
  const label = document.createElement("span");
  label.textContent = title;
  field.append(label, output, slider);
  return field;
}

export function createLightPopupColorView({ hass, entityState, onOpenSettings } = {}) {
  const initial = rgbToHsv(getLightSnapshot(entityState).rgb);
  const state = {
    hass,
    entityState,
    hue: initial.hue,
    saturation: initial.saturation,
    interacting: false,
    suppressHassUntil: 0,
  };

  const root = document.createElement("section");
  root.className = "mha-light-popup-section mha-light-popup-color-view";
  root.dataset.view = "color";
  root.append(createHeading());

  const hueOutput = document.createElement("output");
  const saturationOutput = document.createElement("output");
  const colorAction = createLatestValueAction(
    () => setLightColor(state.hass, state.entityState, hsvToRgb(state.hue, state.saturation, 100)),
    { intervalMs: ACTION_INTERVAL_MS },
  );

  const sync = ({ emit = false, commit = false } = {}) => {
    state.hue = (Number(state.hue) + 360) % 360;
    state.saturation = Math.min(100, Math.max(0, Number(state.saturation) || 0));
    hueOutput.textContent = `${Math.round(state.hue)}°`;
    saturationOutput.textContent = `${Math.round(state.saturation)} %`;
    hueSlider.__mhaSliderApi?.setValue(state.hue);
    saturationSlider.__mhaSliderApi?.setValue(state.saturation);
    wheel.__mhaSync?.();
    if (emit) {
      state.suppressHassUntil = Date.now() + 500;
      if (commit) colorAction.commit();
      else colorAction.update();
    }
  };

  const hueSlider = createSlider({
    label: t("lightPopup.hue", "Hue"),
    min: 0,
    max: 360,
    value: state.hue,
    className: "mha-light-popup-slider mha-light-hue-slider",
    onInput: (event) => {
      state.interacting = true;
      state.hue = Number(event.currentTarget.value);
      sync({ emit: true });
    },
    onChange: (event) => {
      state.hue = Number(event.currentTarget.value);
      state.interacting = false;
      sync({ emit: true, commit: true });
    },
  });
  const saturationSlider = createSlider({
    label: t("lightPopup.saturation", "Saturation"),
    min: 0,
    max: 100,
    value: state.saturation,
    className: "mha-light-popup-slider mha-light-saturation-slider",
    onInput: (event) => {
      state.interacting = true;
      state.saturation = Number(event.currentTarget.value);
      sync({ emit: true });
    },
    onChange: (event) => {
      state.saturation = Number(event.currentTarget.value);
      state.interacting = false;
      sync({ emit: true, commit: true });
    },
  });

  const sliderGroup = document.createElement("div");
  sliderGroup.className = "mha-light-color-slider-group";
  sliderGroup.append(
    createSliderField({
      title: t("lightPopup.saturation", "Saturation"),
      output: saturationOutput,
      slider: saturationSlider,
    }),
    createSliderField({
      title: t("lightPopup.hue", "Hue"),
      output: hueOutput,
      slider: hueSlider,
    }),
  );

  const wheel = createColorWheel(
    state,
    () => sync({ emit: true }),
    () => sync({ emit: true, commit: true }),
  );
  const wheelPane = document.createElement("div");
  wheelPane.className = "mha-light-color-wheel-pane";
  wheelPane.append(wheel);

  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "mha-light-popup-settings-button";
  settings.append(
    createIconSymbol({ name: "settings" }),
    document.createTextNode(t("lightPopup.settings", "Settings")),
  );
  settings.onclick = () => onOpenSettings?.();

  const content = document.createElement("div");
  content.className = "mha-light-color-content";
  content.append(sliderGroup, wheelPane, settings);
  root.append(content);

  root.__mhaUpdateFromHass = (nextHass) => {
    state.hass = nextHass;
    state.entityState = nextHass?.states?.[state.entityState?.entity_id] || state.entityState;
    const capabilities = getLightCapabilities(state.entityState);
    root.dataset.available = String(capabilities.color);
    hueSlider.__mhaSliderApi?.setDisabled(!capabilities.color);
    saturationSlider.__mhaSliderApi?.setDisabled(!capabilities.color);
    wheel.dataset.disabled = String(!capabilities.color);
    wheel.tabIndex = capabilities.color ? 0 : -1;
    wheel.setAttribute("aria-disabled", String(!capabilities.color));
    if (!state.interacting && Date.now() >= state.suppressHassUntil && capabilities.color) {
      const next = rgbToHsv(getLightSnapshot(state.entityState).rgb);
      state.hue = next.hue;
      state.saturation = next.saturation;
      sync();
    }
  };
  root.__mhaDestroy = () => {
    colorAction.clear();
    delete root.__mhaUpdateFromHass;
  };
  sync();
  root.__mhaUpdateFromHass(hass);
  return root;
}
