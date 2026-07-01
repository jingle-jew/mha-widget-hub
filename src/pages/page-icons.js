import { t } from "../i18n/index.js";

export const PAGE_ICON_OPTIONS = Object.freeze([
  { name: "home", label: "Home", labelKey: "settings.dockIconLabels.home", category: "home" },
  { name: "dashboard", label: "Dashboard", labelKey: "settings.dockIconLabels.dashboard", category: "navigation" },
  { name: "apps", label: "Applications", labelKey: "settings.dockIconLabels.apps", category: "system" },
  { name: "grid", label: "Grid", labelKey: "settings.dockIconLabels.grid", category: "navigation" },
  { name: "light", label: "Lights", labelKey: "settings.dockIconLabels.light", category: "lighting" },
  { name: "weather", label: "Weather", labelKey: "settings.dockIconLabels.weather", category: "weather" },
  { name: "media-player", label: "Media", labelKey: "settings.dockIconLabels.media-player", category: "media_player" },
  { name: "calendar", label: "Calendar", labelKey: "settings.dockIconLabels.calendar", category: "utility" },
  { name: "star", label: "Favorite", labelKey: "settings.dockIconLabels.star", category: "utility" },
  { name: "gear", label: "Settings", labelKey: "settings.dockIconLabels.gear", category: "system" },
]);

export function getPageIconLabel(item = {}) {
  return item.labelKey ? t(item.labelKey, item.label) : item.label;
}
