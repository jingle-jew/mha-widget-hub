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
    listeners: {},
    append(...nodes) {
      this.children.push(...nodes);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, listener) {
      this.listeners[name] = listener;
    },
    dispatchEvent() {},
    closest() {
      return null;
    },
    querySelector(selector) {
      if (selector === ".mha-toggle-input") {
        if (this.className === "mha-toggle-input") return this;
        for (const child of this.children) {
          const match = child.querySelector?.(selector);
          if (match) return match;
        }
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
  const iconBubble = root.children[0].children[0];

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
  const iconBubble = root.children[0].children[0];

  assert.equal(iconBubble.dataset.icon, "coffee");
  assert.equal(iconBubble.children[0].dataset.iconSymbol, "coffee");
}));

test("light details open only from the informative button, independently from the toggle", () => withMockDocument(() => {
  let detailsOpened = 0;
  let toggled = 0;
  const root = createToggleWidgetContent({
    kind: "toggle",
    entityId: "light.salon",
    label: "Salon",
  }, {
    onOpenDetails: () => { detailsOpened += 1; },
    onToggle: () => { toggled += 1; },
  });
  const info = root.children[0];
  const toggleInput = root.children[1].querySelector(".mha-toggle-input");

  assert.equal(info.tagName, "button");
  assert.equal(root.dataset.lightDetailsSupported, "true");
  info.listeners.click({ preventDefault() {}, stopPropagation() {} });
  assert.equal(detailsOpened, 1);

  toggleInput.checked = true;
  toggleInput.listeners.change({ currentTarget: toggleInput });
  assert.equal(toggled, 1);
  assert.equal(detailsOpened, 1);
}));

test("switches and booleans keep a non-interactive information surface", () => withMockDocument(() => {
  for (const entityId of ["switch.coffee", "input_boolean.away"]) {
    const root = createToggleWidgetContent({ kind: "toggle", entityId, label: "Control" });
    assert.equal(root.children[0].tagName, "span");
    assert.equal(root.dataset.lightDetailsSupported, "false");
  }
}));
