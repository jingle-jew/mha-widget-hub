import { t } from "../i18n/index.js";
import { createToggle } from "../ui/toggle.js";

function createSection(title, children = []) {
  const section = document.createElement("section");
  section.className = "mha-settings-section";
  section.dataset.advancedSettingsSection = "true";

  const heading = document.createElement("h3");
  heading.className = "mha-settings-section-title";
  heading.textContent = title;
  section.append(heading, ...children);
  return section;
}

function createAdvancedTile({ onClick } = {}) {
  const button = document.createElement("button");
  button.className = "mha-settings-nav-tile";
  button.type = "button";
  button.dataset.advancedSettingsEntry = "true";
  button.addEventListener("click", () => onClick?.());

  const text = document.createElement("span");
  text.className = "mha-settings-nav-text";

  const title = document.createElement("strong");
  title.textContent = t("settings.advanced", "Advanced");

  const description = document.createElement("small");
  description.textContent = t(
    "settings.advancedDescription",
    "Privacy-sensitive and device-level options.",
  );

  const chevron = document.createElement("span");
  chevron.className = "mha-settings-nav-chevron";
  chevron.textContent = "›";

  text.append(title, description);
  button.append(text, chevron);
  return button;
}

function createDeviceInsightsSwitch({ checked = false, onChange } = {}) {
  const field = document.createElement("div");
  field.className = "mha-settings-switch";

  const text = document.createElement("span");
  text.className = "mha-settings-text";

  const label = document.createElement("span");
  label.className = "mha-settings-label";
  label.textContent = t(
    "settings.deviceInsightsShare",
    "Share this device's stats with MHA Insights",
  );

  const description = document.createElement("small");
  description.className = "mha-settings-description";
  description.textContent = t(
    "settings.deviceInsightsShareDescription",
    "Publishes a non-sensitive summary: pages, widgets, widget types, theme and last activity. Entity values, media, calendars and detailed history are not shared.",
  );

  text.append(label, description);

  const toggle = createToggle({
    label: label.textContent,
    checked,
    className: "mha-settings-toggle",
    onChange: event => onChange?.(Boolean(event.currentTarget?.checked)),
  });

  const input = toggle.querySelector(".mha-toggle-input");
  if (input) {
    input.dataset.settingsControl = "device-insights-enabled";
    input.dataset.settingsValueControl = "true";
  }

  text.addEventListener("click", () => input?.click());
  field.append(text, toggle);
  return field;
}

function ensureAdvancedBackButton(panel, onBack) {
  const actions = panel.querySelector(".mha-settings-header-actions");
  if (!actions || actions.querySelector("[data-advanced-settings-back]")) return;

  const back = document.createElement("button");
  back.className = "mha-settings-back";
  back.type = "button";
  back.dataset.advancedSettingsBack = "true";
  back.setAttribute("aria-label", t("settings.backToSettings", "Back to settings"));
  back.textContent = "←";
  back.addEventListener("click", () => onBack?.());
  actions.prepend(back);
}

function renderAdvancedPanel(panel, props = {}) {
  const title = panel.querySelector(".mha-settings-title");
  if (title) title.textContent = t("settings.advanced", "Advanced");

  ensureAdvancedBackButton(panel, props.onAdvancedMainBack);

  const body = panel.querySelector(".mha-settings-body");
  if (!body) return panel;
  body.replaceChildren(createSection(t("settings.deviceInsights", "MHA Insights"), [
    createDeviceInsightsSwitch({
      checked: Boolean(props.deviceInsightsEnabled),
      onChange: props.onDeviceInsightsEnabledChange,
    }),
  ]));
  return panel;
}

function appendAdvancedEntry(panel, props = {}) {
  const body = panel.querySelector(".mha-settings-body");
  if (!body || body.querySelector("[data-advanced-settings-section]")) return panel;

  const layoutSection = [...body.querySelectorAll(".mha-settings-section")]
    .find(section => section.querySelector(".mha-settings-section-title")?.textContent === t("settings.layout", "Layout"));
  const section = createSection(t("settings.advanced", "Advanced"), [
    createAdvancedTile({ onClick: props.onOpenAdvancedSettings }),
  ]);

  if (layoutSection) {
    body.insertBefore(section, layoutSection);
  } else {
    body.append(section);
  }
  return panel;
}

export function appendAdvancedSettingsControls(panel, props = {}) {
  if (!panel || panel.dataset.settingsScope !== "all") return panel;
  if (panel.dataset.settingsPage === "advanced") return renderAdvancedPanel(panel, props);
  if (panel.dataset.settingsPage === "main") return appendAdvancedEntry(panel, props);
  return panel;
}
