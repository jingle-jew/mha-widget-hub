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

function createScrollArea({
  top = 0,
  bottom = 400,
  clientHeight = 400,
  scrollHeight = 400,
  scrollTop = 0,
} = {}) {
  return {
    clientHeight,
    scrollHeight,
    scrollTop,
    scrollByCalls: [],
    getBoundingClientRect() {
      return {
        top,
        bottom,
        height: bottom - top,
      };
    },
    scrollBy(options) {
      this.scrollByCalls.push(options);
      this.scrollTop += Number(options?.top || 0);
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

test("widget drag start threshold is axis-agnostic before arming", () => {
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
  let cleared = false;
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {
    cleared = true;
  };

  try {
    const coordinator = createWidgetDragCoordinator(host);
    coordinator.wireWidget(widget, { id: "clock" });
    widget.listeners.get("pointerdown")?.({
      pointerId: 5,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });

    widget.listeners.get("pointermove")?.({
      pointerId: 5,
      clientX: 10,
      clientY: 29,
    });

    assert.equal(cleared, true);
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

test("canStartWidgetDrag stays available on tablet layouts", () => {
  const host = {
    _isEditing: true,
    dataset: { layout: "tablet" },
    _isMobileLandscapeLayout() {
      return false;
    },
    _isResizeHandleEvent() {
      return false;
    },
  };

  assert.equal(canStartWidgetDrag({
    host,
    element: {},
    widgetId: "clock",
    event: { button: 0, target: { closest() { return null; } } },
  }), true);
});

test("canStartWidgetDrag stays available in mobile landscape while editing", () => {
  const host = {
    _isEditing: true,
    dataset: { layout: "mobile" },
    _isMobileLandscapeLayout() {
      return true;
    },
    _isResizeHandleEvent() {
      return false;
    },
  };

  assert.equal(canStartWidgetDrag({
    host,
    element: {},
    widgetId: "clock",
    event: { button: 0, target: { closest() { return null; } } },
  }), true);
});

test("widget drag cleanup on pointercancel clears pending and armed classes", () => {
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
      pointerId: 11,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });
    assert.equal(host.classList.contains("is-widget-drag-pending"), true);

    widget.listeners.get("pointercancel")?.();
    assert.equal(host.classList.contains("is-widget-drag-pending"), false);
    assert.equal(host.classList.contains("is-widget-dragging"), false);

    widget.listeners.get("pointerdown")?.({
      pointerId: 12,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });
    armedCallback?.();
    assert.equal(host.classList.contains("is-widget-dragging"), true);

    widget.listeners.get("pointercancel")?.();
    assert.equal(host.classList.contains("is-widget-drag-pending"), false);
    assert.equal(host.classList.contains("is-widget-dragging"), false);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("widget drag snap scroll falls back to the host scroll container when the widget area no longer scrolls", () => {
  const widget = createWidgetElement();
  const widgetArea = createScrollArea({
    clientHeight: 400,
    scrollHeight: 400,
    scrollTop: 0,
  });
  const hostScrollArea = createScrollArea({
    clientHeight: 600,
    scrollHeight: 1600,
    scrollTop: 200,
    top: 0,
    bottom: 600,
  });
  const host = {
    ...hostScrollArea,
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
    shadowRoot: {
      elementFromPoint() {
        return null;
      },
      querySelector(selector) {
        return selector === ".mha-widget-area" ? widgetArea : null;
      },
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const previousWindow = globalThis.window;
  let armedCallback = null;
  globalThis.setTimeout = (callback) => {
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    armedCallback = null;
  };
  globalThis.window = { innerHeight: 720 };

  try {
    const coordinator = createWidgetDragCoordinator(host);
    coordinator.wireWidget(widget, { id: "clock" });

    widget.listeners.get("pointerdown")?.({
      pointerId: 21,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });
    armedCallback?.();

    widget.listeners.get("pointermove")?.({
      pointerId: 21,
      clientX: 20,
      clientY: 590,
      preventDefault() {},
      stopPropagation() {},
    });

    assert.deepEqual(host.scrollByCalls, [{
      top: 720,
      behavior: "smooth",
    }]);
    assert.equal(widgetArea.scrollByCalls.length, 0);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.window = previousWindow;
  }
});

test("widget drag snap scroll still prefers the widget area when it remains the active scroll container", () => {
  const widget = createWidgetElement();
  const widgetArea = createScrollArea({
    clientHeight: 420,
    scrollHeight: 1220,
    scrollTop: 120,
    top: 100,
    bottom: 520,
  });
  const hostScrollArea = createScrollArea({
    clientHeight: 700,
    scrollHeight: 700,
    scrollTop: 0,
    top: 0,
    bottom: 700,
  });
  const host = {
    ...hostScrollArea,
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
    shadowRoot: {
      elementFromPoint() {
        return null;
      },
      querySelector(selector) {
        return selector === ".mha-widget-area" ? widgetArea : null;
      },
    },
  };

  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const previousWindow = globalThis.window;
  let armedCallback = null;
  globalThis.setTimeout = (callback) => {
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    armedCallback = null;
  };
  globalThis.window = { innerHeight: 720 };

  try {
    const coordinator = createWidgetDragCoordinator(host);
    coordinator.wireWidget(widget, { id: "clock" });

    widget.listeners.get("pointerdown")?.({
      pointerId: 22,
      button: 0,
      clientX: 10,
      clientY: 20,
      target: widget,
    });
    armedCallback?.();

    widget.listeners.get("pointermove")?.({
      pointerId: 22,
      clientX: 16,
      clientY: 500,
      preventDefault() {},
      stopPropagation() {},
    });

    assert.deepEqual(widgetArea.scrollByCalls, [{
      top: 720,
      behavior: "smooth",
    }]);
    assert.equal(host.scrollByCalls.length, 0);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.window = previousWindow;
  }
});
