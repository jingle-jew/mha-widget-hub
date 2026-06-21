import assert from "node:assert/strict";
import test from "node:test";

import { openDockPageSettingsForPage } from "../src/settings/dock-page-settings.js";

test("openDockPageSettingsForPage opens dock detail settings for an existing page", () => {
  const calls = [];
  const host = {
    _pages: [{ id: "home" }, { id: "media" }],
  };

  const result = openDockPageSettingsForPage(host, "media", {
    openSettingsPageRef(page, options) {
      calls.push([page, options]);
      return "opened";
    },
  });

  assert.equal(result, "opened");
  assert.deepEqual(calls, [["dock-detail", { dockPageId: "media" }]]);
});

test("openDockPageSettingsForPage ignores unknown pages", () => {
  const calls = [];
  const host = {
    _pages: [{ id: "home" }],
  };

  const result = openDockPageSettingsForPage(host, "missing", {
    openSettingsPageRef(page, options) {
      calls.push([page, options]);
    },
  });

  assert.equal(result, undefined);
  assert.deepEqual(calls, []);
});
