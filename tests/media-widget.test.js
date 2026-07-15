import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  buildMediaWidgetData,
  createMediaTransitionCache,
  createMediaPagePlayerWidget,
  deriveMediaArtworkPaletteFromPixels,
  getMediaColorContrastRatio,
  MEDIA_WIDGET_CONTENT_RENDERER,
  MEDIA_TRANSITION_GRACE_MS,
  resolveMediaTransitionData,
  syncMediaArtworkTone,
} from "../src/widgets/media-widget.js";
import { normalizeWidgetForKind } from "../src/layout/layout-engine.js";
import {
  MEDIA_PAGE_INACTIVE_FALLBACK_MS,
  resolveMediaPageNowPlayingId,
  resolveMobileMediaPagePane,
  swapOrderedIds,
} from "../src/pages/media-page.js";

const REPO_ROOT = process.cwd();

test("media volume falls back to zero only when the player is off", () => {
  const buildForState = (state, attributes = {}) => buildMediaWidgetData(
    { entityId: "media_player.salon" },
    {
      states: {
        "media_player.salon": {
          entity_id: "media_player.salon",
          state,
          attributes: {
            friendly_name: "Salon",
            volume_level: 0.41,
            ...attributes,
          },
        },
      },
    },
  );

  for (const state of ["playing", "paused", "idle", "stopped", "unavailable", "unknown"]) {
    const data = buildForState(state);
    assert.equal(data.volumePercent, 41, `${state} should preserve the HA volume`);
    assert.equal(data.volumeLabel, "41%", `${state} should preserve the HA volume label`);
  }

  const off = buildForState("off", { is_volume_muted: true });
  assert.equal(off.volumePercent, 0);
  assert.equal(off.volumeLabel, "0%");
  assert.equal(off.muted, false);
});

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

function parsePaletteRgb(value = "") {
  return String(value).match(/\d+/g)?.slice(0, 3).map(Number) || [];
}

test("artwork palettes stay tonal while meeting readable text contrast", () => {
  const pixels = Uint8ClampedArray.from([
    24, 48, 82, 255,
    38, 74, 112, 255,
    186, 92, 54, 255,
    16, 34, 62, 255,
  ]);
  const palette = deriveMediaArtworkPaletteFromPixels(pixels);
  const surface = parsePaletteRgb(palette.surface);
  const foreground = parsePaletteRgb(palette.foreground);

  assert.ok(palette);
  assert.ok(palette.contrast >= 4.5);
  assert.ok(getMediaColorContrastRatio(surface, foreground) >= 4.5);
  assert.notEqual(palette.foreground, "rgb(255 255 255)");
  assert.notEqual(palette.foreground, "rgb(0 0 0)");
  assert.equal(palette.strong, palette.foreground);
});

test("artwork palettes adapt to the source colors", () => {
  const warm = deriveMediaArtworkPaletteFromPixels(Uint8ClampedArray.from([
    142, 54, 28, 255,
    206, 116, 52, 255,
  ]));
  const cool = deriveMediaArtworkPaletteFromPixels(Uint8ClampedArray.from([
    18, 68, 122, 255,
    42, 132, 168, 255,
  ]));

  assert.notEqual(warm.foreground, cool.foreground);
  assert.notEqual(warm.surface, cool.surface);
});

test("artwork tone can target the media page Now Playing surface", async () => {
  const properties = new Map();
  const page = {
    dataset: {},
    matches: selector => selector.includes(".mha-media-page"),
    style: {
      setProperty: (property, value) => properties.set(property, value),
      removeProperty: property => properties.delete(property),
    },
  };
  const palette = deriveMediaArtworkPaletteFromPixels(Uint8ClampedArray.from([
    18, 38, 64, 255,
    28, 52, 84, 255,
  ]));
  const image = {
    dataset: { artworkUrl: "/api/media_player_proxy/media_player.salon" },
    complete: true,
    naturalWidth: 512,
    matches: selector => selector === "img",
    __mhaArtworkPaletteCache: {
      artworkUrl: "/api/media_player_proxy/media_player.salon",
      palette,
    },
  };

  syncMediaArtworkTone(page, image);
  await Promise.resolve();

  assert.equal(page.dataset.artworkTone, palette.legacyTone);
  assert.equal(page.dataset.artworkPalette, "true");
  assert.equal(properties.get("--mha-media-palette-foreground"), palette.foreground);
});

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

test("media page player widgets default to 4x2 and support a compact 2x2 variant", () => {
  assert.deepEqual(
    createMediaPagePlayerWidget({ entityId: "media_player.salon" }),
    {
      id: "media-page-player-media_player-salon",
      kind: "media",
      type: "media",
      component: "media-widget",
      category: "media",
      variant: "media-page-player",
      mediaPagePlayer: true,
      entityId: "media_player.salon",
      entity_id: "media_player.salon",
      mediaEntityId: "media_player.salon",
      w: 4,
      h: 2,
    },
  );
  const compact = createMediaPagePlayerWidget({
    entityId: "media_player.salon",
    variant: "2x2",
  });
  assert.equal(compact.w, 2);
  assert.equal(compact.h, 2);
});

