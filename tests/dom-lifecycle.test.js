import test from "node:test";
import assert from "node:assert/strict";
import { destroyDomSubtree } from "../src/core/dom-lifecycle.js";

test("DOM cleanup runs children before parents and remains idempotent", () => {
  const calls = [];
  const child = { __mhaDestroy: () => calls.push("child") };
  const parent = {
    __mhaDestroy: () => calls.push("parent"),
    querySelectorAll: () => [child],
  };

  destroyDomSubtree(parent);
  destroyDomSubtree(parent);

  assert.deepEqual(calls, ["child", "parent"]);
  assert.equal("__mhaDestroy" in child, false);
  assert.equal("__mhaDestroy" in parent, false);
});
