import assert from "node:assert/strict";
import test from "node:test";

import {
  changePageIcon,
  renamePage,
} from "../src/pages/page-controller.js";

const pages = [
  { id: "home", name: "Home", icon: "home" },
  { id: "media", name: "Media", icon: "media" },
];

test("renamePage trims non-empty names and rejects blank names", () => {
  assert.equal(renamePage(pages, "media", "   "), null);

  const result = renamePage(pages, "media", "  Music  ");

  assert.equal(result.name, "Music");
  assert.equal(result.pages.find(page => page.id === "media").name, "Music");
});

test("renamePage documents the current unknown-page no-op result", () => {
  const result = renamePage(pages, "missing", "Ghost");

  assert.equal(result.name, "Ghost");
  assert.deepEqual(result.pages, pages);
});

test("changePageIcon normalizes empty icons", () => {
  const result = changePageIcon(pages, "media", "");

  assert.equal(result.icon, "grid");
  assert.equal(result.pages.find(page => page.id === "media").icon, "grid");
});

test("changePageIcon documents the current unknown-page no-op result", () => {
  const result = changePageIcon(pages, "missing", "star");

  assert.equal(result.icon, "star");
  assert.deepEqual(result.pages, pages);
});
