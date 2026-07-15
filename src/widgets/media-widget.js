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
  getMediaStateLabel,
  isMediaPlayerInactiveState,
  resolveMediaProgress,
} from "../ha/media.js";
import { runMediaPlayerAction } from "../ha/actions.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { findThemeStyleId } from "../settings/theme-registry.js";

export const MEDIA_WIDGET_KIND = "media";
export const MEDIA_TRANSITION_GRACE_MS = 5000;

const MEDIA_ARTWORK_PALETTE_PROPERTIES = Object.freeze([
  "--mha-media-palette-surface",
  "--mha-media-palette-foreground",
  "--mha-media-palette-muted",
  "--mha-media-palette-strong",
  "--mha-media-palette-on-strong",
]);
const MEDIA_ARTWORK_PALETTE_ROOT_SELECTOR = ".mha-media-widget, .mha-media-page";
const MEDIA_PAGE_WALLPAPER_OVERLAY_COLOR = Object.freeze([10, 14, 24]);
const MEDIA_PAGE_WALLPAPER_OVERLAY_WEIGHT = 0.44;

const MEDIA_TRANSIENT_STATES = new Set(["idle", "stopped", "off", "unavailable", "unknown", "none"]);

export function isMediaWidget(widget = {}) {
  return isLocalWidgetKind(widget, MEDIA_WIDGET_KIND, ["media-widget"]);
}

function resolveMediaEntity(widget = {}, hass) {
  const entityId = widget.entityId || widget.entity_id || widget.mediaEntityId || "";
  return entityId ? hass?.states?.[entityId] : null;
}

export function createMediaTransitionCache() {
  return {
    entityId: "",
    lastArtwork: "",
    lastTitle: "",
    lastArtist: "",
    lastMediaState: "",
    lastUpdateTimestamp: 0,
    graceState: "",
    graceStartedTimestamp: 0,
  };
}