test("media page player editing swaps two selected players without changing the other positions", () => {
  assert.deepEqual(
    swapOrderedIds(
      ["media_player.corridor", "media_player.studio", "media_player.tv", "media_player.kids"],
      "media_player.studio",
      "media_player.kids",
    ),
    ["media_player.corridor", "media_player.kids", "media_player.tv", "media_player.studio"],
  );
});

test("mobile media page exposes now playing and available players as separate scroll states", () => {
  assert.equal(resolveMobileMediaPagePane(0), "now-playing");
  assert.equal(resolveMobileMediaPagePane(4), "now-playing");
  assert.equal(resolveMobileMediaPagePane(5), "available-players");
});

test("media page keeps a playing selection and falls back from inactive selections", () => {
  const enabledPlayers = [
    { entity_id: "media_player.salon" },
    { entity_id: "media_player.office" },
    { entity_id: "media_player.bedroom" },
  ];
  const hass = {
    states: {
      "media_player.salon": { state: "idle" },
      "media_player.office": { state: "playing" },
      "media_player.bedroom": { state: "off" },
    },
  };

  assert.equal(
    resolveMediaPageNowPlayingId({
      config: {
        selectedPlayerId: "media_player.office",
        defaultPlayerId: "media_player.salon",
      },
      enabledPlayers,
      hass,
    }),
    "media_player.office",
  );
  assert.equal(
    resolveMediaPageNowPlayingId({
      config: {
        selectedPlayerId: "media_player.salon",
        defaultPlayerId: "media_player.office",
      },
      enabledPlayers,
      hass,
    }),
    "media_player.office",
  );
  assert.equal(
    resolveMediaPageNowPlayingId({
      config: {
        selectedPlayerId: "media_player.salon",
        defaultPlayerId: "media_player.bedroom",
      },
      enabledPlayers,
      hass,
      transientPlayerId: "media_player.bedroom",
    }),
    "media_player.bedroom",
  );
  assert.equal(
    resolveMediaPageNowPlayingId({
      config: {
        selectedPlayerId: "media_player.salon",
        defaultPlayerId: "media_player.bedroom",
      },
      enabledPlayers,
      hass,
      lastPlayingPlayerId: "media_player.office",
    }),
    "media_player.office",
  );
  assert.equal(MEDIA_PAGE_INACTIVE_FALLBACK_MS, 10_000);
});

test("media page keeps a paused selected player instead of falling back", () => {
  const pausedPlayerId = "media_player.office";
  assert.equal(
    resolveMediaPageNowPlayingId({
      config: {
        selectedPlayerId: pausedPlayerId,
        defaultPlayerId: "media_player.salon",
      },
      enabledPlayers: [
        { entity_id: "media_player.salon" },
        { entity_id: pausedPlayerId },
      ],
      hass: {
        states: {
          "media_player.salon": { state: "playing" },
          [pausedPlayerId]: { state: "paused" },
        },
      },
    }),
    pausedPlayerId,
  );
});

test("media page panel keeps responsive sizes on supported themes and downgrades elsewhere", () => {
  const widget = {
    kind: "media",
    variant: "media-page-panel",
    responsiveSizeMode: "media-page-panel",
    w: 4,
    h: 8,
  };

  assert.deepEqual(
    normalizeWidgetForKind(widget, { units: 4, rowUnits: 12, layout: "mobile" }),
    { w: 4, h: 4 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 8,
      rowUnits: 8,
      layout: "tablet",
      themeStyle: "ios",
      viewportHeight: 900,
    }),
    { w: 6, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 12,
      rowUnits: 8,
      layout: "desktop",
      themeStyle: "material",
      viewportHeight: 760,
    }),
    { w: 8, h: 6 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 8,
      rowUnits: 8,
      layout: "tablet",
      themeStyle: "alexa",
      viewportHeight: 900,
    }),
    { w: 4, h: 4 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 8,
      rowUnits: 4,
      layout: "mobile",
      themeStyle: "oneui",
      layoutVariant: "mobile-landscape",
    }),
    { w: 8, h: 4 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 4,
      rowUnits: 8,
      layout: "mobile",
      themeStyle: "ios",
      layoutVariant: "mobile-portrait",
    }),
    { w: 4, h: 7 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 4,
      rowUnits: 9,
      layout: "mobile",
      themeStyle: "material",
      layoutVariant: "mobile-portrait",
    }),
    { w: 4, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 8,
      rowUnits: 8,
      layout: "tablet",
      themeStyle: "oneui",
      viewportHeight: 900,
    }),
    { w: 6, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 12,
      rowUnits: 8,
      layout: "desktop",
      themeStyle: "oneui",
      viewportHeight: 900,
    }),
    { w: 6, h: 8 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 8,
      rowUnits: 8,
      layout: "tablet",
      themeStyle: "oneui",
      viewportHeight: 760,
    }),
    { w: 8, h: 6 },
  );
  assert.deepEqual(
    normalizeWidgetForKind(widget, {
      units: 12,
      rowUnits: 8,
      layout: "desktop",
      themeStyle: "oneui",
      viewportHeight: 760,
    }),
    { w: 8, h: 6 },
  );
});

