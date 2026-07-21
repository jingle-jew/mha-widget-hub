import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultPages,
  createFallbackPage,
  getActivePage,
  normalizePage,
  normalizePages,
} from "../src/pages/page-model.js";

const normalizeWidget = widget => ({
  ...widget,
  normalized: true,
});

test("page normalization preserves identity and normalizes widgets", () => {
  assert.deepEqual(
    normalizePage({
      id: " kitchen ",
      label: "Cuisine",
      widgets: [{ id: "light" }],
    }, 1, { normalizeWidget }),
    {
      id: "kitchen",
      name: "Cuisine",
      icon: "grid",
      widgets: [{ id: "light", normalized: true }],
    },
  );
});

test("page normalization supplies stable first-page and later-page defaults", () => {
  assert.deepEqual(normalizePage({}, 0), {
    id: "page-1",
    name: "Home",
    icon: "home",
    widgets: [],
  });
  assert.deepEqual(normalizePage({}, 2), {
    id: "page-3",
    name: "Page 3",
    icon: "grid",
    widgets: [],
  });
});

test("duplicate page ids are repaired deterministically", () => {
  const result = normalizePages([
    { id: "room" },
    { id: "room" },
    { id: "room-2" },
    { id: "room" },
  ]);

  assert.equal(result.repaired, true);
  assert.deepEqual(
    result.pages.map(page => page.id),
    ["room", "room-2", "room-2-2", "room-3"],
  );
});

test("fallback and active-page lookup remain independent from storage", () => {
  const fallback = createFallbackPage();
  const pages = [fallback, normalizePage({ id: "second" }, 1)];

  assert.equal(fallback.id, "home");
  assert.equal(getActivePage(pages, "second").id, "second");
  assert.equal(getActivePage(pages, "missing").id, "home");
  assert.equal(getActivePage([], "missing"), null);
});

test("default first-launch pages are one grid, one weather page, and one media page", () => {
  const pages = createDefaultPages();

  assert.deepEqual(
    pages.map(page => ({
      id: page.id,
      name: page.name,
      icon: page.icon,
      type: page.type || "grid",
      widgets: page.widgets.length,
      autoPopulatePending: page.config?.autoPopulatePending === true,
    })),
    [
      { id: "home", name: "Home", icon: "home", type: "grid", widgets: 0, autoPopulatePending: false },
      { id: "weather", name: "Weather", icon: "cloud", type: "weather", widgets: 0, autoPopulatePending: true },
      { id: "media", name: "Media Players", icon: "media-player", type: "media-players", widgets: 0, autoPopulatePending: false },
    ],
  );
});

test("legacy media pages keep the dedicated page type and selected player config", () => {
  const migrated = normalizePage({
    id: "media",
    name: "Media Players",
    type: "media-players",
    config: {
      selectedPlayerId: "media_player.salon",
    },
    widgets: [],
  }, 2);

  assert.equal(migrated.type, "media-players");
  assert.equal(migrated.icon, "media-player");
  assert.deepEqual(migrated.widgets, []);
  assert.equal(migrated.config.selectedPlayerId, "media_player.salon");
});

test("legacy single-widget media pages are promoted to the dedicated page type", () => {
  const migrated = normalizePage({
    id: "media",
    name: "Media Players",
    widgets: [{
      id: "widget-media-page-media",
      kind: "media",
      variant: "media-page-panel",
      responsiveSizeMode: "media-page-panel",
      entityId: "media_player.salon",
    }],
  }, 2);

  assert.equal(migrated.type, "media-players");
  assert.equal(migrated.widgets.length, 1);
  assert.equal(migrated.config.selectedPlayerId, "media_player.salon");
  assert.deepEqual(migrated.config.enabledPlayerIds, ["media_player.salon"]);
});

test("media page normalization preserves an explicit empty enabled-player list", () => {
  const normalized = normalizePage({
    id: "media",
    type: "media-players",
    config: {
      enabledPlayerIds: [],
      enabledPlayerIdsConfigured: true,
      defaultPlayerId: "",
      selectedPlayerId: "",
    },
    widgets: [{
      id: "widget-media-page-media",
      kind: "media",
      variant: "media-page-panel",
      responsiveSizeMode: "media-page-panel",
      entityId: "media_player.salon",
    }],
  }, 2);

  assert.deepEqual(normalized.config.enabledPlayerIds, []);
  assert.equal(normalized.config.defaultPlayerId, "");
  assert.equal(normalized.config.selectedPlayerId, "");
});
