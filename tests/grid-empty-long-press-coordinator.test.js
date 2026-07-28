import assert from "node:assert/strict";
import test from "node:test";

import {
  canStartGridEmptyLongPress,
  createGridEmptyLongPressCoordinator,
} from "../src/widgets/grid-empty-long-press-coordinator.js";

function createGridWithListeners() {
  const listeners = new Map();
  const scrollListeners = new Map();
  const scrollArea = {
    addEventListener(type, handler) {
      scrollListeners.set(type, handler);
    },
    removeEventListener(type) {
      scrollListeners.delete(type);
    },
  };
  const grid = {
    className: "mha-grid",
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    closest(selector) {
      return selector === ".mha-widget-area" ? scrollArea : null;
    },
    contains(node) {
      return node === grid || node?.insideGrid === true;
    },
  };
  return { grid, listeners, scrollArea, scrollListeners };
}

function createWidgetSurfaceTarget({ directManipulation = "" } = {}) {
  const widget = {
    insideGrid: true,
    closest(selector) {
      return selector === ".mha-widget" ? this : null;
    },
  };
  const target = {
    insideGrid: true,
    closest(selector) {
      if (selector === ".mha-widget") return widget;
      if (directManipulation === "slider" && selector.includes(".mha-slider")) return this;
      if (directManipulation === "toggle" && selector.includes(".mha-toggle")) return this;
      if (directManipulation === "input" && selector.includes("input")) return this;
      if (directManipulation === "resize" && selector.includes(".mha-widget-resize")) return this;
      return null;
    },
  };
  return { target, widget };
}

test("canStartGridEmptyLongPress allows an empty grid press in mobile and tablet", () => {
  const grid = {
    contains(node) {
      return node === this;
    },
    closest() {
      return null;
    },
  };
  const target = grid;
  const mobileHost = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    _isMobileLandscapeLayout() {
      return false;
    },
  };
  const tabletHost = {
    ...mobileHost,
    dataset: { layout: "tablet" },
  };
  const event = { button: 0, isPrimary: true, pointerType: "touch" };

  assert.equal(canStartGridEmptyLongPress({ host: mobileHost, grid, event, target }), true);
  assert.equal(canStartGridEmptyLongPress({ host: tabletHost, grid, event, target }), true);
});

test("canStartGridEmptyLongPress allows widget surfaces and tap-only controls", () => {
  const grid = { contains: () => true };
  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    _isMobileLandscapeLayout() {
      return false;
    },
  };
  const event = { button: 0, isPrimary: true, pointerType: "touch" };
  const widgetSurface = createWidgetSurfaceTarget();

  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: widgetSurface.target }), true);
});

test("canStartGridEmptyLongPress rejects direct manipulation, unrelated content, and editing starts", () => {
  const grid = { contains: () => true };
  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
  };
  const event = { button: 0, isPrimary: true, pointerType: "touch" };
  const sliderSurface = createWidgetSurfaceTarget({ directManipulation: "slider" });
  const toggleSurface = createWidgetSurfaceTarget({ directManipulation: "toggle" });
  const inputSurface = createWidgetSurfaceTarget({ directManipulation: "input" });
  const resizeSurface = createWidgetSurfaceTarget({ directManipulation: "resize" });
  const unrelatedTarget = { insideGrid: true, closest: () => null };

  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: sliderSurface.target }), false);
  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: toggleSurface.target }), false);
  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: inputSurface.target }), false);
  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: resizeSurface.target }), false);
  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: unrelatedTarget }), false);
  assert.equal(canStartGridEmptyLongPress({ host: { ...host, _isEditing: true }, grid, event, target: grid }), false);
});

test("canStartGridEmptyLongPress stays available in mobile landscape", () => {
  const grid = {
    contains(node) {
      return node === this;
    },
    closest() {
      return null;
    },
  };
  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    _isMobileLandscapeLayout() {
      return true;
    },
  };
  const event = { button: 0, isPrimary: true, pointerType: "touch" };

  assert.equal(canStartGridEmptyLongPress({ host, grid, event, target: grid }), true);
});

