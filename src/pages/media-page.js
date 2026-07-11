import { runMediaPlayerAction } from "../ha/actions.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { formatMediaDuration, getMediaStateLabel } from "../ha/media.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { findThemeStyleId } from "../settings/theme-registry.js";
import {
  buildMediaWidgetData,
  createMediaArtwork,
  createMediaPlaybackButtons,
  createMediaProgress,
  createMediaTitleStack,
  createMediaTransitionCache,
  setMediaArtworkImage,
  setMediaProgressState,
} from "../widgets/media-widget.js";

function resolveEnabledPlayerIds(config = {}, availablePlayers = []) {
  const ids = Array.isArray(config.enabledPlayerIds) ? config.enabledPlayerIds.filter(Boolean) : [];
  return ids.length ? ids : availablePlayers.map(player => player.entity_id);
}

function resolveSelectedPlayer(config = {}, players = []) {
  const ids = new Set(players.map(player => player.entity_id));
  if (config.selectedPlayerId && ids.has(config.selectedPlayerId)) return config.selectedPlayerId;
  if (config.defaultPlayerId && ids.has(config.defaultPlayerId)) return config.defaultPlayerId;
  return players[0]?.entity_id || "";
}

function createIconButton({ label, icon, className = "", onClick = () => {} } = {}) {
  const button = document.createElement("button");
  button.className = ["mha-media-page-icon-button", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.append(createIconSymbol({ name: icon, label }));
  button.addEventListener("click", () => onClick());
  return button;
}

function resolveEffectiveVisualStyle(themeStyle = "oneui", pageVisualStyle = "theme") {
  if (pageVisualStyle !== "theme") return pageVisualStyle;
  if (themeStyle === "ios") {
    const variant = globalThis.document?.documentElement?.dataset?.themeVariant || "";
    return variant === "frosted-glass" ? "frosted-glass" : "liquid-glass";
  }
  if (themeStyle === "material") return "material-you";
  if (themeStyle === "alexa") return "alexa";
  return "oneui";
}

function buildStatusLine({
  availablePlayers = [],
  selectedPlayer = null,
  entity = null,
  stateLabel = "",
  deviceName = "",
} = {}) {
  if (!availablePlayers.length) {
    return t("mediaPage.noPlayersAvailable", "No media players available");
  }
  if (!selectedPlayer) {
    return t("mediaPage.noEnabledPlayers", "No enabled players for this page");
  }
  if (!entity) {
    return t("mediaPage.playerUnavailable", "Selected player unavailable");
  }
  return t("mediaPage.statusLine", "{state} on {player}", {
    state: stateLabel,
    player: deviceName,
  });
}

function buildViewState(page = {}, hass, visibilityConfig, cache = null) {
  const availablePlayers = getEntitiesForDomain(hass, "media_player", visibilityConfig);
  const enabledPlayerIds = resolveEnabledPlayerIds(page.config, availablePlayers);
  const enabledPlayers = availablePlayers.filter(player => enabledPlayerIds.includes(player.entity_id));
  const selectedPlayerId = resolveSelectedPlayer(page.config, enabledPlayers);
  const selectedPlayer = enabledPlayers.find(player => player.entity_id === selectedPlayerId) || null;
  const media = buildMediaWidgetData({ entityId: selectedPlayerId }, hass, cache);
  const themeStyle = findThemeStyleId(globalThis.document?.documentElement?.dataset?.themeStyle || "oneui");
  const effectiveVisualStyle = resolveEffectiveVisualStyle(
    themeStyle,
    page.config?.visualStyle || "theme",
  );
  const stateLabel = media.entity ? getMediaStateLabel(media.state) : t("states.unknown", "Unknown");
  const deviceName = selectedPlayer?.name || "";

  return {
    availablePlayers,
    enabledPlayers,
    selectedPlayerId,
    selectedPlayer,
    media,
    stateLabel,
    deviceName,
    effectiveVisualStyle,
    blurBackground: page.config?.blurBackground !== false,
    statusLine: buildStatusLine({
      availablePlayers,
      selectedPlayer,
      entity: media.entity,
      stateLabel,
      deviceName,
    }),
  };
}

function syncControlGroup(container, buttons = []) {
  container.replaceChildren(...buttons);
}

export function createMediaPage(page = {}, {
  hass = null,
  visibilityConfig = null,
  onOpenSettings = () => {},
  onToggleEditMode = () => {},
  onOpenWidgetManager = () => {},
  onCloseEditMode = () => {},
  onBackgroundArtworkChange = () => {},
} = {}) {
  const root = document.createElement("section");
  root.className = "mha-media-page";
  root.dataset.widgetComponent = "media-page";
  root.setAttribute("aria-label", t("mediaPage.ariaLabel", "Media players page"));

  const background = document.createElement("div");
  background.className = "mha-media-page-background";
  background.setAttribute("aria-hidden", "true");

  const layout = document.createElement("div");
  layout.className = "mha-media-page-layout";

  const nowPlaying = document.createElement("section");
  nowPlaying.className = "mha-media-page-now-playing";

  const nowPlayingShell = document.createElement("div");
  nowPlayingShell.className = "mha-media-page-now-playing-shell";

  const artwork = createMediaArtwork({
    artworkUrl: "",
    playing: false,
  });

  const artworkSection = document.createElement("div");
  artworkSection.className = "mha-media-page-artwork-section";

  const settingsButton = createIconButton({
    label: t("mediaPage.openSettings", "Open media page settings"),
    icon: "gear",
    className: "mha-media-page-artwork-settings",
    onClick: onOpenSettings,
  });
  artworkSection.append(artwork, settingsButton);

  const primary = document.createElement("div");
  primary.className = "mha-media-page-primary";

  const titleStack = createMediaTitleStack({
    title: t("mediaPage.nothingPlaying", "Nothing playing"),
    subtitle: t("mediaPage.ready", "Ready"),
  });
  const titleNode = titleStack.querySelector(".mha-media-widget-title");
  const subtitleNode = titleStack.querySelector(".mha-media-widget-artist");

  const transport = document.createElement("div");
  transport.className = "mha-media-page-transport";

  const progress = createMediaProgress({
    progress: { available: false, current: 0, duration: 0, ratio: 0 },
  }, {
    includeLabels: true,
  });
  const progressTrack = progress.querySelector(".mha-media-widget-progress");
  const progressCurrent = progress.querySelector(".mha-media-widget-progress-current");
  const progressDuration = progress.querySelector(".mha-media-widget-progress-duration");

  const controls = document.createElement("div");
  controls.className = "mha-media-page-controls";

  const playbackGroup = document.createElement("div");
  playbackGroup.className = "mha-media-page-control-group mha-media-page-control-group--playback";
  controls.append(playbackGroup);

  transport.append(progress);
  primary.append(titleStack, transport);
  nowPlayingShell.append(artworkSection, primary, controls);
  nowPlaying.append(nowPlayingShell);

  const widgetPanel = document.createElement("aside");
  widgetPanel.className = "mha-media-page-widget-panel mha-page-panel--grid";

  const widgetPanelHeader = document.createElement("div");
  widgetPanelHeader.className = "mha-media-page-widget-panel-header";

  const widgetPanelTitle = document.createElement("h2");
  widgetPanelTitle.className = "mha-media-page-widget-panel-title";
  widgetPanelTitle.textContent = t("mediaPage.availablePlayers", "Available players");

  const widgetPanelActions = document.createElement("div");
  widgetPanelActions.className = "mha-media-page-widget-panel-actions";

  const editButton = createIconButton({
    label: t("common.edit", "Edit"),
    icon: "edit",
    className: "mha-media-page-widget-panel-edit",
    onClick: onToggleEditMode,
  });

  const addButton = createIconButton({
    label: t("settings.addWidget", "Add widget"),
    icon: "plus",
    className: "mha-media-page-widget-panel-add",
    onClick: onOpenWidgetManager,
  });

  const closeEditButton = createIconButton({
    label: t("common.close", "Close"),
    icon: "close",
    className: "mha-media-page-widget-panel-close",
    onClick: onCloseEditMode,
  });
  widgetPanelActions.append(editButton, addButton, closeEditButton);

  const widgetPanelBody = document.createElement("div");
  widgetPanelBody.className = "mha-media-page-widget-panel-body";

  const grid = document.createElement("section");
  grid.className = "mha-grid mha-media-page-widget-grid";
  grid.setAttribute("aria-label", t("settings.widgetGrid", "Widget grid"));
  if (grid.dataset) grid.dataset.pageType = page?.type || "media-players";

  const emptyState = document.createElement("p");
  emptyState.className = "mha-media-page-widget-empty";
  emptyState.textContent = t(
    "mediaPage.widgetGridHint",
    "Add media widgets here to build the player list.",
  );

  widgetPanelHeader.append(widgetPanelTitle, widgetPanelActions);
  widgetPanelBody.append(grid, emptyState);
  widgetPanel.append(widgetPanelHeader, widgetPanelBody);

  layout.append(nowPlaying, widgetPanel);
  root.append(background, layout);
  root.__mhaGrid = grid;

  let progressTimer = 0;
  let visualTransitionTimer = 0;
  const transitionCache = createMediaTransitionCache();
  const context = {
    page,
    hass,
    visibilityConfig,
    view: buildViewState(page, hass, visibilityConfig, transitionCache),
    artwork,
  };

  const onAction = (action) => {
    if (!context.view.media.entity) return;
    runMediaPlayerAction(context.hass, context.view.media.entity, action);
  };

  const applyProgress = (view) => {
    setMediaProgressState(progressTrack, view.media);
    if (progressCurrent) {
      progressCurrent.textContent = view.media.progress?.available
        ? formatMediaDuration(view.media.progress.current)
        : "--:--";
    }
    if (progressDuration) {
      progressDuration.textContent = view.media.progress?.available
        ? formatMediaDuration(view.media.progress.duration)
        : "--:--";
    }
  };

  const applySurfaceState = (view) => {
    root.dataset.visualStyle = view.effectiveVisualStyle;
    root.dataset.hasArtwork = String(Boolean(view.media.artworkUrl));
    root.dataset.backgroundBlur = String(view.blurBackground);
    onBackgroundArtworkChange(view.media.artworkUrl || "", {
      blurBackground: view.blurBackground,
    });
  };

  const beginVisualTransition = () => {
    clearTimeout(visualTransitionTimer);
    root.dataset.visualTransition = "false";
    requestAnimationFrame(() => {
      root.dataset.visualTransition = "true";
      visualTransitionTimer = globalThis.setTimeout(() => {
        visualTransitionTimer = 0;
        root.dataset.visualTransition = "false";
      }, 280);
    });
  };

  const applyView = (view, { progressOnly = false, styleOnly = false } = {}) => {
    const previousView = context.view;
    context.view = view;
    if (progressOnly) {
      applyProgress(view);
      return;
    }

    applySurfaceState(view);
    if (styleOnly) {
      const visualStyleChanged = previousView?.effectiveVisualStyle !== view.effectiveVisualStyle;
      const blurChanged = previousView?.blurBackground !== view.blurBackground;
      if (visualStyleChanged || blurChanged) beginVisualTransition();
      return;
    }

    const hasSelectedEntity = Boolean(view.media.entity);
    if (titleNode) titleNode.textContent = view.media.title || t("mediaPage.nothingPlaying", "Nothing playing");
    if (subtitleNode) {
      subtitleNode.textContent = hasSelectedEntity
        ? (view.media.subtitle || t("mediaPage.ready", "Ready"))
        : view.statusLine;
    }
    setMediaArtworkImage(context.artwork, view.media.artworkUrl);
    context.artwork.dataset.playing = String(view.media.playing);

    syncControlGroup(
      playbackGroup,
      createMediaPlaybackButtons(view.media, { onAction }),
    );
    applyProgress(view);
  };

  const refresh = ({ progressOnly = false } = {}) => {
    const nextView = buildViewState(context.page, context.hass, context.visibilityConfig, transitionCache);
    applyView(nextView, { progressOnly });
  };

  const syncProgressTicker = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = 0;
    }
    if (context.view.media.entity?.state !== "playing" || !context.view.media.progress.available) return;
    progressTimer = window.setInterval(() => {
      refresh({ progressOnly: true });
    }, 1000);
  };

  applyView(context.view);
  syncProgressTicker();

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    refresh();
    syncProgressTicker();
  };

  root.__mhaUpdatePage = (nextPage, options = {}) => {
    context.page = nextPage || context.page;
    const styleOnly = options?.styleOnly === true;
    if (styleOnly) {
      const nextView = buildViewState(context.page, context.hass, context.visibilityConfig, transitionCache);
      applyView(nextView, { styleOnly: true });
      return;
    }
    refresh();
    syncProgressTicker();
  };

  root.__mhaDestroy = () => {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = 0;
    if (visualTransitionTimer) clearTimeout(visualTransitionTimer);
    visualTransitionTimer = 0;
  };

  return root;
}
