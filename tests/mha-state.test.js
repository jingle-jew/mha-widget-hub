import test from "node:test";
import assert from "node:assert/strict";
import {
  getHubActivePage,
  normalizeHubPage,
  readActivePageWidgets,
  readHubActivePageId,
  readHubPages,
  saveHubPages,
  syncActivePageWidgets,
} from "../src/core/mha-state.js";
import { STORAGE_KEYS } from "../src/core/storage-keys.js";

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

test("mha state delegates page normalization and active-page lookup to the shared model", () => {
  const page = normalizeHubPage({
    id: " kitchen ",
    label: "Cuisine",
    widgets: [{ id: "clock-1" }],
  }, 0, {
    normalizeWidget: (widget) => ({ ...widget, normalized: true }),
  });

  assert.deepEqual(page, {
    id: "kitchen",
    name: "Cuisine",
    icon: "home",
    widgets: [{ id: "clock-1", normalized: true }],
  });

  assert.equal(
    getHubActivePage([page, { id: "lights", name: "Lights", icon: "light", widgets: [] }], "kitchen")?.id,
    "kitchen",
  );
});

test("mha state reads pages, active page id, and active-page widgets through shared storage helpers", () => {
  const storage = createStorage({
    [STORAGE_KEYS.gridPages]: JSON.stringify([
      {
        id: "home",
        name: "Home",
        icon: "home",
        widgets: [{ id: "clock-1", kind: "clock", w: 1, h: 1 }],
      },
    ]),
    [STORAGE_KEYS.activePage]: "home",
  });

  withStorage(storage, () => {
    const pagesResult = readHubPages({
      normalizeWidget: (widget) => ({ ...widget, normalized: true }),
    });
    const activePageResult = readHubActivePageId(pagesResult.pages);
    const widgets = readActivePageWidgets({
      pages: pagesResult.pages,
      activePageId: activePageResult.activePageId,
      normalizeWidget: (widget) => ({ ...widget, normalizedAgain: true }),
      normalizeWidgetForGrid: (widget) => ({ w: Math.max(2, widget.w || 1), h: Math.max(2, widget.h || 1) }),
    });

    assert.equal(activePageResult.activePageId, "home");
    assert.deepEqual(widgets, [{
      id: "clock-1",
      kind: "clock",
      w: 2,
      h: 2,
      normalized: true,
      normalizedAgain: true,
    }]);
  });
});

test("mha state can sync active-page widgets and persist the updated page model", () => {
  const storage = createStorage();

  withStorage(storage, () => {
    const pages = [{
      id: "home",
      name: "Home",
      icon: "home",
      widgets: [{ id: "old" }],
    }, {
      id: "lights",
      name: "Lights",
      icon: "light",
      widgets: [{ id: "keep" }],
    }];

    assert.equal(saveHubPages(pages, "home", {
      normalizeWidget: (widget) => ({ ...widget, saved: true }),
    }), true);

    assert.equal(syncActivePageWidgets({
      pages,
      activePageId: "home",
      widgets: [{ id: "clock-1", kind: "clock" }],
      normalizeWidget: (widget) => ({ ...widget, normalized: true }),
    }), true);

    const storedPages = JSON.parse(storage.getItem(STORAGE_KEYS.gridPages));
    assert.deepEqual(storedPages, [{
      id: "home",
      name: "Home",
      icon: "home",
      widgets: [{ id: "clock-1", kind: "clock", normalized: true }],
    }, {
      id: "lights",
      name: "Lights",
      icon: "light",
      widgets: [{ id: "keep", normalized: true }],
    }]);
    assert.equal(storage.getItem(STORAGE_KEYS.activePage), "home");
  });
});
