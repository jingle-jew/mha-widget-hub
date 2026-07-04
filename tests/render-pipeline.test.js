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
  const element = {
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
    parentNode: null,
    style: createMockStyle(),
    classList: createMockClassList(),
    append(...nodes) {
      nodes.forEach((node) => {
        if (!node) return;
        node.parentNode = this;
        this.appended.push(node);
      });
    },
    appendChild(node) {
      node.parentNode = this;
      this.appended.push(node);
      return node;
    },
    replaceChildren(...nodes) {
      this.appended.forEach((node) => {
        if (node) node.parentNode = null;
      });
      this.appended = [];
      this.append(...nodes);
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name];
    },
    removeAttribute(name) {
      delete this.attributes[name];
      if (name === "src") delete this.src;
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      if (!selector.startsWith(".")) return null;
      const className = selector.slice(1);
      const queue = [...this.appended];
      while (queue.length) {
        const node = queue.shift();
        const classes = String(node?.className || "").split(/\s+/).filter(Boolean);
        if (classes.includes(className)) return node;
        if (Array.isArray(node?.appended)) queue.push(...node.appended);
      }
      return null;
    },
    remove() {
      if (!Array.isArray(this.parentNode?.appended)) return;
      const index = this.parentNode.appended.indexOf(this);
      if (index >= 0) this.parentNode.appended.splice(index, 1);
      if (Array.isArray(this.parentNode?.childNodes)) {
        const childIndex = this.parentNode.childNodes.indexOf(this);
        if (childIndex >= 0) this.parentNode.childNodes.splice(childIndex, 1);
      }
      this.parentNode = null;
    },
  };
  return element;
}

function createMockShadowRoot() {
  let markup = "";
  const root = {
    appended: [],
    childNodes: [],
    querySelector(selector) {
      if (!selector.startsWith(".")) return null;
      const className = selector.slice(1);
      const queue = [...this.appended];
      while (queue.length) {
        const node = queue.shift();
        const classes = String(node?.className || "").split(/\s+/).filter(Boolean);
        if (classes.includes(className)) return node;
        if (Array.isArray(node?.appended)) queue.push(...node.appended);
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === 'link[rel="stylesheet"]') {
        return this.appended.filter(node => node?.tag === "link" && node?.attributes?.rel === "stylesheet");
      }
      if (selector === "*") {
        const descendants = [];
        const queue = [...this.appended];
        while (queue.length) {
          const node = queue.shift();
          descendants.push(node);
          if (Array.isArray(node?.appended)) queue.push(...node.appended);
        }
        return descendants;
      }
      if (selector.startsWith(".")) {
        const className = selector.slice(1);
        const matches = [];
        const queue = [...this.appended];
        while (queue.length) {
          const node = queue.shift();
          const classes = String(node?.className || "").split(/\s+/).filter(Boolean);
          if (classes.includes(className)) matches.push(node);
          if (Array.isArray(node?.appended)) queue.push(...node.appended);
        }
        return matches;
      }
      return [];
    },
    append(...nodes) {
      nodes.forEach((node) => {
        if (!node) return;
        node.parentNode = this;
        this.appended.push(node);
        this.childNodes.push(node);
      });
    },
    removeChild(node) {
      const index = this.appended.indexOf(node);
      if (index >= 0) this.appended.splice(index, 1);
      const childIndex = this.childNodes.indexOf(node);
      if (childIndex >= 0) this.childNodes.splice(childIndex, 1);
      node.parentNode = null;
      return node;
    },
    get innerHTML() {
      return markup;
    },
    set innerHTML(value) {
      markup = value;
      this.appended = [];
      this.childNodes = [];
      const linkCount = (String(value).match(/<link /g) || []).length;
      for (let index = 0; index < linkCount; index += 1) {
        const link = createMockElement("link");
        link.setAttribute("rel", "stylesheet");
        link.sheet = {};
        link.parentNode = this;
        this.appended.push(link);
        this.childNodes.push(link);
      }
    },
  };
  return root;
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

test("style finalization schedules mobile dock overflow sync when styles are ready", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  let resolveLoad = null;
  const host = {
    _renderId: 9,
    _bootComplete: true,
    _stylesReadyRenderId: 0,
    _observeLayoutSize() {
      calls.push("observeLayout");
    },
    _scheduleMobileDockOverflowState() {
      calls.push("scheduleDockOverflow");
    },
    _scheduleIconSymbolRefresh() {
      calls.push("scheduleIcons");
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
    layout: "mobile",
    renderId: 9,
  });

  resolveLoad?.();
  await pending;

  assert.equal(host._stylesReadyRenderId, 9);
  assert.deepEqual(calls, [
    "observeLayout",
    "scheduleDockOverflow",
    "scheduleIcons",
  ]);
});

