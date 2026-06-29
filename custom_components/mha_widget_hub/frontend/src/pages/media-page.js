import { buildMediaDisplayModel, buildMediaPlayerServiceCall, getMediaArtworkUrl, getMediaStateLabel } from "../ha/media.js";
import { runMediaPlayerAction } from "../ha/actions.js";
import { getEntitiesForDomain } from "../ha/entity-filters.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function formatDuration(totalSeconds) {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

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

function resolveMediaProgress(entityState) {
  const attributes = entityState?.attributes || {};
  const duration = Number(attributes.media_duration);
  const position = Number(attributes.media_position);
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(position) || position < 0) {
    return { available: false, current: 0, duration: 0, ratio: 0 };
  }

  let current = position;
  if (entityState?.state === "playing" && attributes.media_position_updated_at) {
    const updatedAt = Date.parse(attributes.media_position_updated_at);
    if (Number.isFinite(updatedAt)) {
      current += (Date.now() - updatedAt) / 1000;
    }
  }

  current = clamp(current, 0, duration);
  return {
    available: true,
    current,
    duration,
    ratio: duration > 0 ? clamp(current / duration, 0, 1) : 0,
  };
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

function createActionButton({ label, icon, action, disabled = false, primary = false, onAction = () => {} } = {}) {
  const button = document.createElement("button");
  button.className = "mha-media-page-action";
  button.type = "button";
  button.dataset.action = action || "";
  button.dataset.primary = String(Boolean(primary));
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-label", label);
  button.append(createIconSymbol({ name: icon, label }));
  button.addEventListener("click", () => {
    if (!button.disabled) onAction(action);
  });
  return button;
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
    const variant = document.documentElement.dataset.themeVariant || "";
    return variant === "frosted-glass" ? "frosted-glass" : "liquid-glass";
  }
  if (themeStyle === "material") return "material-you";
  if (themeStyle === "alexa") return "alexa";
  return "oneui";
}

