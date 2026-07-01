import assert from "node:assert/strict";
import test from "node:test";

import {
  SLIDER_ARM_DELAY_MS,
  canStartMobileSliderSession,
  createSlider,
  resolvePendingSliderGesture,
} from "../src/ui/slider.js";

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.tokens = new Set();
  }

  add(...values) {
    values.forEach((value) => this.tokens.add(value));
    this.owner._syncClassName();
  }

  remove(...values) {
    values.forEach((value) => this.tokens.delete(value));
    this.owner._syncClassName();
  }

  contains(value) {
    return this.tokens.has(value);
  }

  setFromString(value = "") {
    this.tokens = new Set(String(value).split(/\s+/).filter(Boolean));
    this.owner._syncClassName();
  }
}

class FakeStyle {
  constructor() {
    this.properties = new Map();
  }

  setProperty(name, value) {
    this.properties.set(name, value);
  }

  removeProperty(name) {
    this.properties.delete(name);
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || "").toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.style = new FakeStyle();
    this.listeners = new Map();
    this.attributes = new Map();
    this.classList = new FakeClassList(this);
    this._className = "";
    this.rootNode = null;
    this.rect = { top: 0, left: 0, width: 100, height: 24 };
    this.capturedPointers = new Set();
    this.value = "";
    this.disabled = false;
    this.type = "";
    this.min = "";
    this.max = "";
    this.textContent = "";
  }

  _syncClassName() {
    this._className = [...this.classList.tokens].join(" ");
  }

  set className(value) {
    this.classList.setFromString(value);
  }

  get className() {
    return this._className;
  }

  append(...nodes) {
    nodes.flat().forEach((node) => {
      if (!node) return;
      node.parentNode = this;
      node.rootNode = this.rootNode;
      this.children.push(node);
      node._propagateRootNode?.(this.rootNode);
    });
  }

  prepend(...nodes) {
    nodes.reverse().forEach((node) => {
      if (!node) return;
      node.parentNode = this;
      node.rootNode = this.rootNode;
      this.children.unshift(node);
      node._propagateRootNode?.(this.rootNode);
    });
  }

  _propagateRootNode(rootNode) {
    this.rootNode = rootNode;
    this.children.forEach((child) => child._propagateRootNode?.(rootNode));
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  getAttribute(name) {
    return this.attributes.get(name) || null;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  removeEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    this.listeners.set(type, handlers.filter((candidate) => candidate !== handler));
  }

  dispatchEvent(event) {
    const handlers = this.listeners.get(event.type) || [];
    const dispatchEvent = {
      ...event,
      currentTarget: this,
      target: event.target || this,
      preventDefault() {
        event.defaultPrevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {},
    };
    handlers.forEach((handler) => handler(dispatchEvent));
    return true;
  }

  querySelector(selector) {
    const matcher = buildSelectorMatcher(selector);
    const queue = [...this.children];
    while (queue.length) {
      const candidate = queue.shift();
      if (matcher(candidate)) return candidate;
      queue.unshift(...candidate.children);
    }
    return null;
  }

  closest(selector) {
    const matcher = buildSelectorMatcher(selector);
    let current = this;
    while (current) {
      if (matcher(current)) return current;
      current = current.parentNode;
    }
    return null;
  }

  getBoundingClientRect() {
    return this.rect;
  }

  getRootNode() {
    return this.rootNode;
  }

  setPointerCapture(pointerId) {
    this.capturedPointers.add(pointerId);
  }

  releasePointerCapture(pointerId) {
    this.capturedPointers.delete(pointerId);
  }

  hasPointerCapture(pointerId) {
    return this.capturedPointers.has(pointerId);
  }
}

function buildSelectorMatcher(selector = "") {
  const selectors = String(selector).split(",").map((item) => item.trim()).filter(Boolean);
  return (element) => selectors.some((entry) => matchesSelector(element, entry));
}

function matchesSelector(element, selector) {
  if (!element || !selector) return false;
  if (selector.startsWith(".")) {
    const classMatch = selector.match(/^\.([a-zA-Z0-9_-]+)/);
    const attributeMatch = selector.match(/\[data-widget-kind="([^"]+)"\]/);
    const classOk = classMatch ? element.classList.contains(classMatch[1]) : true;
    const attributeOk = attributeMatch ? element.dataset.widgetKind === attributeMatch[1] : true;
    return classOk && attributeOk;
  }
  return false;
}

function createFakeDocument() {
  return {
    createElement(tagName) {
      return new FakeElement(tagName);
    },
  };
}

function attachToHost(node, { layout = "mobile", isEditing = false, preview = false } = {}) {
  class FakeShadowRoot {}
  const host = {
    dataset: { layout, themeStyle: "oneui" },
    classList: {
      contains(token) {
        return isEditing && token === "is-editing";
      },
    },
  };
  globalThis.ShadowRoot = FakeShadowRoot;
  const rootNode = new FakeShadowRoot();
  rootNode.host = host;

  const widgetArea = new FakeElement("section");
  widgetArea.className = "mha-widget-area";
  widgetArea._propagateRootNode(rootNode);

  let parent = widgetArea;
  if (preview) {
    const previewNode = new FakeElement("div");
    previewNode.className = "mha-widget-manager-live-preview";
    previewNode._propagateRootNode(rootNode);
    widgetArea.append(previewNode);
    parent = previewNode;
  }

  parent.append(node);
  node._propagateRootNode(rootNode);
  return { host, widgetArea };
}

test("canStartMobileSliderSession blocks disabled, edit and preview states", () => {
  const event = { button: 0 };
  assert.equal(canStartMobileSliderSession({ layout: "mobile", event }), true);
  assert.equal(canStartMobileSliderSession({ layout: "tablet", event }), false);
  assert.equal(canStartMobileSliderSession({ layout: "mobile", disabled: true, event }), false);
  assert.equal(canStartMobileSliderSession({ layout: "mobile", isEditing: true, event }), false);
  assert.equal(canStartMobileSliderSession({ layout: "mobile", isPreview: true, event }), false);
});

test("resolvePendingSliderGesture cancels scroll-first gestures before arming", () => {
  assert.equal(resolvePendingSliderGesture({
    orientation: "horizontal",
    deltaX: 1,
    deltaY: 12,
  }), "cancel");
  assert.equal(resolvePendingSliderGesture({
    orientation: "horizontal",
    deltaX: 9,
    deltaY: 2,
  }), "pending");
  assert.equal(resolvePendingSliderGesture({
    orientation: "vertical",
    deltaX: 0,
    deltaY: 12,
  }), "cancel");
});

test("mobile slider cancels pending when vertical scroll wins before arm", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;

  let armedCallback = null;
  const frames = [];
  globalThis.document = createFakeDocument();
  globalThis.window = {};
  globalThis.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setTimeout = (callback, delay) => {
    assert.equal(delay, SLIDER_ARM_DELAY_MS);
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {
    armedCallback = null;
  };

  try {
    const slider = createSlider({ value: 50 });
    const input = slider.querySelector(".mha-slider-input");
    attachToHost(slider, { layout: "mobile" });

    input.dispatchEvent({
      type: "pointerdown",
      pointerId: 1,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    input.dispatchEvent({
      type: "pointermove",
      pointerId: 1,
      clientX: 12,
      clientY: 28,
    });

    assert.equal(armedCallback, null);
    assert.equal(slider.classList.contains("is-slider-dragging"), false);
    assert.equal(input.hasPointerCapture(1), false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test("mobile slider arms after the delay and dispatches input/change only when active", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;

  let armedCallback = null;
  const frames = [];
  const inputs = [];
  const changes = [];
  globalThis.document = createFakeDocument();
  globalThis.window = {};
  globalThis.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setTimeout = (callback) => {
    armedCallback = callback;
    return 1;
  };
  globalThis.clearTimeout = () => {};

  try {
    const slider = createSlider({
      value: 20,
      min: 0,
      max: 100,
      onInput: (event) => inputs.push(Number(event.currentTarget.value)),
      onChange: (event) => changes.push(Number(event.currentTarget.value)),
    });
    const input = slider.querySelector(".mha-slider-input");
    input.rect = { top: 0, left: 0, width: 100, height: 24 };
    attachToHost(slider, { layout: "mobile" });

    input.dispatchEvent({
      type: "pointerdown",
      pointerId: 2,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    armedCallback?.();
    input.dispatchEvent({
      type: "pointermove",
      pointerId: 2,
      clientX: 80,
      clientY: 10,
    });
    input.dispatchEvent({
      type: "pointerup",
      pointerId: 2,
      clientX: 80,
      clientY: 10,
    });

    assert.equal(slider.classList.contains("is-slider-dragging"), false);
    assert.equal(inputs.at(-1), 80);
    assert.equal(changes.at(-1), 80);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});

test("mobile slider stays inert in edit mode and widget-manager previews", () => {
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;

  const frames = [];
  globalThis.document = createFakeDocument();
  globalThis.window = {};
  globalThis.requestAnimationFrame = (callback) => {
    frames.push(callback);
    return frames.length;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};

  try {
    const editSlider = createSlider({ value: 40 });
    const editInput = editSlider.querySelector(".mha-slider-input");
    attachToHost(editSlider, { layout: "mobile", isEditing: true });
    editInput.dispatchEvent({
      type: "pointerdown",
      pointerId: 3,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    assert.equal(editSlider.classList.contains("is-slider-dragging"), false);

    const previewSlider = createSlider({ value: 40 });
    const previewInput = previewSlider.querySelector(".mha-slider-input");
    attachToHost(previewSlider, { layout: "mobile", preview: true });
    previewInput.dispatchEvent({
      type: "pointerdown",
      pointerId: 4,
      button: 0,
      clientX: 10,
      clientY: 10,
    });
    assert.equal(previewSlider.classList.contains("is-slider-dragging"), false);
  } finally {
    globalThis.document = previousDocument;
    globalThis.window = previousWindow;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
  }
});
