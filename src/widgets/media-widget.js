import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import {
  buildMediaWidgetConfig,
  createMediaConfigDraft,
  renderMediaConfigFields,
} from "../widget-config/media-config.js";
import {
  buildMediaDisplayModel,
  buildMediaPlayerServiceCall,
  formatMediaDuration,
  getMediaArtworkUrl,
  resolveMediaProgress,
} from "../ha/media.js";
import { runMediaPlayerAction } from "../ha/actions.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

export const MEDIA_WIDGET_KIND = "media";
export const MEDIA_TRANSITION_GRACE_MS = 1200;

const MEDIA_TRANSIENT_STATES = new Set(["idle", "off", "unavailable", "unknown", "none"]);

export function isMediaWidget(widget = {}) {
  return isLocalWidgetKind(widget, MEDIA_WIDGET_KIND, ["media-widget"]);
}

function resolveMediaEntity(widget = {}, hass) {
  const entityId = widget.entityId || widget.entity_id || widget.mediaEntityId || "";
  return entityId ? hass?.states?.[entityId] : null;
}

export function createMediaTransitionCache() {
  return {
    lastArtwork: "",
    lastTitle: "",
    lastArtist: "",
    lastMediaState: "",
    lastUpdateTimestamp: 0,
    graceState: "",
    graceStartedTimestamp: 0,
  };
}

function getMediaTimestamp() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function hasLiveMediaMetadata(entity, widget = {}) {
  const attributes = entity?.attributes || {};
  return Boolean(
    attributes.media_title
      || attributes.media_artist
      || attributes.media_album_name
      || widget.mediaTitle
      || widget.mediaArtist
      || widget.artist
      || widget.album,
  );
}

function applyMediaTransitionCache(data, cache, now = getMediaTimestamp()) {
  if (!cache) return data;

  const hasCachedDisplay = Boolean(cache.lastArtwork || cache.lastTitle || cache.lastArtist);
  const hasTransientState = MEDIA_TRANSIENT_STATES.has(data.state);
  const missingCachedArtwork = Boolean(cache.lastArtwork && !data.artworkUrl);
  const missingCachedMetadata = Boolean(cache.lastTitle && !data.hasLiveMetadata);
  const stateWouldRegress = Boolean(cache.lastMediaState && hasTransientState && data.state !== cache.lastMediaState);
  const shouldUseGrace = hasCachedDisplay && (missingCachedArtwork || missingCachedMetadata || stateWouldRegress);

  if (shouldUseGrace) {
    if (cache.graceState !== data.state || !cache.graceStartedTimestamp) {
      cache.graceState = data.state;
      cache.graceStartedTimestamp = now;
    }

    if (now - cache.graceStartedTimestamp <= MEDIA_TRANSITION_GRACE_MS) {
      const state = stateWouldRegress ? cache.lastMediaState : data.state;
      return {
        ...data,
        title: missingCachedMetadata ? cache.lastTitle : data.title,
        subtitle: missingCachedMetadata || stateWouldRegress ? cache.lastArtist || data.subtitle : data.subtitle,
        state,
        playing: state === "playing",
        artworkUrl: missingCachedArtwork ? cache.lastArtwork : data.artworkUrl,
        usingGraceCache: true,
      };
    }
  }

  cache.graceState = "";
  cache.graceStartedTimestamp = 0;

  if (!hasTransientState && (data.artworkUrl || data.hasLiveMetadata)) {
    cache.lastArtwork = data.artworkUrl || "";
    cache.lastTitle = data.title || "";
    cache.lastArtist = data.artist || data.subtitle || "";
    cache.lastMediaState = data.state || "";
    cache.lastUpdateTimestamp = now;
  }

  return data;
}

export function resolveMediaTransitionData(data, cache, now) {
  return applyMediaTransitionCache(data, cache, now);
}