function buildViewState(page = {}, hass, visibilityConfig) {
  const availablePlayers = getEntitiesForDomain(hass, "media_player", visibilityConfig);
  const enabledPlayerIds = resolveEnabledPlayerIds(page.config, availablePlayers);
  const enabledPlayers = availablePlayers.filter(player => enabledPlayerIds.includes(player.entity_id));
  const selectedPlayerId = resolveSelectedPlayer(page.config, enabledPlayers);
  const selectedPlayer = enabledPlayers.find(player => player.entity_id === selectedPlayerId) || null;
  const entity = selectedPlayer ? hass?.states?.[selectedPlayer.entity_id] || null : null;
  const model = buildMediaDisplayModel(entity, { entityId: selectedPlayerId }, { name: t("mediaPage.title", "Media Players") });
  const progress = resolveMediaProgress(entity);
  const artworkUrl = getMediaArtworkUrl(entity);
  const effectiveVisualStyle = resolveEffectiveVisualStyle(
    document.documentElement.dataset.themeStyle || "oneui",
    page.config?.visualStyle || "theme",
  );

  return {
    availablePlayers,
    enabledPlayers,
    selectedPlayerId,
    selectedPlayer,
    entity,
    model,
    progress,
    artworkUrl,
    effectiveVisualStyle,
    blurBackground: page.config?.blurBackground !== false,
    stateLabel: entity ? getMediaStateLabel(entity.state) : t("states.unknown", "Unknown"),
    appName: entity?.attributes?.app_name || "",
    deviceName: selectedPlayer?.name || "",
    canPrevious: Boolean(buildMediaPlayerServiceCall(entity, "previous")),
    canPlayPause: Boolean(buildMediaPlayerServiceCall(entity, "playPause")),
    canNext: Boolean(buildMediaPlayerServiceCall(entity, "next")),
    canVolumeDown: Boolean(buildMediaPlayerServiceCall(entity, "volumeDown")),
    canMute: Boolean(buildMediaPlayerServiceCall(entity, "mute")),
    canVolumeUp: Boolean(buildMediaPlayerServiceCall(entity, "volumeUp")),
    muted: entity?.attributes?.is_volume_muted === true,
  };
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

  let progressTimer = 0;
  let context = {
    page,
    hass,
    visibilityConfig,
    view: buildViewState(page, hass, visibilityConfig),
  };

  const render = () => {
    const { view } = context;
    root.dataset.visualStyle = view.effectiveVisualStyle;
    root.dataset.hasArtwork = String(Boolean(view.artworkUrl));
    root.dataset.backgroundBlur = String(view.blurBackground);
    root.style.setProperty("--mha-media-page-background-image", view.artworkUrl ? `url("${view.artworkUrl}")` : "none");
    onBackgroundArtworkChange(view.artworkUrl || "", {
      blurBackground: view.blurBackground,
    });

    const background = document.createElement("div");
    background.className = "mha-media-page-background";
    background.setAttribute("aria-hidden", "true");

    const hero = document.createElement("div");
    hero.className = "mha-media-page-hero";

    const artwork = document.createElement("div");
    artwork.className = "mha-media-page-artwork";
    if (view.artworkUrl) {
      const image = document.createElement("img");
      image.src = view.artworkUrl;
      image.alt = "";
      image.loading = "lazy";
      image.decoding = "async";
      artwork.append(image);
    } else {
      artwork.append(createIconSymbol({
        name: "media-player",
        label: t("mediaPage.noArtwork", "No artwork"),
      }));
    }

    const info = document.createElement("div");
    info.className = "mha-media-page-info";

    const topbar = document.createElement("div");
    topbar.className = "mha-media-page-topbar";
    if (view.enabledPlayers.length) {
      topbar.append(createPlayerSelect(
        view.enabledPlayers,
        view.selectedPlayerId,
        playerId => onSelectPlayer(playerId),
      ));
    }
    topbar.append(createIconButton({
      label: t("mediaPage.openSettings", "Open media page settings"),
      icon: "gear",
      onClick: onOpenSettings,
    }));

    const eyebrow = document.createElement("span");
    eyebrow.className = "mha-media-page-eyebrow";
    eyebrow.textContent = view.appName || t("mediaPage.mediaCenter", "Media Center");

    const title = document.createElement("h2");
    title.className = "mha-media-page-title";
    title.textContent = view.model.title || t("mediaPage.nothingPlaying", "Nothing playing");

    const subtitle = document.createElement("p");
    subtitle.className = "mha-media-page-subtitle";
    subtitle.textContent = view.model.artist || view.model.subtitle || t("mediaPage.ready", "Ready");

    const meta = document.createElement("div");
    meta.className = "mha-media-page-meta";
    meta.append(
      createMetaChip(view.deviceName || t("mediaPage.noPlayerSelected", "No player selected")),
      createMetaChip(view.stateLabel),
    );

    const status = document.createElement("p");
    status.className = "mha-media-page-status";
    status.textContent = view.availablePlayers.length
      ? view.selectedPlayer
        ? view.entity
          ? t("mediaPage.statusLine", "{state} on {player}", { state: view.stateLabel, player: view.deviceName })
          : t("mediaPage.playerUnavailable", "Selected player unavailable")
        : t("mediaPage.noEnabledPlayers", "No enabled players for this page")
      : t("mediaPage.noPlayersAvailable", "No media players available");

    info.append(topbar, eyebrow, title, subtitle, meta, status);
    hero.append(artwork, info);

    const progress = document.createElement("div");
    progress.className = "mha-media-page-progress-shell";
    const progressTrack = document.createElement("div");
    progressTrack.className = "mha-media-page-progress-track";
    const progressFill = document.createElement("div");
    progressFill.className = "mha-media-page-progress-fill";
    progressFill.style.setProperty("--mha-media-page-progress-ratio", String(view.progress.ratio));
    progressTrack.append(progressFill);
    const progressLabels = document.createElement("div");
    progressLabels.className = "mha-media-page-progress-labels";
    progressLabels.append(
      createMetaChip(view.progress.available ? formatDuration(view.progress.current) : "--:--"),
      createMetaChip(view.progress.available ? formatDuration(view.progress.duration) : "--:--"),
    );
    progress.append(progressTrack, progressLabels);

    const controls = document.createElement("div");
    controls.className = "mha-media-page-controls";

    const playback = document.createElement("div");
    playback.className = "mha-media-page-control-group";
    playback.append(
      createActionButton({
        label: t("widgets.mediaControls.previous", "Previous"),
        icon: "previous",
        action: "previous",
        disabled: !view.canPrevious,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
      createActionButton({
        label: view.entity?.state === "playing"
          ? t("widgets.mediaControls.pause", "Pause")
          : t("widgets.mediaControls.play", "Play"),
        icon: view.entity?.state === "playing" ? "pause" : "play",
        action: "playPause",
        disabled: !view.canPlayPause,
        primary: true,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
      createActionButton({
        label: t("widgets.mediaControls.next", "Next"),
        icon: "next",
        action: "next",
        disabled: !view.canNext,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
    );

    const volume = document.createElement("div");
    volume.className = "mha-media-page-control-group";
    volume.append(
      createActionButton({
        label: t("widgets.mediaControls.volumeDown", "Volume down"),
        icon: "minus",
        action: "volumeDown",
        disabled: !view.canVolumeDown,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
      createActionButton({
        label: view.muted
          ? t("widgets.mediaControls.unmute", "Unmute")
          : t("widgets.mediaControls.mute", "Mute"),
        icon: view.muted ? "volume-off" : "volume",
        action: "mute",
        disabled: !view.canMute,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
      createActionButton({
        label: t("widgets.mediaControls.volumeUp", "Volume up"),
        icon: "plus",
        action: "volumeUp",
        disabled: !view.canVolumeUp,
        onAction: action => runMediaPlayerAction(context.hass, view.entity, action),
      }),
    );

    controls.append(playback, volume);
    root.replaceChildren(background, hero, progress, controls);
  };

  const refresh = () => {
    context.view = buildViewState(context.page, context.hass, context.visibilityConfig);
    render();
  };

  const syncProgressTicker = () => {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = 0;
    }
    if (context.view.entity?.state !== "playing" || !context.view.progress.available) return;
    progressTimer = window.setInterval(() => {
      context.view = buildViewState(context.page, context.hass, context.visibilityConfig);
      render();
    }, 1000);
  };

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    refresh();
    syncProgressTicker();
  };

  root.__mhaUpdatePage = (nextPage) => {
    context.page = nextPage || context.page;
    refresh();
    syncProgressTicker();
  };

  root.__mhaDestroy = () => {
    if (progressTimer) clearInterval(progressTimer);
    progressTimer = 0;
    onBackgroundArtworkChange("", {
      blurBackground: false,
    });
  };

  refresh();
  syncProgressTicker();
  return root;
}

function createMetaChip(text = "") {
  const chip = document.createElement("span");
  chip.className = "mha-media-page-chip";
  chip.textContent = text;
  return chip;
}
