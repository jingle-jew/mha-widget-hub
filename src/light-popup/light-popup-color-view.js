import {
  getLightSnapshot,
  hsvToRgb,
  rgbToHex,
  rgbToHsv,
  setLightColor,
} from "../ha/light-popup-adapter.js";
import { t } from "../i18n/index.js";
import { createSlider } from "../ui/slider.js";

function setWheelPoint(wheel, point, hue, saturation) {
  const angle = hue * Math.PI / 180;
  const radius = saturation / 100 * 50;
  point.style.left = `${50 + Math.cos(angle) * radius}%`;
  point.style.top = `${50 + Math.sin(angle) * radius}%`;
  wheel.style.setProperty("--mha-light-wheel-hue", String(hue));
}

function createColorWheel(state, onChange) {
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
    onChange();
  };

  let pointerId = null;
  wheel.addEventListener("pointerdown", (event) => {
    pointerId = event.pointerId;
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
  };
  wheel.addEventListener("pointerup", finish);
  wheel.addEventListener("pointercancel", finish);
  wheel.addEventListener("keydown", (event) => {
    const delta = event.shiftKey ? 10 : 2;
    if (event.key === "ArrowLeft") state.hue -= delta;
    else if (event.key === "ArrowRight") state.hue += delta;
    else if (event.key === "ArrowUp") state.saturation += delta;
    else if (event.key === "ArrowDown") state.saturation -= delta;
    else return;
    state.hue = (state.hue + 360) % 360;
    state.saturation = Math.min(100, Math.max(0, state.saturation));
    onChange();
    event.preventDefault();
  });

  wheel.__mhaSync = () => {
    setWheelPoint(wheel, point, state.hue, state.saturation);
    wheel.setAttribute("aria-valuenow", String(state.hue));
    wheel.setAttribute("aria-valuetext", `${state.hue}°, ${state.saturation}%`);
  };
  wheel.__mhaSync();
  return wheel;
}

export function createLightPopupColorView({ hass, entityState } = {}) {
  const snapshot = getLightSnapshot(entityState);
  const initial = rgbToHsv(snapshot.rgb);
  const state = {
    hass,
    entityState,
    hue: initial.hue,
    saturation: initial.saturation,
    brightness: snapshot.brightness || initial.value || 100,
  };

  const root = document.createElement("div");
  root.className = "mha-light-popup-color-view";
  root.dataset.view = "color";

  const wheelPane = document.createElement("div");
  wheelPane.className = "mha-light-color-wheel-pane";
  const controls = document.createElement("div");
  controls.className = "mha-light-color-controls";

  const selected = document.createElement("div");
  selected.className = "mha-light-selected-color";
  const swatch = document.createElement("span");
  swatch.className = "mha-light-selected-color-swatch";
  const copy = document.createElement("span");
  const selectedLabel = document.createElement("small");
  selectedLabel.textContent = t("lightPopup.selectedColor", "Selected color");
  const hex = document.createElement("strong");
  copy.append(selectedLabel, hex);
  selected.append(swatch, copy);

  const brightnessLabel = document.createElement("label");
  brightnessLabel.className = "mha-light-color-slider-field";
  const brightnessTitle = document.createElement("span");
  const brightnessValue = document.createElement("output");
  brightnessTitle.textContent = t("lightPopup.brightness", "Brightness");
  brightnessLabel.append(brightnessTitle, brightnessValue);
  const brightness = createSlider({
    min: 1,
    max: 100,
    value: state.brightness,
    className: "mha-light-popup-slider",
    onInput: (event) => {
      state.brightness = Number(event.currentTarget.value);
      sync();
    },
  });
  brightnessLabel.append(brightness);

  const saturationLabel = document.createElement("label");
  saturationLabel.className = "mha-light-color-slider-field";
  const saturationTitle = document.createElement("span");
  const saturationValue = document.createElement("output");
  saturationTitle.textContent = t("lightPopup.saturation", "Saturation");
  saturationLabel.append(saturationTitle, saturationValue);
  const saturation = createSlider({
    min: 0,
    max: 100,
    value: state.saturation,
    className: "mha-light-popup-slider",
    onInput: (event) => {
      state.saturation = Number(event.currentTarget.value);
      sync();
    },
  });
  saturationLabel.append(saturation);

  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "mha-light-color-apply mha-button";
  apply.textContent = t("lightPopup.apply", "Apply");
  apply.onclick = () => setLightColor(
    state.hass,
    state.entityState,
    hsvToRgb(state.hue, state.saturation, 100),
    state.brightness,
  );

  const note = document.createElement("p");
  note.className = "mha-light-color-note";
  note.textContent = t("lightPopup.applyNote", "The color will be applied to the light.");

  const wheel = createColorWheel(state, () => sync());
  wheelPane.append(wheel);
  controls.append(selected, brightnessLabel, saturationLabel, apply, note);
  root.append(wheelPane, controls);

  function sync() {
    state.hue = (Number(state.hue) + 360) % 360;
    state.saturation = Math.min(100, Math.max(0, Number(state.saturation) || 0));
    state.brightness = Math.min(100, Math.max(1, Number(state.brightness) || 1));
    const rgb = hsvToRgb(state.hue, state.saturation, 100);
    const color = rgbToHex(rgb);
    swatch.style.background = color;
    hex.textContent = color.toUpperCase();
    brightnessValue.textContent = `${Math.round(state.brightness)} %`;
    saturationValue.textContent = `${Math.round(state.saturation)} %`;
    saturation.__mhaSliderApi?.setValue(state.saturation);
    brightness.__mhaSliderApi?.setValue(state.brightness);
    wheel.__mhaSync?.();
  }

  root.__mhaUpdateFromHass = (nextHass) => {
    state.hass = nextHass;
    state.entityState = nextHass?.states?.[state.entityState?.entity_id] || state.entityState;
  };
  root.__mhaDestroy = () => delete root.__mhaUpdateFromHass;
  sync();
  return root;
}
