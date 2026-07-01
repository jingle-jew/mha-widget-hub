import assert from "node:assert/strict";
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
  const coreDockIndex = manifestPaths.indexOf("styles/layout/mobile-dock-contract.css");
  const oneuiDockIndex = manifestPaths.indexOf("styles/themes/oneui-dock.css");
  const materialDockIndex = manifestPaths.indexOf("styles/themes/material-dock.css");

  assert.notEqual(coreDockIndex, -1);
  assert.notEqual(oneuiDockIndex, -1);
  assert.notEqual(materialDockIndex, -1);
  assert(oneuiDockIndex > coreDockIndex);
  assert(materialDockIndex > coreDockIndex);
  assert(materialDockIndex > oneuiDockIndex);
});
