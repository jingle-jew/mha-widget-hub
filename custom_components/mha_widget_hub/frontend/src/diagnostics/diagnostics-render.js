import {
  renderCard,
  renderExtensionPanelShell,
  renderMetric,
} from "../extensions/extension-panel-shell.js";
import { renderExtensionPanelAppearanceControl } from "../extensions/extension-panel-appearance-control.js";
import { DIAGNOSTICS_TITLE, FRONTEND_VERSION } from "./diagnostics-constants.js";

function countMhaStorageKeys() {
  try {
    return Object.keys(localStorage).filter(key => key.startsWith("mha-")).length;
  } catch (_error) {
    return 0;
  }
}

function countStates(hass) {
  return Object.keys(hass?.states || {}).length;
}

function yesNo(value) {
  return value ? "Yes" : "No";
}

function renderOverviewCard({ hass }) {
  return renderCard(
    "Overview",
    [
      renderMetric("Panel", DIAGNOSTICS_TITLE, "Optional sidebar module"),
      renderMetric("Home Assistant connection", yesNo(Boolean(hass)), "Read-only shell check"),
      renderMetric("HA entities visible to panel", String(countStates(hass)), "Count only, no entity data shown"),
    ].join(""),
    {
      eyebrow: "Status",
      description: "High-level state for the MHA Insights extension panel.",
    },
  );
}

function renderUsageCard() {
  return renderCard(
    "Usage Stats",
    [
      renderMetric("MHA local storage keys", String(countMhaStorageKeys()), "Local device only"),
      renderMetric("Widget stats", "Coming next", "Planned read-only dashboard usage summary"),
      renderMetric("Page stats", "Coming next", "Planned pages/widgets overview"),
    ].join(""),
    {
      eyebrow: "Stats",
      description: "This section will become the safe, non-sensitive stats view.",
    },
  );
}

function renderAppearanceCard({ appearance }) {
  const state = appearance?.state || {};
  return renderCard(
    "Appearance",
    [
      renderMetric("Mode", appearance?.mode === "custom" ? "Custom" : "Follow MHA", "Per-panel appearance contract"),
      renderMetric("Theme", state.theme || "unknown", state.themeSetting ? `Setting: ${state.themeSetting}` : ""),
      renderMetric("Style", state.themeStyle || "unknown", state.iosGlass ? `iOS glass: ${state.iosGlass}` : ""),
      renderMetric("Accent", state.accent || "unknown", state.accentMode ? `Mode: ${state.accentMode}` : ""),
    ].join(""),
    {
      eyebrow: "Theme",
      description: "Effective theme values applied to this panel.",
    },
  );
}

function renderConfigurationCard() {
  return renderCard(
    "Configuration",
    [
      renderMetric("Diagnostics module", "Available", "Toggleable from MHA options"),
      renderMetric("Dashboard module", "Always enabled", "Current phase guardrail"),
      renderMetric("Theme Builder", "Unavailable", "Future optional module"),
    ].join(""),
    {
      eyebrow: "Modules",
      description: "Safe module availability summary for this phase.",
    },
  );
}

function renderSupportCard() {
  return renderCard(
    "Support Info",
    [
      renderMetric("Frontend version", FRONTEND_VERSION || "dev", "Loader query version"),
      renderMetric("Custom element", "mha-diagnostics-panel", "Dedicated extension entrypoint"),
      renderMetric("Runtime", "Read-only", "No admin writes or destructive actions"),
    ].join(""),
    {
      eyebrow: "Support",
      description: "Small facts that help debug the panel without exposing sensitive data.",
    },
  );
}

export function renderDiagnosticsPanel(root, { linksHtml = "", appearance, hass } = {}) {
  const appearanceHtml = renderExtensionPanelAppearanceControl({ appearance });
  const contentHtml = [
    renderOverviewCard({ hass }),
    renderUsageCard(),
    renderAppearanceCard({ appearance }),
    renderConfigurationCard(),
    renderSupportCard(),
  ].join("");

  root.innerHTML = `
    ${linksHtml}
    ${renderExtensionPanelShell({
      title: DIAGNOSTICS_TITLE,
      eyebrow: "MHA Diagnostics / Stats",
      description: "A safe read-only space for useful MHA stats, appearance state and support information.",
      appearanceHtml,
      contentHtml,
    })}
  `;
}
