import test from "node:test";
import assert from "node:assert/strict";
import { normalizeEntityVisibilityConfig } from "../src/admin/entity-permissions.js";
import {
  getAvailableMediaPlayers,
  resolveEnabledMediaPlayers,
  resolveSelectedMediaPlayerId,
} from "../src/ha/media-players.js";
import { createMediaConfigDraft } from "../src/widget-config/media-config.js";

function createMediaPlayer(entityId, state, friendlyName) {
  return {
    entity_id: entityId,
    state,
    attributes: friendlyName ? { friendly_name: friendlyName } : {},
  };
}

test("media page discovery matches widget media options for available authorized players", () => {
  const hass = {
    user: { id: "user-1" },
    states: {
      "media_player.kitchen": createMediaPlayer("media_player.kitchen", "playing", "Kitchen"),
      "media_player.office": createMediaPlayer("media_player.office", "unavailable", "Office"),
      "media_player.bedroom": createMediaPlayer("media_player.bedroom", "paused", "Bedroom"),
      "media_player.patio": createMediaPlayer("media_player.patio", "idle", "Patio"),
    },
  };
  const visibilityConfig = normalizeEntityVisibilityConfig({
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          media_player: [
            "media_player.kitchen",
            "media_player.office",
            "media_player.bedroom",
          ],
        },
      },
    },
  });

  const pagePlayers = getAvailableMediaPlayers(hass, visibilityConfig);
  const widgetDraft = createMediaConfigDraft({}, hass, visibilityConfig);

  assert.deepEqual(pagePlayers.map(player => player.entity_id), [
    "media_player.bedroom",
    "media_player.kitchen",
  ]);
  assert.deepEqual(pagePlayers.map(player => player.name), [
    "Bedroom",
    "Kitchen",
  ]);
  assert.deepEqual(widgetDraft.options.map(option => option.value), [
    "media_player.bedroom",
    "media_player.kitchen",
  ]);
  assert.deepEqual(widgetDraft.options.map(option => option.label), [
    "Bedroom",
    "Kitchen",
  ]);
  assert.equal(widgetDraft.draft.mediaEntityId, "media_player.bedroom");
});

test("media page selection falls back when configured players become unavailable", () => {
  const availablePlayers = [
    { entity_id: "media_player.bedroom", name: "Bedroom" },
    { entity_id: "media_player.kitchen", name: "Kitchen" },
  ];

  const selectedFromDefault = resolveSelectedMediaPlayerId({
    selectedPlayerId: "media_player.office",
    defaultPlayerId: "media_player.kitchen",
  }, availablePlayers);
  assert.equal(selectedFromDefault, "media_player.kitchen");

  const enabledPlayers = resolveEnabledMediaPlayers({
    enabledPlayerIds: [
      "media_player.office",
      "media_player.kitchen",
      "media_player.bedroom",
    ],
    defaultPlayerId: "media_player.office",
  }, availablePlayers);

  assert.deepEqual(enabledPlayers.map(player => player.entity_id), [
    "media_player.kitchen",
    "media_player.bedroom",
  ]);
  assert.equal(
    resolveSelectedMediaPlayerId({ defaultPlayerId: "media_player.office" }, enabledPlayers),
    "media_player.kitchen",
  );
});

test("media page preserves the configured player order", () => {
  const availablePlayers = [
    { entity_id: "media_player.bedroom", name: "Bedroom" },
    { entity_id: "media_player.kitchen", name: "Kitchen" },
  ];

  const enabledPlayers = resolveEnabledMediaPlayers({
    enabledPlayerIds: ["media_player.kitchen", "media_player.bedroom"],
  }, availablePlayers);

  assert.deepEqual(enabledPlayers.map(player => player.entity_id), [
    "media_player.kitchen",
    "media_player.bedroom",
  ]);
});

test("media page keeps an explicit empty enabled-player list instead of restoring all players", () => {
  const availablePlayers = [
    { entity_id: "media_player.bedroom", name: "Bedroom" },
    { entity_id: "media_player.kitchen", name: "Kitchen" },
  ];

  assert.deepEqual(
    resolveEnabledMediaPlayers({ enabledPlayerIds: [], enabledPlayerIdsConfigured: true }, availablePlayers),
    [],
  );
  assert.deepEqual(
    resolveEnabledMediaPlayers({}, availablePlayers).map(player => player.entity_id),
    ["media_player.bedroom", "media_player.kitchen"],
  );
  assert.deepEqual(
    resolveEnabledMediaPlayers({ enabledPlayerIds: [] }, availablePlayers).map(player => player.entity_id),
    ["media_player.bedroom", "media_player.kitchen"],
  );
  assert.deepEqual(
    resolveEnabledMediaPlayers({ enabledPlayerIds: [], enabledPlayerIdsConfigured: true }, availablePlayers),
    [],
  );
});
