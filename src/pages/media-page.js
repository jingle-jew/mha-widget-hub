import { runMediaPlayerAction } from "../ha/actions.js";
import {
  formatMediaDuration,
  getMediaStateLabel,
  isMediaPlayerInactiveState,
} from "../ha/media.js";
import {
  getAvailableMediaPlayers,
  resolveEnabledMediaPlayers,
} from "../ha/media-players.js?v=media-persistence-v2";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { findThemeStyleId } from "../settings/theme-registry.js";
import {
  buildMediaWidgetData,
  createMediaArtwork,
  createMediaPlaybackButtons,
  createMediaProgress,
  createMediaPagePlayerWidget,
  createMediaWidgetContent,
  createMediaTitleStack,
  createMediaTransitionCache,
  setMediaArtworkImage,
  setMediaProgressState,
  syncMediaArtworkTone,
} from "../widgets/media-widget.js?media-page-ios-card-v1";

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

export const MEDIA_PAGE_INACTIVE_FALLBACK_MS = 10_000;
const MOBILE_MEDIA_PAGE_SCROLL_THRESHOLD = 4;
const MOBILE_MEDIA_PAGE_RETURN_GESTURE_THRESHOLD = 12;

export function resolveMobileMediaPagePane(scrollTop = 0) {
  return Number(scrollTop || 0) <= MOBILE_MEDIA_PAGE_SCROLL_THRESHOLD
    ? "now-playing"
    : "available-players";
}

export function shouldReturnToMobileMediaNowPlaying({
  playerListScrollTop = 0,
  gestureStartedAtTop = false,
  gestureDeltaY = 0,
} = {}) {
  return Boolean(gestureStartedAtTop)
    && Number(playerListScrollTop || 0) <= MOBILE_MEDIA_PAGE_SCROLL_THRESHOLD
    && Number(gestureDeltaY || 0) <= -MOBILE_MEDIA_PAGE_RETURN_GESTURE_THRESHOLD;
}

function getMediaPageHost(root) {
  return root?.getRootNode?.()?.host || null;
}

function isMobileMediaPage(root) {
  const host = getMediaPageHost(root);
  return host?.dataset?.layout === "mobile";
}

