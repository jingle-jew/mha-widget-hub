import { getAccentOptions } from "../settings/accent-palettes.js";
import {
  EXTENSION_APPEARANCE_CUSTOM,
  EXTENSION_APPEARANCE_INHERIT,
  resetExtensionPanelAppearance,
  updateExtensionPanelAppearance,
} from "./extension-panel-appearance.js";

const THEME_OPTIONS = Object.freeze([
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
]);

const STYLE_OPTIONS = Object.freeze([
  { value: "oneui", label: "OneUI" },
  { value: "ios", label: "iOS" },
  { value: "material", label: "Material" },
]);

const IOS_GLASS_OPTIONS = Object.freeze([
  { value: "liquid", label: "Liquid Glass" },
  { value: "frosted", label: "Frosted Glass" },
]);

const ICON_SHAPE_OPTIONS = Object.freeze([
  { value: "auto", label: "Auto" },
  { value: "rounded-square", label: "Rounded square" },
  { value: "squircle", label: "Squircle" },
  { value: "circle", label: "Circle" },
]);

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderOptions(options = [], selectedValue = "") {
  return options.map(option => `
    <option value="${escapeHtml(option.value)}"${option.value === selectedValue ? " selected" : ""}>${escapeHtml(option.label)}</option>
  `).join("");
}

export function renderExtensionPanelAppearanceControl({ appearance } = {}) {
  const mode = appearance?.mode === EXTENSION_APPEARANCE_CUSTOM
    ? EXTENSION_APPEARANCE_CUSTOM
    : EXTENSION_APPEARANCE_INHERIT;
  const state = appearance?.state || {};
  const customActive = mode === EXTENSION_APPEARANCE_CUSTOM;
  const disabled = customActive ? "" : " disabled";
  const accentOptions = getAccentOptions(state.themeStyle || "oneui");

  return `
    <section class="mha-extension-appearance" data-custom-active="${customActive ? "true" : "false"}">
      <div class="mha-extension-appearance-heading">
        <div>
          <p class="mha-extension-eyebrow">Appearance</p>
          <h2>Panel appearance</h2>
        </div>
        <button class="mha-extension-reset" type="button" data-appearance-reset${customActive ? "" : " disabled"}>Reset</button>
      </div>

      <label class="mha-extension-field mha-extension-field-wide">
        <span>Mode</span>
        <select data-appearance-field="mode">
          <option value="inherit"${mode === EXTENSION_APPEARANCE_INHERIT ? " selected" : ""}>Follow MHA Widget Hub</option>
          <option value="custom"${mode === EXTENSION_APPEARANCE_CUSTOM ? " selected" : ""}>Custom for this panel</option>
        </select>
      </label>

      <div class="mha-extension-custom-grid">
        <label class="mha-extension-field">
          <span>Theme</span>
          <select data-appearance-field="themeSetting"${disabled}>${renderOptions(THEME_OPTIONS, state.themeSetting)}</select>
        </label>
        <label class="mha-extension-field">
          <span>Style</span>
          <select data-appearance-field="themeStyle"${disabled}>${renderOptions(STYLE_OPTIONS, state.themeStyle)}</select>
        </label>
        <label class="mha-extension-field">
          <span>iOS glass</span>
          <select data-appearance-field="iosGlass"${disabled}>${renderOptions(IOS_GLASS_OPTIONS, state.iosGlass)}</select>
        </label>
        <label class="mha-extension-field">
          <span>Accent</span>
          <select data-appearance-field="accent"${disabled}>${renderOptions(accentOptions, state.accent)}</select>
        </label>
        <label class="mha-extension-field">
          <span>Icon shape</span>
          <select data-appearance-field="iconShapeSetting"${disabled}>${renderOptions(ICON_SHAPE_OPTIONS, state.iconShapeSetting)}</select>
        </label>
      </div>
    </section>
  `;
}

export function bindExtensionPanelAppearanceControl(root, { panelId, appearance, onChange } = {}) {
  const modeSelect = root.querySelector("[data-appearance-field='mode']");
  const resetButton = root.querySelector("[data-appearance-reset]");
  const state = appearance?.state || {};

  modeSelect?.addEventListener("change", event => {
    const mode = event.target.value;
    if (mode === EXTENSION_APPEARANCE_INHERIT) {
      resetExtensionPanelAppearance(panelId);
      onChange?.();
      return;
    }

    updateExtensionPanelAppearance(panelId, {
      mode: EXTENSION_APPEARANCE_CUSTOM,
      themeSetting: state.themeSetting,
      themeStyle: state.themeStyle,
      iosGlass: state.iosGlass,
      accentMode: state.accentMode,
      accent: state.accent,
      iconShapeSetting: state.iconShapeSetting,
    });
    onChange?.();
  });

  resetButton?.addEventListener("click", () => {
    resetExtensionPanelAppearance(panelId);
    onChange?.();
  });

  root.querySelectorAll("[data-appearance-field]").forEach(control => {
    if (control === modeSelect) return;
    control.addEventListener("change", event => {
      updateExtensionPanelAppearance(panelId, {
        [event.target.dataset.appearanceField]: event.target.value,
      });
      onChange?.();
    });
  });
}
