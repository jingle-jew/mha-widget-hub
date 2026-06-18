import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import {
  buildMediaWidgetConfig,
  createMediaConfigDraft,
} from "../widget-config/media-config.js";
import {
  buildMediaDisplayModel,
  buildMediaPlayerServiceCall,
  getMediaArtworkUrl,
} from "../ha/media.js";
import { runMediaPlayerAction } from "../ha/actions.js";

export const MEDIA_WIDGET_KIND = "media";

export function isMediaWidget(widget = {}) {
  return isLocalWidgetKind(widget, MEDIA_WIDGET_KIND, ["media-widget"]);
}

function resolveMediaEntity(widget = {}, hass) {
  const entityId = widget.entityId || widget.entity_id || widget.mediaEntityId || "";
  return entityId ? hass?.states?.[entityId] : null;
}

function getMediaData(widget = {}, hass) {
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
  const volumeLabel = muted ? "Mute" : hasVolume ? `${volumePercent}%` : "Vol";

  return {
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
    canPrevious: Boolean(buildMediaPlayerServiceCall(entity, "previous")),
    canPlayPause: Boolean(buildMediaPlayerServiceCall(entity, "playPause")),
    canNext: Boolean(buildMediaPlayerServiceCall(entity, "next")),
    canVolumeDown: Boolean(buildMediaPlayerServiceCall(entity, "volumeDown")),
    canVolumeUp: Boolean(buildMediaPlayerServiceCall(entity, "volumeUp")),
    canMute: Boolean(buildMediaPlayerServiceCall(entity, "mute")),
  };
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
    createControlButton("Précédent", "‹", {
      action: "previous",
      disabled: !data.canPrevious,
      interactive,
      onAction,
    }),
    createControlButton(data.playing ? "Pause" : "Lecture", data.playing ? "Ⅱ" : "▶", {
      primary: true,
      action: "playPause",
      className: "mha-media-widget-play-toggle",
      disabled: !data.canPlayPause,
      interactive,
      onAction,
    }),
    createControlButton("Suivant", "›", {
      action: "next",
      disabled: !data.canNext,
      interactive,
      onAction,
    }),
  ];
}

