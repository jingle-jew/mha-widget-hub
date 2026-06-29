import assert from "node:assert/strict";
import test from "node:test";

let hubPrototypePromise = null;

function createMockClassList() {
  return {
    added: [],
    toggled: [],
    add(...tokens) {
      this.added.push(...tokens);
    },
    toggle(token, force) {
      this.toggled.push([token, force]);
    },
  };
}

function createMockStyle() {
  return {
    values: {},
    setProperty(name, value) {
      this.values[name] = value;
    },
    removeProperty(name) {
      delete this.values[name];
    },
  };
}

function createMockElement(tag = "div", namespace = null) {
  return {
    tag,
    namespace,
    className: "",
    type: "",
    hidden: false,
    textContent: "",
    innerHTML: "",
    onclick: null,
    disabled: false,
    dataset: {},
    attributes: {},
    appended: [],
    style: createMockStyle(),
    classList: createMockClassList(),
    append(...nodes) {
      this.appended.push(...nodes);
    },
    appendChild(node) {
      this.appended.push(node);
      return node;
    },
    replaceChildren(...nodes) {
      this.appended = [...nodes];
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector() {
      return null;
    },
    remove() {},
  };
}

async function loadHubPrototype() {
  if (hubPrototypePromise) return hubPrototypePromise;

  const registry = new Map();

  globalThis.HTMLElement = class {};
  globalThis.customElements = {
    define(name, ctor) {
      registry.set(name, ctor);
    },
  };
  globalThis.document = {
    documentElement: {
      dataset: {},
      classList: {
        toggle() {},
      },
    },
    getElementById() {
      return null;
    },
  };
  globalThis.window = {
    innerWidth: 1280,
    location: { pathname: "/lovelace/mha-widget-hub" },
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      };
    },
    addEventListener() {},
    removeEventListener() {},
    visualViewport: {
      addEventListener() {},
      removeEventListener() {},
    },
    dispatchEvent() {},
  };
  globalThis.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  globalThis.cancelAnimationFrame = () => {};
  globalThis.getComputedStyle = () => ({
    getPropertyValue() {
      return "";
    },
  });
  globalThis.localStorage = {
    getItem() {
      return null;
    },
    setItem() {},
    removeItem() {},
  };
  globalThis.CustomEvent = class {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  };

  hubPrototypePromise = import("../mha-widget-hub.js")
    .then(() => registry.get("mha-widget-hub").prototype);

  return hubPrototypePromise;
}

test("_ensureMounted rerenders when widget rendering was interrupted during loading", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  const host = {
    isConnected: true,
    dataset: { widgetsState: "loading" },
    _widgets: [{ id: "clock" }],
    _widgetRenderFrame: 0,
    _hasMountedApp() {
      calls.push("hasMountedApp");
      return true;
    },
    render() {
      calls.push("render");
    },
    _finishBoot() {
      calls.push("finishBoot");
    },
  };

  const result = prototype._ensureMounted.call(host, { reason: "test recovery" });

  assert.equal(result, true);
  assert.deepEqual(calls, ["hasMountedApp", "render"]);
});

test("style finalization keeps deferred UI pending until boot completes", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  let resolveLoad = null;
  const host = {
    _renderId: 7,
    _bootComplete: false,
    _stylesReadyRenderId: 0,
    _pendingDeferredUi: null,
    _observeLayoutSize() {
      calls.push("observeLayout");
    },
    _scheduleIconSymbolRefresh() {
      calls.push("scheduleIcons");
    },
    _appendDeferredUi(detail) {
      calls.push(["appendDeferredUi", detail]);
    },
    _tryCompleteBoot() {
      calls.push("tryCompleteBoot");
    },
    _finishBoot(detail) {
      calls.push(["finishBoot", detail]);
    },
  };
  host._handleStylesReady = (detail) => prototype._handleStylesReady.call(host, detail);
  host._handleStylesError = (detail) => prototype._handleStylesError.call(host, detail);
  const links = [{
    sheet: null,
    addEventListener(type, handler) {
      if (type === "load") resolveLoad = handler;
    },
  }];

  const pending = prototype._awaitStylesAndFinalizeRender.call(host, {
    links,
    layout: "tablet",
    renderId: 7,
  });

  resolveLoad?.();
  await pending;

  assert.equal(host._stylesReadyRenderId, 7);
  assert.deepEqual(host._pendingDeferredUi, { layout: "tablet", renderId: 7 });
  assert.deepEqual(calls, [
    "observeLayout",
    "scheduleIcons",
    "tryCompleteBoot",
  ]);
});