test("style finalization times out stalled stylesheets and falls back cleanly", async () => {
  const prototype = await loadHubPrototype();
  const calls = [];
  const host = {
    _renderId: 21,
    _bootComplete: false,
    _pendingDeferredUi: null,
    dataset: {},
    _handleStylesReady(detail) {
      calls.push(["handleStylesReady", detail]);
    },
    _handleStylesError(detail) {
      calls.push(["handleStylesError", detail.reason || detail.error?.message || ""]);
    },
    _finishBoot(detail) {
      calls.push(["finishBoot", detail]);
    },
  };
  host._handleStylesReady = (detail) => prototype._handleStylesReady.call(host, detail);
  host._handleStylesError = (detail) => prototype._handleStylesError.call(host, detail);

  await prototype._awaitStylesAndFinalizeRender.call(host, {
    links: [{
      sheet: null,
      addEventListener() {},
    }],
    layout: "desktop",
    renderId: 21,
    styleSettleTimeoutMs: 0,
  });

  assert.deepEqual(host._pendingDeferredUi, { layout: "desktop", renderId: 21 });
  assert.deepEqual(calls, [[
    "finishBoot",
    { fallback: true, reason: "stylesheet initialization failed" },
  ]]);
});

test("mountRenderShell preserves the existing background node across rerenders", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const shadowRoot = createMockShadowRoot();
  const preservedBackground = createMockElement("div");
  let backgroundRemoveCalls = 0;
  preservedBackground.className = "mha-background";
  const originalRemove = preservedBackground.remove.bind(preservedBackground);
  preservedBackground.remove = () => {
    backgroundRemoveCalls += 1;
    originalRemove();
  };
  const wallpaper = createMockElement("img");
  wallpaper.className = "mha-background-wallpaper";
  preservedBackground.append(wallpaper);
  shadowRoot.append(preservedBackground);

  const host = {
    shadowRoot,
    dataset: {
      wallpaperKind: "image",
      wallpaperSource: "theme",
    },
    style: {
      getPropertyValue(name) {
        return name === "--mha-active-wallpaper-background" ? "" : "";
      },
    },
    _activeWallpaper: {
      kind: "image",
      source: "theme",
      renderValue: "/wallpapers/animated.webp",
    },
    _getDockProps() {
      return { usesDock: true };
    },
  };

  const first = prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const firstBackground = shadowRoot.querySelector(".mha-background");

  const second = prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const secondBackground = shadowRoot.querySelector(".mha-background");

  assert.equal(first.pageStage?.className, "mha-page-stage");
  assert.equal(second.pageStage?.className, "mha-page-stage");
  assert.equal(firstBackground, preservedBackground);
  assert.equal(secondBackground, preservedBackground);
  assert.equal(shadowRoot.appended.filter(node => node?.className === "mha-background").length, 1);
  assert.equal(wallpaper.src, "/wallpapers/animated.webp");
  assert.equal(backgroundRemoveCalls, 0);

  globalThis.document = previousDocument;
});

