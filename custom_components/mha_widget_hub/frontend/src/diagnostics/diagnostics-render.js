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

function formatCountMap(value = {}, empty = "None yet") {
  const entries = Object.entries(value || {})
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3);
  if (!entries.length) return empty;
  return entries.map(([name, count]) => `${name} ×${count}`).join(", ");
}

function formatLastSeen(value = "") {
  const timestamp = Date.parse(value);
  if (!timestamp) return "unknown";
  const diffMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours} h ago`;
  return `${Math.round(diffHours / 24)} d ago`;
}

function getLatestDevice(devices = []) {
  return [...devices].sort((a, b) => Date.parse(b.last_seen || "") - Date.parse(a.last_seen || ""))[0] || null;
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
      eyebrow: "Current device",
      description: "Local dashboard stats from MHA storage. No entity states or sensitive values are shown.",
    },
  );
}

function renderMultiDeviceCard({ deviceInsights = {} }) {
  const devices = Array.isArray(deviceInsights.devices) ? deviceInsights.devices : [];
  const latest = getLatestDevice(devices);
  const totalWidgets = devices.reduce((sum, device) => sum + (Number(device.widgets) || 0), 0);
  const totalPages = devices.reduce((sum, device) => sum + (Number(device.pages) || 0), 0);

  const details = deviceInsights.loading
    ? "Loading opt-in device snapshots"
    : deviceInsights.error || "Only devices that enabled sharing appear here";

  return renderCard(
    "All Devices",
    [
      renderMetric("Opt-in devices", String(devices.length), details),
      renderMetric("Total pages", String(totalPages), "Across published snapshots"),
      renderMetric("Total widgets", String(totalWidgets), "Across published snapshots"),
      renderMetric(
        "Latest device",
        latest?.device_name || "None yet",
        latest ? `${formatLastSeen(latest.last_seen)} · ${latest.theme_style || "unknown"} / ${latest.theme || "unknown"}` : "Enable sharing on a device to publish a snapshot",
      ),
      renderMetric(
        "Top published mix",
        latest ? formatCountMap(latest.widget_kinds) : "None yet",
        latest ? `From ${latest.device_name || latest.device_id}` : "No snapshots loaded",
      ),
    ].join(""),
    {
      eyebrow: "Multi-device",
      description: "Opt-in snapshots from other MHA devices. No entity values, media, calendars or detailed history are displayed.",
    },
  );
}

function renderAppearanceCard({ appearance }) {
  const state = appearance?.state || {};
  return renderCard(
    "Appearance",
    [
      renderMetric("Mode", appearance?.mode === "custom" ? "Custom" : "Follow MHA", "Per-panel appearance contract"),
      renderMetric("Visual style", state.themeStyle || "unknown", "Effective panel style"),
      renderMetric("Light / dark", state.theme || "unknown", state.themeSetting ? `Setting: ${state.themeSetting}` : ""),
    ].join(""),
    {
      eyebrow: "Theme",
      description: "Only the visual style and light/dark theme are configurable in this panel.",
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

export function renderDiagnosticsPanel(root, { linksHtml = "", appearance, hass, deviceInsights } = {}) {
  const stats = collectDiagnosticsStats({ hass });
  const appearanceHtml = renderExtensionPanelAppearanceControl({ appearance });
  const contentHtml = [
    renderOverviewCard({ hass, stats }),
    renderUsageCard({ stats }),
    renderMultiDeviceCard({ deviceInsights }),
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