function getMediaData(widget = {}, hass, cache = null, now = getMediaTimestamp()) {
  const previewData = WIDGET_PREVIEW_DATA.media;
  const entity = resolveMediaEntity(widget, hass);
  const attributes = entity?.attributes || {};
  const model = buildMediaDisplayModel(entity, widget, previewData);
  const state = model.state;
  const volume = attributes.volume_level ?? widget.volume ?? previewData.volume;
  const volumeNumber = Number(volume);
  const hasVolume = Number.isFinite(volumeNumber);
  const volumePercent = hasVolume
    ? Math.max(0, Math.min(100, Math.round(volumeNumber * 100)))
    : 0;
  const muted = attributes.is_volume_muted === true;
  const volumeLabel = muted ? t("widgets.mediaControls.mute", "Mute") : hasVolume ? `${volumePercent}%` : "Vol";

  const data = {
    entity,
    entityId: model.entityId,
    name: model.name,
    title: model.title,
    subtitle: model.subtitle,
    artist: model.artist,
    album: model.album || "Preview Album",
    app: attributes.app_name || widget.app || "MHA Media",
    state,
    playing: state === "playing",
    muted,
    volumeLabel,
    volumePercent,
    artworkUrl: getMediaArtworkUrl(entity, widget),
    progress: resolveMediaProgress(entity),
    hasLiveMetadata: hasLiveMediaMetadata(entity, widget),
    canPrevious: Boolean(buildMediaPlayerServiceCall(entity, "previous")),
    canPlayPause: Boolean(buildMediaPlayerServiceCall(entity, "playPause")),
    canNext: Boolean(buildMediaPlayerServiceCall(entity, "next")),
    canVolumeDown: Boolean(buildMediaPlayerServiceCall(entity, "volumeDown")),
    canVolumeUp: Boolean(buildMediaPlayerServiceCall(entity, "volumeUp")),
    canMute: Boolean(buildMediaPlayerServiceCall(entity, "mute")),
  };

  return applyMediaTransitionCache(data, cache, now);
}

function createText(className, text = "") {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function setArtworkImage(artwork, artworkUrl = "") {
  const image = artwork.querySelector(".mha-media-widget-artwork-image");
  const hasArtwork = Boolean(artworkUrl);
  artwork.dataset.hasArtwork = String(hasArtwork);
  if (!image) return;
  if (hasArtwork) {
    image.src = artworkUrl;
    image.alt = "";
  } else {
    image.removeAttribute("src");
  }
}

function setBackgroundImage(root, artworkUrl = "") {
  const image = root.querySelector(".mha-media-widget-background-image");
  const hasArtwork = Boolean(artworkUrl);
  root.dataset.hasArtwork = String(hasArtwork);
  if (!image) return;
  if (hasArtwork) {
    image.src = artworkUrl;
    image.alt = "";
  } else {
    image.removeAttribute("src");
  }
}

function createArtworkBackground(data) {
  const background = document.createElement("div");
  background.className = "mha-media-widget-background";
  background.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.className = "mha-media-widget-background-image";
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;
  background.append(image);
  return background;
}

function createArtwork(data) {
  const artwork = document.createElement("div");
  artwork.className = "mha-media-widget-artwork";
  artwork.setAttribute("aria-hidden", "true");

  const image = document.createElement("img");
  image.className = "mha-media-widget-artwork-image";
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;

  artwork.append(
    image,
    createText("mha-media-widget-artwork-glyph", "♪"),
  );
  artwork.dataset.playing = String(data.playing);
  setArtworkImage(artwork, data.artworkUrl);
  return artwork;
}

function createTitleStack(data) {
  const stack = document.createElement("div");
  stack.className = "mha-media-widget-text";
  stack.append(
    createText("mha-media-widget-title", data.title),
    createText("mha-media-widget-artist", data.subtitle),
  );
  return stack;
}

function createMetaDetails(data) {
  const details = document.createElement("div");
  details.className = "mha-media-widget-meta-details";
  details.append(createText("mha-media-widget-source", data.app));
  return details;
}

function createSourceBadge(data) {
  const badge = document.createElement("div");
  badge.className = "mha-media-widget-source-badge";
  badge.append(
    createIconSymbol({ name: "speaker", label: data.app }),
    createText("mha-media-widget-source-badge-label", data.app),
  );
  return badge;
}

function createControlButton(label, symbol, {
  primary = false,
  action = "",
  className = "",
  disabled = false,
  interactive = true,
  onAction,
} = {}) {
  const button = document.createElement("button");
  button.className = ["mha-media-widget-control", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.dataset.action = action;
  if (primary) button.dataset.primary = "true";
  button.disabled = Boolean(disabled);
  button.setAttribute("aria-disabled", String(Boolean(disabled)));
  if (!interactive) {
    button.tabIndex = -1;
    button.setAttribute("aria-disabled", "true");
  }
  button.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (!button.disabled) onAction?.(action);
  });
  button.textContent = symbol;
  return button;
}

