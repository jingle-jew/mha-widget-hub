import assert from "node:assert/strict";
import test from "node:test";

import { createResponsiveDockCoordinator } from "../src/layout/responsive-dock-coordinator.js";

function createClassList() {
  const set = new Set();
  return {
    add(...tokens) {
      tokens.forEach((token) => set.add(token));
    },
    remove(...tokens) {
      tokens.forEach((token) => set.delete(token));
    },
    toggle(token, force) {
      if (force === undefined) {
        if (set.has(token)) set.delete(token);
        else set.add(token);
        return set.has(token);
      }
      if (force) set.add(token);
      else set.delete(token);
      return force;
    },
    contains(token) {
      return set.has(token);
    },
  };
}

test("responsive dock coordinator persists dock position and relayouts viewport", async () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const previousLocalStorage = globalThis.localStorage;

  const rafCallbacks = [];
  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };
  globalThis.localStorage = {
    setItem() {},
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const calls = [];
  const host = {
    _dockPosition: "left",
    _relayoutTimer: 0,
    _viewportRaf: 0,
    _activePageId: "home",
    _pageUiCoordinator: {
      syncDocks() {
        calls.push("syncDocks");
      },
    },
    dataset: {},
    classList: createClassList(),
    shadowRoot: {
      querySelector() {
        return null;
      },
    },
    setAttribute(name, value) {
      calls.push(["setAttribute", name, value]);
    },
    _recordPersistenceResult(value) {
      calls.push(["recordPersistenceResult", value]);
    },
    _syncSettingsDom() {
      calls.push("syncSettingsDom");
    },
    _syncGridRuntimeMetrics() {
      calls.push("syncGridRuntimeMetrics");
    },
    _observeLayoutSize() {
      calls.push("observeLayoutSize");
    },
    _syncEditModeDom() {
      calls.push("syncEditModeDom");
    },
    _syncWidgetDropSlots() {
      calls.push("syncWidgetDropSlots");
    },
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.applyDockPositionFromSettings("bottom");
    assert.equal(host._dockPosition, "bottom");
    assert.equal(host.dataset.dockPosition, "bottom");
    assert.deepEqual(calls.slice(0, 3), [
      ["recordPersistenceResult", true],
      ["setAttribute", "data-dock-position", "bottom"],
      "syncSettingsDom",
    ]);

    rafCallbacks.shift()?.();

    assert.deepEqual(calls.slice(3), [
      "syncGridRuntimeMetrics",
      "observeLayoutSize",
      "syncEditModeDom",
      "syncWidgetDropSlots",
    ]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
    globalThis.localStorage = previousLocalStorage;
  }
});

test("responsive dock coordinator hides floating controls in mobile landscape", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    matchMedia() {
      return { matches: true };
    },
  };

  const host = {
    dataset: { layout: "mobile" },
    classList: createClassList(),
    _gridScrollCleanup: null,
  };

  const scrollContainer = {
    addEventListener() {
      throw new Error("should not install portrait scroll listener in landscape");
    },
  };
  const grid = {
    closest(selector) {
      assert.equal(selector, ".mha-widget-area");
      return scrollContainer;
    },
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.wireDockAutoHide(grid);
    assert.equal(host.classList.contains("is-mobile-floating-controls-hidden"), true);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("responsive dock coordinator toggles floating controls on portrait scroll direction", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };

  const host = {
    dataset: { layout: "mobile" },
    classList: createClassList(),
    _gridScrollCleanup: null,
  };

  let onScroll = null;
  const scrollContainer = {
    scrollTop: 0,
    addEventListener(type, listener) {
      assert.equal(type, "scroll");
      onScroll = listener;
    },
    removeEventListener(type, listener) {
      assert.equal(type, "scroll");
      assert.equal(listener, onScroll);
    },
  };
  const grid = {
    closest() {
      return scrollContainer;
    },
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.wireDockAutoHide(grid);

    scrollContainer.scrollTop = 24;
    onScroll?.();
    assert.equal(host.classList.contains("is-mobile-floating-controls-hidden"), true);

    scrollContainer.scrollTop = 0;
    onScroll?.();
    assert.equal(host.classList.contains("is-mobile-floating-controls-hidden"), false);

    coordinator.clearGridScrollListener();
    assert.equal(host._gridScrollCleanup, null);
  } finally {
    globalThis.window = previousWindow;
  }
});

test("responsive dock coordinator scrolls the mobile dock to the end when editing starts", () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const rafCallbacks = [];
  globalThis.window = {
    matchMedia(query) {
      return { matches: query === "(orientation: landscape)" ? false : false };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const scrollCalls = [];
  const dock = {
    scrollWidth: 640,
    clientWidth: 320,
    scrollLeft: 0,
    scrollTo(options) {
      scrollCalls.push(options);
    },
  };
  const host = {
    _isEditing: false,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _wasMobileDockEditing: false,
    _pageUiCoordinator: {
      syncDocks() {},
    },
    shadowRoot: {
      querySelector(selector) {
        assert.equal(selector, ".mha-mobile-dock");
        return dock;
      },
    },
    dataset: { layout: "mobile" },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);

    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 0);

    host._isEditing = true;
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 1);
    rafCallbacks.shift()?.();
    assert.deepEqual(scrollCalls, [{ left: 640, behavior: "smooth" }]);

    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 0);

    host._isEditing = false;
    coordinator.syncDocksDom();
    host._isEditing = true;
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 1);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});

test("responsive dock coordinator skips auto-scroll outside mobile or without overflow", () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const rafCallbacks = [];
  globalThis.window = {
    matchMedia(query) {
      return { matches: query === "(orientation: landscape)" ? false : false };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const dock = {
    scrollWidth: 320,
    clientWidth: 320,
    scrollLeft: 0,
    scrollTo() {
      throw new Error("should not auto-scroll without overflow");
    },
  };
  const host = {
    _isEditing: true,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _wasMobileDockEditing: false,
    _pageUiCoordinator: {
      syncDocks() {},
    },
    shadowRoot: {
      querySelector() {
        return dock;
      },
    },
    dataset: { layout: "tablet" },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 0);

    host.dataset.layout = "mobile";
    coordinator.syncMobileDockEditScroll();
    assert.equal(rafCallbacks.length, 0);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});
