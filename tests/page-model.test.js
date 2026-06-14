import test from "node:test";
import assert from "node:assert/strict";
import {
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
    name: "Accueil",
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
