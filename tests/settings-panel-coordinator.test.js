import assert from "node:assert/strict";
import test from "node:test";

import {
  buildSettingsCoordinatorProps,
  syncSettingsPanels,
} from "../src/settings/settings-panel-coordinator.js";

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

test("settings coordinator builds both scopes and preserves callback routing", () => {
  const onClose = () => {};
  const onCloseScreensaver = () => {};
  const onThemeChange = () => {};

  const props = buildSettingsCoordinatorProps({
    settingsOpen: true,
    screensaverSettingsOpen: false,
    settingsPage: "dock",
    isMobileLayout: true,
    themeState: {
      themeSetting: "dark",
      themeStyle: "oneui",
      iosGlass: "liquid",
      accent: "sky",
      accentMode: "manual",
      iconShapeSetting: "auto",
      iconShape: "squircle",
    },
    screensaverState: {
      enabled: true,
      delay: 30000,
      preview: false,
      nowBar: true,
      nowBarItems: { media: true },
      nowBarConfig: { tiles: { media: true } },
      clockVariant: "digital",
    },
    callbacks: {
      onClose,
      onCloseScreensaver,
      onThemeChange,
    },
  });

  assert.equal(props.all.scope, "all");
  assert.equal(props.all.open, true);
  assert.equal(props.all.onClose, onClose);
  assert.equal(props.all.onThemeChange, onThemeChange);

  assert.equal(props.screensaver.scope, "screensaver");
  assert.equal(props.screensaver.open, false);
  assert.equal(props.screensaver.onClose, onCloseScreensaver);
  assert.equal(props.screensaver.onThemeChange, onThemeChange);
  assert.equal(props.all.isMobileLayout, true);
  assert.equal(props.screensaver.isMobileLayout, true);
});

test("settings coordinator updates in place for the same view and replaces changed views", () => {
  const existingAll = createPanel({ scope: "all", page: "main" });
  existingAll.body.scrollTop = 240;
  const existingScreensaver = createPanel({ scope: "screensaver", page: "dock" });
  const panelsBySelector = new Map([
    ['.mha-settings-panel[data-settings-scope="all"]', existingAll],
    ['.mha-settings-panel[data-settings-scope="screensaver"]', existingScreensaver],
  ]);

  const root = {
    activeElement: null,
    querySelector(selector) {
      return panelsBySelector.get(selector) || null;
    },
    append(node) {
      this.appended = [...(this.appended || []), node];
    },
  };

  const created = [];
  const makePanel = (props) => {
    const panel = createPanel({ scope: props.scope, page: props.settingsPage });
    created.push(panel);
    return panel;
  };

  const result = syncSettingsPanels({
    root,
    props: {
      all: { scope: "all", settingsPage: "main" },
      screensaver: { scope: "screensaver", settingsPage: "screensaver-nowbar" },
    },
    createPanel: makePanel,
    updatePanel: (existing, next) => (
      existing.dataset.settingsScope === next.dataset.settingsScope
      && existing.dataset.settingsPage === next.dataset.settingsPage
    ),
  });

  assert.equal(result.all, existingAll);
  assert.equal(existingAll.replacedWith, undefined);
  assert.equal(result.screensaver, created[1]);
  assert.equal(existingScreensaver.replacedWith, created[1]);
  assert.equal(created[1].body.scrollTop, 0);
});
