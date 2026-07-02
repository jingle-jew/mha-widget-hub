import assert from "node:assert/strict";
import test from "node:test";

import {
  captureSettingsPanelsUiState,
  findPanelFocusTarget,
  getPanelFocusIdentity,
  replaceSettingsPanelPreservingUiState,
  restoreSettingsPanelsUiState,
} from "../src/settings/settings-panel-orchestrator.js";

function createPanel({ scope = "all", page = "main", withBody = true } = {}) {
  const body = withBody ? { scrollTop: 0 } : null;
  return {
    dataset: { settingsScope: scope, settingsPage: page },
    hidden: false,
    contains: (node) => node?.inside === true,
    querySelector: (selector) => selector === ".mha-settings-body" ? body : null,
    querySelectorAll: () => [],
    replaceWith(next) {
      this.replacedWith = next;
    },
    body,
  };
}

test("panel focus identity keeps stable control metadata", () => {
  const panel = createPanel();
  const active = {
    inside: true,
    tagName: "SELECT",
    dataset: { settingsControl: "Theme" },
    getAttribute: (name) => name === "aria-label" ? "" : "",
  };
  const root = { activeElement: active };

  assert.deepEqual(getPanelFocusIdentity(root, panel), {
    tagName: "SELECT",
    settingsControl: "Theme",
    ariaLabel: "",
    name: "",
    type: "",
  });
});

test("panel focus target prefers settings control identity", () => {
  const target = {
    dataset: { settingsControl: "Theme" },
    getAttribute: () => "",
  };
  const panel = {
    querySelectorAll: () => [target],
  };

  assert.equal(findPanelFocusTarget(panel, {
    tagName: "SELECT",
    settingsControl: "Theme",
  }), target);
});

test("same settings view updates in place without replacing the panel", () => {
  const existing = createPanel();
  const next = createPanel();
  const result = replaceSettingsPanelPreservingUiState({
    root: { activeElement: null },
    existing,
    next,
    updatePanel: () => true,
  });

  assert.equal(result, existing);
  assert.equal(existing.replacedWith, undefined);
});

test("replaced settings view restores its body scroll position", () => {
  const existing = createPanel();
  existing.body.scrollTop = 240;
  const next = createPanel();
  const root = {
    activeElement: null,
    append(node) {
      this.appended = node;
    },
  };

  const result = replaceSettingsPanelPreservingUiState({
    root,
    existing,
    next,
    updatePanel: () => false,
  });

  assert.equal(result, next);
  assert.equal(existing.replacedWith, next);
  assert.equal(next.body.scrollTop, 240);
});

test("settings panel ui state capture and restore preserves body scroll by scope and page", () => {
  const allPanel = createPanel({ scope: "all", page: "main" });
  const screensaverPanel = createPanel({ scope: "screensaver", page: "screensaver" });
  allPanel.body.scrollTop = 180;
  screensaverPanel.body.scrollTop = 64;

  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, ".mha-settings-panel");
      return [allPanel, screensaverPanel];
    },
    querySelector(selector) {
      if (selector === '.mha-settings-panel[data-settings-scope="all"]') return allPanel;
      if (selector === '.mha-settings-panel[data-settings-scope="screensaver"]') return screensaverPanel;
      return null;
    },
  };

  const state = captureSettingsPanelsUiState(root);
  allPanel.body.scrollTop = 0;
  screensaverPanel.body.scrollTop = 0;

  restoreSettingsPanelsUiState(root, state);

  assert.equal(allPanel.body.scrollTop, 180);
  assert.equal(screensaverPanel.body.scrollTop, 64);
});
