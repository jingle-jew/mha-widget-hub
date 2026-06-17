import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";

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
  const state = entity?.state || widget.state || previewData.state;
  const volume = attributes.volume_level ?? widget.volume ?? previewData.volume;

  return {
    entityId: entity?.entity_id || widget.entityId || widget.entity_id || previewData.entityId,
    name: widget.label || widget.title || attributes.friendly_name || previewData.name,
    title: attributes.media_title || widget.mediaTitle || widget.title || previewData.title,
    artist: attributes.media_artist || widget.mediaArtist || widget.artist || previewData.artist,
    album: attributes.media_album_name || widget.album || "Preview Album",
    app: attributes.app_name || widget.app || "MHA Media",
    state,
    playing: state === "playing",
    volumePercent: Math.round(Number(volume) * 100),
  };
}

function createText(className, text = "") {
  const node = document.createElement("span");
  node.className = className;
  node.textContent = text;
  return node;
}

function createArtwork(data) {
  const artwork = document.createElement("div");
  artwork.className = "mha-media-widget-artwork";
  artwork.setAttribute("aria-hidden", "true");
  artwork.append(
    createText("mha-media-widget-artwork-glyph", "♪"),
  );
  artwork.dataset.playing = String(data.playing);
  return artwork;
}

function createTitleStack(data) {
  const stack = document.createElement("div");
  stack.className = "mha-media-widget-text";
  stack.append(
    createText("mha-media-widget-title", data.title),
    createText("mha-media-widget-artist", data.artist),
  );
  return stack;
}

function createControlButton(label, symbol, { primary = false } = {}) {
  const button = document.createElement("button");
  button.className = "mha-media-widget-control";
  button.type = "button";
  button.setAttribute("aria-label", label);
  if (primary) button.dataset.primary = "true";
  button.textContent = symbol;
  return button;
}

function createControls(data, { compact = false } = {}) {
  const controls = document.createElement("div");
  controls.className = "mha-media-widget-controls";
  controls.append(
    createControlButton("Précédent", "‹"),
    createControlButton(data.playing ? "Pause" : "Lecture", data.playing ? "Ⅱ" : "▶", { primary: true }),
    createControlButton("Suivant", "›"),
  );
  if (!compact) {
    controls.append(createText("mha-media-widget-volume", `${data.volumePercent}%`));
  }
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
  const variantKey = mediaVariantKey({ widgetW, widgetH });
  const root = document.createElement("div");
  root.className = "mha-media-widget";
  root.dataset.widgetComponent = "media";
  root.dataset.mediaSize = variantKey;
  root.dataset.state = data.state;
  root.dataset.playing = String(data.playing);

  const artwork = createArtwork(data);
  const text = createTitleStack(data);
  const controls = createControls(data, { compact: variantKey === "2x2" });
  const progress = createProgress();

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
    root.append(header, progress, createMetaRows(data), controls);
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
    root.dataset.state = nextData.state;
    root.dataset.playing = String(nextData.playing);
    root.querySelector(".mha-media-widget-title").textContent = nextData.title;
    root.querySelector(".mha-media-widget-artist").textContent = nextData.artist;
    root.querySelector(".mha-media-widget-artwork")?.setAttribute("data-playing", String(nextData.playing));
    root.querySelector(".mha-media-widget-volume")?.replaceChildren(`${nextData.volumePercent}%`);
  };

  root.__mhaDestroy = () => {
    delete root.__mhaUpdateFromHass;
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
  preview: Object.freeze({
    mode: "live",
    createWidget: createMediaPreviewWidget,
  }),
});
