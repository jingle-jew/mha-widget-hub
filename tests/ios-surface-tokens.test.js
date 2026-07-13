import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { getStyleManifest } from "../src/styles/style-manifest.js";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("iOS Liquid uses the raw hybrid material as its single source of truth", async () => {
  const [ios, raw, surfaceMap] = await Promise.all([
    read("styles/themes/ios.css"),
    read("styles/themes/ios-raw-materials.css"),
    read("styles/themes/ios-surface-map.css"),
  ]);

  assert.match(raw, /--mha-ios-raw-liquid-shell-blur:\s*14px/);
  assert.match(raw, /--mha-ios-raw-liquid-shell-saturation:\s*165%/);
  assert.match(raw, /--mha-glass-noise-opacity:\s*\.072/);
  assert.match(raw, /--mha-glass-noise-size:\s*80px 80px/);
  assert.match(raw, /--mha-glass-noise-blend-mode:\s*soft-light/);
  assert.match(raw, /--mha-ios-raw-liquid-shell-highlight-opacity:\s*\.56/);
  assert.match(raw, /--mha-ios-liquid-blur:\s*var\(--mha-ios-raw-liquid-shell-blur\)/);
  assert.match(raw, /--mha-widget-surface:\s*var\(--mha-ios-liquid-surface\)/);
  assert.match(raw, /--mha-widget-shell-highlight:\s*var\(--mha-ios-raw-liquid-shell-highlight\)/);

  assert.doesNotMatch(ios, /--mha-surface-blur:\s*6px/);
  assert.doesNotMatch(ios, /--mha-surface-saturation:\s*190%/);
  assert.doesNotMatch(ios, /--mha-widget-reflection-opacity:\s*0/);
  assert.match(surfaceMap, /--mha-blur-primary:\s*var\(--mha-ios-raw-liquid-primary-blur\)/);
  assert.match(surfaceMap, /--mha-saturation-primary:\s*var\(--mha-ios-raw-liquid-primary-saturation\)/);
});

test("iOS glass applies one shared filter path and preserves layered optics", async () => {
  const [glass, shell, shellContract, dock, status, dockContract, statusContract] = await Promise.all([
    read("styles/core/glass-surface.css"),
    read("styles/widgets/widget-shell.css"),
    read("styles/widgets/widget-shell-contract.css"),
    read("styles/layout/dock.css"),
    read("styles/layout/status-bar.css"),
    read("styles/layout/dock-contract.css"),
    read("styles/layout/status-bar-contract.css"),
  ]);

  assert.match(glass, /\.mha-widget::before[\s\S]*background-image:\s*var\(--mha-glass-noise-image\)/);
  assert.match(glass, /\.mha-widget::after,[\s\S]*z-index:\s*1/);
  assert.match(glass, /\.mha-dock::after[\s\S]*var\(--mha-widget-reflection-opacity, 0\)/);
  assert.match(glass, /@supports \(backdrop-filter: blur\(1px\)\)[\s\S]*\.mha-widget[\s\S]*var\(--mha-glass-surface-filter\)/);
  assert.match(glass, /@supports \(-webkit-backdrop-filter: blur\(1px\)\)[\s\S]*\.mha-widget[\s\S]*var\(--mha-glass-surface-filter\)/);
  assert.doesNotMatch(glass, /@-moz-document[\s\S]*--mha-glass-noise-blend-mode:\s*normal/);

  const widgetBaseRule = shell.match(/\.mha-widget\s*\{([\s\S]*?)\n\}/)?.[1] || "";
  assert.doesNotMatch(widgetBaseRule, /backdrop-filter/);
  assert.doesNotMatch(dock, /\.mha-dock\s*\{[\s\S]*backdrop-filter/);
  assert.doesNotMatch(status, /data-ios-glass="(?:liquid|frosted)"[^}]*\{[\s\S]*backdrop-filter/);
  assert.doesNotMatch(status, /saturate\(190%\)/);
  assert.match(shellContract, /-webkit-backdrop-filter:\s*var\([\s\S]*--mha-widget-shell-filter/);
  assert.match(shellContract, /backdrop-filter:\s*var\([\s\S]*--mha-widget-shell-filter/);
  assert.match(dockContract, /--mha-shell-filter/);
  assert.match(statusContract, /--mha-statusbar-filter/);
});

test("the manifest loads raw mappings before the shared glass and widget contracts", () => {
  const paths = getStyleManifest().map(([path]) => path);
  const indexOf = (path) => paths.indexOf(path);

  assert(indexOf("styles/themes/ios-raw-materials.css") < indexOf("styles/themes/ios-surface-map.css"));
  assert(indexOf("styles/themes/ios-surface-map.css") < indexOf("styles/core/glass-surface.css"));
  assert(indexOf("styles/core/glass-surface.css") < indexOf("styles/widgets/widget-shell.css"));
  assert(indexOf("styles/widgets/widget-shell.css") < indexOf("styles/widgets/widget-shell-contract.css"));
});
