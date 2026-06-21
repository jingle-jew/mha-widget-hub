import assert from "node:assert/strict";
import test from "node:test";

import { selectPage } from "../src/pages/page-controller.js";

const pages = [
  { id: "home" },
  { id: "media" },
];

test("selectPage rejects empty, current, and unknown page ids", () => {
  assert.equal(selectPage(pages, "home", ""), null);
  assert.equal(selectPage(pages, "home", "home"), null);
  assert.equal(selectPage(pages, "home", "missing"), null);
});

test("selectPage returns the requested active page id", () => {
  assert.deepEqual(selectPage(pages, "home", "media"), {
    activePageId: "media",
  });
});
