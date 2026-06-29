import assert from "node:assert/strict";
import test from "node:test";

import {
  buildPageCreatorPanelProps,
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  syncPageCreatorPanel,
} from "../src/widgets/widget-placement-orchestrator.js";

test("widget manager panel props retain state and callback routing", () => {
  const onClose = () => {};
  const onBack = () => {};
  const onSelectCategory = () => {};
  const onSelectWidget = () => {};
  const categories = [{ id: "media", label: "Media" }];

  const props = buildWidgetManagerPanelProps({
    open: true,
    activeCategory: "media",
    categories,
    onClose,
    onBack,
    onSelectCategory,
    onSelectWidget,
  });

  assert.equal(props.open, true);
  assert.equal(props.activeCategory, "media");
  assert.equal(props.categories, categories);
  assert.equal(props.onClose, onClose);
  assert.equal(props.onBack, onBack);
  assert.equal(props.onSelectCategory, onSelectCategory);
  assert.equal(props.onSelectWidget, onSelectWidget);
});

test("widget config panel props rerender only when the popup requests it", () => {
  let rerenders = 0;
  const props = buildWidgetConfigPanelProps({
    session: { mode: "create", draft: {} },
    onRerender: () => { rerenders += 1; },
  });

  props.onChange({ rerender: false });
  props.onChange({});
  assert.equal(rerenders, 0);

  props.onChange({ rerender: true });
  assert.equal(rerenders, 1);
});

test("page creator panel props retain state and callback routing", () => {
  const onClose = () => {};
  const onSelectPageType = () => {};
  const onCreate = () => {};

  const props = buildPageCreatorPanelProps({
    open: true,
    selectedPageType: "media-players",
    onClose,
    onSelectPageType,
    onCreate,
  });

  assert.equal(props.open, true);
  assert.equal(props.selectedPageType, "media-players");
  assert.equal(props.onClose, onClose);
  assert.equal(props.onSelectPageType, onSelectPageType);
  assert.equal(props.onCreate, onCreate);
});

test("page creator sync replaces the existing panel", () => {
  class FakeNode {
    constructor(tagName = "") {
      this.tagName = tagName.toUpperCase();
      this.childNodes = [];
      this.dataset = {};
      this.className = "";
      this.attributes = {};
      this.style = { setProperty() {} };
      this.hidden = false;
    }

    append(...children) {
      this.childNodes.push(...children);
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    addEventListener(type, handler) {
      this[`on_${type}`] = handler;
    }

    querySelectorAll() {
      return [];
    }

    remove() {
      this.removed = true;
    }
  }

  globalThis.document = {
    createElement(tag) {
      return new FakeNode(tag);
    },
    createElementNS(_namespace, tag) {
      return new FakeNode(tag);
    },
  };

  const existing = new FakeNode("section");
  const root = {
    querySelectorAll() {
      return [existing];
    },
    append(node) {
      this.appended = node;
    },
  };

  syncPageCreatorPanel(root, {
    open: true,
    selectedPageType: "grid",
  });

  assert.equal(existing.removed, true);
  assert.equal(root.appended?.className, "mha-page-creator");

  delete globalThis.document;
});