test("grid empty long press triggers edit mode on empty grid for touch, mouse, and pen", () => {
  const { grid, listeners } = createGridWithListeners();
  const targets = [grid, grid, grid];
  const pointerTypes = ["touch", "mouse", "pen"];
  const previousDocument = globalThis.document;
  globalThis.document = {
    elementFromPoint() {
      return targets.shift() || grid;
    },
  };

  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    shadowRoot: {
      elementFromPoint() {
        return grid;
      },
    },
    _isMobileLandscapeLayout() {
      return false;
    },
    toggleCalls: 0,
    toggleEditMode() {
      this.toggleCalls += 1;
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const timeouts = [];
  globalThis.setTimeout = (callback) => {
    timeouts.push(callback);
    return timeouts.length;
  };
  globalThis.clearTimeout = () => {};

  try {
    const coordinator = createGridEmptyLongPressCoordinator(host);
    coordinator.wire(grid);
    pointerTypes.forEach((pointerType, index) => {
      listeners.get("pointerdown")?.({
        pointerId: index + 1,
        pointerType,
        button: 0,
        isPrimary: true,
        clientX: 20,
        clientY: 30,
        target: grid,
      });
      timeouts.shift()?.();
    });
    assert.equal(host.toggleCalls, 3);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.document = previousDocument;
  }
});

test("widget long press enters edit mode and suppresses only its trailing click", () => {
  const { grid, listeners } = createGridWithListeners();
  const { target, widget } = createWidgetSurfaceTarget();
  const previousDocument = globalThis.document;
  globalThis.document = {
    elementFromPoint() {
      return target;
    },
  };

  const host = {
    _isEditing: false,
    dataset: { layout: "tablet" },
    shadowRoot: {
      elementFromPoint() {
        return target;
      },
    },
    toggleCalls: 0,
    toggleEditMode() {
      this.toggleCalls += 1;
      this._isEditing = true;
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const timeouts = new Map();
  let nextTimeoutId = 1;
  globalThis.setTimeout = (callback) => {
    const id = nextTimeoutId;
    nextTimeoutId += 1;
    timeouts.set(id, callback);
    return id;
  };
  globalThis.clearTimeout = (id) => timeouts.delete(id);

  try {
    const coordinator = createGridEmptyLongPressCoordinator(host);
    coordinator.wire(grid);
    listeners.get("pointerdown")?.({
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 20,
      clientY: 30,
      target,
    });
    const longPressTimer = timeouts.get(1);
    timeouts.delete(1);
    longPressTimer?.();

    assert.equal(host.toggleCalls, 1);
    assert.equal(host._isEditing, true);
    listeners.get("pointerup")?.({ pointerId: 1, type: "pointerup" });

    const clickCalls = [];
    listeners.get("click")?.({
      target,
      preventDefault() {
        clickCalls.push("preventDefault");
      },
      stopPropagation() {
        clickCalls.push("stopPropagation");
      },
      stopImmediatePropagation() {
        clickCalls.push("stopImmediatePropagation");
      },
    });
    assert.deepEqual(clickCalls, [
      "preventDefault",
      "stopPropagation",
      "stopImmediatePropagation",
    ]);

    const laterClickCalls = [];
    listeners.get("click")?.({
      target: {
        closest(selector) {
          return selector === ".mha-widget" ? widget : null;
        },
      },
      preventDefault() {
        laterClickCalls.push("preventDefault");
      },
    });
    assert.deepEqual(laterClickCalls, []);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.document = previousDocument;
  }
});

test("short widget press leaves the following tap untouched", () => {
  const { grid, listeners } = createGridWithListeners();
  const { target } = createWidgetSurfaceTarget();
  const previousDocument = globalThis.document;
  globalThis.document = {
    elementFromPoint() {
      return target;
    },
  };

  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    shadowRoot: {
      elementFromPoint() {
        return target;
      },
    },
    toggleCalls: 0,
    toggleEditMode() {
      this.toggleCalls += 1;
      this._isEditing = true;
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    timeoutCallback = null;
  };

  try {
    const coordinator = createGridEmptyLongPressCoordinator(host);
    coordinator.wire(grid);
    listeners.get("pointerdown")?.({
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 20,
      clientY: 30,
      target,
    });
    listeners.get("pointerup")?.({ pointerId: 1 });

    assert.equal(timeoutCallback, null);
    assert.equal(host.toggleCalls, 0);

    const clickCalls = [];
    listeners.get("click")?.({
      target,
      preventDefault() {
        clickCalls.push("preventDefault");
      },
    });
    assert.deepEqual(clickCalls, []);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.document = previousDocument;
  }
});

test("grid empty long press cancels on movement, scroll, blocked target, and duplicate wiring cleanup", () => {
  const first = createGridWithListeners();
  const second = createGridWithListeners();
  const blockedTarget = createWidgetSurfaceTarget({ directManipulation: "slider" }).target;
  let activeTarget = second.grid;
  const previousDocument = globalThis.document;
  globalThis.document = {
    elementFromPoint() {
      return activeTarget;
    },
  };

  const host = {
    _isEditing: false,
    dataset: { layout: "mobile" },
    shadowRoot: {
      elementFromPoint() {
        return activeTarget;
      },
    },
    _isMobileLandscapeLayout() {
      return false;
    },
    toggleCalls: 0,
    toggleEditMode() {
      this.toggleCalls += 1;
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    timeoutCallback = null;
  };

  try {
    const coordinator = createGridEmptyLongPressCoordinator(host);
    coordinator.wire(first.grid);
    coordinator.wire(second.grid);
    assert.equal(first.listeners.size, 0);
    assert.equal(first.scrollListeners.size, 0);

    activeTarget = blockedTarget;
    second.listeners.get("pointerdown")?.({
      pointerId: 1,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      target: blockedTarget,
    });
    timeoutCallback?.();
    assert.equal(host.toggleCalls, 0);

    activeTarget = second.grid;
    second.listeners.get("pointerdown")?.({
      pointerId: 2,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      target: second.grid,
    });
    second.listeners.get("pointermove")?.({
      pointerId: 2,
      clientX: 40,
      clientY: 40,
    });
    timeoutCallback?.();
    assert.equal(host.toggleCalls, 0);

    activeTarget = second.grid;
    second.listeners.get("pointerdown")?.({
      pointerId: 3,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      target: second.grid,
    });
    second.scrollListeners.get("scroll")?.();
    timeoutCallback?.();
    assert.equal(host.toggleCalls, 0);

    host._isEditing = true;
    activeTarget = second.grid;
    second.listeners.get("pointerdown")?.({
      pointerId: 4,
      pointerType: "touch",
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      target: second.grid,
    });
    timeoutCallback?.();
    assert.equal(host.toggleCalls, 0);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.document = previousDocument;
  }
});
