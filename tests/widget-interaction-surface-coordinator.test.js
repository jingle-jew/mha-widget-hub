import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetInteractionSurfaceCoordinator } from "../src/widgets/widget-interaction-surface-coordinator.js";

function createDomStubElement() {
  return {
    dataset: {},
    classList: { add() {} },
    setAttribute() {},
    append() {},
  };
}

function createClassList() {
  const set = new Set();
  return {
    add(token) {
      set.add(token);
    },
    remove(...tokens) {
      tokens.forEach((token) => set.delete(token));
    },
    toggle(token, force) {
      if (force) set.add(token);
      else set.delete(token);
    },
    contains(token) {
      return set.has(token);
    },
  };
}

test("widget interaction coordinator toggles move mode and schedules drop-slot sync", () => {
  const calls = [];
  const host = {
    _isEditing: true,
    _widgets: [{ id: "clock" }],
    _activeMoveWidgetId: "",
    _widgetDropSlotsFrame: 0,
    shadowRoot: {
      querySelector() {
        return null;
      },
    },
    _isMobileLandscapeLayout() {
      return false;
    },
    classList: { toggle() {}, remove() {} },
    dataset: {},
    _syncPageCreatorDom() {},
    _syncWidgetConfigDom() {},
    _getEditButtonIcon() {
      return "";
    },
  };

  const previousRaf = globalThis.requestAnimationFrame;
  const previousCancelRaf = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    calls.push("requestAnimationFrame");
    callback();
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};

  try {
    const coordinator = createWidgetInteractionSurfaceCoordinator(host);
    coordinator.toggleMoveMode("clock");
    assert.equal(host._activeMoveWidgetId, "clock");
    assert.deepEqual(calls, ["requestAnimationFrame"]);
  } finally {
    globalThis.requestAnimationFrame = previousRaf;
    globalThis.cancelAnimationFrame = previousCancelRaf;
  }
});

test("widget interaction coordinator clears drop-state classes", () => {
  const nodes = [{
    classList: createClassList(),
    attributes: { "data-drop-placement": "before" },
    removeAttribute(name) {
      delete this.attributes[name];
    },
  }];
  nodes[0].classList.add("is-drop-before");

  const host = {
    shadowRoot: {
      querySelectorAll(selector) {
        assert.equal(selector, ".is-drop-before,.is-drop-after");
        return nodes;
      },
    },
  };

  const coordinator = createWidgetInteractionSurfaceCoordinator(host);
  coordinator.clearDropState();

  assert.equal(nodes[0].classList.contains("is-drop-before"), false);
  assert.equal("data-drop-placement" in nodes[0].attributes, false);
});

test("widget interaction coordinator hides the primary edit button until touch editing starts", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return createDomStubElement();
    },
    createElementNS() {
      return createDomStubElement();
    },
  };
  const editButton = {
    hidden: false,
    dataset: {},
    attributes: {},
    classList: createClassList(),
    append() {},
    replaceChildren() {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };

  const host = {
    _isEditing: false,
    _widgets: [],
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _widgetManagerOpen: false,
    _widgetManagerCategory: "",
    _widgetConfigSession: null,
    _pageCreatorOpen: false,
    classList: { toggle() {}, remove() {} },
    dataset: { layout: "tablet" },
    shadowRoot: {
      querySelector(selector) {
        if (selector === ".mha-primary-edit-button") return editButton;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    _isMobileLandscapeLayout() {
      return false;
    },
    _syncPageCreatorDom() {},
    _syncWidgetConfigDom() {},
    _canAddWidgetToActivePage() {
      return true;
    },
  };

  try {
    const coordinator = createWidgetInteractionSurfaceCoordinator(host);
    coordinator.syncEditModeDom();
    assert.equal(editButton.hidden, true);
    assert.equal(editButton.dataset.touchEditClose, "false");

    host._isEditing = true;
    coordinator.syncEditModeDom();
    assert.equal(editButton.hidden, false);
    assert.equal(editButton.dataset.touchEditClose, "true");
  } finally {
    globalThis.document = previousDocument;
  }
});

test("widget interaction coordinator enters edit mode on touch long press over empty grid space", () => {
  const listeners = new Map();
  const scrollContainer = {
    addEventListener(type, handler) {
      listeners.set(`scroll:${type}`, handler);
    },
    removeEventListener(type) {
      listeners.delete(`scroll:${type}`);
    },
  };
  const grid = {
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    closest(selector) {
      if (selector === ".mha-grid") return this;
      assert.equal(selector, ".mha-widget-area");
      return scrollContainer;
    },
    contains(node) {
      return node === target || node === grid;
    },
  };
  const target = {
    closest(selector) {
      if (selector.includes(".mha-widget")) return null;
      return null;
    },
  };

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
    _isMobileLandscapeLayout() {
      return false;
    },
    toggleEditModeCalls: 0,
    toggleEditMode() {
      this.toggleEditModeCalls += 1;
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let timeoutCallback = null;
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    const coordinator = createWidgetInteractionSurfaceCoordinator(host);
    coordinator.wireTouchEditLongPress(grid);
    listeners.get("pointerdown")?.({
      pointerId: 7,
      pointerType: "touch",
      button: 0,
      clientX: 120,
      clientY: 240,
      target,
    });
    timeoutCallback?.();
    assert.equal(host.toggleEditModeCalls, 1);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.document = previousDocument;
  }
});
