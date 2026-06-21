import assert from "node:assert/strict";
import test from "node:test";

import { refreshIconSymbols } from "../src/core/icon-symbol-refresh.js";

function createSymbol() {
  const calls = [];
  return {
    style: { transform: "" },
    calls,
    getBoundingClientRect() {
      calls.push("measure");
      return {};
    },
  };
}

test("refreshIconSymbols repaints matching icon symbols", () => {
  const first = createSymbol();
  const second = createSymbol();
  const queriedSelectors = [];
  const root = {
    querySelectorAll(selector) {
      queriedSelectors.push(selector);
      return [first, second];
    },
  };

  const count = refreshIconSymbols(root);

  assert.equal(count, 2);
  assert.deepEqual(queriedSelectors, [".mha-icon-symbol"]);
  assert.equal(first.style.transform, "");
  assert.equal(second.style.transform, "");
  assert.deepEqual(first.calls, ["measure"]);
  assert.deepEqual(second.calls, ["measure"]);
});

test("refreshIconSymbols ignores missing roots", () => {
  assert.equal(refreshIconSymbols(null), 0);
  assert.equal(refreshIconSymbols({}), 0);
});
