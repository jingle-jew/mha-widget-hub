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
