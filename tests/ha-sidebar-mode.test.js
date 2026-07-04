import assert from "node:assert/strict";
import test from "node:test";

import {
  scheduleHaSidebarReservedWidthSync,
  syncHaSidebarReservedWidth,
} from "../src/core/ha-sidebar-mode.js";

function createSidebarDocument(sidebar) {
  return {
    querySelector(selector) {
      return selector === "ha-sidebar" ? sidebar : null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

test("syncHaSidebarReservedWidth applies the measured visible HA sidebar width", () => {
  const styleCalls = [];
  const sidebar = {
    getBoundingClientRect() {
      return { width: 312, height: 800 };
    },
  };
  const host = {
    style: {
      setProperty(name, value) {
        styleCalls.push([name, value]);
      },
    },
  };

  const width = syncHaSidebarReservedWidth(host, {
    enabled: false,
    documentRef: createSidebarDocument(sidebar),
    windowRef: {
      getComputedStyle() {
        return {
          display: "block",
          visibility: "visible",
        };
      },
    },
  });

  assert.equal(width, 312);
  assert.deepEqual(styleCalls, [
    ["--mha-ha-sidebar-reserved-inline-start", "312px"],
  ]);
});

test("scheduleHaSidebarReservedWidthSync remeasures after deferred HA layout updates", () => {
  const styleCalls = [];
  const frameCallbacks = [];
  const timeoutCallbacks = [];
  let measuredWidth = 0;
  const sidebar = {
    getBoundingClientRect() {
      return { width: measuredWidth, height: 800 };
    },
  };
  const host = {
    _haSidebarReservedWidthFrame: 0,
    _haSidebarReservedWidthTimeout: 0,
    style: {
      setProperty(name, value) {
        styleCalls.push([name, value]);
      },
    },
  };

  scheduleHaSidebarReservedWidthSync(host, {
    enabled: false,
    documentRef: createSidebarDocument(sidebar),
    windowRef: {
      getComputedStyle() {
        return {
          display: "block",
          visibility: "visible",
        };
      },
    },
    requestAnimationFrameRef(callback) {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    },
    cancelAnimationFrameRef() {},
    setTimeoutRef(callback) {
      timeoutCallbacks.push(callback);
      return timeoutCallbacks.length;
    },
    clearTimeoutRef() {},
    timeoutMs: 1,
  });

  measuredWidth = 284;
  frameCallbacks.shift()?.();
  assert.deepEqual(styleCalls, []);
  frameCallbacks.shift()?.();

  assert.deepEqual(styleCalls, [
    ["--mha-ha-sidebar-reserved-inline-start", "284px"],
  ]);

  measuredWidth = 296;
  timeoutCallbacks.shift()?.();

  assert.deepEqual(styleCalls, [
    ["--mha-ha-sidebar-reserved-inline-start", "284px"],
    ["--mha-ha-sidebar-reserved-inline-start", "296px"],
  ]);
});
