import test from "node:test";
import assert from "node:assert/strict";
import {
  createDockProps,
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
      assert.equal(selector, ".mha-dock-item, .mha-mobile-dock-item, .mha-dock-spacer, .mha-mobile-dock-spacer");
      return dockItems;
    },
    replaceWith() {
      replaceCalls.push("dock");
    },
  };
  const mobileDock = {
    querySelectorAll(selector) {
      assert.equal(selector, ".mha-dock-item, .mha-mobile-dock-item, .mha-dock-spacer, .mha-mobile-dock-spacer");
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
