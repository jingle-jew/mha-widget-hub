import test from "node:test";
import assert from "node:assert/strict";
import {
  DOCK_STRUCTURE_ITEM_SELECTOR,
  MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR,
  buildDockStructureSignature,
  buildDockStructureSignatureFromDom,
  buildDockStructureSignatureFromProps,
  captureDockRenderState,
  createDockProps,
  restoreDockRenderState,
  syncDockActiveState,
  syncDocks,
} from "../src/layout/dock-controller.js";

test("dock props preserve state and callback identities", () => {
  const pages = [{ id: "home" }];
  const onPageSelect = () => {};
  const props = createDockProps({
    pages,
    activePageId: "home",
    isEditing: true,
    themeStyle: "material",
    usesDock: false,
    contentBuilder: "default",
    onPageSelect,
  });

  assert.equal(props.pages, pages);
  assert.equal(props.activePageId, "home");
  assert.equal(props.isEditing, true);
  assert.equal(props.themeStyle, "material");
  assert.equal(props.usesDock, false);
  assert.equal(props.contentBuilder, "default");
  assert.equal(props.onPageSelect, onPageSelect);
});

test("dock active-state sync updates every page button", () => {
  const buttons = ["home", "lights"].map(pageId => ({
    dataset: { pageId },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  }));
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, "[data-page-id]");
      return buttons;
    },
  };

  syncDockActiveState(root, "lights");

  assert.deepEqual(
    buttons.map(button => ({
      active: button.dataset.active,
      current: button.attributes["aria-current"],
    })),
    [
      { active: "false", current: "false" },
      { active: "true", current: "page" },
    ],
  );
});

test("dock structure signature serializes resolved dock items", () => {
  assert.equal(buildDockStructureSignature([
    { type: "page", action: "page", pageId: "home", symbol: "home" },
    { type: "action", action: "settings", symbol: "gear" },
  ]), "page:page:home:home|action:settings::gear");
});

test("dock structure signature uses the same selector contract for desktop and mobile docks", () => {
  const selectors = [];
  const desktopDock = {
    querySelectorAll(selector) {
      selectors.push(selector);
      return [
        {
          dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
          querySelector() {
            return { dataset: { icon: "home" } };
          },
        },
        {
          dataset: { dockItemType: "action", dockAction: "settings" },
          querySelector() {
            return { dataset: { icon: "gear" } };
          },
        },
      ];
    },
  };
  const mobileDock = {
    querySelectorAll(selector) {
      selectors.push(selector);
      return [
        {
          dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
          querySelector() {
            return { dataset: { icon: "home" } };
          },
        },
        {
          dataset: { dockItemType: "action", dockAction: "settings" },
          querySelector() {
            return { dataset: { icon: "gear" } };
          },
        },
      ];
    },
  };

  assert.equal(
    buildDockStructureSignatureFromDom(desktopDock, DOCK_STRUCTURE_ITEM_SELECTOR),
    buildDockStructureSignatureFromDom(mobileDock, MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR),
  );
  assert.deepEqual(selectors, [
    DOCK_STRUCTURE_ITEM_SELECTOR,
    MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR,
  ]);
});

test("dock structure signature from props matches the current dock item contract", () => {
  assert.equal(buildDockStructureSignatureFromProps({
    pages: [
      { id: "home", name: "Home", icon: "home" },
      { id: "lights", name: "Lights", icon: "light" },
    ],
    isEditing: true,
  }), "page:page:home:home|page:page:lights:light|action:settings::gear|action:add-page::plus|action:dock-settings::edit");
});

test("captureDockRenderState keeps dock signatures and mobile paging state", () => {
  const desktopDock = {
    querySelectorAll(selector) {
      assert.equal(selector, DOCK_STRUCTURE_ITEM_SELECTOR);
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
  };
  const mobileDock = {
    scrollLeft: 640,
    clientWidth: 320,
    classList: {
      contains(token) {
        assert.equal(token, "is-paged");
        return true;
      },
    },
    querySelectorAll(selector) {
      assert.equal(selector, MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR);
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-dock") return desktopDock;
      if (selector === ".mha-mobile-dock") return mobileDock;
      return null;
    },
  };

  assert.deepEqual(captureDockRenderState(root), {
    dock: desktopDock,
    dockSignature: "page:page:home:home",
    mobileDock,
    mobileDockSignature: "page:page:home:home",
    mobileDockScrollLeft: 640,
    mobileDockPageIndex: 2,
  });
});

test("restoreDockRenderState preserves desktop and mobile dock DOM when signatures match", () => {
  const calls = [];
  const currentDock = {
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
  };
  const currentMobileDock = {
    scrollLeft: 640,
    clientWidth: 320,
    classList: {
      contains() {
        return true;
      },
    },
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
  };
  const nextDock = {
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
    replaceWith(node) {
      calls.push(["replaceDock", node]);
      rootState.dock = node;
    },
  };
  const nextMobileDock = {
    scrollLeft: 0,
    clientWidth: 320,
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
    replaceWith(node) {
      calls.push(["replaceMobileDock", node]);
      rootState.mobileDock = node;
    },
  };
  const rootState = {
    dock: nextDock,
    mobileDock: nextMobileDock,
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-dock") return rootState.dock;
      if (selector === ".mha-mobile-dock") return rootState.mobileDock;
      return null;
    },
  };

  const result = restoreDockRenderState(root, {
    dock: currentDock,
    dockSignature: "page:page:home:home",
    mobileDock: currentMobileDock,
    mobileDockSignature: "page:page:home:home",
    mobileDockScrollLeft: 640,
    mobileDockPageIndex: 2,
  }, {
    scheduleMobileDockOverflowState() {
      calls.push("scheduleOverflow");
    },
    updateDockActiveState() {
      calls.push("updateActive");
    },
    requestFrame(callback) {
      calls.push("requestFrame");
      callback();
      return 1;
    },
  });

  assert.deepEqual(result, {
    desktopPreserved: true,
    mobilePreserved: true,
  });
  assert.deepEqual(calls, [
    ["replaceDock", currentDock],
    ["replaceMobileDock", currentMobileDock],
    "scheduleOverflow",
    "updateActive",
    "requestFrame",
  ]);
  assert.equal(rootState.mobileDock, currentMobileDock);
  assert.equal(currentMobileDock.scrollLeft, 640);
});

