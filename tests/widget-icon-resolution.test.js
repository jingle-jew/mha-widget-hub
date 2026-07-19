import test from "node:test";
import assert from "node:assert/strict";
import {
  createSimpleButtonWidgetContent,
} from "../src/widgets/simple-button-widget.js";
import {
  createToggleWidgetContent,
} from "../src/widgets/toggle-widget.js";

function createMockElement(tagName, namespaceURI = null) {
  return {
    tagName,
    namespaceURI,
    className: "",
    textContent: "",
    type: "",
    checked: false,
    disabled: false,
    dataset: {},
    attributes: {},
    children: [],
    append(...nodes) {
      this.children.push(...nodes);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener() {},
    dispatchEvent() {},
    closest() {
      return null;
    },
    querySelector(selector) {
      if (selector === ".mha-toggle-input") {
        return this.children.find(child => child.className === "mha-toggle-input") || null;
      }
      return null;
    },
  };
}

function withMockDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    createElement(tagName) {
      return createMockElement(tagName);
    },
    createElementNS(namespaceURI, tagName) {
      return createMockElement(tagName, namespaceURI);
    },
  };

  try {
    return run();
  } finally {
    globalThis.document = previousDocument;
  }
}

test("button widget uses the resolved automatic icon name", () => withMockDocument(() => {
  const root = createSimpleButtonWidgetContent({
    kind: "button",
    label: "Cafe",
    icon: "auto",
  });
  const iconBubble = root.children[0];

  assert.equal(iconBubble.dataset.icon, "coffee");
  assert.equal(iconBubble.children[0].dataset.iconSymbol, "coffee");
}));

test("button widget treats the legacy home icon as implicit and resolves from label", () => withMockDocument(() => {
  const root = createSimpleButtonWidgetContent({
    kind: "button",
    label: "TV salon",
    icon: "home",
    iconCategory: "home",
  });
  const iconBubble = root.children[0];

  assert.equal(iconBubble.dataset.icon, "tv");
  assert.equal(iconBubble.children[0].dataset.iconSymbol, "tv");
}));

test("toggle widget uses the resolved automatic icon name", () => withMockDocument(() => {
  const root = createToggleWidgetContent({
    kind: "toggle",
    label: "Lampe salon",
    icon: "auto",
  });
  const iconBubble = root.children[0];

  assert.equal(iconBubble.dataset.icon, "lamp");
  assert.equal(iconBubble.children[0].dataset.iconSymbol, "lamp");
}));

test("toggle widget treats the legacy home icon as implicit and resolves from label", () => withMockDocument(() => {
  const root = createToggleWidgetContent({
    kind: "toggle",
    label: "Cafe",
    icon: "home",
    iconCategory: "home",
  });
  const iconBubble = root.children[0];

  assert.equal(iconBubble.dataset.icon, "coffee");
  assert.equal(iconBubble.children[0].dataset.iconSymbol, "coffee");
}));
