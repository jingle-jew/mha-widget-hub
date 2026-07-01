import assert from "node:assert/strict";
import test from "node:test";

import { createDock } from "../src/layout/dock.js";

function createMockElement(tagName, namespaceURI = null) {
  return {
    tagName,
    namespaceURI,
    className: "",
    type: "",
    textContent: "",
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
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
}

function buildMockElement(tagName, namespaceURI = null) {
  const element = createMockElement(tagName, namespaceURI);
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
      return buildMockElement(tagName);
    },
    createElementNS(namespaceURI, tagName) {
      return buildMockElement(tagName, namespaceURI);
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

test("bottom dock keeps direct items and does not paginate overflow", () => withMockDom(() => {
  const dock = createDock({
    dockPosition: "bottom",
    items: [
      { type: "page", pageId: "p1", symbol: "home", label: "P1" },
      { type: "page", pageId: "p2", symbol: "grid", label: "P2" },
      { type: "page", pageId: "p3", symbol: "grid", label: "P3" },
      { type: "page", pageId: "p4", symbol: "grid", label: "P4" },
      { type: "page", pageId: "p5", symbol: "grid", label: "P5" },
    ],
  });

  assert.equal(dock.className, "mha-dock");
  assert.equal(dock.children.length, 5);
  assert.equal(dock.children[0].dataset.pageId, "p1");
  assert.equal(dock.children[4].dataset.pageId, "p5");
}));
