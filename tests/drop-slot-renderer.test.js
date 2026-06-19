import assert from "node:assert/strict";
import test from "node:test";

import { syncDropSlotRenderer } from "../src/widgets/drop-slot-renderer.js";

class FakeNode {
  constructor(tagName = "") {
    this.tagName = tagName.toUpperCase();
    this.childNodes = [];
    this.parentNode = null;
    this.className = "";
    this.dataset = {};
    this.attributes = {};
    this.style = {};
    this.listeners = new Map();
    this.classList = {
      values: new Set(),
      add: (...tokens) => tokens.forEach((token) => this.classList.values.add(token)),
      remove: (...tokens) => tokens.forEach((token) => this.classList.values.delete(token)),
      contains: (token) => this.classList.values.has(token),
    };
  }

  append(...children) {
    children.forEach((child) => this.#appendChild(child));
  }

  prepend(...children) {
    const nodes = children.flatMap((child) => this.#expandChild(child));
    nodes.reverse().forEach((child) => {
      child.parentNode = this;
      this.childNodes.unshift(child);
    });
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, handler) {
    const handlers = this.listeners.get(type) || [];
    handlers.push(handler);
    this.listeners.set(type, handlers);
  }

  querySelectorAll(selector) {
    if (selector !== ".mha-widget-drop-slot") return [];
    return this.childNodes.filter((child) => child.className === "mha-widget-drop-slot");
  }

  remove() {
    if (!this.parentNode) return;
    this.parentNode.childNodes = this.parentNode.childNodes.filter((child) => child !== this);
    this.parentNode = null;
  }

  click() {
    const event = {
      defaultPrevented: false,
      propagationStopped: false,
      preventDefault() {
        this.defaultPrevented = true;
      },
      stopPropagation() {
        this.propagationStopped = true;
      },
    };
    (this.listeners.get("click") || []).forEach((handler) => handler(event));
    return event;
  }

  #appendChild(child) {
    this.#expandChild(child).forEach((node) => {
      node.parentNode = this;
      this.childNodes.push(node);
    });
  }

  #expandChild(child) {
    if (child?.isFragment) return child.childNodes;
    return [child];
  }
}

class FakeFragment extends FakeNode {
  constructor() {
    super("#fragment");
    this.isFragment = true;
  }
}

function installFakeDocument() {
  globalThis.document = {
    createElement(tag) {
      return new FakeNode(tag);
    },
    createDocumentFragment() {
      return new FakeFragment();
    },
  };
}

test("drop slot renderer distinguishes add and move labels", () => {
  installFakeDocument();
  const grid = new FakeNode("div");
  const slot = { x: 2, y: 3, w: 2, h: 1 };

  syncDropSlotRenderer(grid, {
    editing: true,
    mode: "add",
    slots: [slot],
  });
  assert.equal(grid.dataset.dropSlotsCount, "1");
  assert.equal(grid.dataset.dropSlotMode, "add");
  assert.equal(grid.classList.contains("has-drop-slots"), true);
  assert.match(
    grid.childNodes[0].getAttribute("aria-label"),
    /Add widget here, column 2, row 3/,
  );

  syncDropSlotRenderer(grid, {
    editing: true,
    mode: "move",
    slots: [slot],
  });
  assert.equal(grid.dataset.dropSlotMode, "move");
  assert.match(
    grid.childNodes[0].getAttribute("aria-label"),
    /Move widget here, column 2, row 3/,
  );

  delete globalThis.document;
});

test("drop slot renderer wires the click handler to the selected slot", () => {
  installFakeDocument();
  const grid = new FakeNode("div");
  const selected = [];

  syncDropSlotRenderer(grid, {
    editing: true,
    mode: "move",
    slots: [{ x: 4, y: 1, w: 1, h: 2 }],
    onSelectSlot: (slot) => selected.push(slot),
  });

  const button = grid.childNodes[0];
  assert.equal(button.dataset.x, "4");
  assert.equal(button.dataset.y, "1");
  assert.equal(button.style.gridColumn, "4 / span 1");
  assert.equal(button.style.gridRow, "1 / span 2");

  const event = button.click();
  assert.deepEqual(selected, [{ x: 4, y: 1, w: 1, h: 2 }]);
  assert.equal(event.defaultPrevented, true);
  assert.equal(event.propagationStopped, true);

  delete globalThis.document;
});

test("drop slot renderer clears slots when editing is disabled", () => {
  installFakeDocument();
  const grid = new FakeNode("div");

  syncDropSlotRenderer(grid, {
    editing: true,
    mode: "add",
    slots: [{ x: 1, y: 1, w: 1, h: 1 }],
  });
  assert.equal(grid.childNodes.length, 1);

  syncDropSlotRenderer(grid, {
    editing: false,
    mode: "add",
    slots: [{ x: 1, y: 1, w: 1, h: 1 }],
  });

  assert.equal(grid.childNodes.length, 0);
  assert.equal(grid.dataset.dropSlotsCount, "0");
  assert.equal(grid.dataset.dropSlotMode, "none");
  assert.equal(grid.classList.contains("has-drop-slots"), false);

  delete globalThis.document;
});