test("media page panel shell stays active on supported themes and falls back elsewhere", () => {
  const shell = { dataset: {} };
  const originalDocument = globalThis.document;

  globalThis.document = {
    documentElement: {
      dataset: {
        themeStyle: "ios",
      },
    },
  };

  MEDIA_WIDGET_CONTENT_RENDERER.decorateShell({
    shell,
    widget: {
      variant: "media-page-panel",
      responsiveSizeMode: "media-page-panel",
    },
  });

  assert.equal(shell.dataset.mediaVariant, "media-page-panel");

  globalThis.document = {
    documentElement: {
      dataset: {
        themeStyle: "alexa",
      },
    },
  };

  MEDIA_WIDGET_CONTENT_RENDERER.decorateShell({
    shell,
    widget: {
      variant: "media-page-panel",
      responsiveSizeMode: "media-page-panel",
    },
  });

  assert.equal(shell.dataset.mediaVariant, "media-panel");

  globalThis.document = {
    documentElement: {
      dataset: {
        themeStyle: "oneui",
      },
    },
  };

  MEDIA_WIDGET_CONTENT_RENDERER.decorateShell({
    shell,
    widget: {
      variant: "media-page-panel",
      responsiveSizeMode: "media-page-panel",
    },
  });

  assert.equal(shell.dataset.mediaVariant, "media-page-panel");
  globalThis.document = originalDocument;
});

test("media page panel css clears the mobile dock and anchors transport in landscape", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "widgets", "media-widget.css"),
    "utf8",
  );

  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s*>\s*\.mha-media-widget\[data-media-size="4x4"\],[\s\S]*?:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="material"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s*>\s*\.mha-media-widget\[data-media-size="4x4"\]\s*\{[\s\S]*grid-template-rows:\s*auto minmax\(0,\s*1fr\) auto;[\s\S]*block-size:\s*calc\([\s\S]*var\(--mha-shell-content-bottom-inset,\s*var\(--mha-mobile-dock-footprint,\s*0px\)\)[\s\S]*\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-artwork\s*\{[\s\S]*inline-size:\s*min\(100%,\s*var\(--mha-media-4x4-artwork-size\)\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s*>\s*\.mha-media-widget\[data-media-size="4x4"\]\s*\{[\s\S]*--mha-media-gap:\s*clamp\(\.58rem,\s*min\(4\.6cqi,\s*4\.6cqb\),\s*\.94rem\);[\s\S]*--mha-media-progress-height:\s*clamp\(\.34rem,\s*2\.4cqb,\s*\.58rem\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-meta-rows\s*\{[\s\S]*display:\s*none;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-transport\s*\{[\s\S]*padding:\s*clamp\(\.78rem,\s*3\.4cqb,\s*\.98rem\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-transport,[\s\S]*?:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-theme-style="material"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-transport\s*\{[\s\S]*inset-inline:\s*max\(var\(--mha-media-padding\),\s*var\(--mha-mobile-grid-gutter,\s*var\(--mha-page-padding\)\)\);[\s\S]*inset-block-end:\s*var\(--mha-media-padding\);[\s\S]*position:\s*absolute;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-transport,[\s\S]*?:host\(\[data-layout-variant="mobile-landscape"\]\[data-theme-style="material"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-transport\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;[\s\S]*justify-content:\s*flex-end;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\[data-theme-style="oneui"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-progress-shell,[\s\S]*?:host\(\[data-layout-variant="mobile-landscape"\]\[data-theme-style="material"\]\)\s+\.mha-widget\[data-widget-kind="media"\]\[data-media-variant="media-page-panel"\]\s+\.mha-media-widget-progress-shell\s*\{[\s\S]*margin-block-start:\s*auto;/,
  );
});

test("premium media layouts scope immersive states and artwork palettes to 2x2 and 4x2", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "widgets", "media-widget.css"),
    "utf8",
  );
  const premiumSection = source.split("Premium compact and wide compositions")[1] || "";

  assert.match(
    premiumSection,
    /data-media-size="2x2"\], \[data-media-size="4x2"\].*data-media-state="playing".*data-media-state="paused"/s,
  );
  assert.match(
    premiumSection,
    /data-artwork-palette="true"[\s\S]*--mha-media-artwork-foreground:\s*var\(--mha-media-palette-foreground\);/,
  );
  assert.match(
    premiumSection,
    /:not\(:is\(\[data-media-state="playing"\], \[data-media-state="paused"\]\)\) \.mha-media-widget-artwork\s*\{\s*display:\s*none;/,
  );
  assert.doesNotMatch(premiumSection, /data-media-size="4x4"/);
});
