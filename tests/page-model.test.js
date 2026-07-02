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

test("default first-launch pages are two grids plus one media page", () => {
  const pages = createDefaultPages();

  assert.deepEqual(
    pages.map(page => ({
      id: page.id,
      name: page.name,
      icon: page.icon,
      type: page.type || "grid",
      widgets: page.widgets.length,
    })),
    [
      { id: "home", name: "Home", icon: "home", type: "grid", widgets: 0 },
      { id: "page-2", name: "Page 2", icon: "grid", type: "grid", widgets: 0 },
      { id: "media", name: "Media Players", icon: "media-player", type: "grid", widgets: 1 },
    ],
  );
});

test("legacy media pages are migrated to normal grid pages with a seeded media widget", () => {
  const migrated = normalizePage({
    id: "media",
    name: "Media Players",
    type: "media-players",
    config: {
      selectedPlayerId: "media_player.salon",
    },
    widgets: [],
  }, 2);

  assert.equal(migrated.type, undefined);
  assert.equal(migrated.icon, "media-player");
  assert.equal(migrated.widgets.length, 1);
  assert.deepEqual(
    migrated.widgets[0] && {
      kind: migrated.widgets[0].kind,
      variant: migrated.widgets[0].variant,
      entityId: migrated.widgets[0].entityId,
      responsiveSizeMode: migrated.widgets[0].responsiveSizeMode,
    },
    {
      kind: "media",
      variant: "media-page-panel",
      entityId: "media_player.salon",
      responsiveSizeMode: "media-page-panel",
    },
  );
});
