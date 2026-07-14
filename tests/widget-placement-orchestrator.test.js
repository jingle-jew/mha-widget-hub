import assert from "node:assert/strict";
import test from "node:test";

import {
  applyWidgetSurfaceHostLayoutState,
  buildPageCreatorPanelProps,
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  createPageCreatorPanel,
  createWidgetConfigPanel,
  syncWidgetManagerPanel,
  syncPageCreatorPanel,
  syncWidgetSurfaceOpenState,
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

  const rebuiltProps = buildWidgetConfigPanelProps(props);
  rebuiltProps.onChange({ rerender: true });
  assert.equal(rerenders, 2);
});

test("widget surface open state includes panels waiting for their opening frame", () => {
  const toggles = [];
  const host = {
    classList: {
      toggle(name, value) {
        toggles.push([name, value]);
      },
    },
    dataset: {},
  };
  const panel = {
    _mhaDesiredOpenState: true,
    hidden: false,
  };
  const root = {
    host,
    querySelector() {
      return null;
    },
    querySelectorAll() {
      return [panel];
    },
  };

  syncWidgetSurfaceOpenState(root);

  assert.deepEqual(toggles, [["is-widget-surface-open", true]]);
  assert.equal(host.dataset.widgetSurfaceOpen, "true");
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
  assert.equal(props.themeStyle, "oneui");
  assert.equal(props.selectedPageType, "media-players");
  assert.equal(props.onClose, onClose);
  assert.equal(props.onSelectPageType, onSelectPageType);
  assert.equal(props.onCreate, onCreate);
});

test("page creator props preserve the original theme style across rebuilds", () => {
  const props = buildPageCreatorPanelProps({
    open: true,
    themeStyle: "ios",
    selectedPageType: "media-players",
  });

  const rebuilt = buildPageCreatorPanelProps(props);

  assert.equal(rebuilt.themeStyle, "ios");
  assert.equal(rebuilt.selectedPageType, "media-players");
  assert.equal(rebuilt.pageTypeOptions.some((option) => option.value === "media-players"), true);
});

test("closed page creator panels are hidden", () => {
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

    addEventListener() {}

    querySelector() {
      return null;
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

  const panel = createPageCreatorPanel({ open: false, selectedPageType: "grid" });
  assert.equal(panel.hidden, true);

  delete globalThis.document;
});

test("closed widget config panels are hidden", () => {
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

    addEventListener() {}

    querySelector() {
      return null;
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

  const panel = createWidgetConfigPanel({ session: null });
  assert.equal(panel.hidden, true);

  delete globalThis.document;
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

test("widget surface panels inherit the host mobile-landscape layout state", () => {
  class FakeNode {
    constructor(tagName = "") {
      this.tagName = tagName.toUpperCase();
      this.childNodes = [];
      this.dataset = {};
      this.className = "";
      this.attributes = {};
      this.style = { setProperty() {} };
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

    replaceChildren(...children) {
      this.childNodes = [];
      this.append(...children);
    }

    setAttribute(name, value) {
      this.attributes[name] = value;
    }

    addEventListener() {}

    querySelector(selector) {
      if (!selector.startsWith(".")) return null;
      const className = selector.slice(1);
      const queue = [...this.childNodes];
      while (queue.length) {
        const node = queue.shift();
        const classes = String(node?.className || "").split(/\s+/).filter(Boolean);
        if (classes.includes(className)) return node;
        if (Array.isArray(node?.childNodes)) queue.push(...node.childNodes);
      }
      return null;
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

  const root = {
    host: {
      dataset: {
        layout: "mobile",
        layoutVariant: "mobile-landscape",
      },
      classList: {
        toggle() {},
      },
      _isMobileLandscapeLayout() {
        return true;
      },
    },
    querySelector() {
      return null;
    },
    append(node) {
      this.appended = node;
    },
  };

  syncWidgetManagerPanel(root, {
    open: true,
    categories: [],
  });

  assert.equal(root.appended?.dataset.layout, "mobile");
  assert.equal(root.appended?.dataset.layoutVariant, "mobile-landscape");
  assert.equal(root.appended?.dataset.mobileLayout, "true");
  assert.equal(root.appended?.dataset.mobileLandscape, "true");
  assert.equal(root.appended?.dataset.surfaceRole, "popup");

  const dialog = { dataset: {} };
  const panel = {
    dataset: { surfaceRole: "panel" },
    querySelector(selector) {
      return selector === "[role='dialog']" ? dialog : null;
    },
  };
  applyWidgetSurfaceHostLayoutState(root, panel);
  assert.equal(panel.dataset.mobileLayout, "true");
  assert.equal(panel.dataset.mobileLandscape, "true");
  assert.equal(panel.dataset.surfaceRole, "popup");
  assert.equal(dialog.dataset.surfaceRole, "popup");

  delete globalThis.document;
});
