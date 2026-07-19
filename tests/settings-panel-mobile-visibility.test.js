import assert from "node:assert/strict";
import test from "node:test";

import { setLanguage } from "../src/i18n/index.js";
import { getPageIconLabel, PAGE_ICON_OPTIONS } from "../src/pages/page-icons.js";
import { createSettingsPanel, updateSettingsPanel } from "../src/settings/settings-panel.js";
import { createMhaCheckbox, createMhaRadio } from "../src/ui/form-controls.js";

function createMockNode(tagName, namespaceURI = null) {
  const node = {
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
      const children = nodes.filter(Boolean);
      children.forEach(child => { child.parentNode = this; });
      this.children.push(...children);
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
  node.classList = {
    add(...tokens) {
      const classes = new Set(String(node.className || "").split(/\s+/u).filter(Boolean));
      tokens.forEach(token => classes.add(token));
      node.className = [...classes].join(" ");
    },
    remove(...tokens) {
      const classes = new Set(String(node.className || "").split(/\s+/u).filter(Boolean));
      tokens.forEach(token => classes.delete(token));
      node.className = [...classes].join(" ");
    },
    contains(token) {
      return String(node.className || "").split(/\s+/u).includes(token);
    },
    toggle(token, force) {
      const active = force ?? !this.contains(token);
      if (active) this.add(token);
      else this.remove(token);
      return active;
    },
  };
  node.closest = function closest(selector) {
    let current = this;
    while (current) {
      if (matchesSelector(current, selector)) return current;
      current = current.parentNode;
    }
    return null;
  };
  return node;
}

function createMockDocument() {
  const listeners = {};
  return {
    listeners,
    createElement(tagName) {
      return createMockNode(tagName);
    },
    createElementNS(namespaceURI, tagName) {
      return createMockNode(tagName, namespaceURI);
    },
    addEventListener(type, handler) {
      listeners[type] = handler;
    },
    removeEventListener(type, handler) {
      if (listeners[type] === handler) delete listeners[type];
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

test("Weather page customization tile opens its dedicated landscape subpanel", () => withMockDocument(() => {
  let openCount = 0;
  let backCount = 0;
  const changes = [];
  const main = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    onOpenWeatherPageSettings: () => { openCount += 1; },
  });
  const weatherTile = main.querySelectorAll(".mha-settings-nav-tile")
    .find(tile => hasText(tile, "Weather page"));

  assert.ok(weatherTile);
  weatherTile.listeners.click();
  assert.equal(openCount, 1);

  const subpanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "weather-page",
    weatherLandscapeId: "alpine-lake",
    onWeatherPageMainBack: () => { backCount += 1; },
    onWeatherLandscapeChange: value => changes.push(value),
  });
  const choices = subpanel.querySelectorAll(".mha-settings-weather-landscape-option");
  const alpineChoice = choices.find(choice => choice.dataset.landscapeId === "alpine-lake");
  const celestialChoice = choices.find(choice => choice.dataset.landscapeId === "celestial-gradient");
  const alpineInput = alpineChoice.querySelector("input");
  const celestialInput = celestialChoice.querySelector("input");

  assert.equal(subpanel.dataset.settingsPage, "weather-page");
  assert.equal(hasText(subpanel, "Landscape"), true);
  assert.equal(choices.length, 2);
  assert.equal(alpineChoice.dataset.selected, "true");
  assert.ok(celestialChoice);
  assert.equal(
    celestialChoice.querySelector(".mha-settings-weather-landscape-preview").dataset.renderer,
    "celestial-gradient",
  );
  assert.equal(alpineInput.checked, true);
  celestialInput.checked = true;
  celestialInput.listeners.change({ target: celestialInput });
  assert.deepEqual(changes, ["celestial-gradient"]);

  const renderedHeader = subpanel.querySelector(".mha-settings-header").replacedWith;
  assert.equal(renderedHeader.querySelector(".mha-settings-title").textContent, "Weather page settings");
  renderedHeader.querySelector(".mha-settings-back").listeners.click();
  assert.equal(backCount, 1);
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

test("settings selectors use the controlled MHA listbox and keep the native value contract", () => withMockDocument(() => {
  const values = [];
  const panel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    theme: "auto",
    onThemeChange: value => values.push(value),
  });
  const trigger = panel.querySelectorAll(".mha-select-trigger")
    .find(control => control.getAttribute("aria-label") === "Theme");
  const control = trigger.closest(".mha-select");
  const input = control.querySelector(".mha-select-native");
  const darkOption = control.querySelectorAll("[role='option']")
    .find(option => option.dataset.value === "dark");

  assert.ok(trigger);
  assert.equal(trigger.getAttribute("role"), "combobox");
  assert.equal(input.tagName, "SELECT");
  assert.equal(input.value, "auto");
  assert.equal(control.dataset.open, "false");

  trigger.listeners.click();
  assert.equal(control.dataset.open, "true");
  assert.equal(trigger.getAttribute("aria-expanded"), "true");
  assert.equal(control.closest(".mha-settings-section").dataset.selectOpen, "true");

  globalThis.document.listeners.pointerdown({
    target: createMockNode("mha-control-hub"),
    composedPath: () => [darkOption, control],
  });
  assert.equal(control.dataset.open, "true");

  darkOption.listeners.click();
  assert.equal(input.value, "dark");
  assert.equal(darkOption.getAttribute("aria-selected"), "true");
  assert.equal(control.dataset.open, "false");
  assert.equal(control.closest(".mha-settings-section").dataset.selectOpen, undefined);
  assert.deepEqual(values, ["dark"]);

  trigger.listeners.click();
  globalThis.document.listeners.pointerdown({
    target: createMockNode("button"),
    composedPath: () => [],
  });
  assert.equal(control.dataset.open, "false");

  const menu = control.querySelector(".mha-select-menu");
  const settingsBody = control.closest(".mha-settings-body");
  const shadowRoot = createMockNode("shadow-root");
  shadowRoot.host = createMockNode("mha-control-hub");
  control.getRootNode = () => shadowRoot;
  trigger.getBoundingClientRect = () => ({ left: 220, right: 412, top: 180, bottom: 224, width: 192 });
  settingsBody.getBoundingClientRect = () => ({ left: 160, right: 440, top: 100, bottom: 700 });
  menu.scrollHeight = 180;

  trigger.listeners.click();
  assert.equal(menu.dataset.portaled, "true");
  assert.equal(shadowRoot.children.includes(menu), true);

  globalThis.document.listeners.pointerdown({
    target: shadowRoot.host,
    composedPath: () => [darkOption, menu, shadowRoot, shadowRoot.host],
  });
  assert.equal(control.dataset.open, "true");

  darkOption.listeners.click();
  assert.equal(control.dataset.open, "false");
  assert.equal(menu.dataset.portaled, undefined);
}));

test("MHA checkbox and radio primitives keep native semantics behind custom indicators", () => withMockDocument(() => {
  const checkboxValues = [];
  const checkbox = createMhaCheckbox({
    label: "Calendar",
    checked: false,
    onChange: checked => checkboxValues.push(checked),
  });
  const radio = createMhaRadio({
    label: "Dynamic",
    name: "surface",
    value: "dynamic",
    checked: true,
  });
  const checkboxInput = checkbox.querySelector(".mha-choice-input");
  const radioInput = radio.querySelector(".mha-choice-input");

  checkboxInput.checked = true;
  checkboxInput.listeners.change({ currentTarget: checkboxInput });

  assert.equal(checkboxInput.type, "checkbox");
  assert.equal(radioInput.type, "radio");
  assert.equal(radioInput.name, "surface");
  assert.equal(radioInput.value, "dynamic");
  assert.equal(radioInput.checked, true);
  assert.ok(checkbox.querySelector(".mha-choice-indicator"));
  assert.ok(radio.querySelector(".mha-choice-indicator"));
  assert.deepEqual(checkboxValues, [true]);
}));

test("settings panel exposes primary surface opacity only for OneUI", () => withMockDocument(() => {
  const values = [];
  const oneUiPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    themeStyle: "oneui",
    oneUiPrimarySurfaceOpacity: 42,
    onOneUiPrimarySurfaceOpacityChange: value => values.push(value),
  });
  const iosPanel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    themeStyle: "ios",
  });

  const slider = oneUiPanel.querySelector(".mha-settings-range-input");
  assert.ok(slider);
  assert.equal(slider.type, "range");
  assert.equal(slider.min, "0");
  assert.equal(slider.max, "100");
  assert.equal(slider.value, "42");
  assert.equal(hasText(oneUiPanel, "Widget opacity"), true);
  assert.equal(iosPanel.querySelector(".mha-settings-range-input"), null);

  slider.value = "0";
  slider.listeners.input();
  assert.deepEqual(values, [0]);
  assert.equal(oneUiPanel.querySelector(".mha-settings-range-value").textContent, "0%");
}));

test("OneUI opacity preview hides panel layers only while the slider is armed", () => withMockDocument(() => {
  const values = [];
  const panel = createSettingsPanel({
    open: true,
    scope: "all",
    settingsPage: "main",
    themeStyle: "oneui",
    onOneUiPrimarySurfaceOpacityChange: value => values.push(value),
  });
  const slider = panel.querySelector(".mha-settings-range-input");
  const host = createMockNode("mha-control-hub");
  slider.getRootNode = () => ({ host });

  slider.listeners.pointerdown({ button: 0, pointerId: 7 });
  assert.equal(panel.classList.contains("is-oneui-opacity-previewing"), true);
  assert.equal(host.classList.contains("is-oneui-opacity-previewing"), true);

  slider.value = "31";
  slider.listeners.input();
  assert.deepEqual(values, [31]);
  assert.equal(panel.classList.contains("is-oneui-opacity-previewing"), true);

  slider.listeners.pointerup({ pointerId: 7 });
  assert.equal(panel.classList.contains("is-oneui-opacity-previewing"), false);
  assert.equal(host.classList.contains("is-oneui-opacity-previewing"), false);
}));
