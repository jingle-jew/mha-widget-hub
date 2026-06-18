import test from "node:test";
import assert from "node:assert/strict";
import {
  createInitialAdminState,
  getDefaultUserConfig,
  getHassRenderSignature,
  setEntityAllowed,
  updateUserConfig,
} from "../src/admin/admin-state.js";

test("admin state initializes with safe defaults", () => {
  assert.deepEqual(createInitialAdminState(), {
    loadedUserId: "",
    failedUserId: "",
    loadingUserId: "",
    loadPromise: null,
    loadRequestId: 0,
    users: [],
    config: { version: 1, users: {} },
    selectedUserId: "",
    selectedDomain: "light",
    search: "",
    loading: true,
    saving: false,
    error: "",
    hassRenderSignature: "",
  });
});

test("admin state reads and updates user visibility config immutably", () => {
  const baseConfig = {
    version: 1,
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          light: ["light.kitchen"],
        },
      },
    },
  };

  assert.deepEqual(getDefaultUserConfig(baseConfig, "user-1"), {
    unrestricted: false,
    allowedEntities: {
      light: ["light.kitchen"],
    },
  });

  const updated = updateUserConfig(baseConfig, "user-1", {
    unrestricted: true,
  });
  assert.equal(updated.users["user-1"].unrestricted, true);
  assert.equal(baseConfig.users["user-1"].unrestricted, false);
});

test("admin state toggles allowed entities per selected domain", () => {
  const config = {
    version: 1,
    users: {
      "user-1": {
        unrestricted: false,
        allowedEntities: {
          light: ["light.kitchen"],
        },
      },
    },
  };

  const added = setEntityAllowed(config, {
    selectedUserId: "user-1",
    selectedDomain: "light",
    entityId: "light.office",
    checked: true,
  });
  assert.deepEqual(added.users["user-1"].allowedEntities.light, [
    "light.kitchen",
    "light.office",
  ]);

  const removed = setEntityAllowed(added, {
    selectedUserId: "user-1",
    selectedDomain: "light",
    entityId: "light.kitchen",
    checked: false,
  });
  assert.deepEqual(removed.users["user-1"].allowedEntities.light, [
    "light.office",
  ]);
});

test("admin state builds a stable hass render signature for the selected domain", () => {
  const signature = getHassRenderSignature({
    user: { id: "user-1" },
    states: {
      "light.kitchen": {
        attributes: { friendly_name: "Cuisine" },
      },
      "switch.coffee": {
        attributes: { friendly_name: "Coffee" },
      },
      "light.office": {
        attributes: { friendly_name: "Office" },
      },
    },
  }, "light");

  assert.equal(signature, "user-1|light|light.kitchen:Cuisine|light.office:Office");
});