function clearMediaTransitionDisplayCache(cache) {
  cache.lastArtwork = "";
  cache.lastTitle = "";
  cache.lastArtist = "";
  cache.lastMediaState = "";
  cache.lastUpdateTimestamp = 0;
  cache.graceState = "";
  cache.graceStartedTimestamp = 0;
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

  const entityId = String(data.entityId || "").trim();
  if (cache.entityId && entityId && cache.entityId !== entityId) {
    clearMediaTransitionDisplayCache(cache);
  }
  if (entityId) cache.entityId = entityId;

  const hasCachedDisplay = Boolean(cache.lastArtwork || cache.lastTitle || cache.lastArtist);
  const hasTransientState = MEDIA_TRANSIENT_STATES.has(data.state);
  const missingCachedArtwork = Boolean(cache.lastArtwork && !data.artworkUrl);
  const missingCachedMetadata = Boolean(cache.lastTitle && !data.hasLiveMetadata);
  const stateWouldRegress = Boolean(cache.lastMediaState && hasTransientState && data.state !== cache.lastMediaState);
  const shouldUseGrace = hasCachedDisplay && (missingCachedArtwork || missingCachedMetadata || stateWouldRegress);

  if (shouldUseGrace) {
    cache.graceState = data.state;
    if (!cache.graceStartedTimestamp) {
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

    clearMediaTransitionDisplayCache(cache);
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

export function buildMediaWidgetData(widget = {}, hass, cache = null, now = getMediaTimestamp()) {
  const previewData = WIDGET_PREVIEW_DATA.media;
  const entity = resolveMediaEntity(widget, hass);
  const attributes = entity?.attributes || {};
  const model = buildMediaDisplayModel(entity, widget, previewData);
  const state = model.state;
  const poweredOff = state === "off";
  const volume = poweredOff
    ? 0
    : attributes.volume_level ?? widget.volume ?? previewData.volume;
  const volumeNumber = Number(volume);
  const hasVolume = Number.isFinite(volumeNumber);
  const volumePercent = hasVolume
    ? Math.max(0, Math.min(100, Math.round(volumeNumber * 100)))
    : 0;
  const muted = !poweredOff && attributes.is_volume_muted === true;
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

export function setMediaArtworkImage(artwork, artworkUrl = "") {
  const image = artwork.querySelector(".mha-media-widget-artwork-image");
  const hasArtwork = Boolean(artworkUrl);
  artwork.dataset.hasArtwork = String(hasArtwork);
  if (!image) return;
  if (hasArtwork) {
    if (image.dataset.artworkUrl && image.dataset.artworkUrl !== artworkUrl) {
      const paletteRoot = resolveMediaArtworkPaletteRoot(artwork);
      /* Keep the media page's previous palette until the next artwork is
       * sampled. Clearing it here makes the available-players panel flash back
       * to its theme surface between two tracks. Standalone widgets retain
       * their existing eager reset behavior. */
      if (!paletteRoot?.matches?.(".mha-media-page")) {
        clearMediaArtworkPalette(paletteRoot);
      }
    }
    image.dataset.artworkUrl = artworkUrl;
    image.src = artworkUrl;
    image.alt = "";
    syncMediaArtworkTone(artwork, image);
  } else {
    detachMediaArtworkPaletteListener(image);
    delete image.__mhaArtworkPaletteCache;
    delete image.dataset.artworkUrl;
    image.removeAttribute("src");
    clearMediaArtworkPalette(resolveMediaArtworkPaletteRoot(artwork));
  }
}

function detachMediaArtworkPaletteListener(image) {
  const pending = image?.__mhaArtworkPaletteListener;
  if (!pending) return;
  image.removeEventListener("load", pending.onLoad);
  image.removeEventListener("error", pending.onError);
  delete image.__mhaArtworkPaletteListener;
}

function clampColorChannel(value) {
  return Math.max(0, Math.min(255, Math.round(Number(value) || 0)));
}

function rgbToHsl([red, green, blue]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return { hue: 0, saturation: 0, lightness };

  const saturation = delta / (1 - Math.abs((2 * lightness) - 1));
  let hue = max === r
    ? ((g - b) / delta) % 6
    : max === g
      ? ((b - r) / delta) + 2
      : ((r - g) / delta) + 4;
  hue = ((hue * 60) + 360) % 360;
  return { hue, saturation, lightness };
}

function hslToRgb({ hue, saturation, lightness }) {
  const normalizedHue = (((hue % 360) + 360) % 360) / 60;
  const chroma = (1 - Math.abs((2 * lightness) - 1)) * saturation;
  const component = chroma * (1 - Math.abs((normalizedHue % 2) - 1));
  const offset = lightness - (chroma / 2);
  const [r, g, b] = normalizedHue < 1 ? [chroma, component, 0]
    : normalizedHue < 2 ? [component, chroma, 0]
      : normalizedHue < 3 ? [0, chroma, component]
        : normalizedHue < 4 ? [0, component, chroma]
          : normalizedHue < 5 ? [component, 0, chroma]
            : [chroma, 0, component];
  return [r, g, b].map(channel => clampColorChannel((channel + offset) * 255));
}

function getRelativeLuminance([red, green, blue]) {
  const linearize = channel => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return (0.2126 * linearize(red)) + (0.7152 * linearize(green)) + (0.0722 * linearize(blue));
}

export function getMediaColorContrastRatio(first, second) {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function deriveContrastingTone(surface, hue, saturation, preferLight, minimumContrast = 4.5) {
  const start = preferLight ? 0.88 : 0.12;
  const direction = preferLight ? 1 : -1;
  for (let step = 0; step <= 12; step += 1) {
    const lightness = Math.max(0, Math.min(1, start + (direction * step * 0.01)));
    const candidate = hslToRgb({ hue, saturation, lightness });
    if (getMediaColorContrastRatio(surface, candidate) >= minimumContrast) return candidate;
  }
  return preferLight ? [255, 255, 255] : [0, 0, 0];
}

function mixRgb(first, second, secondWeight) {
  return first.map((channel, index) => clampColorChannel(
    channel + ((second[index] - channel) * secondWeight),
  ));
}

function formatPaletteColor(color) {
  return `rgb(${color.map(clampColorChannel).join(" ")})`;
}

export function deriveMediaArtworkPaletteFromPixels(pixels = []) {
  if (!pixels || pixels.length < 4) return null;

  let red = 0;
  let green = 0;
  let blue = 0;
  let alphaWeight = 0;
  let hueX = 0;
  let hueY = 0;
  let chromaWeight = 0;
  let saturationTotal = 0;

  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] / 255;
    if (alpha <= 0.02) continue;
    const sample = [pixels[index], pixels[index + 1], pixels[index + 2]];
    red += sample[0] * alpha;
    green += sample[1] * alpha;
    blue += sample[2] * alpha;
    alphaWeight += alpha;

    const hsl = rgbToHsl(sample);
    const hueWeight = hsl.saturation * alpha;
    if (hueWeight > 0.02) {
      const radians = hsl.hue * (Math.PI / 180);
      hueX += Math.cos(radians) * hueWeight;
      hueY += Math.sin(radians) * hueWeight;
      saturationTotal += hsl.saturation * hueWeight;
      chromaWeight += hueWeight;
    }
  }

  if (alphaWeight === 0) return null;
  const sampledSurface = [red, green, blue].map(channel => clampColorChannel(channel / alphaWeight));
  const surfaceHsl = rgbToHsl(sampledSurface);
  const hue = chromaWeight > 0
    ? ((Math.atan2(hueY, hueX) * (180 / Math.PI)) + 360) % 360
    : surfaceHsl.hue;
  const artworkSaturation = chromaWeight > 0 ? saturationTotal / chromaWeight : surfaceHsl.saturation;
  const tonalSaturation = artworkSaturation < 0.08
    ? artworkSaturation
    : Math.max(0.18, Math.min(0.58, artworkSaturation * 0.72));
  const lightContrast = getMediaColorContrastRatio(sampledSurface, [255, 255, 255]);
  const darkContrast = getMediaColorContrastRatio(sampledSurface, [0, 0, 0]);
  const preferLight = lightContrast >= darkContrast;
  /* Now Playing is drawn over the enlarged artwork plus the dark wallpaper
   * overlay, not over the raw image sampled above. Model that composition
   * separately so a medium or dark cover cannot incorrectly select black UI. */
  const wallpaperSurface = mixRgb(
    sampledSurface,
    MEDIA_PAGE_WALLPAPER_OVERLAY_COLOR,
    MEDIA_PAGE_WALLPAPER_OVERLAY_WEIGHT,
  );
  const wallpaperLightContrast = getMediaColorContrastRatio(wallpaperSurface, [255, 255, 255]);
  const wallpaperDarkContrast = getMediaColorContrastRatio(wallpaperSurface, [0, 0, 0]);
  const surface = mixRgb(sampledSurface, preferLight ? [0, 0, 0] : [255, 255, 255], 0.16);
  const foreground = deriveContrastingTone(surface, hue, tonalSaturation, preferLight);
  const muted = mixRgb(surface, foreground, 0.72);
  const strong = foreground;
  const onStrong = deriveContrastingTone(
    strong,
    hue,
    Math.min(0.42, tonalSaturation),
    !preferLight,
  );

  return {
    tone: preferLight ? "dark" : "light",
    wallpaperTone: wallpaperLightContrast >= wallpaperDarkContrast ? "dark" : "light",
    legacyTone: ((0.2126 * sampledSurface[0]) + (0.7152 * sampledSurface[1]) + (0.0722 * sampledSurface[2])) / 255 >= 0.52
      ? "light"
      : "dark",
    surface: formatPaletteColor(surface),
    foreground: formatPaletteColor(foreground),
    muted: formatPaletteColor(muted),
    strong: formatPaletteColor(strong),
    onStrong: formatPaletteColor(onStrong),
    contrast: getMediaColorContrastRatio(surface, foreground),
  };
}

function readArtworkPalette(image) {
  if (!image?.naturalWidth || !image.naturalHeight) return null;
  try {
    const canvas = document.createElement("canvas");
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    const pixels = context.getImageData(0, 0, size, size).data;
    return deriveMediaArtworkPaletteFromPixels(pixels);
  } catch {
    // Cross-origin artwork can make canvas sampling unavailable. The caller
    // decides whether to keep an existing palette or use theme defaults.
    return null;
  }
}

function clearMediaArtworkPalette(root) {
  if (!root) return;
  root.removeAttribute("data-artwork-tone");
  root.removeAttribute("data-artwork-palette");
  MEDIA_ARTWORK_PALETTE_PROPERTIES.forEach(property => root.style.removeProperty(property));
}

function shouldPreserveMediaPagePalette(root) {
  return Boolean(
    root?.matches?.(".mha-media-page")
    && root.dataset.artworkPalette === "true",
  );
}

function resolveMediaArtworkPaletteRoot(rootOrArtwork) {
  if (rootOrArtwork?.matches?.(MEDIA_ARTWORK_PALETTE_ROOT_SELECTOR)) return rootOrArtwork;
  return rootOrArtwork?.closest?.(MEDIA_ARTWORK_PALETTE_ROOT_SELECTOR) || null;
}

function applyMediaArtworkPalette(root, palette) {
  if (!root || !palette) return;
  root.dataset.artworkTone = root.matches?.(".mha-media-page")
    ? palette.wallpaperTone || palette.legacyTone
    : palette.legacyTone;
  if (root.dataset.mediaSize === "4x4") {
    root.removeAttribute("data-artwork-palette");
    MEDIA_ARTWORK_PALETTE_PROPERTIES.forEach(property => root.style.removeProperty(property));
    return;
  }
  root.dataset.artworkPalette = "true";
  root.style.setProperty("--mha-media-palette-surface", palette.surface);
  root.style.setProperty("--mha-media-palette-foreground", palette.foreground);
  root.style.setProperty("--mha-media-palette-muted", palette.muted);
  root.style.setProperty("--mha-media-palette-strong", palette.strong);
  root.style.setProperty("--mha-media-palette-on-strong", palette.onStrong);
}

export function syncMediaArtworkTone(rootOrArtwork, artworkOrImage) {
  if (!rootOrArtwork || !artworkOrImage) return;
  const image = artworkOrImage.matches?.("img")
    ? artworkOrImage
    : artworkOrImage.querySelector?.(".mha-media-widget-artwork-image");
  if (!image) return;
  const expectedArtworkUrl = image.dataset.artworkUrl || "";
  const applyPalette = () => {
    if (expectedArtworkUrl !== (image.dataset.artworkUrl || "")) return;
    const root = resolveMediaArtworkPaletteRoot(rootOrArtwork);
    if (!root) return;
    const cached = image.__mhaArtworkPaletteCache;
    const palette = cached?.artworkUrl === expectedArtworkUrl
      ? cached.palette
      : readArtworkPalette(image);
    if (palette && cached?.artworkUrl !== expectedArtworkUrl) {
      image.__mhaArtworkPaletteCache = { artworkUrl: expectedArtworkUrl, palette };
    }
    if (palette) applyMediaArtworkPalette(root, palette);
    else if (!shouldPreserveMediaPagePalette(root)) clearMediaArtworkPalette(root);
  };
  detachMediaArtworkPaletteListener(image);
  if (image.complete && image.naturalWidth) {
    queueMicrotask(applyPalette);
    return;
  }

  const onLoad = () => {
    detachMediaArtworkPaletteListener(image);
    applyPalette();
  };
  const onError = () => {
    detachMediaArtworkPaletteListener(image);
    if (expectedArtworkUrl !== (image.dataset.artworkUrl || "")) return;
    const root = resolveMediaArtworkPaletteRoot(rootOrArtwork);
    if (!shouldPreserveMediaPagePalette(root)) clearMediaArtworkPalette(root);
  };
  image.__mhaArtworkPaletteListener = { onLoad, onError };
  image.addEventListener("load", onLoad);
  image.addEventListener("error", onError);
}

export function setMediaBackgroundImage(root, artworkUrl = "") {
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

export function createMediaArtworkBackground(data) {
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

export function createMediaArtwork(data) {
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
  setMediaArtworkImage(artwork, data.artworkUrl);
  return artwork;
}

export function createMediaTitleStack(data) {
  const stack = document.createElement("div");
  stack.className = "mha-media-widget-text";
  stack.append(
    createText("mha-media-widget-title", data.title),
    createText("mha-media-widget-artist", data.subtitle),
  );
  return stack;
}

export function createMediaMetaDetails(data) {
  const details = document.createElement("div");
  details.className = "mha-media-widget-meta-details";
  details.append(createText("mha-media-widget-source", data.app));
  return details;
}

export function createMediaSourceBadge(data, { label = data.app } = {}) {
  const badge = document.createElement("div");
  badge.className = "mha-media-widget-source-badge";
  badge.append(
    createIconSymbol({ name: "speaker", label }),
    createText("mha-media-widget-source-badge-label", label),
  );
  return badge;
}

export function createMediaControlButton(label, symbol, {
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

export function createMediaPlaybackButtons(data, { interactive = true, onAction } = {}) {
  return [
    createMediaControlButton(t("widgets.mediaControls.previous", "Previous"), "‹", {
      action: "previous",
      disabled: !data.canPrevious,
      interactive,
      onAction,
    }),
    createMediaControlButton(data.playing ? t("widgets.mediaControls.pause", "Pause") : t("widgets.mediaControls.play", "Play"), data.playing ? "Ⅱ" : "▶", {
      primary: true,
      action: "playPause",
      className: "mha-media-widget-play-toggle",
      disabled: !data.canPlayPause,
      interactive,
      onAction,
    }),
    createMediaControlButton(t("widgets.mediaControls.next", "Next"), "›", {
      action: "next",
      disabled: !data.canNext,
      interactive,
      onAction,
    }),
  ];
}

export function createMediaVolumeButtons(data, { interactive = true, onAction } = {}) {
  return [
    createMediaControlButton(t("widgets.mediaControls.volumeDown", "Volume down"), "−", {
      action: "volumeDown",
      disabled: !data.canVolumeDown,
      interactive,
      onAction,
    }),
    createMediaControlButton(data.muted ? t("widgets.mediaControls.unmute", "Unmute") : t("widgets.mediaControls.mute", "Mute"), data.muted ? t("widgets.mediaControls.mute", "Mute") : "Vol", {
      primary: true,
      action: "mute",
      className: "mha-media-widget-play-toggle",
      disabled: !data.canMute,
      interactive,
      onAction,
    }),
    createMediaControlButton(t("widgets.mediaControls.volumeUp", "Volume up"), "+", {
      action: "volumeUp",
      disabled: !data.canVolumeUp,
      interactive,
      onAction,
    }),
  ];
}

export const MEDIA_PAGE_PLAYER_VARIANTS = Object.freeze(["4x2", "2x2"]);

export function createMediaPagePlayerWidget({
  entityId = "",
  variant = "4x2",
} = {}) {
  const normalizedEntityId = String(entityId || "").trim();
  const normalizedVariant = MEDIA_PAGE_PLAYER_VARIANTS.includes(variant) ? variant : "4x2";
  const size = normalizedVariant === "2x2" ? { w: 2, h: 2 } : { w: 4, h: 2 };

  return {
    id: `media-page-player-${normalizedEntityId.replace(/[^a-z0-9_-]/gi, "-")}`,
    kind: "media",
    type: "media",
    component: "media-widget",
    category: "media",
    variant: "media-page-player",
    mediaPagePlayer: true,
    entityId: normalizedEntityId,
    entity_id: normalizedEntityId,
    mediaEntityId: normalizedEntityId,
    ...size,
  };
}

export function renderMediaControls(controls, data, { mode = "playback", interactive = true, onAction } = {}) {
  const group = controls.querySelector(".mha-media-widget-controls-group");
  const toggle = controls.querySelector(".mha-media-widget-control-toggle");
  if (!group || !toggle) return;

  controls.dataset.mode = mode;
  const widgetRoot = controls.closest(".mha-media-page-player-widget");
  if (widgetRoot) widgetRoot.dataset.mediaControlsMode = mode;
  group.replaceChildren(...(
    mode === "volume"
      ? createMediaVolumeButtons(data, { interactive, onAction })
      : mode === "volume-only"
        ? []
        : createMediaPlaybackButtons(data, { interactive, onAction })
  ));

  const showingVolumeReturn = mode === "volume";
  toggle.textContent = showingVolumeReturn ? "♪" : data.volumeLabel;
  toggle.dataset.action = "toggleVolume";
  toggle.dataset.mode = showingVolumeReturn ? "volume-only" : "volume";
  toggle.removeAttribute("data-primary");
  toggle.classList.remove("mha-media-widget-play-toggle");
  toggle.setAttribute(
    "aria-label",
    showingVolumeReturn
      ? t("widgets.mediaControls.backToMediaControls", "Back to media controls")
      : t("widgets.mediaControls.showVolumeControls", "Show volume controls ({volume})", { volume: data.volumeLabel }),
  );
  toggle.disabled = false;
  toggle.setAttribute("aria-disabled", String(!interactive));
  toggle.tabIndex = interactive ? 0 : -1;
}

export function resolveMediaControlsToggleMode(currentMode = "playback", {
  mediaPagePlayer = false,
} = {}) {
  if (currentMode !== "volume") return "volume";
  return mediaPagePlayer ? "volume-only" : "playback";
}

export function createMediaControls(data, { mode = "playback", interactive = true, onAction } = {}) {
  const controls = document.createElement("div");
  controls.className = "mha-media-widget-controls-shell";

  const group = document.createElement("div");
  group.className = "mha-media-widget-controls mha-media-widget-controls-group";

  const toggle = createMediaControlButton(t("widgets.mediaControls.volume", "Volume"), data.volumeLabel, {
    action: "toggleVolume",
    interactive,
    onAction,
  });
  toggle.classList.add("mha-media-widget-control-toggle");

  controls.append(group, toggle);
  renderMediaControls(controls, data, { mode, interactive, onAction });
  return controls;
}

function hasMediaPagePlayerMetadata(data = {}) {
  return Boolean(data.entity && data.title && data.name && data.title !== data.name);
}

function getMediaPagePlayerMetadataSubtitle(data = {}) {
  if (data.artist) return data.artist;
  if (data.album && data.album !== "Preview Album") return data.album;
  return "";
}

function syncMediaPagePlayerMetadata(root, data = {}) {
  if (!root?.classList?.contains("mha-media-page-player-widget")) return;

  const playerNameNode = root.querySelector(".mha-media-page-player-name");
  if (playerNameNode) {
    playerNameNode.textContent = data.name || "";
    playerNameNode.hidden = !data.name;
  }

  const textNode = root.querySelector(".mha-media-widget-text");
  if (textNode) {
    textNode.hidden = !hasMediaPagePlayerMetadata(data);
  }

  const artistNode = root.querySelector(".mha-media-widget-artist");
  if (artistNode) {
    const metadataSubtitle = getMediaPagePlayerMetadataSubtitle(data);
    artistNode.textContent = metadataSubtitle;
    artistNode.hidden = !hasMediaPagePlayerMetadata(data) || !metadataSubtitle;
  }
}

export function setMediaProgressState(progress, data) {
  if (!progress) return;
  const width = data.progress?.available
    ? `${Math.max(0, Math.min(100, data.progress.ratio * 100))}%`
    : "0%";
  progress.style.setProperty("--mha-media-progress-fill-width", width);
}

export function createMediaProgress(data, { includeLabels = false } = {}) {
  const progress = document.createElement("div");
  progress.className = "mha-media-widget-progress";
  progress.setAttribute("aria-hidden", "true");
  progress.append(createText("mha-media-widget-progress-fill"));
  setMediaProgressState(progress, data);

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

export function createMediaMetaRows(data) {
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

function resolveMediaThemeStyle(context = {}) {
  return String(
    context?.themeStyle
    || globalThis?.document?.documentElement?.dataset?.themeStyle
    || "",
  ).trim().toLowerCase();
}

function supportsMediaPagePanelTheme(themeStyle = "") {
  return ["oneui", "ios", "material"].includes(findThemeStyleId(themeStyle));
}

function isMediaPagePanelWidget(widget = {}, themeStyle = "") {
  return widget?.responsiveSizeMode === "media-page-panel" && supportsMediaPagePanelTheme(themeStyle);
}

function resolveEffectiveMediaVariant(widget = {}, themeStyle = "") {
  if (widget?.responsiveSizeMode === "media-page-panel" && !supportsMediaPagePanelTheme(themeStyle)) {
    return "media-panel";
  }
  return widget?.variant || "media-compact";
}

function resolveMediaPagePanelSize({
  context = {},
  fallbackSize = {},
} = {}) {
  const themeStyle = resolveMediaThemeStyle(context);
  if (!supportsMediaPagePanelTheme(themeStyle)) {
    return {
      w: 4,
      h: 4,
    };
  }

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
  const isLowHeightMediaPagePanel = supportsMediaPagePanelTheme(themeStyle)
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

  if (isLowHeightMediaPagePanel) {
    return {
      w: Math.max(8, Number(fallbackSize?.w) || 8),
      h: 6,
    };
  }

  const layout = context?.layout === "mobile" ? "mobile" : "desktop";
  if (layout === "mobile") {
    const portraitRowUnits = Math.max(
      6,
      Number(context?.rowUnits)
      || Number(context?.rows)
      || Number(fallbackSize?.h)
      || 8,
    );
    return {
      w: 4,
      h: Math.max(6, portraitRowUnits - 1),
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
  onSelect = () => {},
} = {}) {
  const themeStyle = resolveMediaThemeStyle();
  const useMediaPagePanel = isMediaPagePanelWidget(widget, themeStyle);
  const transitionCache = createMediaTransitionCache();
  let graceTimer = null;
  const data = buildMediaWidgetData(widget, hass, transitionCache);
  const context = {
    hass,
    entity: data.entity,
    data,
    mediaPagePlayer: Boolean(widget?.mediaPagePlayer),
    controlsMode: widget?.mediaPagePlayer ? "volume-only" : "playback",
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
      context.controlsMode = resolveMediaControlsToggleMode(context.controlsMode, {
        mediaPagePlayer: context.mediaPagePlayer,
      });
      renderMediaControls(controls, context.data, {
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
    syncMediaPagePlayerMetadata(root, nextData);
    const sourceNode = root.querySelector(".mha-media-widget-source");
    if (sourceNode) sourceNode.textContent = nextData.app;
    const sourceBadgeNode = root.querySelector(".mha-media-widget-source-badge-label");
    if (sourceBadgeNode) {
      sourceBadgeNode.textContent = widget?.mediaPagePlayer
        ? getMediaStateLabel(nextData.state)
        : nextData.app;
    }
    const artworkNode = root.querySelector(".mha-media-widget-artwork");
    artworkNode?.setAttribute("data-playing", String(nextData.playing));
    if (artworkNode) setMediaArtworkImage(artworkNode, nextData.artworkUrl);
    setMediaBackgroundImage(root, nextData.artworkUrl);
    const progressNode = root.querySelector(".mha-media-widget-progress");
    setMediaProgressState(progressNode, nextData);
    const currentNode = root.querySelector(".mha-media-widget-progress-current");
    if (currentNode) currentNode.textContent = nextData.progress?.available ? formatMediaDuration(nextData.progress.current) : "--:--";
    const durationNode = root.querySelector(".mha-media-widget-progress-duration");
    if (durationNode) durationNode.textContent = nextData.progress?.available ? formatMediaDuration(nextData.progress.duration) : "--:--";
    renderMediaControls(controls, nextData, {
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
      context.hass && applyData(buildMediaWidgetData(widget, context.hass, transitionCache));
    }, delay);
  };

  const background = createMediaArtworkBackground(data);
  const artwork = createMediaArtwork(data);
  const text = createMediaTitleStack(data);
  const metaDetails = createMediaMetaDetails(data);
  const controls = createMediaControls(data, {
    mode: context.controlsMode,
    interactive,
    onAction,
  });
  const progress = createMediaProgress(data, {
    includeLabels: variantKey === "2x2" || variantKey === "4x2" || useMediaPagePanel,
  });
  root.append(background);
  setMediaBackgroundImage(root, data.artworkUrl);

  if (widget?.mediaPagePlayer) {
    root.classList.add("mha-media-page-player-widget");
    root.dataset.mediaPageVariant = variantKey;
    root.dataset.mediaControlsMode = context.controlsMode;
    const info = document.createElement("div");
    info.className = "mha-media-page-player-info";
    const playerMetaHeader = document.createElement("div");
    playerMetaHeader.className = "mha-media-page-player-meta-header";
    const playerName = createText("mha-media-page-player-name", data.name);
    const pageText = createMediaTitleStack({
      ...data,
      subtitle: getMediaPagePlayerMetadataSubtitle(data),
    });
    playerMetaHeader.append(createMediaSourceBadge(data, {
      label: getMediaStateLabel(data.state),
    }), playerName);
    info.append(playerMetaHeader, pageText, progress);
    root.append(artwork, info, controls);
    syncMediaPagePlayerMetadata(root, data);
  } else if (variantKey === "2x2") {
    root.append(artwork, createMediaSourceBadge(data), text, progress, controls);
  } else if (variantKey === "4x2") {
    const info = document.createElement("div");
    info.className = "mha-media-widget-info";
    info.append(createMediaSourceBadge(data), text, progress, controls);
    root.append(artwork, info);
  } else {
    const info = document.createElement("div");
    info.className = "mha-media-widget-info";
    info.append(text, metaDetails);

    const transport = document.createElement("div");
    transport.className = "mha-media-widget-transport";
    transport.append(createMediaMetaRows(data), progress, controls);

    root.append(artwork, info, transport);
  }

  if (widget?.mediaPagePlayer) {
    root.dataset.mediaPagePlayer = "true";
    root.addEventListener("click", () => onSelect(widget.entityId || widget.entity_id || widget.mediaEntityId || ""));
  }

  if (!interactive) {
    root.dataset.interactive = "false";
    root.querySelectorAll("button").forEach(button => {
      button.tabIndex = -1;
      button.setAttribute("aria-disabled", "true");
    });
  }

  root.__mhaUpdateFromHass = nextHass => {
    const nextData = buildMediaWidgetData(widget, nextHass, transitionCache);
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
    shell.dataset.mediaVariant = resolveEffectiveMediaVariant(
      widget,
      resolveMediaThemeStyle(),
    );
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
