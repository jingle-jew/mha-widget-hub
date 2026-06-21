import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("iOS exposes one shared surface contract for Liquid and Frosted glass", async () => {
  const ios = await read("styles/themes/ios.css");
  const requiredTokens = [
    "--mha-ios-liquid-surface",
    "--mha-ios-liquid-primary-surface",
    "--mha-ios-liquid-surface-active",
    "--mha-ios-liquid-surface-muted",
    "--mha-ios-liquid-border",
    "--mha-ios-liquid-primary-border",
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
});

test("iOS surface consumers reuse the shared contract", async () => {
  const [semantic, settings, manager, slider2, sliderWidget, widgets, weather, status] = await Promise.all([
    read("styles/themes/semantic-tokens.css"),
    read("styles/settings/settings-panel.css"),
    read("styles/widget-manager/widget-manager.css"),
    read("styles/components/slider2.css"),
    read("styles/widgets/slider-widget.css"),
    read("styles/widgets/widget-shell.css"),
    read("styles/widgets/weather-widget.css"),
    read("styles/layout/status-bar.css"),
  ]);

  assert.match(semantic, /--mha-ios-slider-track-surface:\s*var\(--mha-ios-frosted-surface-muted\)/);
  assert.match(semantic, /--mha-primary-surface:\s*var\(--mha-ios-liquid-primary-surface\)/);
  assert.match(semantic, /--mha-primary-border:\s*var\(--mha-ios-liquid-primary-border\)/);
  assert.match(settings, /background:\s*var\(--mha-primary-surface\)/);
  assert.match(settings, /\[data-ios-glass="frosted"\]\[data-theme="light"\]\) \.mha-settings-sheet \{[\s\S]*?var\(--mha-surface-panel\) 92%/);
  assert.match(settings, /\[data-ios-glass="frosted"\]\[data-theme="dark"\]\) \.mha-settings-sheet \{[\s\S]*?var\(--mha-surface-panel\) 68%/);
  assert.match(manager, /mha-widget-manager-sheet\.mha-settings-sheet \{[\s\S]*?background:\s*var\(--mha-primary-surface\)/);
  assert.match(manager, /background:\s*var\(--mha-on-primary-surface\)/);
  assert.match(slider2, /--mha-ios-slider-track-surface:\s*var\(--mha-ios-frosted-surface-muted\)/);
  assert.match(sliderWidget, /\[data-ios-glass="frosted"\]\[data-theme="light"\]\) \.mha-widget\[data-widget-kind="slider"\] \{[\s\S]*?background:\s*var\(--mha-primary-surface\) !important;[\s\S]*?border-color:\s*var\(--mha-primary-border\)/);
  assert.doesNotMatch(sliderWidget, /\[data-ios-glass="frosted"\]\[data-theme="dark"\]\) \.mha-widget\[data-widget-kind="slider"\] \{[\s\S]*?background:\s*var\(--mha-primary-surface\)/);
  assert.match(widgets, /\[data-ios-glass="frosted"\]\[data-theme="light"\]\) \.mha-widget \{[\s\S]*?background:\s*var\(--mha-primary-surface\);[\s\S]*?border-color:\s*var\(--mha-primary-border\)/);
  assert.doesNotMatch(widgets, /\[data-ios-glass="frosted"\]\[data-theme="dark"\]\) \.mha-widget \{[\s\S]*?background:\s*var\(--mha-primary-surface\)/);
  assert.match(widgets, /\[data-ios-glass="liquid"\]\[data-theme\]\) \.mha-widget \{[\s\S]*?background:\s*var\(--mha-primary-surface\)/);
  assert.doesNotMatch(weather, /\[data-theme-style="ios"\]\) \.mha-widget\[data-widget-kind="weather"\]/);
  assert.doesNotMatch(weather, /\[data-ios-glass="liquid"\][^}]*\.mha-widget\[data-widget-kind="weather"\][^{]*\{[^}]*--mha-weather-bg-(?:start|end)/);
  assert.match(weather, /\[data-ios-glass="frosted"\]\) \.mha-widget\[data-widget-kind="weather"\] \{[\s\S]*?--mha-weather-bg-start:\s*#8edcff/);
  assert.match(weather, /\[data-theme-style="oneui"\]\) \.mha-widget\[data-widget-kind="weather"\] \{[\s\S]*?--mha-weather-bg-start:\s*#8edcff/);
  assert.match(status, /\[data-ios-glass="liquid"\]\[data-theme\]\) \.mha-status-bar \{[\s\S]*?background:\s*var\(--mha-primary-surface\)/);
  assert.match(settings, /\[data-ios-glass="liquid"\]\[data-theme\]\) \.mha-settings-sheet \{[\s\S]*?border-color:\s*var\(--mha-primary-border\)/);
  assert.match(manager, /\[data-ios-glass="liquid"\]\) \.mha-widget-manager-category,[\s\S]*?border-color:\s*transparent/);
  assert.match(settings, /\.mha-settings-sheet::before \{[\s\S]*?background:\s*none/);
});
