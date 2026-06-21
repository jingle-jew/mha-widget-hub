import assert from "node:assert/strict";
import test from "node:test";

import { movePage } from "../src/pages/page-controller.js";

const pages = [
  { id: "home" },
  { id: "media" },
  { id: "lights" },
];

test("movePage rejects unknown and out-of-range moves", () => {
  assert.equal(movePage(pages, "missing", 1), null);
  assert.equal(movePage(pages, "home", -1), null);
  assert.equal(movePage(pages, "lights", 1), null);
});

test("movePage moves pages forward and backward", () => {
  assert.deepEqual(
    movePage(pages, "media", 1).pages.map(page => page.id),
    ["home", "lights", "media"],
  );
  assert.deepEqual(
    movePage(pages, "media", -1).pages.map(page => page.id),
    ["media", "home", "lights"],
  );
});
