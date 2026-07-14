import { t } from "../i18n/index.js";
import { findThemeStyleId } from "../settings/theme-registry.js";
import {
  createWeatherPageSeed,
  discoverWeatherPageSeed,
} from "./weather-page-seed.js";

export const PAGE_TYPES = Object.freeze({
  GRID: "grid",
  MEDIA_PLAYERS: "media-players",
  WEATHER: "weather",
});

export const MEDIA_PAGE_VISUAL_STYLES = Object.freeze([
  "theme",
  "liquid-glass",
  "frosted-glass",
  "oneui",
  "material-you",
  "alexa",
]);

const MEDIA_PAGE_THEME_STYLES = new Set(["oneui", "ios", "material"]);

export function normalizePageType(type = PAGE_TYPES.GRID) {
  return Object.values(PAGE_TYPES).includes(type) ? type : PAGE_TYPES.GRID;
}

export function normalizeWeatherPageConfig(config = {}) {
  const autoDetectedMetricKeys = [...new Set(
    (Array.isArray(config.autoDetectedMetricKeys) ? config.autoDetectedMetricKeys : [])
      .map(key => String(key || "").trim())
      .filter(Boolean),
  )];
  const discoveryMode = config.discoveryMode === "registry"
    ? "registry"
    : "state-fallback";

  const normalized = {
    weatherEntityId: String(config.weatherEntityId || "").trim(),
    radarEntityId: String(config.radarEntityId || "").trim(),
    radarDiscoveryCompleted: config.radarDiscoveryCompleted === true,
    autoDetectedMetricKeys,
    discoveryMode,
    registryLinked: config.registryLinked === true,
  };
  if (config.autoPopulatePending === true) normalized.autoPopulatePending = true;
  return normalized;
}

export function createDefaultPageConfig(type = PAGE_TYPES.GRID, {
  availablePlayerIds = [],
  weatherEntityId = "",
} = {}) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.WEATHER) {
    return normalizeWeatherPageConfig({ weatherEntityId });
  }
  if (normalizedType !== PAGE_TYPES.MEDIA_PLAYERS) return {};

  const uniquePlayerIds = [...new Set(
    (Array.isArray(availablePlayerIds) ? availablePlayerIds : [])
      .map(id => String(id || "").trim())
      .filter(Boolean),
  )];

  return {
    enabledPlayerIds: uniquePlayerIds,
    defaultPlayerId: uniquePlayerIds[0] || "",
    selectedPlayerId: uniquePlayerIds[0] || "",
    visualStyle: "theme",
    blurBackground: true,
  };
}

export function normalizeMediaPageConfig(config = {}) {
  const enabledPlayerIds = [...new Set(
    (Array.isArray(config.enabledPlayerIds) ? config.enabledPlayerIds : [])
      .map(id => String(id || "").trim())
      .filter(Boolean),
  )];
  const enabledPlayerIdsConfigured = config.enabledPlayerIdsConfigured === true;
  const defaultPlayerId = String(config.defaultPlayerId || "").trim();
  const selectedPlayerId = String(config.selectedPlayerId || "").trim();
  const visualStyle = MEDIA_PAGE_VISUAL_STYLES.includes(config.visualStyle)
    ? config.visualStyle
    : "theme";

  const normalized = {
    enabledPlayerIds,
    defaultPlayerId,
    selectedPlayerId,
    visualStyle,
    blurBackground: config.blurBackground !== false,
  };
  if (enabledPlayerIdsConfigured) normalized.enabledPlayerIdsConfigured = true;
  return normalized;
}

export function normalizePageConfig(type = PAGE_TYPES.GRID, config = {}) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) {
    return normalizeMediaPageConfig(config);
  }
  if (normalizedType === PAGE_TYPES.WEATHER) {
    return normalizeWeatherPageConfig(config);
  }
  return {};
}

export function getDefaultPageName(type = PAGE_TYPES.GRID, index = 0) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) return "Media Players";
  if (normalizedType === PAGE_TYPES.WEATHER) return "Weather";
  return index === 0 ? "Home" : `Page ${index + 1}`;
}

export function getDefaultPageIcon(type = PAGE_TYPES.GRID) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) return "media-player";
  if (normalizedType === PAGE_TYPES.WEATHER) return "weather";
  return "grid";
}

