import assert from "node:assert/strict";
import test from "node:test";

import { setLanguage } from "../src/i18n/index.js";
import { getPageIconLabel, PAGE_ICON_OPTIONS } from "../src/pages/page-icons.js";
import { createSettingsPanel } from "../src/settings/settings-panel.js";

function createMockNode(tagName, namespaceURI = null) {
  return {
    tagName: String(tagName).toUpperCase(),
    namespaceURI,
    className: "",
    textContent: "",
    style: {
      setProperty() {},
    },
    dataset: {},
    attributes: {},
    children: [],
    listeners: {},
    hidden: false,
    append(...nodes) {
      this.children.push(...nodes.filter(Boolean));
    },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === "class") this.className = String(value);
    },
    getAttribute(name) {
      return this.attributes[name] || "";
    },
    addEventListener(type, handler) {
      this.listeners[type] = handler;
    },
    querySelector(selector) {
      return findNode(this, selector);
    },
    querySelectorAll(selector) {
      return findAllNodes(this, selector);
    },
    replaceWith(next) {
      this.replacedWith = next;
    },
    focus() {},
  };
}

function createMockDocument() {
  return {
    createElement(tagName) {
      return createMockNode(tagName);
    },
    createElementNS(namespaceURI, tagName) {
      return createMockNode(tagName, namespaceURI);
    },
  };
}

function withMockDocument(run) {
  const previousDocument = globalThis.document;
  globalThis.document = createMockDocument();
  setLanguage("en");
  try {
    return run();
  } finally {
    globalThis.document = previousDocument;
  }
}

function matchesSelector(node, selector) {
  if (!node || !selector) return false;
  if (selector.startsWith(".")) {
    const className = selector.slice(1).split("[", 1)[0];
    return String(node.className || "").split(/\s+/u).includes(className);
  }

  const roleMatch = selector.match(/^\[role='([^']+)'\]$/u);
  if (roleMatch) {
    return node.attributes?.role === roleMatch[1];
  }

  return String(node.tagName || "").toLowerCase() === selector.toLowerCase();
}

function findNode(root, selector) {
  if (!root) return null;
  if (matchesSelector(root, selector)) return root;
  for (const child of root.children || []) {
    const found = findNode(child, selector);
    if (found) return found;
  }
  return null;
}

function findAllNodes(root, selector, results = []) {
  if (!root) return results;
  if (matchesSelector(root, selector)) results.push(root);
  for (const child of root.children || []) {
    findAllNodes(child, selector, results);
  }
  return results;
}

function collectTextNodes(root, results = []) {
  if (!root) return results;
  if (typeof root.textContent === "string" && root.textContent) {
    results.push(root.textContent);
  }
  for (const child of root.children || []) {
    collectTextNodes(child, results);
  }
  return results;
}

function hasText(root, text) {
  return collectTextNodes(root).includes(text);
}

test("settings panel hides dock-only controls on mobile and keeps them on desktop", () => withMockDocument(() => {
  const mobileMain = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: true,
  });

  const desktopMain = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: false,
  });

  const mobileDock = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "dock",
    isMobileLayout: true,
    themeStyle: "ios",
    dockPages: [{ id: "home", name: "Home", icon: "home" }],
  });

  const desktopDock = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "dock",
    isMobileLayout: false,
    themeStyle: "ios",
    dockPages: [{ id: "home", name: "Home", icon: "home" }],
  });

  const oneUiDock = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "dock",
    isMobileLayout: false,
    themeStyle: "oneui",
    dockPages: [{ id: "home", name: "Home", icon: "home" }],
  });

  assert.equal(hasText(mobileMain, "Hide Home Assistant sidebar"), false);
  assert.equal(hasText(desktopMain, "Hide Home Assistant sidebar"), true);
  assert.equal(hasText(mobileMain, "Status bar"), false);
  assert.equal(hasText(desktopMain, "Status bar"), true);
  assert.equal(hasText(mobileDock, "Dock position"), false);
  assert.equal(hasText(desktopDock, "Dock position"), true);
  assert.equal(hasText(mobileDock, "Show dock labels"), true);
  assert.equal(hasText(desktopDock, "Show dock labels"), true);
  assert.equal(hasText(oneUiDock, "Show dock labels"), false);
  assert.equal(hasText(mobileDock, "Dock icons"), true);
}));

test("dock detail reuses the shared page icon registry", () => withMockDocument(() => {
  const dockDetail = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "dock-detail",
    dockPages: [{ id: "home", name: "Home", icon: "home" }],
    selectedDockPageId: "home",
  });

  const iconButtons = dockDetail.querySelectorAll(".mha-settings-icon-option");

  assert.equal(iconButtons.length, PAGE_ICON_OPTIONS.length);
  assert.deepEqual(
    iconButtons.map(button => button.attributes["aria-label"]),
    PAGE_ICON_OPTIONS.map(option => getPageIconLabel(option)),
  );
}));
