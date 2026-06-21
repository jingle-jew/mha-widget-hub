import assert from "node:assert/strict";
import test from "node:test";

import {
  setScreensaverClockVariantState,
  toggleNowBarPreviewState,
  toggleScreensaverPreviewState,
} from "../src/screensaver/screensaver-preview-actions.js";

function createHost(state) {
  const calls = [];
  return {
    calls,
    _screensaverController: {
      read() {
        calls.push(["read"]);
        return state;
      },
      setPreviewState(value) {
        calls.push(["setPreviewState", value]);
      },
      setNowBarState(value) {
        calls.push(["setNowBarState", value]);
      },
      setClockVariantState(value) {
        calls.push(["setClockVariantState", value]);
      },
    },
    _syncScreensaverDom() {
      calls.push(["syncScreensaverDom"]);
    },
  };
}

test("toggleScreensaverPreviewState flips preview and syncs screensaver DOM", () => {
  const host = createHost({ preview: false });

  toggleScreensaverPreviewState(host);

  assert.deepEqual(host.calls, [
    ["read"],
    ["setPreviewState", true],
    ["syncScreensaverDom"],
  ]);
});

test("toggleNowBarPreviewState flips now bar state and syncs screensaver DOM", () => {
  const host = createHost({ nowBar: true });

  toggleNowBarPreviewState(host);

  assert.deepEqual(host.calls, [
    ["read"],
    ["setNowBarState", false],
    ["syncScreensaverDom"],
  ]);
});

test("setScreensaverClockVariantState applies the requested variant and syncs screensaver DOM", () => {
  const host = createHost({});

  setScreensaverClockVariantState(host, "analog");

  assert.deepEqual(host.calls, [
    ["setClockVariantState", "analog"],
    ["syncScreensaverDom"],
  ]);
});

test("setScreensaverClockVariantState defaults to digital", () => {
  const host = createHost({});

  setScreensaverClockVariantState(host);

  assert.deepEqual(host.calls, [
    ["setClockVariantState", "digital"],
    ["syncScreensaverDom"],
  ]);
});