function createPlaybackButtons(data, { interactive = true, onAction } = {}) {
  return [
    createControlButton(t("widgets.mediaControls.previous", "Previous"), "‹", {
      action: "previous",
      disabled: !data.canPrevious,
      interactive,
      onAction,
    }),
    createControlButton(data.playing ? t("widgets.mediaControls.pause", "Pause") : t("widgets.mediaControls.play", "Play"), data.playing ? "Ⅱ" : "▶", {
      primary: true,
      action: "playPause",
      className: "mha-media-widget-play-toggle",
      disabled: !data.canPlayPause,
      interactive,
      onAction,
    }),
    createControlButton(t("widgets.mediaControls.next", "Next"), "›", {
      action: "next",
      disabled: !data.canNext,
      interactive,
      onAction,
    }),
  ];
}

function createVolumeButtons(data, { interactive = true, onAction } = {}) {
  return [
    createControlButton(t("widgets.mediaControls.volumeDown", "Volume down"), "−", {
      action: "volumeDown",
      disabled: !data.canVolumeDown,
      interactive,
      onAction,
    }),
    createControlButton(data.muted ? t("widgets.mediaControls.unmute", "Unmute") : t("widgets.mediaControls.mute", "Mute"), data.muted ? t("widgets.mediaControls.mute", "Mute") : "Vol", {
      primary: true,
      action: "mute",
      className: "mha-media-widget-play-toggle",
      disabled: !data.canMute,
      interactive,
      onAction,
    }),
    createControlButton(t("widgets.mediaControls.volumeUp", "Volume up"), "+", {
      action: "volumeUp",
      disabled: !data.canVolumeUp,
      interactive,
      onAction,
    }),
  ];
}

function renderControls(controls, data, { mode = "playback", interactive = true, onAction } = {}) {
  const group = controls.querySelector(".mha-media-widget-controls-group");
  const toggle = controls.querySelector(".mha-media-widget-control-toggle");
  if (!group || !toggle) return;

  controls.dataset.mode = mode;
  group.replaceChildren(...(
    mode === "volume"
      ? createVolumeButtons(data, { interactive, onAction })
      : createPlaybackButtons(data, { interactive, onAction })
  ));

  const showingPlaybackReturn = mode === "volume";
  toggle.textContent = showingPlaybackReturn ? "♪" : data.volumeLabel;
  toggle.dataset.action = "toggleVolume";
  toggle.dataset.mode = showingPlaybackReturn ? "playback" : "volume";
  toggle.removeAttribute("data-primary");
  toggle.classList.remove("mha-media-widget-play-toggle");
  toggle.setAttribute(
    "aria-label",
    showingPlaybackReturn
      ? t("widgets.mediaControls.backToMediaControls", "Back to media controls")
      : t("widgets.mediaControls.showVolumeControls", "Show volume controls ({volume})", { volume: data.volumeLabel }),
  );
  toggle.disabled = false;
  toggle.setAttribute("aria-disabled", String(!interactive));
  toggle.tabIndex = interactive ? 0 : -1;
}

function createControls(data, { mode = "playback", interactive = true, onAction } = {}) {
  const controls = document.createElement("div");
  controls.className = "mha-media-widget-controls-shell";

  const group = document.createElement("div");
  group.className = "mha-media-widget-controls mha-media-widget-controls-group";

  const toggle = createControlButton(t("widgets.mediaControls.volume", "Volume"), data.volumeLabel, {
    action: "toggleVolume",
    interactive,
    onAction,
  });
  toggle.classList.add("mha-media-widget-control-toggle");

  controls.append(group, toggle);
  renderControls(controls, data, { mode, interactive, onAction });
  return controls;
}

