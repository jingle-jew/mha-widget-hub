import { getEntityDomain, normalizeEntityStateValue } from "./entity.js";
import { t } from "../i18n/index.js";

export const MEDIA_PLAYER_FEATURES = Object.freeze({
  pause: 1,
  volumeSet: 4,
  volumeMute: 8,
  previousTrack: 16,
  nextTrack: 32,
  play: 16384,
});

const MEDIA_VOLUME_STEP = 0.05;

const MEDIA_STATE_LABEL_KEYS = Object.freeze({
  playing: "states.playing",
  paused: "states.paused",
  idle: "states.idle",
  off: "states.off",
  unavailable: "states.unavailable",
  unknown: "states.unknown",
  none: "states.unknown",
});

function cleanText(value = "") {
  return String(value || "").trim();
}

export function getMediaStateLabel(state = "") {
  const normalized = normalizeEntityStateValue(state);
  return MEDIA_STATE_LABEL_KEYS[normalized] ? t(MEDIA_STATE_LABEL_KEYS[normalized]) : normalized;
}

export function resolveHomeAssistantMediaUrl(url = "", origin = globalThis.window?.location?.origin || "") {
  const normalized = cleanText(url);
  if (!normalized) return "";
  if (/^(https?:)?\/\//i.test(normalized) || normalized.startsWith("data:")) return normalized;
  if (normalized.startsWith("/")) return `${origin}${normalized}`;
  return normalized;
}

export function getMediaArtworkUrl(entityState, widget = {}) {
  const attributes = entityState?.attributes || {};
  return resolveHomeAssistantMediaUrl(
    attributes.entity_picture
      || attributes.media_image_url
      || attributes.entity_picture_local
      || widget.artworkUrl
      || widget.entityPicture
      || widget.mediaImageUrl
      || "",
  );
}

export function buildMediaDisplayModel(entityState, widget = {}, fallback = {}) {
  const attributes = entityState?.attributes || {};
  const entityId = entityState?.entity_id || widget.entityId || widget.entity_id || widget.mediaEntityId || fallback.entityId || "";
  const state = normalizeEntityStateValue(entityState?.state || widget.state || fallback.state);
  const stateLabel = getMediaStateLabel(state);
  const friendlyName = cleanText(attributes.friendly_name)
    || cleanText(widget.label)
    || cleanText(widget.title)
    || cleanText(fallback.name)
    || entityId;
  const mediaTitle = cleanText(attributes.media_title || widget.mediaTitle || fallback.title);
  const mediaArtist = cleanText(attributes.media_artist || widget.mediaArtist || widget.artist || fallback.artist);
  const mediaAlbum = cleanText(attributes.media_album_name || widget.album || fallback.album);

  if (mediaTitle && state === "paused") {
    return {
      entityId,
      name: friendlyName,
      title: mediaTitle,
      subtitle: t("states.paused", "Paused"),
      artist: mediaArtist,
      album: mediaAlbum,
      state,
      stateLabel,
    };
  }

  if (mediaTitle && !["idle", "off", "unavailable", "unknown", "none"].includes(state)) {
    return {
      entityId,
      name: friendlyName,
      title: mediaTitle,
      subtitle: mediaArtist || mediaAlbum || stateLabel,
      artist: mediaArtist,
      album: mediaAlbum,
      state,
      stateLabel,
    };
  }

  return {
    entityId,
    name: friendlyName,
    title: friendlyName,
    subtitle: stateLabel,
    artist: mediaArtist,
    album: mediaAlbum,
    state,
    stateLabel,
  };
}

export function supportsMediaPlayerFeature(entityState, feature) {
  if (!entityState || getEntityDomain(entityState.entity_id) !== "media_player") return false;
  const supportedFeatures = entityState.attributes?.supported_features;
  if (!Number.isFinite(Number(supportedFeatures))) return true;
  return (Number(supportedFeatures) & feature) === feature;
}

function clampMediaVolume(value) {
  return Math.max(0, Math.min(1, value));
}

export function buildMediaPlayerServiceCall(entityState, action = "") {
  const entityId = entityState?.entity_id || "";
  if (!entityId || getEntityDomain(entityId) !== "media_player") return null;
  const attributes = entityState.attributes || {};

  if (action === "previous") {
    if (!supportsMediaPlayerFeature(entityState, MEDIA_PLAYER_FEATURES.previousTrack)) return null;
    return {
      domain: "media_player",
      service: "media_previous_track",
      data: { entity_id: entityId },
    };
  }

  if (action === "next") {
    if (!supportsMediaPlayerFeature(entityState, MEDIA_PLAYER_FEATURES.nextTrack)) return null;
    return {
      domain: "media_player",
      service: "media_next_track",
      data: { entity_id: entityId },
    };
  }

  if (action === "volumeDown" || action === "volumeUp") {
    if (!supportsMediaPlayerFeature(entityState, MEDIA_PLAYER_FEATURES.volumeSet)) return null;
    const currentVolume = Number(attributes.volume_level);
    if (!Number.isFinite(currentVolume)) return null;
    const direction = action === "volumeUp" ? 1 : -1;
    const volumeLevel = clampMediaVolume(currentVolume + (MEDIA_VOLUME_STEP * direction));
    return {
      domain: "media_player",
      service: "volume_set",
      data: {
        entity_id: entityId,
        volume_level: Number(volumeLevel.toFixed(3)),
      },
    };
  }

  if (action === "mute") {
    if (!supportsMediaPlayerFeature(entityState, MEDIA_PLAYER_FEATURES.volumeMute)) return null;
    return {
      domain: "media_player",
      service: "volume_mute",
      data: {
        entity_id: entityId,
        is_volume_muted: attributes.is_volume_muted !== true,
      },
    };
  }

  if (action === "playPause") {
    const playing = normalizeEntityStateValue(entityState.state) === "playing";
    const feature = playing ? MEDIA_PLAYER_FEATURES.pause : MEDIA_PLAYER_FEATURES.play;
    if (!supportsMediaPlayerFeature(entityState, feature)) return null;
    return {
      domain: "media_player",
      service: playing ? "media_pause" : "media_play",
      data: { entity_id: entityId },
    };
  }

  return null;
}