test("style finalization keeps the stylesheet fallback path intact", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  const host = {
    _renderId: 11,
    _bootComplete: false,
    _pendingDeferredUi: null,
    _appendDeferredUi(detail) {
      calls.push(["appendDeferredUi", detail]);
    },
    _finishBoot(detail) {
      calls.push(["finishBoot", detail]);
    },
  };
  host._handleStylesReady = (detail) => prototype._handleStylesReady.call(host, detail);
  host._handleStylesError = (detail) => prototype._handleStylesError.call(host, detail);
  const links = [{
    sheet: null,
    addEventListener() {
      throw new Error("stylesheet listener failure");
    },
  }];

  const previousWarn = console.warn;
  console.warn = () => {};
  try {
    await prototype._awaitStylesAndFinalizeRender.call(host, {
      links,
      layout: "desktop",
      renderId: 11,
    });
  } finally {
    console.warn = previousWarn;
  }

  assert.deepEqual(host._pendingDeferredUi, { layout: "desktop", renderId: 11 });
  assert.deepEqual(calls, [[
    "finishBoot",
    { fallback: true, reason: "stylesheet initialization failed" },
  ]]);
});

test("render helpers preserve widgetsState transitions from pending to loading to ready", async () => {
  const prototype = await loadHubPrototype();
  const scheduledFrames = [];
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const previousCancelAnimationFrame = globalThis.cancelAnimationFrame;
  globalThis.requestAnimationFrame = (callback) => {
    scheduledFrames.push(callback);
    return scheduledFrames.length;
  };
  globalThis.cancelAnimationFrame = () => {};

  const grid = {
    appended: [],
    dataset: {},
    placeholders: new Map(),
    append(node) {
      if (node?.isFragment) {
        node.childNodes.forEach((child) => this.append(child));
        return;
      }
      this.appended.push(node);
    },
    querySelector(selector) {
      const match = selector.match(/\[data-widget-placeholder-id="(.+)"\]/);
      return match ? this.placeholders.get(match[1]) || null : null;
    },
  };
  const host = {
    dataset: { layoutMode: "desktop" },
    style: createMockStyle(),
    classList: {
      toggle() {},
    },
    _hideHaSidebar: false,
    _widgetRenderFrame: 0,
    _secondaryUiFrame: 0,
    _stylesReadyRenderId: 9,
    _widgets: [{ id: "clock" }, { id: "weather" }],
    _renderId: 2,
    _applyCustomWallpaperState() {},
    _applyHaSidebarMode() {},
    _clearGridScrollListener() {},
    _createWidgetPlaceholder(widget) {
      const placeholder = {
        widgetId: widget.id,
        replaceWith(node) {
          grid.appended.push(node);
        },
      };
      grid.placeholders.set(widget.id, placeholder);
      return placeholder;
    },
    _createWidgetElement(widget) {
      return { widgetId: widget.id };
    },
    _scheduleSquareUnitSync() {
      this.squareSyncs = (this.squareSyncs || 0) + 1;
    },
    _scheduleHassUpdate() {
      this.hassSyncs = (this.hassSyncs || 0) + 1;
    },
    _syncWidgetDropSlots() {
      this.dropSlotSyncs = (this.dropSlotSyncs || 0) + 1;
    },
    _scheduleIconSymbolRefresh() {
      this.iconRefreshes = (this.iconRefreshes || 0) + 1;
    },
    isConnected: true,
    _renderId: 3,
  };

  prototype._prepareRenderCycle.call(host, { renderId: 4, themeState: {} });
  assert.equal(host.dataset.widgetsState, "pending");

  const previousDocument = globalThis.document;
  globalThis.document = {
    ...globalThis.document,
    createDocumentFragment() {
      return {
        isFragment: true,
        childNodes: [],
        append(node) {
          this.childNodes.push(node);
        },
      };
    },
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  prototype._appendWidgetPlaceholders.call(host, grid, {
    units: 4,
    positions: {},
  });
  assert.equal(host.dataset.widgetsState, "loading");

  prototype._startProgressiveWidgetRender.call(host, {
    grid,
    units: 4,
    positions: {},
    renderId: 4,
  });

  while (scheduledFrames.length) {
    const callback = scheduledFrames.shift();
    callback();
  }

  assert.equal(host.dataset.widgetsState, "ready");
  assert.equal(host.squareSyncs, 1);
  assert.equal(host.hassSyncs, 1);
  assert.equal(host.dropSlotSyncs, 1);
  assert.equal(host.iconRefreshes, 1);

  globalThis.document = previousDocument;
  globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  globalThis.cancelAnimationFrame = previousCancelAnimationFrame;
});

test("primary controls use host edit icon and widget-manager bridge callbacks", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;
  const calls = [];

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const host = {
    _isEditing: true,
    dataset: {},
    classList: {
      toggle() {},
    },
    shadowRoot: {
      appended: [],
      append(...nodes) {
        this.appended.push(...nodes);
      },
    },
    _getEditButtonIcon(editing) {
      calls.push(["icon", editing]);
      return "<svg>close</svg>";
    },
    toggleEditMode() {
      calls.push("toggleEditMode");
    },
    _openWidgetManager() {
      calls.push("openWidgetManager");
    },
  };

  prototype._appendPrimaryControls.call(host);
  const [editButton, addButton] = host.shadowRoot.appended;
  editButton.onclick?.();
  addButton.onclick?.({
    preventDefault() {},
    stopPropagation() {},
  });

  assert.equal(editButton.appended.length, 1);
  assert.equal(addButton.appended.length, 1);
  assert.equal(addButton.hidden, false);
  assert.deepEqual(calls, [
    "toggleEditMode",
    "openWidgetManager",
  ]);

  globalThis.document = previousDocument;
});