function createVolumeButtons(data, { interactive = true, onAction } = {}) {
  return [
    createControlButton("Baisser le volume", "−", {
      action: "volumeDown",
      disabled: !data.canVolumeDown,
      interactive,
      onAction,
    }),
    createControlButton(data.muted ? "Activer le son" : "Couper le son", data.muted ? "Mute" : "Vol", {
      primary: true,
      action: "mute",
      disabled: !data.canMute,
      interactive,
      onAction,
    }),
    createControlButton("Monter le volume", "+", {
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

  const toggleAsPlayback = mode === "volume";
  toggle.textContent = toggleAsPlayback ? (data.playing ? "Ⅱ" : "▶") : data.volumeLabel;
  toggle.dataset.action = toggleAsPlayback ? "playPause" : "toggleVolume";
  toggle.toggleAttribute("data-primary", toggleAsPlayback);
  toggle.classList.toggle("mha-media-widget-play-toggle", toggleAsPlayback);
  toggle.setAttribute("aria-label", toggleAsPlayback
    ? data.playing ? "Pause" : "Lecture"
    : `Volume ${data.volumeLabel}`);
  toggle.disabled = toggleAsPlayback ? !data.canPlayPause : false;
  toggle.setAttribute("aria-disabled", String(!interactive || toggle.disabled));
  if (!interactive) toggle.tabIndex = -1;
}

function createControls(data, { mode = "playback", interactive = true, onAction } = {}) {
  const controls = document.createElement("div");
  controls.className = "mha-media-widget-controls-shell";

  const group = document.createElement("div");
  group.className = "mha-media-widget-controls mha-media-widget-controls-group";

  const toggle = createControlButton("Volume", data.volumeLabel, {
    action: "toggleVolume",
    interactive,
    onAction,
  });
  toggle.classList.add("mha-media-widget-control-toggle");

  controls.append(group, toggle);
  renderControls(controls, data, { mode, interactive, onAction });
  return controls;
}

function createProgress() {
  const progress = document.createElement("div");
  progress.className = "mha-media-widget-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.append(createText("mha-media-widget-progress-fill"));
  return progress;
}

function createMetaRows(data) {
  const rows = document.createElement("div");
  rows.className = "mha-media-widget-meta-rows";
  rows.append(
    createText("mha-media-widget-chip", data.app),
    createText("mha-media-widget-chip", data.album),
    createText("mha-media-widget-chip", `Volume ${data.volumePercent}%`),
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

export function createMediaWidgetContent(widget = {}, {
  widgetW = Number(widget?.w) || 2,
  widgetH = Number(widget?.h) || 2,
  hass,
  interactive = true,
} = {}) {
  const data = getMediaData(widget, hass);
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

  const background = createArtworkBackground(data);
  const artwork = createArtwork(data);
  const text = createTitleStack(data);
  const controls = createControls(data, {
    mode: context.controlsMode,
    interactive,
    onAction,
  });
  const progress = createProgress();
  root.append(background);
  setBackgroundImage(root, data.artworkUrl);

  if (variantKey === "2x2") {
    root.append(artwork, text, controls);
  } else if (variantKey === "4x2") {
    const info = document.createElement("div");
    info.className = "mha-media-widget-info";
    info.append(text, progress, controls);
    root.append(artwork, info);
  } else {
    const header = document.createElement("div");
    header.className = "mha-media-widget-header";
    header.append(artwork, text);
    root.append(header, createMetaRows(data), progress, controls);
  }

  if (!interactive) {
    root.dataset.interactive = "false";
    root.querySelectorAll("button").forEach(button => {
      button.tabIndex = -1;
      button.setAttribute("aria-disabled", "true");
    });
  }

  root.__mhaUpdateFromHass = nextHass => {
    const nextData = getMediaData(widget, nextHass);
    context.hass = nextHass;
    context.entity = nextData.entity;
    context.data = nextData;
    root.dataset.state = nextData.state;
    root.dataset.mediaState = nextData.state;
    root.dataset.playing = String(nextData.playing);
    root.dataset.hasArtwork = String(Boolean(nextData.artworkUrl));
    root.querySelector(".mha-media-widget-title").textContent = nextData.title;
    root.querySelector(".mha-media-widget-artist").textContent = nextData.subtitle;
    const artworkNode = root.querySelector(".mha-media-widget-artwork");
    artworkNode?.setAttribute("data-playing", String(nextData.playing));
    if (artworkNode) setArtworkImage(artworkNode, nextData.artworkUrl);
    setBackgroundImage(root, nextData.artworkUrl);
    renderControls(controls, nextData, {
      mode: context.controlsMode,
      interactive,
      onAction,
    });
  };

  root.__mhaDestroy = () => {
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
  createDraft: createMediaConfigDraft,
  build: buildMediaWidgetConfig,
});

export const MEDIA_WIDGET_DEFINITION = Object.freeze({
  component: "media-widget",
  category: "media",
  manager: Object.freeze({
    entries: Object.freeze([
      Object.freeze({ category: "media", variant: "media-compact", label: "Média compact", size: freezeSize(2, 2), description: "Lecture rapide.", order: 10 }),
      Object.freeze({ category: "media", variant: "media-wide", label: "Média large", size: freezeSize(4, 2), description: "Now playing.", order: 20 }),
      Object.freeze({ category: "media", variant: "media-panel", label: "Panneau média", size: freezeSize(4, 4), description: "Contrôles et détails.", order: 30 }),
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
  normalizeSize: (size) => {
    if (size.w >= 4 && size.h >= 4) return { w: 4, h: 4 };
    if (size.w >= 4 || size.h >= 3) return { w: 4, h: 2 };
    return { w: 2, h: 2 };
  },
  variants: [
    variant("media-compact", "Compact 2×2", 2, 2),
    variant("media-wide", "Large 4×2", 4, 2),
    variant("media-panel", "Panneau 4×4", 4, 4),
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