test("restoreDockRenderState skips DOM preservation when the structure changes but still restores mobile paging", () => {
  const calls = [];
  const currentMobileDock = {
    scrollLeft: 320,
    clientWidth: 320,
    classList: {
      contains() {
        return true;
      },
    },
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
        querySelector() {
          return { dataset: { icon: "home" } };
        },
      }];
    },
  };
  const nextMobileDock = {
    scrollLeft: 0,
    clientWidth: 320,
    querySelectorAll() {
      return [{
        dataset: { dockItemType: "page", dockAction: "page", pageId: "lights" },
        querySelector() {
          return { dataset: { icon: "light" } };
        },
      }];
    },
    replaceWith() {
      throw new Error("mobile dock should not be preserved when the signature changes");
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-mobile-dock") return nextMobileDock;
      return null;
    },
  };

  const result = restoreDockRenderState(root, {
    mobileDock: currentMobileDock,
    mobileDockSignature: "page:page:home:home",
    mobileDockScrollLeft: 320,
    mobileDockPageIndex: 1,
  }, {
    scheduleMobileDockOverflowState() {
      calls.push("scheduleOverflow");
    },
    updateDockActiveState() {
      calls.push("updateActive");
    },
    requestFrame(callback) {
      calls.push("requestFrame");
      callback();
      return 1;
    },
  });

  assert.deepEqual(result, {
    desktopPreserved: false,
    mobilePreserved: false,
  });
  assert.deepEqual(calls, [
    "updateActive",
    "requestFrame",
  ]);
  assert.equal(nextMobileDock.scrollLeft, 320);
});

test("syncDocks removes existing dock DOM when the theme disables docks", () => {
  const removed = [];
  const dock = {
    remove() {
      removed.push("dock");
    },
  };
  const mobileDock = {
    remove() {
      removed.push("mobile");
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-dock") return dock;
      if (selector === ".mha-mobile-dock") return mobileDock;
      return null;
    },
    querySelectorAll() {
      throw new Error("disabled docks should not sync active state");
    },
  };

  const result = syncDocks(root, { usesDock: false });

  assert.equal(result, true);
  assert.deepEqual(removed, ["dock", "mobile"]);
});

test("syncDocks preserves existing dock DOM when only active page changes", () => {
  const replaceCalls = [];
  const dockItems = [
    {
      dataset: { dockItemType: "page", dockAction: "page", pageId: "home" },
      querySelector(selector) {
        assert.equal(selector, ".mha-icon");
        return { dataset: { icon: "home" } };
      },
    },
    {
      dataset: { dockItemType: "page", dockAction: "page", pageId: "lights" },
      querySelector(selector) {
        assert.equal(selector, ".mha-icon");
        return { dataset: { icon: "lightbulb" } };
      },
    },
    {
      dataset: { dockItemType: "action", dockAction: "settings" },
      querySelector(selector) {
        assert.equal(selector, ".mha-icon");
        return { dataset: { icon: "gear" } };
      },
    },
  ];
  const buttons = ["home", "lights"].map(pageId => ({
    dataset: { pageId },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  }));
  const dock = {
    querySelectorAll(selector) {
      assert.equal(selector, ".mha-dock-item, .mha-dock-spacer, .mha-mobile-dock-item, .mha-mobile-dock-spacer");
      return dockItems;
    },
    replaceWith() {
      replaceCalls.push("dock");
    },
  };
  const mobileDock = {
    querySelectorAll(selector) {
      assert.equal(selector, ".mha-dock-item, .mha-dock-spacer, .mha-mobile-dock-item, .mha-mobile-dock-spacer");
      return dockItems;
    },
    replaceWith() {
      replaceCalls.push("mobile");
    },
  };
  const root = {
    querySelector(selector) {
      if (selector === ".mha-dock") return dock;
      if (selector === ".mha-mobile-dock") return mobileDock;
      return null;
    },
    querySelectorAll(selector) {
      assert.equal(selector, "[data-page-id]");
      return buttons;
    },
  };

  const result = syncDocks(root, {
    pages: [
      { id: "home", icon: "home" },
      { id: "lights", icon: "lightbulb" },
    ],
    activePageId: "lights",
    isEditing: false,
  });

  assert.equal(result, true);
  assert.deepEqual(replaceCalls, []);
  assert.equal(buttons[1].dataset.active, "true");
});