function setProgressState(progress, data) {
  if (!progress) return;
  const width = data.progress?.available
    ? `${Math.max(0, Math.min(100, data.progress.ratio * 100))}%`
    : "54%";
  progress.style.setProperty("--mha-media-progress-fill-width", width);
}

function createProgress(data, { includeLabels = false } = {}) {
  const progress = document.createElement("div");
  progress.className = "mha-media-widget-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.append(createText("mha-media-widget-progress-fill"));
  setProgressState(progress, data);

  if (!includeLabels) return progress;

  const shell = document.createElement("div");
  shell.className = "mha-media-widget-progress-shell";

  const labels = document.createElement("div");
  labels.className = "mha-media-widget-progress-labels";
  labels.append(
    createText("mha-media-widget-progress-current", data.progress?.available ? formatMediaDuration(data.progress.current) : "--:--"),
    createText("mha-media-widget-progress-duration", data.progress?.available ? formatMediaDuration(data.progress.duration) : "--:--"),
  );

  shell.append(progress, labels);
  return shell;
}

function createMetaRows(data) {
  const rows = document.createElement("div");
  rows.className = "mha-media-widget-meta-rows";
  rows.append(
    createText("mha-media-widget-chip", data.app),
    createText("mha-media-widget-chip", data.album),
    createText("mha-media-widget-chip", t("widgets.mediaControls.volumePercent", "Volume {percent}%", { percent: data.volumePercent })),
  );
  return rows;
}

function mediaVariantKey({ widgetW = 2, widgetH = 2 } = {}) {
  const w = Number(widgetW) || 2;
  const h = Number(widgetH) || 2;
  if (w >= 4 && h >= 4) return "4x4";
  if (w >= 4 && h >= 2) return "4x2";
  return "2x2";
}

function resolveMediaPagePanelSize({
  context = {},
  fallbackSize = {},
} = {}) {
  const themeStyle = String(
    context?.themeStyle
    || globalThis?.document?.documentElement?.dataset?.themeStyle
    || "",
  ).trim().toLowerCase();
  const viewportHeight = Math.max(
    0,
    Number(context?.viewportHeight)
    || Number(context?.availableContentRect?.height)
    || Number(context?.panelFrameHeight)
    || Number(globalThis?.window?.innerHeight)
    || 0,
  );
  const isMobileLandscape = context?.layoutVariant === "mobile-landscape"
    || (context?.layout === "mobile" && (Number(context?.units) || 0) >= 8);
  const isLowHeightOneUiPanel = themeStyle === "oneui"
    && context?.layout !== "mobile"
    && !isMobileLandscape
    && viewportHeight > 0
    && viewportHeight <= 780;

  if (isMobileLandscape) {
    return {
      w: Math.max(8, Number(fallbackSize?.w) || 8),
      h: 4,
    };
  }

  if (isLowHeightOneUiPanel) {
    return {
      w: Math.max(8, Number(fallbackSize?.w) || 8),
      h: 6,
    };
  }

  const layout = context?.layout === "mobile" ? "mobile" : "desktop";
  if (layout === "mobile") {
    return {
      w: 4,
      h: Math.max(8, Number(fallbackSize?.h) || 8),
    };
  }

  const units = Math.max(4, Number(context?.units) || Number(fallbackSize?.w) || 6);
  return {
    w: Math.min(6, units),
    h: Math.max(8, Number(fallbackSize?.h) || 8),
  };
}

