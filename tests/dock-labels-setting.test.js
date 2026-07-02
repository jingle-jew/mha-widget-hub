import assert from "node:assert/strict";
import test from "node:test";

import { applyDockLabelsSetting } from "../src/settings/dock-labels-setting.js";

test("applyDockLabelsSetting persists the dock label preference and syncs host state", () => {
  const calls = [];
  const host = {
    _showDockLabels: false,
    dataset: {},
    _recordPersistenceResult(success) {
      calls.push(["recordPersistenceResult", success]);
    },
    _syncSettingsDom() {
      calls.push(["syncSettingsDom"]);
    },
  };

  const result = applyDockLabelsSetting(host, 1, {
    storageKey: "dock-labels",
    writeStorageValueRef(key, value) {
      calls.push(["writeStorageValue", key, value]);
      return true;
    },
  });

  assert.equal(result, true);
  assert.equal(host._showDockLabels, true);
  assert.equal(host.dataset.dockLabels, "true");
  assert.deepEqual(calls, [
    ["writeStorageValue", "dock-labels", true],
    ["recordPersistenceResult", true],
    ["syncSettingsDom"],
  ]);
});

test("applyDockLabelsSetting normalizes falsy values to hidden labels", () => {
  const host = {
    _showDockLabels: true,
    dataset: {},
    _recordPersistenceResult() {},
    _syncSettingsDom() {},
  };

  const result = applyDockLabelsSetting(host, "", {
    storageKey: "dock-labels",
    writeStorageValueRef() {
      return true;
    },
  });

  assert.equal(result, false);
  assert.equal(host._showDockLabels, false);
  assert.equal(host.dataset.dockLabels, "false");
});
