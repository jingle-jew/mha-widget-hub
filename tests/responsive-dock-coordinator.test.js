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
    _getRuntimeLayout() {
      return "desktop";
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
    _getRuntimeLayout() {
      return "mobile";
    },
    _getGridOrientation() {
      return "landscape";
    },
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

test("responsive dock coordinator rerenders when the layout variant changes", () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const rafCallbacks = [];
  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const calls = [];
  const host = {
    _relayoutTimer: 0,
    _viewportRaf: 0,
    _responsiveState: {
      layout: "mobile",
      layoutVariant: "mobile-portrait",
      dockFamily: "bottom",
      statusBarVisible: false,
    },
    classList: createClassList(),
    shadowRoot: {
      querySelector() {
        return null;
      },
    },
    _syncResponsiveState() {
      const next = {
        layout: "mobile",
        layoutVariant: "mobile-landscape",
        dockFamily: "side",
        statusBarVisible: false,
      };
      this._responsiveState = next;
      calls.push("syncResponsiveState");
      return next;
    },
    render() {
      calls.push("render");
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
    coordinator.handleViewportChange();
    rafCallbacks.shift()?.();

    assert.deepEqual(calls, [
      "syncResponsiveState",
      "render",
    ]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
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
    _getRuntimeLayout() {
      return "mobile";
    },
    _getGridOrientation() {
      return "portrait";
    },
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

test("responsive dock coordinator scrolls the mobile landscape dock to the bottom on edit entry", () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const rafCallbacks = [];

  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const dock = {
    scrollHeight: 480,
    clientHeight: 180,
    scrollToCalls: [],
    scrollTo(options) {
      this.scrollToCalls.push(options);
    },
  };

  const host = {
    _isEditing: true,
    _wasMobileDockEditing: false,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _responsiveState: {
      layout: "mobile",
      layoutVariant: "mobile-landscape",
      dockFamily: "side",
    },
    classList: createClassList(),
    shadowRoot: {
      querySelector(selector) {
        return selector === ".mha-dock" ? dock : null;
      },
    },
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    assert.equal(coordinator.syncMobileDockEditScroll(), true);
    rafCallbacks.shift()?.();

    assert.deepEqual(dock.scrollToCalls, [{
      top: 300,
      behavior: "smooth",
    }]);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});

test("responsive dock coordinator scrolls the side dock to the bottom on edit entry", () => {
  const previousWindow = globalThis.window;
  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  const rafCallbacks = [];

  globalThis.window = {
    matchMedia() {
      return { matches: false };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    rafCallbacks.push(callback);
    return rafCallbacks.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const dock = {
    scrollHeight: 640,
    clientHeight: 240,
    scrollTop: 0,
  };

  const host = {
    _isEditing: true,
    _wasMobileDockEditing: false,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _responsiveState: {
      layout: "desktop",
      layoutVariant: "desktop-landscape",
      dockFamily: "side",
    },
    classList: createClassList(),
    shadowRoot: {
      querySelector(selector) {
        return selector === ".mha-dock" ? dock : null;
      },
    },
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    assert.equal(coordinator.syncMobileDockEditScroll(), true);
    rafCallbacks.shift()?.();

    assert.equal(dock.scrollTop, 400);
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
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
    dataset: {},
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
    _getRuntimeLayout() {
      return "mobile";
    },
    _getGridOrientation() {
      return "portrait";
    },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);

    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 1);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "true");

    host._isEditing = true;
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 2);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "true");
    rafCallbacks.shift()?.();
    assert.deepEqual(scrollCalls, [{ left: 320, behavior: "smooth" }]);

    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 1);
    rafCallbacks.shift()?.();

    host._isEditing = false;
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 1);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "true");

    host._isEditing = true;
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 2);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "true");
    rafCallbacks.shift()?.();
    assert.deepEqual(scrollCalls, [
      { left: 320, behavior: "smooth" },
      { left: 320, behavior: "smooth" },
    ]);
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
    dataset: {},
    scrollWidth: 320,
    clientWidth: 320,
    scrollHeight: 240,
    clientHeight: 240,
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
    _getRuntimeLayout() {
      return "tablet";
    },
    _getGridOrientation() {
      return "portrait";
    },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.syncDocksDom();
    assert.equal(rafCallbacks.length, 2);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "false");
    rafCallbacks.shift()?.();

    host._getRuntimeLayout = () => "mobile";
    host._getGridOrientation = () => "landscape";
    coordinator.syncMobileDockEditScroll();
    assert.equal(rafCallbacks.length, 0);
    coordinator.syncMobileDockOverflowState();
    assert.equal(dock.dataset.overflowing, "false");
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});

test("responsive dock coordinator schedules initial mobile dock overflow measurement", () => {
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
    dataset: {},
    scrollWidth: 640,
    clientWidth: 320,
  };
  const host = {
    shadowRoot: {
      querySelector(selector) {
        assert.equal(selector, ".mha-mobile-dock");
        return dock;
      },
    },
    _getRuntimeLayout() {
      return "mobile";
    },
    _getGridOrientation() {
      return "portrait";
    },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    coordinator.scheduleMobileDockOverflowState();
    assert.equal(rafCallbacks.length, 1);
    rafCallbacks.shift()?.();
    assert.equal(dock.dataset.overflowing, "true");
  } finally {
    globalThis.window = previousWindow;
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});

test("responsive dock coordinator marks the mobile dock as non-overflowing or overflowing", () => {
  const previousWindow = globalThis.window;
  globalThis.window = {
    matchMedia(query) {
      return { matches: query === "(orientation: landscape)" ? false : false };
    },
  };

  const dock = {
    dataset: {},
    scrollWidth: 320,
    clientWidth: 320,
  };
  const host = {
    shadowRoot: {
      querySelector(selector) {
        assert.equal(selector, ".mha-mobile-dock");
        return dock;
      },
    },
    _getRuntimeLayout() {
      return "mobile";
    },
    _getGridOrientation() {
      return "portrait";
    },
    classList: createClassList(),
  };

  try {
    const coordinator = createResponsiveDockCoordinator(host);
    assert.equal(coordinator.syncMobileDockOverflowState(), false);
    assert.equal(dock.dataset.overflowing, "false");

    dock.scrollWidth = 640;
    assert.equal(coordinator.syncMobileDockOverflowState(), true);
    assert.equal(dock.dataset.overflowing, "true");
  } finally {
    globalThis.window = previousWindow;
  }
});
