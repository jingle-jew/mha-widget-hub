import assert from "node:assert/strict";
import test from "node:test";

import { getEditButtonIcon } from "../src/core/edit-button-icon.js";

const ICONS = {
  close: "close-icon",
  edit: "edit-icon",
};

test("getEditButtonIcon returns edit when not editing", () => {
  assert.equal(getEditButtonIcon(ICONS, false), "edit-icon");
});

test("getEditButtonIcon returns close when editing", () => {
  assert.equal(getEditButtonIcon(ICONS, true), "close-icon");
});

test("getEditButtonIcon defaults to not editing", () => {
  assert.equal(getEditButtonIcon(ICONS), "edit-icon");
});
