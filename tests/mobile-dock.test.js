import assert from "node:assert/strict";
import test from "node:test";

import { createMobileDock } from "../src/layout/mobile-dock.js";

function createMockElement(tagName, namespaceURI = null) {
  const element = {
    tagName,
    namespaceURI,
    className: "",
    type: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    style: {
      values: {},
      setProperty(name, value) {
        this.values[name] = String(value);
      },
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    dispatchEvent(event) {
      this.lastDispatchedEvent = event;
      return true;
    },
  };
  element.classList = {
    add: (...names) => {
      const existing = new Set(String(element.className || "").split(/\s+/).filter(Boolean));
      names.forEach(name => existing.add(name));
      element.className = Array.from(existing).join(" ");
    },
  };
  return element;
}

function withMockDom(run) {
  const previousDocument = globalThis.document;
  const previousCustomEvent = globalThis.CustomEvent;

  globalThis.document = {
    createElement(tagName) {
      return createMockElement(tagName);
    },
    createElementNS(namespaceURI, tagName) {
      return createMockElement(tagName, namespaceURI);
    },
  };
  globalThis.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
      this.type = type;
      this.detail = options.detail;
      this.bubbles = options.bubbles;
      this.composed = options.composed;
    }
  };

  try {
    return run();
  } finally {
    globalThis.document = previousDocument;
    globalThis.CustomEvent = previousCustomEvent;
  }
}

test("mobile dock renders a direct nav without launcher, panel, or scrim", () => withMockDom(() => {
  const dock = createMobileDock({
    pages: [
      { id: "home", name: "Home", icon: "home" },
      { id: "lights", name: "Lights", icon: "lamp" },
    ],
    activePageId: "lights",
  });

  assert.equal(dock.tagName, "nav");
  assert.equal(dock.className, "mha-mobile-dock");
  assert.equal(dock.attributes["aria-label"], "Dock");
  assert.equal(dock.children.length, 3);
  assert.equal(dock.children.some(child => child.className === "mha-mobile-dock-launcher"), false);
  assert.equal(dock.children.some(child => child.className === "mha-mobile-dock-panel"), false);
  assert.equal(dock.children.some(child => child.className === "mha-mobile-dock-scrim"), false);
  assert.equal(dock.children[1].dataset.active, "true");
  assert.equal(dock.children[1].attributes["aria-current"], "page");
  assert.equal(dock.children[1].children[1]?.className, "mha-dock-item-label");
  assert.equal(dock.children[1].children[1]?.textContent, "Lights");
}));

test("mobile dock keeps page and edit callbacks without the old panel flow", () => withMockDom(() => {
  const calls = [];
  const dock = createMobileDock({
    pages: [
      { id: "home", name: "Home", icon: "home" },
    ],
    activePageId: "home",
    isEditing: true,
    onPageSelect: (pageId) => calls.push(["page", pageId]),
    onAddPage: () => calls.push("add-page"),
    onDockSettings: () => calls.push("dock-settings"),
    onSettings: () => calls.push("settings"),
  });

  assert.equal(dock.children.length, 4);
  dock.children[0].listeners.click?.();
  dock.children[1].listeners.click?.();
  dock.children[2].listeners.click?.();
  dock.children[3].listeners.click?.();

  assert.deepEqual(calls, [
    ["page", "home"],
    "settings",
    "add-page",
    "dock-settings",
  ]);
}));

test("mobile dock still dispatches the settings event fallback", () => withMockDom(() => {
  const dock = createMobileDock();
  const settingsButton = dock.children[dock.children.length - 1];
  settingsButton.listeners.click?.();

  assert.equal(dock.lastDispatchedEvent?.type, "mha-open-settings");
  assert.equal(dock.lastDispatchedEvent?.bubbles, true);
  assert.equal(dock.lastDispatchedEvent?.composed, true);
}));

test("mobile dock renders typed spacer items without breaking page and action items", () => withMockDom(() => {
  const dock = createMobileDock({
    activePageId: "home",
    items: [
      { type: "page", pageId: "home", symbol: "home", label: "Home" },
      { type: "spacer", mobileClassName: "mha-mobile-dock-gap" },
      { type: "action", action: "settings", symbol: "gear", label: "Settings" },
    ],
  });

  assert.equal(dock.children.length, 3);
  assert.equal(dock.children[0].dataset.dockItemType, "page");
  assert.equal(dock.children[1].className, "mha-mobile-dock-spacer mha-mobile-dock-gap");
  assert.equal(dock.children[1].attributes["aria-hidden"], "true");
  assert.equal(dock.children[2].dataset.dockItemType, "action");
}));

test("mobile dock groups overflowing items into snap pages of four", () => withMockDom(() => {
  const dock = createMobileDock({
    items: [
      { type: "page", pageId: "p1", symbol: "home", label: "P1" },
      { type: "page", pageId: "p2", symbol: "grid", label: "P2" },
      { type: "page", pageId: "p3", symbol: "grid", label: "P3" },
      { type: "page", pageId: "p4", symbol: "grid", label: "P4" },
      { type: "page", pageId: "p5", symbol: "grid", label: "P5" },
    ],
  });

  assert.equal(dock.className, "mha-mobile-dock is-paged");
  assert.equal(dock.style.values["--mha-mobile-dock-page-count"], "2");
  assert.equal(dock.children.length, 1);
  assert.equal(dock.children[0].className, "mha-dock-pages");
  assert.equal(dock.children[0].children.length, 2);
  assert.equal(dock.children[0].children[0].className, "mha-dock-page");
  assert.equal(dock.children[0].children[0].children.length, 4);
  assert.equal(dock.children[0].children[1].children.length, 1);
}));
