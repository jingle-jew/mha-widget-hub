import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("iOS exposes one shared surface contract for Liquid and Frosted glass", async () => {
  const ios = await read("styles/themes/ios.css");
  const requiredTokens = [
    "--mha-ios-liquid-surface",
    "--mha-ios-liquid-surface-active",
    "--mha-ios-liquid-surface-muted",
    "--mha-ios-liquid-border",
    "--mha-ios-liquid-border-active",
    "--mha-ios-liquid-blur",
    "--mha-ios-liquid-shadow",
    "--mha-ios-frosted-surface",
    "--mha-ios-frosted-surface-active",
    "--mha-ios-frosted-surface-muted",
    "--mha-ios-frosted-border",
    "--mha-ios-frosted-border-active",
    "--mha-ios-frosted-blur",
    "--mha-ios-frosted-shadow",
    "--mha-ios-frosted-tile-surface",
    "--mha-ios-frosted-tile-surface-hover",
    "--mha-ios-frosted-tile-border",
    "--mha-ios-frosted-tile-shadow",
  ];

  for (const token of requiredTokens) {
    assert.match(ios, new RegExp(`${token.replaceAll("-", "\\-")}:`), `${token} is missing`);
  }

  assert.match(ios, /--mha-ios-liquid-blur:\s*6px/);
  assert.match(ios, /--mha-ios-frosted-blur:\s*24px/);
  assert.match(ios, /--mha-widget-shell-border:\s*transparent/);
  assert.match(ios, /--mha-widget-surface:\s*var\(--mha-ios-liquid-surface\)/);
  assert.match(ios, /--mha-widget-surface:\s*var\(--mha-ios-frosted-surface\)/);
  assert.match(ios, /--mha-ios-frosted-surface:\s*linear-gradient\(145deg, rgba\(255,255,255,.76\), rgba\(255,246,238,.58\)\)/);
  assert.match(ios, /--mha-ios-frosted-surface:\s*linear-gradient\(145deg, rgba\(255,240,226,.18\), rgba\(255,255,255,.105\)\)/);
});

test("iOS surface consumers reuse the shared contract", async () => {
  const [semantic, settings, manager, slider2] = await Promise.all([
    read("styles/themes/semantic-tokens.css"),
    read("styles/settings/settings-panel.css"),
    read("styles/widget-manager/widget-manager.css"),
    read("styles/components/slider2.css"),
  ]);

  assert.match(semantic, /--mha-ios-slider-track-surface:\s*var\(--mha-ios-frosted-surface-muted\)/);
  assert.match(settings, /background:\s*var\(--mha-widget-shell-surface, var\(--mha-ios-liquid-surface\)\)/);
  assert.match(settings, /\[data-ios-glass="frosted"\]\[data-theme="light"\]\) \.mha-settings-sheet \{[\s\S]*?var\(--mha-surface-panel\) 92%/);
  assert.match(settings, /\[data-ios-glass="frosted"\]\[data-theme="dark"\]\) \.mha-settings-sheet \{[\s\S]*?var\(--mha-surface-panel\) 68%/);
  assert.match(manager, /mha-widget-manager-sheet\.mha-settings-sheet \{[\s\S]*?background:\s*var\(--mha-widget-shell-surface, var\(--mha-ios-liquid-surface\)\)/);
  assert.match(manager, /background:\s*var\(--mha-ios-frosted-tile-surface\)/);
  assert.match(slider2, /--mha-ios-slider-track-surface:\s*var\(--mha-ios-frosted-surface-muted\)/);
  assert.match(settings, /\[data-ios-glass="liquid"\]\) \.mha-settings-sheet \{[\s\S]*?border-color:\s*transparent/);
  assert.match(manager, /\[data-ios-glass="liquid"\]\) \.mha-widget-manager-category,[\s\S]*?border-color:\s*transparent/);
  assert.match(settings, /\.mha-settings-sheet::before \{[\s\S]*?background:\s*none/);
});
