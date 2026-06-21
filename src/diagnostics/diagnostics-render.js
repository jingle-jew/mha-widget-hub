import {
  renderCard,
  renderExtensionPanelShell,
  renderMetric,
} from "../extensions/extension-panel-shell.js";
import { renderExtensionPanelAppearanceControl } from "../extensions/extension-panel-appearance-control.js";
import { collectDiagnosticsStats } from "./diagnostics-data.js";
import { DIAGNOSTICS_TITLE, FRONTEND_VERSION } from "./diagnostics-constants.js";

function yesNo(value) {
  return value ? "Yes" : "No";
}

function formatListSummary(items = [], labelKey = "kind", empty = "None yet") {
  if (!items.length) return empty;
  return items
    .slice(0, 3)
    .map(item => `${item[labelKey]} ×${item.count}`)
    .join(", ");
}

function renderOverviewCard({ hass, stats }) {
  return renderCard(
    "Overview",
    [
      renderMetric("Panel", DIAGNOSTICS_TITLE, "Optional sidebar module"),
      renderMetric("Pages", String(stats.totals.pages), stats.activePage ? `Active: ${stats.activePage.name || stats.activePage.id}` : "No active page found"),
      renderMetric("Widgets", String(stats.totals.widgets), `${stats.totals.widgetKinds} widget type${stats.totals.widgetKinds === 1 ? "" : "s"}`),
      renderMetric("Home Assistant connection", yesNo(Boolean(hass)), `${stats.totals.hassEntities} HA entities visible to panel`),
    ].join(""),
    {
      eyebrow: "Status",
      description: "High-level read-only state for this MHA install on the current device.",
    },
  );
}

function renderUsageCard({ stats }) {
  return renderCard(
    "Usage Stats",
    [
      renderMetric("Widget mix", formatListSummary(stats.widgetKinds, "kind"), "Top widget types on this device"),
      renderMetric("Empty pages", String(stats.emptyPages.length), "Pages with no widgets"),
      renderMetric("Configured entity refs", String(stats.totals.configuredEntities), formatListSummary(stats.entityDomains, "domain", "No entity refs found")),
    ].join(""),
    {
      eyebrow: "Stats",
      description: "Local dashboard stats from MHA storage. No entity states or sensitive values are shown.",
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

function renderConfigurationCard({ stats }) {
  return renderCard(
    "Configuration",
    [
      renderMetric("Diagnostics module", "Available", "Toggleable from MHA options"),
      renderMetric("Dashboard module", "Always enabled", "Current phase guardrail"),
      renderMetric("Theme Builder", "Unavailable", "Future optional module"),
      renderMetric("Storage health", stats.storage.hasPages ? "Pages found" : "No pages key", `${stats.storage.keyCount} MHA local keys`),
    ].join(""),
    {
      eyebrow: "Modules",
      description: "Safe module and storage availability summary for this phase.",
    },
  );
}

function renderSupportCard({ stats }) {
  return renderCard(
    "Support Info",
    [
      renderMetric("Frontend version", FRONTEND_VERSION || "dev", "Loader query version"),
      renderMetric("Custom element", "mha-diagnostics-panel", "Dedicated extension entrypoint"),
      renderMetric("Runtime", "Read-only", "No admin writes or destructive actions"),
      renderMetric("Panel override saved", yesNo(stats.storage.hasPanelAppearance), "Local appearance override storage"),
    ].join(""),
    {
      eyebrow: "Support",
      description: "Small facts that help debug the panel without exposing sensitive data.",
    },
  );
}

export function renderDiagnosticsPanel(root, { linksHtml = "", appearance, hass } = {}) {
  const stats = collectDiagnosticsStats({ hass });
  const appearanceHtml = renderExtensionPanelAppearanceControl({ appearance });
  const contentHtml = [
    renderOverviewCard({ hass, stats }),
    renderUsageCard({ stats }),
    renderAppearanceCard({ appearance }),
    renderConfigurationCard({ stats }),
    renderSupportCard({ stats }),
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
