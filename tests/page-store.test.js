import test from "node:test";
import assert from "node:assert/strict";
import {
  migratePageStorage,
  readActivePageId,
  readPages,
  savePages,
} from "../src/pages/page-store.js";
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  STORAGE_KEYS,
} from "../src/core/storage-keys.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    setItem(key, value) {
      values.set(key, String(value));
    },
    removeItem(key) {
      values.delete(key);
    },
    values,
  };
}

function withStorage(storage, run) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });

  try {
    return run();
  } finally {
    if (previous) {
      Object.defineProperty(globalThis, "localStorage", previous);
    } else {
      delete globalThis.localStorage;
    }
  }
}

test("page reads repair duplicate ids and persist the repaired model", () => {
  const storage = createStorage({
    [STORAGE_KEYS.gridPages]: JSON.stringify([
      { id: "home", widgets: [] },
      { id: "home", widgets: [] },
    ]),
  });

  withStorage(storage, () => {
    const result = readPages();
    assert.equal(result.persistenceResult, true);
    assert.deepEqual(
      result.pages.map(page => page.id),
      ["home", "home-2"],
    );
    assert.deepEqual(
      JSON.parse(storage.getItem(STORAGE_KEYS.gridPages))
        .map(page => page.id),
      ["home", "home-2"],
    );
  });
});

test("missing pages and invalid active ids receive persisted fallbacks", () => {
  const storage = createStorage();

  withStorage(storage, () => {
    const pagesResult = readPages();
    assert.equal(pagesResult.persistenceResult, true);
    assert.equal(pagesResult.pages[0].id, "home");

    const activeResult = readActivePageId(pagesResult.pages);
    assert.equal(activeResult.persistenceResult, true);
    assert.equal(activeResult.activePageId, "home");
    assert.equal(storage.getItem(STORAGE_KEYS.activePage), "home");
  });
});

test("valid pages and active ids are read without unnecessary writes", () => {
  const storage = createStorage({
    [STORAGE_KEYS.gridPages]: JSON.stringify([
      { id: "home", widgets: [] },
      { id: "lights", widgets: [] },
    ]),
    [STORAGE_KEYS.activePage]: "lights",
  });

  withStorage(storage, () => {
    const pagesResult = readPages();
    const activeResult = readActivePageId(pagesResult.pages);

    assert.equal(pagesResult.persistenceResult, null);
    assert.equal(activeResult.persistenceResult, null);
    assert.equal(activeResult.activePageId, "lights");
  });
});

test("page saves normalize the model and preserve the active page", () => {
  const storage = createStorage();

  withStorage(storage, () => {
    assert.equal(savePages([
      {
        id: " kitchen ",
        label: "Cuisine",
        widgets: [{ id: "light" }],
      },
    ], "kitchen", {
      normalizeWidget: widget => ({ ...widget, normalized: true }),
    }), true);

    assert.deepEqual(
      JSON.parse(storage.getItem(STORAGE_KEYS.gridPages)),
      [{
        id: "kitchen",
        name: "Cuisine",
        icon: "home",
        widgets: [{ id: "light", normalized: true }],
      }],
    );
    assert.equal(storage.getItem(STORAGE_KEYS.activePage), "kitchen");
  });
});

test("legacy widget storage migrates once into the page model", () => {
  const storage = createStorage({
    [STORAGE_KEYS.gridOrder]: JSON.stringify(["custom", "default"]),
    [STORAGE_KEYS.widgetSizes]: JSON.stringify({
      custom: { w: 4, h: 2 },
    }),
    [STORAGE_KEYS.customWidgets]: JSON.stringify([
      { id: "custom", kind: "empty", w: 2, h: 2 },
    ]),
    [STORAGE_KEYS.hiddenWidgets]: JSON.stringify([]),
  });

  withStorage(storage, () => {
    const result = migratePageStorage({
      defaultWidgets: [{ id: "default", kind: "empty", w: 2, h: 2 }],
      normalizeWidget: widget => ({ ...widget, normalized: true }),
      normalizeWidgetForGrid: widget => ({ w: widget.w, h: widget.h }),
    });

    assert.deepEqual(result, { migrated: true, success: true });
    assert.equal(
      storage.getItem(STORAGE_KEYS.schemaVersion),
      String(CURRENT_STORAGE_SCHEMA_VERSION),
    );
    const pages = JSON.parse(storage.getItem(STORAGE_KEYS.gridPages));
    assert.equal(pages[0].id, "home");
    assert.deepEqual(
      pages[0].widgets.map(widget => [widget.id, widget.w, widget.h]),
      [["custom", 4, 2], ["default", 2, 2]],
    );
    assert.ok(storage.getItem(STORAGE_KEYS.schemaMigrationBackup));

    assert.deepEqual(migratePageStorage(), {
      migrated: false,
      success: true,
    });
  });
});
