import { collectDiagnosticsStats } from "../diagnostics/diagnostics-data.js";
import { readThemeState } from "../settings/theme-controller.js";
import { readDeviceInsightsLocalState } from "./device-insights-storage.js";

function toCountMap(items = [], keyName = "kind") {
  return Object.fromEntries(
    items
      .filter(item => item && item[keyName])
      .map(item => [String(item[keyName]), Number(item.count) || 0]),
  );
}

export function buildDeviceInsightsSnapshot({ host, hass } = {}) {
  const localState = readDeviceInsightsLocalState();
  const stats = collectDiagnosticsStats({ hass });
  const themeState = host?._themeController?.read?.() || readThemeState(host);

  return {
    device_id: localState.deviceId,
    device_name: localState.deviceName,
    pages: stats.totals.pages,
    widgets: stats.totals.widgets,
    empty_pages: stats.emptyPages.length,
    configured_entities: stats.totals.configuredEntities,
    widget_kinds: toCountMap(stats.widgetKinds, "kind"),
    entity_domains: toCountMap(stats.entityDomains, "domain"),
    theme: themeState.theme || "unknown",
    theme_style: themeState.themeStyle || "unknown",
    appearance_mode: "local",
    frontend_version: new URL(import.meta.url).searchParams.get("v") || "dev",
  };
}
