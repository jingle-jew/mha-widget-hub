import assert from "node:assert/strict";
import test from "node:test";

import { createPanelShell } from "../src/panels/panel-shell.js";

class FakeNode {
  constructor(tagName = "") {
    this.tagName = tagName.toUpperCase();
    this.childNodes = [];
    this.dataset = {};
    this.className = "";
    this.attributes = {};
    this.style = {};
    this.listeners = new Map();
    this.hidden = false;
    this.parentNode = null;
  }

  append(...children) {
    children.forEach((child) => {
      if (!child) return;
      child.parentNode = this;
      this.childNodes.push(child);
    });
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  querySelector(selector) {
    if (selector === "[role='dialog']") {
      return this.childNodes.find((node) => node.attributes?.role === "dialog") || null;
    }
    return null;
  }

  getBoundingClientRect() {
    return { height: 0 };
  }
}

function withMockDocument(callback) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return new FakeNode(tag);
    },
    createElementNS(_namespace, tag) {
      return new FakeNode(tag);
    },
  };

  try {
    callback();
  } finally {
    if (previousDocument) globalThis.document = previousDocument;
    else delete globalThis.document;
  }
}

function dispatch(node, type, event) {
  node.listeners.get(type)?.forEach((handler) => handler(event));
}

test("mobile sheet headers close the panel on swipe down", () => withMockDocument(() => {
  let closeCount = 0;
  const panel = createPanelShell({
    open: true,
    rootClassName: "mha-settings-panel",
    scrimClassName: "mha-settings-scrim",
    sheetClassName: "mha-settings-sheet",
    headerClassName: "mha-settings-header",
    onClose: () => { closeCount += 1; },
  });
  panel.dataset.open = "true";
  panel.dataset.mobilePresentation = "sheet";
  panel.hidden = false;
  panel.getRootNode = () => ({ host: { dataset: { layout: "mobile" } } });

  const scrim = panel.childNodes[0];
  const sheet = panel.childNodes[1];
  const header = sheet.childNodes[0];
  sheet.getBoundingClientRect = () => ({ height: 400 });
  header.setPointerCapture = (pointerId) => { header.capturedPointerId = pointerId; };
  header.releasePointerCapture = (pointerId) => { header.releasedPointerId = pointerId; };
  header.closest = (selector) => (selector === "[role='dialog']" ? sheet : null);

  const target = {
    closest(selector) {
      if (selector === ".mha-settings-header, .mha-page-creator-header") return header;
      if (selector === "button, input, select, textarea, a, [role='button'], [data-settings-control]") return null;
      return null;
    },
  };

  dispatch(panel, "pointerdown", {
    pointerId: 7,
    pointerType: "touch",
    button: 0,
    clientX: 24,
    clientY: 24,
    target,
  });

  let movePrevented = false;
  dispatch(panel, "pointermove", {
    pointerId: 7,
    clientX: 28,
    clientY: 132,
    target,
    preventDefault() {
      movePrevented = true;
    },
  });

  assert.equal(header.capturedPointerId, 7);
  assert.equal(panel.dataset.swipeClosing, "true");
  assert.equal(sheet.style.transform, "translateY(108px)");
  assert.equal(movePrevented, true);

  let upPrevented = false;
  dispatch(panel, "pointerup", {
    pointerId: 7,
    preventDefault() {
      upPrevented = true;
    },
  });

  assert.equal(closeCount, 1);
  assert.equal(header.releasedPointerId, 7);
  assert.equal(panel.dataset.swipeClosing, "false");
  assert.equal(sheet.style.transform, "");
  assert.equal(scrim.style.opacity, "");
  assert.equal(upPrevented, true);
}));

test("swipe down dismissal stays disabled outside mobile sheet layouts", () => withMockDocument(() => {
  let closeCount = 0;
  const panel = createPanelShell({
    open: true,
    rootClassName: "mha-settings-panel",
    scrimClassName: "mha-settings-scrim",
    sheetClassName: "mha-settings-sheet",
    headerClassName: "mha-settings-header",
    onClose: () => { closeCount += 1; },
  });
  panel.dataset.open = "true";
  panel.dataset.mobilePresentation = "sheet";
  panel.hidden = false;
  panel.getRootNode = () => ({ host: { dataset: { layout: "tablet" } } });

  const sheet = panel.childNodes[1];
  const header = sheet.childNodes[0];
  sheet.getBoundingClientRect = () => ({ height: 400 });
  header.closest = (selector) => (selector === "[role='dialog']" ? sheet : null);

  const target = {
    closest(selector) {
      if (selector === ".mha-settings-header, .mha-page-creator-header") return header;
      if (selector === "button, input, select, textarea, a, [role='button'], [data-settings-control]") return null;
      return null;
    },
  };

  dispatch(panel, "pointerdown", {
    pointerId: 3,
    pointerType: "touch",
    button: 0,
    clientX: 12,
    clientY: 12,
    target,
  });
  dispatch(panel, "pointermove", {
    pointerId: 3,
    clientX: 12,
    clientY: 144,
    target,
    preventDefault() {},
  });
  dispatch(panel, "pointerup", {
    pointerId: 3,
    preventDefault() {},
  });

  assert.equal(closeCount, 0);
  assert.equal(panel.dataset.swipeClosing, undefined);
}));