function scrollMobileMediaPageToNowPlaying(root) {
  if (typeof root?.scrollTo === "function") {
    root.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (root) root.scrollTop = 0;
}

function createMobileMediaPageScrollCoordinator(root, playerList) {
  let touchStartY = null;
  let gestureStartedAtTop = false;

  const syncDockState = () => {
    const host = getMediaPageHost(root);
    if (!host?.classList) return "disabled";
    if (!isMobileMediaPage(root)) {
      root.dataset.mobileMediaPane = "disabled";
      host.classList.remove("is-mobile-floating-controls-hidden");
      return "disabled";
    }

    const pane = resolveMobileMediaPagePane(root.scrollTop);
    root.dataset.mobileMediaPane = pane;
    host.classList.toggle(
      "is-mobile-floating-controls-hidden",
      pane !== "now-playing",
    );
    return pane;
  };

  const reset = () => {
    root.scrollTop = 0;
    if (playerList) playerList.scrollTop = 0;
    syncDockState();
  };

  const onWheel = (event) => {
    if (!isMobileMediaPage(root)) return;
    if (!shouldReturnToMobileMediaNowPlaying({
      playerListScrollTop: playerList?.scrollTop,
      gestureStartedAtTop: true,
      gestureDeltaY: event.deltaY,
    })) return;
    event.preventDefault?.();
    scrollMobileMediaPageToNowPlaying(root);
  };

  const onTouchStart = (event) => {
    if (!isMobileMediaPage(root)) return;
    touchStartY = event.touches?.[0]?.clientY ?? null;
    gestureStartedAtTop = Number(playerList?.scrollTop || 0) <= MOBILE_MEDIA_PAGE_SCROLL_THRESHOLD;
  };

  const onTouchEnd = (event) => {
    const touchEndY = event.changedTouches?.[0]?.clientY;
    if (touchStartY === null || !Number.isFinite(touchEndY)) {
      touchStartY = null;
      gestureStartedAtTop = false;
      return;
    }

    const shouldReturn = shouldReturnToMobileMediaNowPlaying({
      playerListScrollTop: playerList?.scrollTop,
      gestureStartedAtTop,
      gestureDeltaY: touchStartY - touchEndY,
    });
    touchStartY = null;
    gestureStartedAtTop = false;
    if (shouldReturn) scrollMobileMediaPageToNowPlaying(root);
  };

  root.addEventListener("scroll", syncDockState, { passive: true });
  playerList?.addEventListener("wheel", onWheel, { passive: false });
  playerList?.addEventListener("touchstart", onTouchStart, { passive: true });
  playerList?.addEventListener("touchend", onTouchEnd, { passive: true });
  playerList?.addEventListener("touchcancel", onTouchEnd, { passive: true });

  return {
    reset,
    syncDockState,
    destroy() {
      root.removeEventListener("scroll", syncDockState);
      playerList?.removeEventListener("wheel", onWheel);
      playerList?.removeEventListener("touchstart", onTouchStart);
      playerList?.removeEventListener("touchend", onTouchEnd);
      playerList?.removeEventListener("touchcancel", onTouchEnd);
    },
  };
}

function isPlayerPlaying(hass, playerId = "") {
  return String(hass?.states?.[playerId]?.state || "").trim().toLowerCase() === "playing";
}

function isPlayerSelectedMediaState(hass, playerId = "") {
  const state = String(hass?.states?.[playerId]?.state || "").trim().toLowerCase();
  return state === "playing" || state === "paused";
}

function getEnabledPlayerIdSet(enabledPlayers = []) {
  return new Set(enabledPlayers.map(player => player.entity_id).filter(Boolean));
}

export function resolveMediaPageNowPlayingId({
  config = {},
  enabledPlayers = [],
  hass = null,
  transientPlayerId = "",
  committedPlayerId = "",
  lastPlayingPlayerId = "",
} = {}) {
  const ids = getEnabledPlayerIdSet(enabledPlayers);
  const candidates = [
    transientPlayerId,
    committedPlayerId,
    lastPlayingPlayerId,
  ];

  for (const candidate of candidates) {
    if (candidate && ids.has(candidate)) return candidate;
  }

  const configuredSelectedId = String(config?.selectedPlayerId || "").trim();
  if (configuredSelectedId && ids.has(configuredSelectedId) && isPlayerSelectedMediaState(hass, configuredSelectedId)) {
    return configuredSelectedId;
  }

  const configuredDefaultId = String(config?.defaultPlayerId || "").trim();
  if (configuredDefaultId && ids.has(configuredDefaultId)) return configuredDefaultId;
  return enabledPlayers[0]?.entity_id || "";
}

function normalizeInactiveNowPlayingMedia(media = {}) {
  if (!isMediaPlayerInactiveState(media.entity?.state)) return media;

  return {
    ...media,
    state: String(media.entity?.state || media.state || "unknown").trim().toLowerCase(),
    playing: false,
    title: media.name,
    subtitle: getMediaStateLabel(media.entity?.state || media.state),
    artist: "",
    artworkUrl: "",
    hasLiveMetadata: false,
    progress: { available: false, current: 0, duration: 0, ratio: 0 },
    usingGraceCache: false,
  };
}

function buildViewState(page = {}, hass, visibilityConfig, cache = null, selection = {}) {
  const availablePlayers = getAvailableMediaPlayers(hass, visibilityConfig);
  const enabledPlayers = resolveEnabledMediaPlayers(page.config, availablePlayers);
  const selectedPlayerId = resolveMediaPageNowPlayingId({
    config: page.config,
    enabledPlayers,
    hass,
    ...selection,
  });
  const selectedPlayer = enabledPlayers.find(player => player.entity_id === selectedPlayerId) || null;
  const media = normalizeInactiveNowPlayingMedia(
    buildMediaWidgetData({ entityId: selectedPlayerId }, hass, cache),
  );
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

export function swapOrderedIds(ids = [], sourceId = "", targetId = "") {
  const nextOrder = Array.isArray(ids) ? [...ids] : [];
  if (!sourceId || !targetId || sourceId === targetId) return nextOrder;
  const sourceIndex = nextOrder.indexOf(sourceId);
  const targetIndex = nextOrder.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) return nextOrder;
  [nextOrder[sourceIndex], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[sourceIndex]];
  return nextOrder;
}

export function createMediaPage(page = {}, {
  hass = null,
  visibilityConfig = null,
  onOpenSettings = () => {},
  onSelectPlayer = () => {},
  onReorderPlayers = () => {},
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
  artworkSection.append(artwork);

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
  widgetPanel.className = "mha-media-page-widget-panel";

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

  const closeEditButton = createIconButton({
    label: t("common.close", "Close"),
    icon: "close",
    className: "mha-media-page-widget-panel-close",
    onClick: onCloseEditMode,
  });
  settingsButton.className = "mha-media-page-icon-button mha-media-page-widget-panel-settings";
  widgetPanelActions.append(editButton, settingsButton, closeEditButton);

  const widgetPanelBody = document.createElement("div");
  widgetPanelBody.className = "mha-media-page-widget-panel-body";

  const playerList = document.createElement("section");
  playerList.className = "mha-media-page-player-list";
  playerList.setAttribute("aria-label", t("mediaPage.availablePlayers", "Available players"));
  playerList.setAttribute("role", "list");

  const emptyState = document.createElement("p");
  emptyState.className = "mha-media-page-widget-empty";
  emptyState.textContent = t(
    "mediaPage.widgetGridHint",
    "Selected players appear here automatically.",
  );

  widgetPanelHeader.append(widgetPanelTitle, widgetPanelActions);
  widgetPanelBody.append(playerList, emptyState);
  widgetPanel.append(widgetPanelHeader, widgetPanelBody);

  layout.append(nowPlaying, widgetPanel);
  root.append(background, layout);
  root.__mhaGrid = null;
  root.__mhaPlayerList = playerList;
  const mobileScrollCoordinator = createMobileMediaPageScrollCoordinator(root, playerList);
  root.__mhaSyncMobileDockState = mobileScrollCoordinator.syncDockState;

  let progressTimer = 0;
  let visualTransitionTimer = 0;
  let automaticPlayerCards = [];
  let draggedPlayerId = "";
  let inactiveSelectionTimer = 0;
  const transitionCache = createMediaTransitionCache();
  const selectionState = {
    transientPlayerId: "",
    committedPlayerId: "",
    lastPlayingPlayerId: "",
  };
  const initialSelectedPlayerId = String(page?.config?.selectedPlayerId || "").trim();
  if (initialSelectedPlayerId && isPlayerSelectedMediaState(hass, initialSelectedPlayerId)) {
    selectionState.committedPlayerId = initialSelectedPlayerId;
    if (isPlayerPlaying(hass, initialSelectedPlayerId)) {
      selectionState.lastPlayingPlayerId = initialSelectedPlayerId;
    }
  }
  const context = {
    page,
    hass,
    visibilityConfig,
    view: buildViewState(page, hass, visibilityConfig, transitionCache, selectionState),
    artwork,
  };

  const onAction = (action) => {
    if (!context.view.media.entity) return;
    runMediaPlayerAction(context.hass, context.view.media.entity, action);
  };

  const clearInactiveSelectionTimer = () => {
    if (!inactiveSelectionTimer) return;
    clearTimeout(inactiveSelectionTimer);
    inactiveSelectionTimer = 0;
  };

  const restoreLastPlayingSelection = () => {
    inactiveSelectionTimer = 0;
    selectionState.transientPlayerId = "";
    const enabledIds = getEnabledPlayerIdSet(context.view.enabledPlayers);
    const defaultPlayerId = String(context.page?.config?.defaultPlayerId || "").trim();
    selectionState.committedPlayerId = enabledIds.has(selectionState.lastPlayingPlayerId)
      ? selectionState.lastPlayingPlayerId
      : (enabledIds.has(defaultPlayerId) ? defaultPlayerId : context.view.enabledPlayers[0]?.entity_id || "");
    refresh();
  };

  const scheduleInactiveSelectionRestore = () => {
    clearInactiveSelectionTimer();
    inactiveSelectionTimer = globalThis.setTimeout(
      restoreLastPlayingSelection,
      MEDIA_PAGE_INACTIVE_FALLBACK_MS,
    );
  };

  const selectPlayer = (playerId = "") => {
    const normalizedPlayerId = String(playerId || "").trim();
    if (!normalizedPlayerId) return;
    const player = context.view.enabledPlayers.find(candidate => candidate.entity_id === normalizedPlayerId);
    if (!player) return;

    if (isPlayerSelectedMediaState(context.hass, normalizedPlayerId)) {
      clearInactiveSelectionTimer();
      selectionState.transientPlayerId = "";
      selectionState.committedPlayerId = normalizedPlayerId;
      if (isPlayerPlaying(context.hass, normalizedPlayerId)) {
        selectionState.lastPlayingPlayerId = normalizedPlayerId;
      }
      onSelectPlayer(normalizedPlayerId);
      refresh();
      return;
    }

    selectionState.transientPlayerId = normalizedPlayerId;
    refresh();
    scheduleInactiveSelectionRestore();
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
    if (!view.media.artworkUrl) root.removeAttribute("data-artwork-tone");
    root.dataset.backgroundBlur = String(view.blurBackground);
    onBackgroundArtworkChange(view.media.artworkUrl || "", {
      blurBackground: view.blurBackground,
    });
  };

  const isEditing = () => Boolean(root.getRootNode?.()?.host?.classList?.contains?.("is-editing"));

  const clearPlayerDragState = () => {
    draggedPlayerId = "";
    automaticPlayerCards.forEach((card) => {
      card.dataset.dragging = "false";
      card.dataset.dropTarget = "false";
    });
  };

  const findPlayerCardAtPoint = (clientX, clientY) => {
    return automaticPlayerCards.find((card) => {
      const bounds = card.getBoundingClientRect();
      return clientX >= bounds.left
        && clientX <= bounds.right
        && clientY >= bounds.top
        && clientY <= bounds.bottom;
    }) || null;
  };

  const swapPlayers = (playerId, targetId) => {
    if (!playerId || !targetId || playerId === targetId) return;
    onReorderPlayers(swapOrderedIds(
      automaticPlayerCards.map((card) => card.dataset.mediaPlayerId),
      playerId,
      targetId,
    ));
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
    if (view.media.playing && !selectionState.transientPlayerId) {
      selectionState.lastPlayingPlayerId = view.selectedPlayerId;
    }
    if (automaticPlayerCards.length !== view.enabledPlayers.length
      || automaticPlayerCards.some((card, index) => card.dataset.mediaPlayerId !== view.enabledPlayers[index]?.entity_id)) {
      automaticPlayerCards.forEach((card) => {
        card.__mhaDestroy?.();
        card.remove();
      });
      automaticPlayerCards = view.enabledPlayers.map((player) => {
        const card = document.createElement("article");
        card.className = "mha-widget mha-media-page-auto-player";
        card.dataset.widgetKind = "media";
        card.dataset.mediaPlayerId = player.entity_id;
        const widget = createMediaPagePlayerWidget({entityId: player.entity_id});
        card.dataset.widgetId = widget.id;
        card.dataset.mediaPagePlayer = "true";
        card.dataset.mediaPageDensity = "compact";
        card.dataset.widgetW = String(widget.w);
        card.dataset.widgetH = String(widget.h);
        card.dataset.widgetSize = `${widget.w}x${widget.h}`;
        card.style.setProperty("--mha-widget-w", String(widget.w));
        card.style.setProperty("--mha-widget-configured-w", String(widget.w));
        card.style.setProperty("--mha-widget-h", String(widget.h));
        card.dataset.selected = String(player.entity_id === view.selectedPlayerId);
        card.draggable = false;
        card.addEventListener("pointerdown", (event) => {
          if (!isEditing() || event.target?.closest?.("button")) return;
          if (event.isPrimary === false) return;
          draggedPlayerId = player.entity_id;
          card.dataset.dragging = "true";
          card.dataset.pointerDragging = "true";
          card.setPointerCapture?.(event.pointerId);
          event.preventDefault();
        });
        card.addEventListener("pointermove", (event) => {
          if (card.dataset.pointerDragging !== "true") return;
          event.preventDefault();
          automaticPlayerCards.forEach((candidate) => {
            candidate.dataset.dropTarget = String(candidate === findPlayerCardAtPoint(event.clientX, event.clientY));
          });
        });
        card.addEventListener("pointerup", (event) => {
          if (card.dataset.pointerDragging !== "true") return;
          const target = findPlayerCardAtPoint(event.clientX, event.clientY);
          if (target && target !== card) {
            swapPlayers(
              draggedPlayerId,
              target.dataset.mediaPlayerId,
            );
          }
          card.releasePointerCapture?.(event.pointerId);
          delete card.dataset.pointerDragging;
          clearPlayerDragState();
        });
        card.addEventListener("pointercancel", () => {
          delete card.dataset.pointerDragging;
          clearPlayerDragState();
        });
        card.append(createMediaWidgetContent(widget, {
          widgetW: widget.w,
          widgetH: widget.h,
          hass: context.hass,
          onSelect: playerId => {
            if (!isEditing()) selectPlayer(playerId);
          },
        }));
        card.setAttribute("role", "listitem");
        playerList.append(card);
        return card;
      });
    } else {
      automaticPlayerCards.forEach((card) => card.querySelector(".mha-media-widget")?.__mhaUpdateFromHass?.(context.hass));
    }
    automaticPlayerCards.forEach((card) => {
      card.dataset.selected = String(card.dataset.mediaPlayerId === view.selectedPlayerId);
    });
    emptyState.hidden = view.enabledPlayers.length > 0;
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
    if (view.media.artworkUrl) root.removeAttribute("data-artwork-tone");
    syncMediaArtworkTone(root, context.artwork);
    context.artwork.dataset.playing = String(view.media.playing);

    syncControlGroup(
      playbackGroup,
      createMediaPlaybackButtons(view.media, { onAction }),
    );
    applyProgress(view);
  };

  const refresh = ({ progressOnly = false } = {}) => {
    const nextView = buildViewState(
      context.page,
      context.hass,
      context.visibilityConfig,
      transitionCache,
      selectionState,
    );
    applyView(nextView, { progressOnly });
  };

  const resetScrollPosition = () => {
    mobileScrollCoordinator.reset();
  };

  const scheduleScrollReset = () => {
    const scheduler = globalThis.requestAnimationFrame || ((callback) => globalThis.setTimeout(callback, 0));
    scheduler(resetScrollPosition);
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
  scheduleScrollReset();

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    refresh();
    syncProgressTicker();
  };

  root.__mhaResetScrollPosition = resetScrollPosition;

  root.__mhaUpdatePage = (nextPage, options = {}) => {
    context.page = nextPage || context.page;
    const enabledIds = getEnabledPlayerIdSet(resolveEnabledMediaPlayers(
      context.page.config,
      getAvailableMediaPlayers(context.hass, context.visibilityConfig),
    ));
    if (selectionState.transientPlayerId && !enabledIds.has(selectionState.transientPlayerId)) {
      selectionState.transientPlayerId = "";
      clearInactiveSelectionTimer();
    }
    if (selectionState.committedPlayerId && !enabledIds.has(selectionState.committedPlayerId)) {
      selectionState.committedPlayerId = "";
    }
    if (selectionState.lastPlayingPlayerId && !enabledIds.has(selectionState.lastPlayingPlayerId)) {
      selectionState.lastPlayingPlayerId = "";
    }
    const styleOnly = options?.styleOnly === true;
    if (styleOnly) {
      const nextView = buildViewState(
        context.page,
        context.hass,
        context.visibilityConfig,
        transitionCache,
        selectionState,
      );
      applyView(nextView, { styleOnly: true });
      return;
    }
    refresh();
    syncProgressTicker();
  };

  root.__mhaDestroy = () => {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = 0;
    clearInactiveSelectionTimer();
    if (visualTransitionTimer) clearTimeout(visualTransitionTimer);
    visualTransitionTimer = 0;
    mobileScrollCoordinator.destroy();
    automaticPlayerCards.forEach((card) => card.__mhaDestroy?.());
    automaticPlayerCards = [];
  };

  return root;
}
