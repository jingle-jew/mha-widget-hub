import test from "node:test";
import assert from "node:assert/strict";
import {
  createDockProps,
  syncDockActiveState,
} from "../src/layout/dock-controller.js";

test("dock props preserve state and callback identities", () => {
  const pages = [{ id: "home" }];
  const onPageSelect = () => {};
  const props = createDockProps({
    pages,
    activePageId: "home",
    isEditing: true,
    onPageSelect,
  });

  assert.equal(props.pages, pages);
  assert.equal(props.activePageId, "home");
  assert.equal(props.isEditing, true);
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
