import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetInteractionSurfaceCoordinator } from "../src/widgets/widget-interaction-surface-coordinator.js";

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

test("widget interaction coordinator hides the mobile and tablet edit pencil until editing starts", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
    createElementNS() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
  };
  const editButton = {
    hidden: false,
    dataset: {},
    setAttribute(name, value) {
      this[name] = value;
    },
    append() {},
    replaceChildren() {},
  };
  const addButton = {
    hidden: true,
    dataset: {},
    setAttribute() {},
    replaceChildren() {},
  };

  function createHost(layout) {
    return {
      _isEditing: false,
      _widgets: [],
      dataset: { layout },
      shadowRoot: {
        querySelector(selector) {
          if (selector === ".mha-primary-edit-button") return editButton;
          if (selector === ".mha-add-widget-button") return addButton;
          return null;
        },
        querySelectorAll() {
          return [];
        },
      },
      _isMobileLandscapeLayout() {
        return false;
      },
      classList: { toggle() {}, remove() {} },
      _syncPageCreatorDom() {},
      _syncWidgetConfigDom() {},
      _canAddWidgetToActivePage() {
        return true;
      },
    };
  }

  const mobileHost = createHost("mobile");
  try {
    const mobileCoordinator = createWidgetInteractionSurfaceCoordinator(mobileHost);
    mobileCoordinator.syncEditModeDom();
    assert.equal(editButton.hidden, true);
    assert.equal(editButton.dataset.touchEditClose, "false");

    mobileHost._isEditing = true;
    mobileCoordinator.syncEditModeDom();
    assert.equal(editButton.hidden, false);
    assert.equal(editButton.dataset.touchEditClose, "true");

    const desktopHost = createHost("desktop");
    desktopHost._isEditing = false;
    const desktopCoordinator = createWidgetInteractionSurfaceCoordinator(desktopHost);
    desktopCoordinator.syncEditModeDom();
    assert.equal(editButton.hidden, false);
    assert.equal(editButton.dataset.touchEditClose, "false");
  } finally {
    globalThis.document = previousDocument;
  }
});

test("widget interaction coordinator hides global floating edit controls on media pages", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
    createElementNS() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
  };
  const editButton = {
    hidden: false,
    dataset: {},
    setAttribute() {},
    append() {},
    replaceChildren() {},
  };
  const addButton = {
    hidden: false,
    dataset: {},
    setAttribute() {},
    replaceChildren() {},
    classList: { remove() {} },
  };
  const host = {
    _isEditing: true,
    _widgets: [],
    dataset: { layout: "desktop", mediaPageActive: "true" },
    shadowRoot: {
      querySelector(selector) {
        if (selector === ".mha-primary-edit-button") return editButton;
        if (selector === ".mha-add-widget-button") return addButton;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    _isMobileLandscapeLayout() {
      return false;
    },
    classList: {
      toggle() {},
      remove() {},
      contains() {
        return false;
      },
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
    assert.equal(addButton.hidden, true);
    assert.equal(editButton.dataset.touchEditClose, "false");
  } finally {
    globalThis.document = previousDocument;
  }
});

test("widget interaction coordinator keeps edit surfaces open in mobile landscape while editing", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
    createElementNS() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
  };

  const editButton = {
    hidden: false,
    dataset: {},
    setAttribute() {},
    append() {},
    replaceChildren() {},
  };
  const addButton = {
    hidden: true,
    dataset: {},
    setAttribute() {},
    replaceChildren() {},
  };
  const widgetConfigSession = {
    configType: "button",
    mode: "edit",
  };
  const host = {
    _isEditing: true,
    _widgets: [],
    _activeMoveWidgetId: "clock",
    _pendingWidgetPlacement: { id: "pending" },
    _widgetManagerOpen: true,
    _widgetManagerCategory: "utilities",
    _widgetConfigSession: widgetConfigSession,
    _pageCreatorOpen: true,
    dataset: { layout: "mobile" },
    shadowRoot: {
      querySelector(selector) {
        if (selector === ".mha-primary-edit-button") return editButton;
        if (selector === ".mha-add-widget-button") return addButton;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    _isMobileLandscapeLayout() {
      return true;
    },
    classList: { toggle() {}, remove() {} },
    _syncPageCreatorDom() {},
    _syncWidgetConfigDom() {},
    _canAddWidgetToActivePage() {
      return true;
    },
  };

  try {
    const coordinator = createWidgetInteractionSurfaceCoordinator(host);
    coordinator.syncEditModeDom();

    assert.equal(addButton.hidden, false);
    assert.equal(host._activeMoveWidgetId, "clock");
    assert.deepEqual(host._pendingWidgetPlacement, { id: "pending" });
    assert.equal(host._widgetManagerOpen, true);
    assert.equal(host._widgetManagerCategory, "utilities");
    assert.equal(host._widgetConfigSession, widgetConfigSession);
    assert.equal(host._pageCreatorOpen, true);
  } finally {
    globalThis.document = previousDocument;
  }
});

test("widget interaction coordinator turns the add button into a trash target during widget drag", () => {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
    createElementNS() {
      return {
        dataset: {},
        setAttribute() {},
        append() {},
        appendChild() {},
        classList: { add() {} },
        style: {},
      };
    },
  };

  const editButton = {
    hidden: false,
    dataset: {},
    setAttribute() {},
    append() {},
    replaceChildren() {},
  };
  const addButton = {
    hidden: false,
    dataset: {},
    classList: { remove() {} },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    replaceChildren() {},
  };
  const host = {
    _isEditing: true,
    _widgets: [],
    dataset: { layout: "desktop" },
    shadowRoot: {
      querySelector(selector) {
        if (selector === ".mha-primary-edit-button") return editButton;
        if (selector === ".mha-add-widget-button") return addButton;
        return null;
      },
      querySelectorAll() {
        return [];
      },
    },
    classList: {
      toggle() {},
      remove() {},
      contains(token) {
        return token === "is-widget-dragging";
      },
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

    assert.equal(addButton.hidden, false);
    assert.equal(addButton.dataset.dragDelete, "true");
    assert.match(addButton.attributes["aria-label"], /^(Supprimer|Delete)$/);
  } finally {
    globalThis.document = previousDocument;
  }
});