export function isMediaPlayersPage(page = {}) {
  return normalizePageType(page?.type) === PAGE_TYPES.MEDIA_PLAYERS;
}

export function isWeatherPage(page = {}) {
  return normalizePageType(page?.type) === PAGE_TYPES.WEATHER;
}

export function isMediaPagePanelWidget(widget = {}) {
  return widget?.responsiveSizeMode === "media-page-panel"
    || widget?.variant === "media-page-panel";
}

export function hasMediaPagePanelWidget(page = {}) {
  return Boolean((page?.widgets || []).some(widget => isMediaPagePanelWidget(widget)));
}

export function supportsMediaPageTheme(themeStyle = "") {
  return MEDIA_PAGE_THEME_STYLES.has(findThemeStyleId(themeStyle));
}

export function isMediaPageExperienceActive(page = {}, themeStyle = "") {
  return supportsMediaPageTheme(themeStyle)
    && (isMediaPlayersPage(page) || hasMediaPagePanelWidget(page));
}

export function resolveMediaPageWidgetEntityId(config = {}) {
  const enabledPlayerIds = Array.isArray(config?.enabledPlayerIds)
    ? config.enabledPlayerIds
    : [];
  const selectedPlayerId = String(config?.selectedPlayerId || "").trim();
  const defaultPlayerId = String(config?.defaultPlayerId || "").trim();

  return selectedPlayerId
    || defaultPlayerId
    || enabledPlayerIds.find(Boolean)
    || "";
}

export function createMediaPageWidgetSeed({
  pageId = "media",
  pageName = "Media Players",
  config = {},
} = {}) {
  const entityId = resolveMediaPageWidgetEntityId(config);

  return {
    id: `widget-media-page-${String(pageId || "media").trim() || "media"}`,
    kind: "media",
    type: "media",
    component: "media-widget",
    category: "media",
    variant: "media-page-panel",
    responsiveSizeMode: "media-page-panel",
    w: 4,
    h: 8,
    label: String(pageName || "Media Players"),
    title: String(pageName || "Media Players"),
    entityId,
    entity_id: entityId,
    mediaEntityId: entityId,
  };
}

export function createWeatherPageWidgets(options = {}) {
  return createWeatherPageSeed(options);
}

export async function discoverWeatherPageWidgets(options = {}) {
  return discoverWeatherPageSeed(options);
}

export function getPageCreatorTypeOptions({ themeStyle = "oneui" } = {}) {
  const options = [
    Object.freeze({
      value: PAGE_TYPES.GRID,
      icon: "grid",
      label: t("settings.pageTypeLabels.grid", "Grid"),
      description: t("settings.pageTypeDescriptions.grid", "A standard page with MHA widgets."),
    }),
  ];

  options.push(Object.freeze({
    value: PAGE_TYPES.WEATHER,
    icon: "weather",
    label: t("settings.pageTypeLabels.weather", "Weather"),
    description: t("settings.pageTypeDescriptions.weather", "A weather dashboard built from MHA widgets."),
  }));

  if (supportsMediaPageTheme(themeStyle)) {
    options.push(Object.freeze({
      value: PAGE_TYPES.MEDIA_PLAYERS,
      icon: "media-player",
      label: t("settings.pageTypeLabels.media-players", "Media"),
      description: t("settings.pageTypeDescriptions.media-players", "A dedicated page for media players."),
    }));
  }

  return options;
}

export function getMediaPageVisualStyleOptions() {
  return [
    { value: "theme", label: t("settings.mediaPageVisualStyles.theme", "Follow active theme") },
    { value: "liquid-glass", label: t("settings.mediaPageVisualStyles.liquid-glass", "Liquid Glass") },
    { value: "frosted-glass", label: t("settings.mediaPageVisualStyles.frosted-glass", "Frosted Glass") },
    { value: "oneui", label: t("settings.mediaPageVisualStyles.oneui", "One UI") },
    { value: "material-you", label: t("settings.mediaPageVisualStyles.material-you", "Material You") },
    { value: "alexa", label: t("settings.mediaPageVisualStyles.alexa", "Alexa") },
  ];
}
