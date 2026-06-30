import assert from "node:assert/strict";
import test from "node:test";

import {
  canStartWidgetDrag,
  createWidgetDragCoordinator,
} from "../src/widgets/widget-drag-coordinator.js";

function createClassList() {
  const tokens = new Set();
  return {
    add(...values) {
      values.forEach((value) => tokens.add(value));
    },
    remove(...values) {
      values.forEach((value) => tokens.delete(value));
    },
    contains(value) {
      return tokens.has(value);
    },
  };
}

function createWidgetElement() {
  const listeners = new Map();
  return {
    dataset: { widgetId: "clock" },
    classList: createClassList(),
    listeners,
    draggable: false,
    addEventListener(type, handler) {
      listeners.set(type, handler);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    removeAttribute() {},
    setPointerCaptureCalls: [],
    releasePointerCaptureCalls: [],
    setPointerCapture(pointerId) {
      this.setPointerCaptureCalls.push(pointerId);
    },
    releasePointerCapture(pointerId) {
      this.releasePointerCaptureCalls.push(pointerId);
    },
  };
}

test("widget drag stays scroll-friendly until the long press is armed", () => {
  const widget = createWidgetElement();
  const host = {
    _isEditing: true,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _isMobileLandscapeLayout() {
      return false;
    },
    _isResizeHandleEvent() {
      return false;
    },
    _syncEditModeDomCalls: 0,
    _syncWidgetDropSlotsCalls: 0,
    _syncEditModeDom() {
      this._syncEditModeDomCalls += 1;
    },
    _syncWidgetDropSlots() {
      this._syncWidgetDropSlotsCalls += 1;
    },
    classList: createClassList(),
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let armedCallback = null;
  globalThis.setTimeout = (callback) => {
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    armedCallback = null;
  };

  try {
    const coordinator = createWidgetDragCoordinator(host);
    coordinator.wireWidget(widget, { id: "clock" });
    widget.listeners.get("pointerdown")?.({
      pointerId: 7,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });

    assert.equal(widget.setPointerCaptureCalls.length, 0);
    assert.equal(host.classList.contains("is-widget-drag-pending"), true);
    assert.equal(host.classList.contains("is-widget-dragging"), false);

    armedCallback?.();

    assert.deepEqual(widget.setPointerCaptureCalls, [7]);
    assert.equal(host.classList.contains("is-widget-drag-pending"), false);
    assert.equal(host.classList.contains("is-widget-dragging"), true);
    assert.equal(host._activeMoveWidgetId, "clock");
    assert.equal(host._syncEditModeDomCalls, 1);
    assert.equal(host._syncWidgetDropSlotsCalls, 1);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("widget drag cancels before arming when the pointer starts scrolling", () => {
  const widget = createWidgetElement();
  const host = {
    _isEditing: true,
    _activeMoveWidgetId: "",
    _pendingWidgetPlacement: null,
    _isMobileLandscapeLayout() {
      return false;
    },
    _isResizeHandleEvent() {
      return false;
    },
    _syncEditModeDom() {},
    _syncWidgetDropSlots() {},
    classList: createClassList(),
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let armedCallback = null;
  globalThis.setTimeout = (callback) => {
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    armedCallback = null;
  };

  try {
    const coordinator = createWidgetDragCoordinator(host);
    coordinator.wireWidget(widget, { id: "clock" });
    widget.listeners.get("pointerdown")?.({
      pointerId: 3,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });

    widget.listeners.get("pointermove")?.({
      pointerId: 3,
      clientX: 10,
      clientY: 40,
    });

    assert.equal(armedCallback, null);
    assert.equal(widget.setPointerCaptureCalls.length, 0);
    assert.equal(host.classList.contains("is-widget-drag-pending"), false);
    assert.equal(host.classList.contains("is-widget-dragging"), false);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("canStartWidgetDrag still blocks resize handles and non-primary starts", () => {
  const host = {
    _isEditing: true,
    _isMobileLandscapeLayout() {
      return false;
    },
    _isResizeHandleEvent() {
      return true;
    },
  };

  assert.equal(canStartWidgetDrag({
    host,
    element: {},
    widgetId: "clock",
    event: { button: 0, target: { closest() { return null; } } },
  }), false);

  assert.equal(canStartWidgetDrag({
    host: {
      ...host,
      _isResizeHandleEvent() {
        return false;
      },
    },
    element: {},
    widgetId: "clock",
    event: { button: 1, target: { closest() { return null; } } },
  }), false);
});