export function createMediaWidgetContent(widget = {}, {
  widgetW = Number(widget?.w) || 2,
  widgetH = Number(widget?.h) || 2,
  hass,
  interactive = true,
} = {}) {
  const transitionCache = createMediaTransitionCache();
  let graceTimer = null;
  const data = getMediaData(widget, hass, transitionCache);
  const context = {
    hass,
    entity: data.entity,
    data,
    controlsMode: "playback",
  };
  const variantKey = mediaVariantKey({ widgetW, widgetH });
  const root = document.createElement("div");
  root.className = "mha-media-widget";
  root.dataset.widgetComponent = "media";
  root.dataset.mediaSize = variantKey;
  root.dataset.state = data.state;
  root.dataset.mediaState = data.state;
  root.dataset.playing = String(data.playing);
  root.dataset.hasArtwork = String(Boolean(data.artworkUrl));

  const onAction = action => {
    if (!interactive) return;
    if (action === "toggleVolume") {
      context.controlsMode = context.controlsMode === "volume" ? "playback" : "volume";
      renderControls(controls, context.data, {
        mode: context.controlsMode,
        interactive,
        onAction,
      });
      return;
    }
    if (!context.entity) return;
    runMediaPlayerAction(context.hass, context.entity, action);
  };
  const applyData = nextData => {
    context.entity = nextData.entity;
    context.data = nextData;
    root.dataset.state = nextData.state;
    root.dataset.mediaState = nextData.state;
    root.dataset.playing = String(nextData.playing);
    root.dataset.hasArtwork = String(Boolean(nextData.artworkUrl));
    root.querySelector(".mha-media-widget-title").textContent = nextData.title;
    root.querySelector(".mha-media-widget-artist").textContent = nextData.subtitle;
    const sourceNode = root.querySelector(".mha-media-widget-source");
    if (sourceNode) sourceNode.textContent = nextData.app;
    const sourceBadgeNode = root.querySelector(".mha-media-widget-source-badge-label");
    if (sourceBadgeNode) sourceBadgeNode.textContent = nextData.app;
    const artworkNode = root.querySelector(".mha-media-widget-artwork");
    artworkNode?.setAttribute("data-playing", String(nextData.playing));
    if (artworkNode) setArtworkImage(artworkNode, nextData.artworkUrl);
    setBackgroundImage(root, nextData.artworkUrl);
    const progressNode = root.querySelector(".mha-media-widget-progress");
    setProgressState(progressNode, nextData);
    const currentNode = root.querySelector(".mha-media-widget-progress-current");
    if (currentNode) currentNode.textContent = nextData.progress?.available ? formatMediaDuration(nextData.progress.current) : "--:--";
    const durationNode = root.querySelector(".mha-media-widget-progress-duration");
    if (durationNode) durationNode.textContent = nextData.progress?.available ? formatMediaDuration(nextData.progress.duration) : "--:--";
    renderControls(controls, nextData, {
      mode: context.controlsMode,
      interactive,
      onAction,
    });
  };
  const scheduleGraceRefresh = nextData => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
    if (!nextData.usingGraceCache) return;
    const elapsed = getMediaTimestamp() - transitionCache.graceStartedTimestamp;
    const delay = Math.max(0, MEDIA_TRANSITION_GRACE_MS - elapsed + 1);
    graceTimer = setTimeout(() => {
      graceTimer = null;
      context.hass && applyData(getMediaData(widget, context.hass, transitionCache));
    }, delay);
  };

  const background = createArtworkBackground(data);
  const artwork = createArtwork(data);
  const text = createTitleStack(data);
  const metaDetails = createMetaDetails(data);
  const controls = createControls(data, {
    mode: context.controlsMode,
    interactive,
    onAction,
  });
  const progress = createProgress(data, {
    includeLabels: variantKey === "4x2" || widget?.responsiveSizeMode === "media-page-panel",
  });
  root.append(background);
  setBackgroundImage(root, data.artworkUrl);

  if (variantKey === "2x2") {
    root.append(artwork, createSourceBadge(data), text, controls);
  } else if (variantKey === "4x2") {
    const info = document.createElement("div");
    info.className = "mha-media-widget-info";
    info.append(createSourceBadge(data), text, progress, controls);
    root.append(artwork, info);
  } else {
    const info = document.createElement("div");
    info.className = "mha-media-widget-info";
    info.append(text, metaDetails);

    const transport = document.createElement("div");
    transport.className = "mha-media-widget-transport";
    transport.append(createMetaRows(data), progress, controls);

    root.append(artwork, info, transport);
  }

  if (!interactive) {
    root.dataset.interactive = "false";
    root.querySelectorAll("button").forEach(button => {
      button.tabIndex = -1;
      button.setAttribute("aria-disabled", "true");
    });
  }

  root.__mhaUpdateFromHass = nextHass => {
    const nextData = getMediaData(widget, nextHass, transitionCache);
    context.hass = nextHass;
    applyData(nextData);
    scheduleGraceRefresh(nextData);
  };

  root.__mhaDestroy = () => {
    if (graceTimer) clearTimeout(graceTimer);
    graceTimer = null;
    delete root.__mhaUpdateFromHass;
    context.hass = null;
    context.entity = null;
  };

  return root;
}

