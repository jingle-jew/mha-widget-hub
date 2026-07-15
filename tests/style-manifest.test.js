import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getStyleManifest,
  getThemeDockStyleManifestEntries,
} from "../src/styles/style-manifest.js";

test("style manifest appends theme dock styles after the core dock layers", () => {
  assert.deepEqual(getThemeDockStyleManifestEntries(), [
    ["styles/themes/ios-dock.css", "theme"],
    ["styles/themes/oneui-dock.css", "theme"],
    ["styles/themes/material-dock.css", "theme"],
  ]);

  const manifestPaths = getStyleManifest().map(([path]) => path);
  const formControlsIndex = manifestPaths.indexOf("styles/components/form-controls.css");
  const oneuiThemeIndex = manifestPaths.indexOf("styles/themes/oneui.css");
  const coreDockIndex = manifestPaths.indexOf("styles/layout/mobile-dock-contract.css");
  const oneuiDockIndex = manifestPaths.indexOf("styles/themes/oneui-dock.css");
  const materialDockIndex = manifestPaths.indexOf("styles/themes/material-dock.css");

  assert.notEqual(coreDockIndex, -1);
  assert.notEqual(oneuiDockIndex, -1);
  assert.notEqual(materialDockIndex, -1);
  assert.notEqual(formControlsIndex, -1);
  assert(formControlsIndex < oneuiThemeIndex);
  assert(oneuiDockIndex > coreDockIndex);
  assert(materialDockIndex > coreDockIndex);
  assert(materialDockIndex > oneuiDockIndex);
});

test("glass theme select menus consume the semantic popup surface and filter", () => {
  const css = readFileSync(new URL("../styles/components/form-controls.css", import.meta.url), "utf8");

  for (const themeStyle of ["oneui", "ios"]) {
    const selector = `:host([data-theme-style="${themeStyle}"]) .mha-select-menu`;
    const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)) + 1);

    assert.match(rule, /--mha-surface-popup/u);
    assert.match(rule, /backdrop-filter: var\(--mha-popup-filter/u);
  }

  assert.match(css, /data-theme-style="ios"\]\[data-theme="light"\][\s\S]*--mha-select-menu-glass-tint/u);
  assert.match(css, /data-theme-style="ios"\]\[data-theme="dark"\][\s\S]*--mha-select-menu-glass-tint/u);
  assert.match(css, /\.mha-select-menu\[data-portaled="true"\][\s\S]*position: fixed/u);
});
