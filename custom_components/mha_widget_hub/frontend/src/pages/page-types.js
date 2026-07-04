import { t } from "../i18n/index.js";

export const PAGE_TYPES = Object.freeze({
  GRID: "grid",
  MEDIA_PLAYERS: "media-players",
});

export const MEDIA_PAGE_VISUAL_STYLES = Object.freeze([
  "theme",
  "liquid-glass",
  "frosted-glass",
  "oneui",
  "material-you",
  "alexa",
]);

export function normalizePageType(type = PAGE_TYPES.GRID) {
  return Object.values(PAGE_TYPES).includes(type) ? type : PAGE_TYPES.GRID;
}

export function createDefaultPageConfig(type = PAGE_TYPES.GRID, {
  availablePlayerIds = [],
} = {}) {
  const normalizedType = normalizePageType(type);
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
  const defaultPlayerId = String(config.defaultPlayerId || "").trim();
  const selectedPlayerId = String(config.selectedPlayerId || "").trim();
  const visualStyle = MEDIA_PAGE_VISUAL_STYLES.includes(config.visualStyle)
    ? config.visualStyle
    : "theme";

  return {
    enabledPlayerIds,
    defaultPlayerId,
    selectedPlayerId,
    visualStyle,
    blurBackground: config.blurBackground !== false,
  };
}

export function normalizePageConfig(type = PAGE_TYPES.GRID, config = {}) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) {
    return normalizeMediaPageConfig(config);
  }
  return {};
}

export function getDefaultPageName(type = PAGE_TYPES.GRID, index = 0) {
  const normalizedType = normalizePageType(type);
  if (normalizedType === PAGE_TYPES.MEDIA_PLAYERS) return "Media Players";
  return index === 0 ? "Home" : `Page ${index + 1}`;
}

export function getDefaultPageIcon(type = PAGE_TYPES.GRID) {
  const normalizedType = normalizePageType(type);
  return normalizedType === PAGE_TYPES.MEDIA_PLAYERS ? "media-player" : "grid";
}

export function isMediaPlayersPage(page = {}) {
  return normalizePageType(page?.type) === PAGE_TYPES.MEDIA_PLAYERS;
}

export function hasMediaPagePanelWidget(page = {}) {
  return Boolean((page?.widgets || []).some(widget => (
    widget?.responsiveSizeMode === "media-page-panel"
    || widget?.variant === "media-page-panel"
  )));
}

export function isOneUiMediaPageTheme(themeStyle = "") {
  return String(themeStyle || "").trim().toLowerCase() === "oneui";
}

export function isMediaPageExperienceActive(page = {}, themeStyle = "") {
  return isOneUiMediaPageTheme(themeStyle)
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

export function getPageCreatorTypeOptions({ themeStyle = "oneui" } = {}) {
  const options = [
    Object.freeze({
      value: PAGE_TYPES.GRID,
      icon: "grid",
      label: t("settings.pageTypeLabels.grid", "Grid"),
      description: t("settings.pageTypeDescriptions.grid", "A standard page with MHA widgets."),
    }),
  ];

  if (isOneUiMediaPageTheme(themeStyle)) {
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