export const MEDIA_WIDGET_CONTENT_RENDERER = Object.freeze({
  decorateShell: ({ shell, widget }) => {
    shell.dataset.mediaVariant = widget.variant || "media-compact";
  },
  render: ({ widget, widgetW, widgetH, hass, interactive }) => createMediaWidgetContent(widget, {
    widgetW,
    widgetH,
    hass,
    interactive,
  }),
});

export const MEDIA_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "media",
  title: "Configure media",
  hint: "Choose the media player and display name.",
  titleKey: "widgets.config.configureMedia",
  hintKey: "widgets.config.mediaHint",
  createDraft: createMediaConfigDraft,
  build: buildMediaWidgetConfig,
  renderFields: renderMediaConfigFields,
});

export const MEDIA_WIDGET_DEFINITION = Object.freeze({
  component: "media-widget",
  category: "media",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({ category: "media", variant: "media-compact", label: "Compact media", size: freezeSize(2, 2), description: "Quick playback.", order: 10 }),
      Object.freeze({ category: "media", variant: "media-wide", label: "Wide media", size: freezeSize(4, 2), description: "Now playing.", order: 20 }),
      Object.freeze({ category: "media", variant: "media-panel", label: "Media panel", size: freezeSize(4, 4), description: "Controls and details.", order: 30 }),
    ]),
  }),
  renderer: "media",
  config: "media",
  css: css("styles/widgets/media-widget.css"),
  preview: "media",
  aliases: ["media-widget"],
  variantAliases: ["media-compact", "media-wide", "media-panel"],
  defaultVariant: "media-compact",
  defaultSize: freezeSize(2, 2),
  normalizeSize: (size, { widget, rawSize, context } = {}) => {
    if (widget?.responsiveSizeMode === "media-page-panel") {
      return resolveMediaPagePanelSize({
        context,
        fallbackSize: rawSize || size,
      });
    }
    if (size.w >= 4 && size.h >= 4) return { w: 4, h: 4 };
    if (size.w >= 4 || size.h >= 3) return { w: 4, h: 2 };
    return { w: 2, h: 2 };
  },
  capabilities: Object.freeze({
    configurable: true,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => {
      const mediaEntityId = widget.mediaEntityId || widget.entityId || widget.entity_id || "";
      return {
        entityId: mediaEntityId,
        mediaEntityId,
      };
    },
  }),
  shell: Object.freeze({
    configureMode: "config",
  }),
  placementFlow: "configure-first",
  variants: [
    variant("media-compact", "Compact 2×2", 2, 2),
    variant("media-wide", "Large 4×2", 4, 2),
    variant("media-panel", "Panel 4×4", 4, 4),
  ],
});

function createMediaPreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.media;
  return {
    ...item,
    kind: "media",
    type: "media",
    component: MEDIA_WIDGET_DEFINITION.component,
    variant: item.variant || MEDIA_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
    label: item.label || item.title || previewData.name,
    title: item.title || item.label || previewData.name,
    mediaTitle: item.mediaTitle || previewData.title,
    mediaArtist: item.mediaArtist || previewData.artist,
    state: item.state || previewData.state,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "media",
  definition: MEDIA_WIDGET_DEFINITION,
  renderer: MEDIA_WIDGET_CONTENT_RENDERER,
  config: MEDIA_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createMediaPreviewWidget,
  }),
});
