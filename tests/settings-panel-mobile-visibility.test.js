import assert from "node:assert/strict";
import test from "node:test";

import { setLanguage } from "../src/i18n/index.js";
import { getPageIconLabel, PAGE_ICON_OPTIONS } from "../src/pages/page-icons.js";
import { createSettingsPanel, updateSettingsPanel } from "../src/settings/settings-panel.js";

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

function withMockAnimationQueues(run) {
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  let nextId = 1;
  const frameQueue = new Map();
  const timeoutQueue = new Map();

  globalThis.requestAnimationFrame = (callback) => {
    const id = nextId++;
    frameQueue.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => {
    frameQueue.delete(id);
  };
  globalThis.setTimeout = (callback, _delay = 0) => {
    const id = nextId++;
    timeoutQueue.set(id, callback);
    return id;
  };
  globalThis.clearTimeout = (id) => {
    timeoutQueue.delete(id);
  };

  const flushFrames = () => {
    const callbacks = [...frameQueue.values()];
    frameQueue.clear();
    callbacks.forEach(callback => callback());
  };

  const flushTimeouts = () => {
    const callbacks = [...timeoutQueue.values()];
    timeoutQueue.clear();
    callbacks.forEach(callback => callback());
  };

  try {
    return run({ flushFrames, flushTimeouts });
  } finally {
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
    globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
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

test("settings panel keeps mobile-landscape navigation options filtered even with a side dock layout", () => withMockDocument(() => {
  const mobileLandscapeMain = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: true,
    isMobileLandscape: true,
    supportsDockPosition: false,
    supportsSidebarToggle: false,
    showsStatusBarOptions: false,
  });

  const mobileLandscapeDock = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "dock",
    isMobileLayout: true,
    isMobileLandscape: true,
    supportsDockPosition: false,
    supportsSidebarToggle: false,
    showsStatusBarOptions: false,
    themeStyle: "ios",
    dockPages: [{ id: "home", name: "Home", icon: "home" }],
  });

  assert.equal(mobileLandscapeMain.dataset.mobileLandscape, "true");
  assert.equal(hasText(mobileLandscapeMain, "Hide Home Assistant sidebar"), false);
  assert.equal(hasText(mobileLandscapeMain, "Status bar"), false);
  assert.equal(hasText(mobileLandscapeDock, "Dock position"), false);
  assert.equal(hasText(mobileLandscapeDock, "Dock icons"), true);
}));

test("settings panel updates its mobile landscape dataset in place across viewport transitions", () => withMockDocument(() => {
  const portraitPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: true,
    isMobileLandscape: false,
    supportsDockPosition: false,
    supportsSidebarToggle: false,
    showsStatusBarOptions: false,
  });

  const landscapePanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: true,
    isMobileLandscape: true,
    supportsDockPosition: false,
    supportsSidebarToggle: false,
    showsStatusBarOptions: false,
  });

  assert.equal(updateSettingsPanel(portraitPanel, landscapePanel), true);
  assert.equal(portraitPanel.dataset.mobileLayout, "true");
  assert.equal(portraitPanel.dataset.mobileLandscape, "true");
}));

test("settings panel keeps desktop close animation visible before hiding", () => withMockDocument(() => withMockAnimationQueues(({ flushFrames, flushTimeouts }) => {
  const openPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: false,
  });
  const closedPanel = createSettingsPanel({
    open: false,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: false,
  });

  assert.equal(updateSettingsPanel(openPanel, closedPanel), true);
  assert.equal(openPanel.dataset.open, "false");
  assert.equal(openPanel.hidden, false);
  assert.equal(openPanel.getAttribute("aria-hidden"), "true");

  flushTimeouts();
  assert.equal(openPanel.hidden, true);

  const reopenedPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    isMobileLayout: false,
  });

  assert.equal(updateSettingsPanel(openPanel, reopenedPanel), true);
  assert.equal(openPanel.hidden, false);
  assert.equal(openPanel.dataset.open, "false");
  assert.equal(openPanel.getAttribute("aria-hidden"), "false");

  flushFrames();
  assert.equal(openPanel.dataset.open, "true");
})));

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

test("settings panel hides the iOS glass variant selector", () => withMockDocument(() => {
  const iosPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    themeStyle: "ios",
    themeVariant: "liquid",
    iosGlass: "liquid",
  });

  assert.equal(hasText(iosPanel, "Theme variant"), false);
}));

test("settings panel hides the Alexa theme option", () => withMockDocument(() => {
  const panel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    themeStyle: "oneui",
  });

  assert.equal(hasText(panel, "Alexa"), false);
}));
