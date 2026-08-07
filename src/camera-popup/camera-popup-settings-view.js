import { t } from "../i18n/index.js";
import { createSlider } from "../ui/slider.js";
import { normalizeCameraPopupConfig } from "./camera-popup-config.js";

function createField(labelText, control, { hint = "" } = {}) {
  const field = document.createElement("label");
  field.className = "mha-camera-popup-settings-field";
  const label = document.createElement("span");
  label.textContent = labelText;
  field.append(label, control);
  if (hint) {
    const hintNode = document.createElement("small");
    hintNode.textContent = hint;
    field.append(hintNode);
  }
  return field;
}

export function createCameraPopupSettingsView({
  config,
  onCancel,
  onSave,
} = {}) {
  const draft = structuredClone(normalizeCameraPopupConfig(config));
  const root = document.createElement("section");
  root.className = "mha-camera-popup-settings";
  root.setAttribute("aria-label", t("cameraPopup.settings", "PTZ settings"));

  const heading = document.createElement("div");
  heading.className = "mha-camera-popup-settings-heading";
  const title = document.createElement("h3");
  title.textContent = t("cameraPopup.settings", "PTZ settings");
  const provider = document.createElement("span");
  provider.textContent = t(`cameraPopup.providers.${draft.ptz.provider}`, draft.ptz.provider);
  heading.append(title, provider);

  const speedOutput = document.createElement("output");
  speedOutput.textContent = `${Math.round(draft.ptz.speed * 100)} %`;
  const speed = createSlider({
    label: t("cameraPopup.speed", "PTZ speed"),
    min: 0,
    max: 100,
    value: Math.round(draft.ptz.speed * 100),
    className: "mha-camera-popup-speed-slider",
    onInput: (event) => {
      draft.ptz.speed = Number(event.currentTarget.value) / 100;
      speedOutput.textContent = `${Math.round(draft.ptz.speed * 100)} %`;
    },
  });
  const speedRow = document.createElement("div");
  speedRow.className = "mha-camera-popup-speed-row";
  speedRow.append(speed, speedOutput);

  const presetHeading = document.createElement("h4");
  presetHeading.textContent = t("cameraPopup.presets", "PTZ presets");
  const presetHint = document.createElement("p");
  presetHint.className = "mha-camera-popup-settings-hint";
  presetHint.textContent = t(
    "cameraPopup.presetsHint",
    "Set the visible label and the preset token expected by the camera integration.",
  );

  const presets = document.createElement("div");
  presets.className = "mha-camera-popup-settings-presets";
  draft.ptz.presets.forEach((preset, index) => {
    const row = document.createElement("div");
    row.className = "mha-camera-popup-preset-config";
    row.dataset.home = String(preset.home);

    const slot = document.createElement("strong");
    slot.textContent = preset.home
      ? t("cameraPopup.home", "Home")
      : t("cameraPopup.presetNumber", "Preset {count}").replace("{count}", String(index));

    const label = document.createElement("input");
    label.className = "mha-widget-config-control";
    label.value = preset.label;
    label.setAttribute("aria-label", t("cameraPopup.presetLabel", "Preset label"));
    label.addEventListener("input", (event) => {
      preset.label = String(event.currentTarget.value || "");
    });

    const value = document.createElement("input");
    value.className = "mha-widget-config-control";
    value.value = preset.value;
    value.setAttribute("aria-label", t("cameraPopup.presetValue", "Preset token"));
    value.addEventListener("input", (event) => {
      preset.value = String(event.currentTarget.value || "");
    });

    row.append(
      slot,
      createField(t("cameraPopup.presetLabel", "Label"), label),
      createField(t("cameraPopup.presetValue", "Token"), value),
    );
    presets.append(row);
  });

  const actions = document.createElement("div");
  actions.className = "mha-camera-popup-settings-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "mha-button";
  cancel.textContent = t("common.cancel", "Cancel");
  cancel.onclick = () => onCancel?.();
  const save = document.createElement("button");
  save.type = "button";
  save.className = "mha-button";
  save.dataset.variant = "primary";
  save.textContent = t("common.save", "Save");
  save.onclick = () => onSave?.(normalizeCameraPopupConfig(draft));
  actions.append(cancel, save);

  root.append(heading, speedRow, presetHeading, presetHint, presets, actions);
  return root;
}