test("mountRenderShell does not reassign the same wallpaper src on rerender", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;
  let srcAssignments = 0;

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      const element = createMockElement(tag);
      if (tag === "img") {
        Object.defineProperty(element, "src", {
          get() {
            return this._src || "";
          },
          set(value) {
            this._src = value;
            this.attributes.src = value;
            srcAssignments += 1;
          },
          configurable: true,
        });
      }
      return element;
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const shadowRoot = createMockShadowRoot();
  const host = {
    shadowRoot,
    dataset: {
      wallpaperKind: "image",
      wallpaperSource: "theme",
    },
    style: {
      getPropertyValue() {
        return "";
      },
    },
    _activeWallpaper: {
      kind: "image",
      source: "theme",
      renderValue: "/wallpapers/animated.webp",
    },
    _getDockProps() {
      return { usesDock: true };
    },
  };

  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });

  assert.equal(srcAssignments, 1);

  globalThis.document = previousDocument;
});

test("mountRenderShell reuses the background node while updating wallpaper src changes", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;
  let srcAssignments = 0;

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      const element = createMockElement(tag);
      if (tag === "img") {
        Object.defineProperty(element, "src", {
          get() {
            return this._src || "";
          },
          set(value) {
            this._src = value;
            this.attributes.src = value;
            srcAssignments += 1;
          },
          configurable: true,
        });
      }
      return element;
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const shadowRoot = createMockShadowRoot();
  const host = {
    shadowRoot,
    dataset: {
      wallpaperKind: "image",
      wallpaperSource: "theme",
    },
    style: {
      getPropertyValue() {
        return "";
      },
    },
    _activeWallpaper: {
      kind: "image",
      source: "theme",
      renderValue: "/wallpapers/animated-a.webp",
    },
    _getDockProps() {
      return { usesDock: true };
    },
  };

  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const firstBackground = shadowRoot.querySelector(".mha-background");

  host._activeWallpaper = {
    kind: "image",
    source: "theme",
    renderValue: "/wallpapers/animated-b.webp",
  };
  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const secondBackground = shadowRoot.querySelector(".mha-background");
  const wallpaper = secondBackground.querySelector(".mha-background-wallpaper");

  assert.equal(firstBackground, secondBackground);
  assert.equal(wallpaper.src, "/wallpapers/animated-b.webp");
  assert.equal(srcAssignments, 2);

  globalThis.document = previousDocument;
});

