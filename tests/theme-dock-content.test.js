import assert from "node:assert/strict";
import test from "node:test";

import {
  getDefaultThemeDockItems,
  getThemeDockItems,
} from "../src/settings/theme-dock-content.js";

test("theme dock content manifests keep the current default dock structure", () => {
  assert.deepEqual(getDefaultThemeDockItems(), [
    { type: "pages" },
    { type: "edit-actions" },
    {
      type: "action",
      action: "settings",
      symbol: "gear",
      category: "system",
      labelKey: "settings",
    },
  ]);
});

test("registered themes resolve dock content through the manifest layer", () => {
  const defaultItems = getDefaultThemeDockItems();

  assert.equal(getThemeDockItems("ios"), defaultItems);
  assert.equal(getThemeDockItems("oneui"), defaultItems);
  assert.equal(getThemeDockItems("material"), defaultItems);
  assert.equal(getThemeDockItems("alexa"), defaultItems);
  assert.equal(getThemeDockItems("unknown"), defaultItems);
});
