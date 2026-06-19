import { getLanguage, t } from "../i18n/index.js";
import {
  getStoredLayoutMode,
  normalizeLayoutMode,
  writeStoredLayoutMode,
} from "../layout/layout-mode.js";

const LAYOUT_MODE_OPTIONS = Object.freeze([
  { value: "auto", label: "Auto" },
  { value: "mobile", label: "Mobile" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
]);

const LOCAL_LABELS = Object.freeze({
  en: Object.freeze({
    layoutMode: "Layout mode",
    auto: "Auto",
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
  }),
  fr: Object.freeze({
    layoutMode: "Mode de disposition",
    auto: "Auto",
    mobile: "Mobile",
    tablet: "Tablette",
    desktop: "Bureau",
  }),
  es: Object.freeze({
    layoutMode: "Modo de diseño",
    auto: "Auto",
    mobile: "Móvil",
    tablet: "Tableta",
    desktop: "Escritorio",
  }),
});

function getLocalLabels() {
  return LOCAL_LABELS[getLanguage()] || LOCAL_LABELS.en;
}

function optionLabel(item = {}) {
  const labels = getLocalLabels();
  return t(`settings.layoutModes.${item.value}`, labels[item.value] || item.label);
}

function createOption(item, value) {
  const option = document.createElement("option");
  option.value = item.value;
  option.textContent = optionLabel(item);
  option.selected = item.value === value;
  return option;
}

function createLayoutModeField(panel) {
  const value = getStoredLayoutMode();
  const field = document.createElement("label");
  field.className = "mha-settings-field";
  field.dataset.layoutModeControl = "true";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = t("settings.layoutMode", getLocalLabels().layoutMode);

  const select = document.createElement("select");
  select.className = "mha-settings-select";
  select.dataset.settingsControl = "layout-mode";
  select.dataset.settingsValueControl = "true";
  select.append(...LAYOUT_MODE_OPTIONS.map(item => createOption(item, value)));
  select.addEventListener("change", () => applyLayoutMode(panel, select.value));

  field.append(text, select);
  return field;
}

function applyLayoutMode(panel, value = "auto") {
  const mode = normalizeLayoutMode(value);
  writeStoredLayoutMode(mode);
  document.documentElement.dataset.layoutMode = mode;

  const host = panel?.getRootNode?.()?.host;
  if (host) {
    host.dataset.layoutMode = mode;
    host.setAttribute("data-layout-mode", mode);
    host.render?.();
    return;
  }

  window.dispatchEvent(new Event("resize"));
}

export function appendLayoutModeControl(panel) {
  if (!panel || panel.dataset.settingsScope !== "all" || panel.dataset.settingsPage !== "main") {
    return panel;
  }
  if (panel.querySelector('[data-layout-mode-control="true"]')) return panel;

  const title = t("settings.layout", "Layout");
  const section = [...panel.querySelectorAll(".mha-settings-section")]
    .find(item => item.querySelector(".mha-settings-section-title")?.textContent === title);
  const heading = section?.querySelector(".mha-settings-section-title");
  if (!section || !heading) return panel;

  heading.after(createLayoutModeField(panel));
  return panel;
}