test("immediate UI delegates status updates through the host bridge", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;
  const calls = [];

  globalThis.document = {
    ...globalThis.document,
    createDocumentFragment() {
      return {
        isFragment: true,
        childNodes: [],
        append(node) {
          this.childNodes.push(node);
        },
      };
    },
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const pageStage = createMockElement("div");
  const host = {
    _widgets: [],
    _isEditing: false,
    dataset: {},
    classList: {
      toggle() {},
    },
    shadowRoot: {
      appended: [],
      append(...nodes) {
        this.appended.push(...nodes);
      },
    },
    _getActiveWidgetPositions() {
      return {};
    },
    _getEditButtonIcon() {
      return "<svg>edit</svg>";
    },
    toggleEditMode() {},
    _openWidgetManager() {},
    _wireDockAutoHide() {
      calls.push("wireDockAutoHide");
    },
    _updateStatusDom() {
      calls.push("updateStatusDom");
    },
    _getActivePage() {
      return { id: "home", type: "grid" };
    },
    _getActiveWidgetPositions() {
      return {};
    },
  };

  prototype._mountImmediateUi.call(host, {
    layout: "desktop",
    pageStage,
    units: 4,
  });

  assert.deepEqual(calls, ["wireDockAutoHide", "updateStatusDom"]);
  assert.equal(pageStage.appended.length, 1);
  globalThis.document = previousDocument;
});

test("widget config sync builds the panel props without relying on removed globals", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  const host = {
    shadowRoot: {},
    _widgetConfigSession: {
      mode: "create",
      configType: "button",
      widget: { id: "widget-1", kind: "button" },
      draft: {},
    },
    _hass: { states: {} },
    _entityVisibilityConfig: null,
    _closeWidgetConfig() {
      calls.push("cancel");
    },
    _saveWidgetConfig() {
      calls.push("save");
    },
    _syncWidgetConfigDom() {
      calls.push("rerender");
    },
  };

  const previousDocument = globalThis.document;
  globalThis.document = {
    ...globalThis.document,
    createElement() {
      return {
        ...createMockElement("div"),
        querySelector() {
          return {
            dataset: {},
            replaceChildren() {},
          };
        },
      };
    },
    createElementNS() {
      return createMockElement("svg", "http://www.w3.org/2000/svg");
    },
  };

  const previousAppend = host.shadowRoot.append;
  host.shadowRoot.append = () => {
    calls.push("append");
  };
  host.shadowRoot.querySelector = () => null;

  prototype._syncWidgetConfigDom.call(host);

  assert.deepEqual(calls, ["append"]);

  host.shadowRoot.append = previousAppend;
  globalThis.document = previousDocument;
});
