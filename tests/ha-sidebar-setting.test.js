import assert from "node:assert/strict";
import test from "node:test";

import { applyHideHaSidebarSetting } from "../src/settings/ha-sidebar-setting.js";

test("applyHideHaSidebarSetting persists and applies the sidebar setting", () => {
  const calls = [];
  const host = {
    _hideHaSidebar: false,
    _recordPersistenceResult(success) {
      calls.push(["recordPersistenceResult", success]);
    },
    _applyHaSidebarMode(value) {
      calls.push(["applyHaSidebarMode", value]);
    },
    _syncSettingsDom() {
      calls.push(["syncSettingsDom"]);
    },
  };

  const result = applyHideHaSidebarSetting(host, "yes", {
    storageKey: "hide-sidebar",
    writeStorageValueRef(key, value) {
      calls.push(["writeStorageValue", key, value]);
      return true;
    },
  });

  assert.equal(result, true);
  assert.equal(host._hideHaSidebar, true);
  assert.deepEqual(calls, [
    ["writeStorageValue", "hide-sidebar", true],
    ["recordPersistenceResult", true],
    ["applyHaSidebarMode", true],
    ["syncSettingsDom"],
  ]);
});

test("applyHideHaSidebarSetting normalizes disabled values to false", () => {
  const host = {
    _hideHaSidebar: true,
    _recordPersistenceResult() {},
    _applyHaSidebarMode() {},
    _syncSettingsDom() {},
  };

  const result = applyHideHaSidebarSetting(host, 0, {
    storageKey: "hide-sidebar",
    writeStorageValueRef() {
      return true;
    },
  });

  assert.equal(result, false);
  assert.equal(host._hideHaSidebar, false);
});