test("mountRenderShell keeps a persistent background while updating css wallpaper styles", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const shadowRoot = createMockShadowRoot();
  let activeBackground = "linear-gradient(red, blue)";
  const host = {
    shadowRoot,
    dataset: {
      wallpaperKind: "css",
      wallpaperSource: "theme",
    },
    style: {
      getPropertyValue(name) {
        return name === "--mha-active-wallpaper-background" ? activeBackground : "";
      },
    },
    _activeWallpaper: {
      kind: "css",
      source: "theme",
      renderValue: "",
    },
    _getDockProps() {
      return { usesDock: true };
    },
  };

  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const firstBackground = shadowRoot.querySelector(".mha-background");
  assert.equal(firstBackground.style.background, "linear-gradient(red, blue)");

  activeBackground = "linear-gradient(green, black)";
  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  const secondBackground = shadowRoot.querySelector(".mha-background");

  assert.equal(firstBackground, secondBackground);
  assert.equal(secondBackground.style.background, "linear-gradient(green, black)");

  globalThis.document = previousDocument;
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
    _clearTouchEditLongPress() {
      this.touchEditClears = (this.touchEditClears || 0) + 1;
    },
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
  assert.equal(host.touchEditClears, 1);

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

test("render datasets include the persisted dock label visibility state", async () => {
  const prototype = await loadHubPrototype();
  const host = {
    _dockPosition: "bottom",
    _isEditing: false,
    _showDockLabels: true,
    _statusBarMode: "hidden",
    dataset: {},
    style: createMockStyle(),
    classList: {
      toggle() {},
    },
  };

  prototype._applyRenderDatasetsAndRuntimeVars.call(host, {
    themeStyle: "material",
    iconShapeSetting: "auto",
    iconShape: "circle",
    layoutMode: "default",
    layout: "tablet",
    preset: { density: "comfortable" },
    units: 4,
    rows: 8,
    cols: 4,
    logicalRows: 4,
    accent: "sky",
    statusBarMode: "hidden",
  });

  assert.equal(host.dataset.dockLabels, "true");
  assert.equal(host.dataset.dockPosition, "bottom");
  assert.equal(host.dataset.statusBarMode, "hidden");
  assert.equal(host.dataset.themeStyle, "material");
});

test("host grid metrics prefer published runtime sizes and include the available content rect", async () => {
  const prototype = await loadHubPrototype();
  const previousComputedStyle = globalThis.getComputedStyle;
  globalThis.getComputedStyle = () => ({
    getPropertyValue(name) {
      if (name === "--mha-grid-column-size") return "48px";
      if (name === "--mha-grid-row-size") return "64px";
      return "";
    },
    gridTemplateColumns: "48px 48px 48px",
    gridAutoRows: "64px",
    columnGap: "12px",
    gap: "12px",
  });

  const host = {
    style: {
      getPropertyValue(name) {
        if (name === "--mha-grid-column-size") return "72px";
        if (name === "--mha-grid-row-size") return "84px";
        return "";
      },
    },
    shadowRoot: {
      querySelector(selector) {
        return selector === ".mha-grid" ? {} : null;
      },
    },
    _getAvailableContentRect() {
      return { x: 10, y: 20, width: 300, height: 400 };
    },
  };

  try {
    assert.deepEqual(prototype._getGridMetrics.call(host), {
      columnStep: 84,
      rowStep: 96,
      columnSize: 72,
      rowSize: 84,
      gap: 12,
      availableContentRect: { x: 10, y: 20, width: 300, height: 400 },
    });
  } finally {
    globalThis.getComputedStyle = previousComputedStyle;
  }
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
    _wireTouchEditLongPress(grid) {
      calls.push(["wireTouchEditLongPress", grid?.className || ""]);
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

  assert.deepEqual(calls, [
    "wireDockAutoHide",
    ["wireTouchEditLongPress", "mha-grid"],
    "updateStatusDom",
  ]);
  assert.equal(pageStage.appended.length, 1);
  globalThis.document = previousDocument;
});

test("deferred UI rebuilds settings through syncSettingsDom instead of appending raw panels", async () => {
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

  const shadowRoot = createMockShadowRoot();
  const host = {
    isConnected: true,
    _renderId: 17,
    shadowRoot,
    _screensaverCoordinator: {
      createDomElement() {
        const el = createMockElement("div");
        el.className = "mha-screensaver";
        return el;
      },
    },
    _syncSettingsDom() {
      calls.push("syncSettingsDom");
      const panel = createMockElement("section");
      panel.className = "mha-settings-panel";
      shadowRoot.append(panel);
    },
    _getSettingsPanelsProps() {
      throw new Error("appendDeferredUi should not build raw settings panels directly");
    },
    _widgetManagerOpen: false,
    _widgetManagerCategory: "",
    _getWidgetManagerCategories() {
      return [];
    },
    _closeWidgetManager() {},
    _showWidgetManagerCategories() {},
    _selectWidgetManagerCategory() {},
    _beginWidgetPlacement() {},
    _pageUiCoordinator: {
      buildPageCreatorProps() {
        return {};
      },
    },
    _buildMediaPageSettingsProps() {
      return {};
    },
    _widgetConfigSession: null,
    _hass: { states: {} },
    _entityVisibilityConfig: null,
    _closeWidgetConfig() {},
    _saveWidgetConfig() {},
    _syncWidgetConfigDom() {},
    _syncEditModeDom() {
      calls.push("syncEditModeDom");
    },
    _syncScreensaverVisibilityState() {
      calls.push("syncScreensaverVisibilityState");
    },
    _scheduleIconSymbolRefresh() {
      calls.push("scheduleIconSymbolRefresh");
    },
  };

  prototype._appendDeferredUi.call(host, {
    layout: "mobile",
    renderId: 17,
  });
  await new Promise(resolve => setTimeout(resolve, 0));

  assert.deepEqual(calls, [
    "syncSettingsDom",
    "syncEditModeDom",
    "syncScreensaverVisibilityState",
    "scheduleIconSymbolRefresh",
  ]);
  assert.equal(
    shadowRoot.appended.filter(node => node?.className === "mha-settings-panel").length,
    1,
  );

  globalThis.document = previousDocument;
});

test("deferred UI restores settings panel scroll state after a full rerender", async () => {
  const prototype = await loadHubPrototype();
  const previousDocument = globalThis.document;

  globalThis.document = {
    ...globalThis.document,
    createElement(tag) {
      return createMockElement(tag);
    },
    createElementNS(namespace, tag) {
      return createMockElement(tag, namespace);
    },
  };

  const shadowRoot = createMockShadowRoot();
  const existingBody = createMockElement("div");
  existingBody.className = "mha-settings-body";
  existingBody.scrollTop = 210;
  const existingPanel = createMockElement("section");
  existingPanel.className = "mha-settings-panel";
  existingPanel.dataset.settingsScope = "all";
  existingPanel.dataset.settingsPage = "main";
  existingPanel.append(existingBody);
  shadowRoot.append(existingPanel);

  const host = {
    isConnected: true,
    _renderId: 21,
    shadowRoot,
    dataset: {
      wallpaperKind: "image",
      wallpaperSource: "theme",
    },
    style: {
      getPropertyValue() {
        return "";
      },
    },
    _activeWallpaper: {
      kind: "image",
      source: "theme",
      renderValue: "",
    },
    _screensaverCoordinator: {
      createDomElement() {
        return createMockElement("div");
      },
    },
    _getDockProps() {
      return { usesDock: true };
    },
    _getWidgetManagerCategories() {
      return [];
    },
    _closeWidgetManager() {},
    _showWidgetManagerCategories() {},
    _selectWidgetManagerCategory() {},
    _beginWidgetPlacement() {},
    _pageUiCoordinator: {
      buildPageCreatorProps() {
        return {};
      },
    },
    _buildMediaPageSettingsProps() {
      return {};
    },
    _widgetManagerOpen: false,
    _widgetManagerCategory: "",
    _widgetConfigSession: null,
    _hass: { states: {} },
    _entityVisibilityConfig: null,
    _closeWidgetConfig() {},
    _saveWidgetConfig() {},
    _syncWidgetConfigDom() {},
    _syncEditModeDom() {},
    _syncScreensaverVisibilityState() {},
    _scheduleIconSymbolRefresh() {},
    _syncSettingsDom() {
      const nextBody = createMockElement("div");
      nextBody.className = "mha-settings-body";
      nextBody.scrollTop = 0;
      const nextPanel = createMockElement("section");
      nextPanel.className = "mha-settings-panel";
      nextPanel.dataset.settingsScope = "all";
      nextPanel.dataset.settingsPage = "main";
      nextPanel.append(nextBody);
      shadowRoot.append(nextPanel);
    },
  };

  prototype._mountRenderShell.call(host, {
    layoutMode: "auto",
    layout: "tablet",
    cols: 4,
    units: 8,
  });
  prototype._appendDeferredUi.call(host, {
    layout: "tablet",
    renderId: 21,
  });
  await new Promise(resolve => setTimeout(resolve, 0));

  const restoredPanel = shadowRoot.appended.find(node => node?.className === "mha-settings-panel");
  assert.equal(restoredPanel?.querySelector?.(".mha-settings-body")?.scrollTop, 210);

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
