import assert from "node:assert/strict";
import test from "node:test";

import { scheduleIconSymbolRefresh } from "../src/core/icon-symbol-refresh-scheduler.js";

function createRoot(symbolCount = 1) {
  const symbols = Array.from({ length: symbolCount }, () => ({
    style: { transform: "" },
    getBoundingClientRect() {
      return {};
    },
  }));

  return {
    symbols,
    querySelectorAll(selector) {
      assert.equal(selector, ".mha-icon-symbol");
      return symbols;
    },
  };
}

test("scheduleIconSymbolRefresh cancels the previous frame and refreshes connected roots", () => {
  const cancelledFrames = [];
  const scheduledCallbacks = [];
  const host = {
    isConnected: true,
    shadowRoot: createRoot(2),
    _iconSymbolRefreshFrame: 12,
  };

  const frameId = scheduleIconSymbolRefresh(host, {
    cancelAnimationFrameRef(frameIdToCancel) {
      cancelledFrames.push(frameIdToCancel);
    },
    requestAnimationFrameRef(callback) {
      scheduledCallbacks.push(callback);
      return 34;
    },
  });

  assert.equal(frameId, 34);
  assert.equal(host._iconSymbolRefreshFrame, 34);
  assert.deepEqual(cancelledFrames, [12]);

  scheduledCallbacks[0]();

  assert.equal(host._iconSymbolRefreshFrame, 0);
  assert.deepEqual(
    host.shadowRoot.symbols.map(symbol => symbol.style.transform),
    ["", ""],
  );
});

test("scheduleIconSymbolRefresh preserves the pending frame when the host is disconnected", () => {
  const scheduledCallbacks = [];
  const host = {
    isConnected: false,
    shadowRoot: createRoot(1),
    _iconSymbolRefreshFrame: 0,
  };

  scheduleIconSymbolRefresh(host, {
    cancelAnimationFrameRef() {},
    requestAnimationFrameRef(callback) {
      scheduledCallbacks.push(callback);
      return 56;
    },
  });

  scheduledCallbacks[0]();

  assert.equal(host._iconSymbolRefreshFrame, 56);
});
