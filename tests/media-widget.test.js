import test from "node:test";
import assert from "node:assert/strict";
import {
  createMediaTransitionCache,
  MEDIA_TRANSITION_GRACE_MS,
  resolveMediaTransitionData,
} from "../src/widgets/media-widget.js";
import { normalizeWidgetForKind } from "../src/layout/layout-engine.js";

function mediaData(overrides = {}) {
  return {
    entity: null,
    entityId: "media_player.salon",
    name: "Salon",
    title: "Salon",
    subtitle: "Idle",
    artist: "",
    album: "",
    app: "MHA Media",
    state: "idle",
    playing: false,
    muted: false,
    volumeLabel: "50%",
    volumePercent: 50,
    artworkUrl: "",
    hasLiveMetadata: false,
    canPrevious: true,
    canPlayPause: true,
    canNext: true,
    canVolumeDown: true,
    canVolumeUp: true,
    canMute: true,
    ...overrides,
  };
}

test("media transition cache hides temporary idle metadata and artwork gaps", () => {
  const cache = createMediaTransitionCache();
  const playing = resolveMediaTransitionData(mediaData({
    title: "Ocean Drive",
    subtitle: "Duke Dumont",
    artist: "Duke Dumont",
    state: "playing",
    playing: true,
    artworkUrl: "/api/media_player_proxy/media_player.salon",
    hasLiveMetadata: true,
  }), cache, 1000);

  assert.equal(playing.title, "Ocean Drive");
  assert.equal(cache.lastTitle, "Ocean Drive");
  assert.equal(cache.lastArtwork, "/api/media_player_proxy/media_player.salon");
  assert.equal(cache.lastArtist, "Duke Dumont");
  assert.equal(cache.lastMediaState, "playing");
  assert.equal(cache.lastUpdateTimestamp, 1000);

  const transientIdle = resolveMediaTransitionData(mediaData({
    title: "Salon",
    subtitle: "Idle",
    state: "idle",
    playing: false,
    artworkUrl: "",
    hasLiveMetadata: false,
  }), cache, 1100);

  assert.equal(transientIdle.title, "Ocean Drive");
  assert.equal(transientIdle.subtitle, "Duke Dumont");
  assert.equal(transientIdle.state, "playing");
  assert.equal(transientIdle.playing, true);
  assert.equal(transientIdle.artworkUrl, "/api/media_player_proxy/media_player.salon");
  assert.equal(transientIdle.usingGraceCache, true);

  const paused = resolveMediaTransitionData(mediaData({
    title: "Ocean Drive",
    subtitle: "Paused",
    artist: "Duke Dumont",
    state: "paused",
    playing: false,
    artworkUrl: "/api/media_player_proxy/media_player.salon",
    hasLiveMetadata: true,
  }), cache, 1200);

  assert.equal(paused.title, "Ocean Drive");
  assert.equal(paused.subtitle, "Paused");
  assert.equal(paused.state, "paused");
  assert.equal(paused.playing, false);
  assert.equal(paused.usingGraceCache, undefined);
});

test("media transition cache expires when idle is not temporary", () => {
  const cache = createMediaTransitionCache();
  resolveMediaTransitionData(mediaData({
    title: "Ocean Drive",
    subtitle: "Duke Dumont",
    artist: "Duke Dumont",
    state: "playing",
    playing: true,
    artworkUrl: "/api/media_player_proxy/media_player.salon",
    hasLiveMetadata: true,
  }), cache, 1000);

  resolveMediaTransitionData(mediaData({ state: "idle" }), cache, 1100);
  const expiredIdle = resolveMediaTransitionData(mediaData({ state: "idle" }), cache, 1100 + MEDIA_TRANSITION_GRACE_MS + 1);

  assert.equal(expiredIdle.title, "Salon");
  assert.equal(expiredIdle.subtitle, "Idle");
  assert.equal(expiredIdle.state, "idle");
  assert.equal(expiredIdle.playing, false);
  assert.equal(expiredIdle.artworkUrl, "");
  assert.equal(expiredIdle.usingGraceCache, undefined);
});

test("media page panel resolves responsive sizes without collapsing back to 4x4", () => {
  const widget = {
    kind: "media",
    variant: "media-page-panel",
    responsiveSizeMode: "media-page-panel",
    w: 4,
    h: 8,
  };

  assert.deepEqual(
    normalizeWidgetForKind(widget, { units: 4, rowUnits: 12, layout: "mobile" }),
    { w: 4, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, { units: 8, rowUnits: 8, layout: "tablet" }),
    { w: 6, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, { units: 12, rowUnits: 8, layout: "desktop" }),
    { w: 6, h: 8 },
  );
});
