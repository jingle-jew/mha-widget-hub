import assert from "node:assert/strict";
import test from "node:test";

import { applyStatusBarModeSetting } from "../src/settings/status-bar-mode-setting.js";

test("applyStatusBarModeSetting persists, normalizes, and relayouts the shell", () => {
  const calls = [];
  const host = {
    _statusBarMode: "pill",
    dataset: {},
    _recordPersistenceResult(success) {
      calls.push(["recordPersistenceResult", success]);
    },
    _syncSettingsDom() {
      calls.push(["syncSettingsDom"]);
    },
    _handleViewportChange() {
      calls.push(["handleViewportChange"]);
    },
  };

  const result = applyStatusBarModeSetting(host, "top-bar", {
    storageKey: "status-bar-mode",
    writeStorageValueRef(key, value) {
      calls.push(["writeStorageValue", key, value]);
      return true;
    },
  });

  assert.equal(result, "top-bar");
  assert.equal(host._statusBarMode, "top-bar");
  assert.equal(host.dataset.statusBarMode, "top-bar");
  assert.deepEqual(calls, [
    ["writeStorageValue", "status-bar-mode", "top-bar"],
    ["recordPersistenceResult", true],
    ["syncSettingsDom"],
    ["handleViewportChange"],
  ]);
});

test("applyStatusBarModeSetting falls back to pill for unknown values", () => {
  const host = {
    _statusBarMode: "top-bar",
    dataset: {},
    _recordPersistenceResult() {},
    _syncSettingsDom() {},
    _scheduleSquareUnitSync() {},
  };

  const result = applyStatusBarModeSetting(host, "unsupported", {
    storageKey: "status-bar-mode",
    writeStorageValueRef() {
      return true;
    },
  });

  assert.equal(result, "pill");
  assert.equal(host._statusBarMode, "pill");
  assert.equal(host.dataset.statusBarMode, "pill");
});
