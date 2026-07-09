import { runMediaPlayerAction } from "../ha/actions.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { formatMediaDuration, getMediaStateLabel } from "../ha/media.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { findThemeStyleId } from "../settings/theme-registry.js";
import {
  buildMediaWidgetData,
  createMediaArtwork,
  createMediaMetaDetails,
  createMediaPlaybackButtons,
  createMediaProgress,
  createMediaSourceBadge,
  createMediaTitleStack,
  createMediaTransitionCache,
  createMediaVolumeButtons,
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

function createPlayerSelect(players = [], selectedPlayerId = "", onChange = () => {}) {
  const field = document.createElement("label");
  field.className = "mha-media-page-player-select";

  const label = document.createElement("span");
  label.className = "mha-media-page-select-label";
  label.textContent = t("mediaPage.player", "Player");

  const select = document.createElement("select");
  select.className = "mha-media-page-select";
  select.setAttribute("aria-label", t("mediaPage.player", "Player"));
  select.addEventListener("change", (event) => onChange(event.currentTarget.value));

  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.entity_id;
    option.textContent = player.name;
    option.selected = player.entity_id === selectedPlayerId;
    select.append(option);
  });

  field.append(label, select);
  return field;
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

function createMetaChip(text = "") {
  const chip = document.createElement("span");
  chip.className = "mha-media-page-chip";
  chip.textContent = text;
  return chip;
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

function syncPlayerSelect(container, view, onSelectPlayer) {
  container.replaceChildren();
  if (!view.enabledPlayers.length) return;
  container.append(createPlayerSelect(
    view.enabledPlayers,
    view.selectedPlayerId,
    playerId => onSelectPlayer(playerId),
  ));
}

function syncMetaChips(container, view) {
  container.replaceChildren(
    createMetaChip(view.deviceName || t("mediaPage.noPlayerSelected", "No player selected")),
    createMetaChip(view.stateLabel),
  );
}

function syncControlGroup(container, buttons = []) {
  container.replaceChildren(...buttons);
}

export function createMediaPage(page = {}, {
  hass = null,
  visibilityConfig = null,
  onSelectPlayer = () => {},
  onOpenSettings = () => {},
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

  const hero = document.createElement("section");
  hero.className = "mha-media-page-hero";

  const heroMedia = document.createElement("div");
  heroMedia.className = "mha-media-page-media";

  const artwork = createMediaArtwork({
    artworkUrl: "",
    playing: false,
  });

  const info = document.createElement("div");
  info.className = "mha-media-page-info";

  const topbar = document.createElement("div");
  topbar.className = "mha-media-page-topbar";

  const playerSelectSlot = document.createElement("div");
  playerSelectSlot.className = "mha-media-page-topbar-slot";

  const settingsButton = createIconButton({
    label: t("mediaPage.openSettings", "Open media page settings"),
    icon: "gear",
    onClick: onOpenSettings,
  });

  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-media-page-eyebrow";

  const titleStack = createMediaTitleStack({
    title: t("mediaPage.nothingPlaying", "Nothing playing"),
    subtitle: t("mediaPage.ready", "Ready"),
  });
  const titleNode = titleStack.querySelector(".mha-media-widget-title");
  const subtitleNode = titleStack.querySelector(".mha-media-widget-artist");

  const metaDetails = createMediaMetaDetails({ app: "MHA Media" });
  const sourceNode = metaDetails.querySelector(".mha-media-widget-source");

  const meta = document.createElement("div");
  meta.className = "mha-media-page-meta";

  const status = document.createElement("p");
  status.className = "mha-media-page-status";

  info.append(topbar, eyebrow, titleStack, metaDetails, meta, status);

  const transport = document.createElement("section");
  transport.className = "mha-media-page-transport";

  const sourceBadge = createMediaSourceBadge({ app: "MHA Media" });
  const sourceBadgeLabel = sourceBadge.querySelector(".mha-media-widget-source-badge-label");

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

  const volumeGroup = document.createElement("div");
  volumeGroup.className = "mha-media-page-control-group mha-media-page-control-group--volume";

  controls.append(playbackGroup, volumeGroup);

  transport.append(sourceBadge, progress, controls);
  heroMedia.append(artwork, info);
  hero.append(heroMedia);
  layout.append(hero, transport);
  root.append(background, layout);

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

    eyebrow.textContent = view.media.app || t("mediaPage.mediaCenter", "Media Center");
    if (titleNode) titleNode.textContent = view.media.title || t("mediaPage.nothingPlaying", "Nothing playing");
    if (subtitleNode) subtitleNode.textContent = view.media.subtitle || t("mediaPage.ready", "Ready");
    if (sourceNode) sourceNode.textContent = view.media.app;
    if (sourceBadgeLabel) sourceBadgeLabel.textContent = view.media.app;
    status.textContent = view.statusLine;
    setMediaArtworkImage(context.artwork, view.media.artworkUrl);
    context.artwork.dataset.playing = String(view.media.playing);

    syncPlayerSelect(playerSelectSlot, view, onSelectPlayer);
    syncMetaChips(meta, view);
    syncControlGroup(
      playbackGroup,
      createMediaPlaybackButtons(view.media, { onAction }),
    );
    syncControlGroup(
      volumeGroup,
      createMediaVolumeButtons(view.media, { onAction }),
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

  topbar.append(playerSelectSlot, settingsButton);
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
