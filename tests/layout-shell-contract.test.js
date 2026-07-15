import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const REPO_ROOT = process.cwd();
const THEME_ROOT = path.join(REPO_ROOT, "styles", "themes");
const GEOMETRY_VARS = [
  "--mha-available-content-x",
  "--mha-available-content-y",
  "--mha-available-content-width",
  "--mha-available-content-height",
  "--mha-panel-frame-width",
  "--mha-panel-frame-height",
  "--mha-grid-container-width",
  "--mha-grid-container-height",
  "--mha-grid-track-width",
  "--mha-grid-track-height",
  "--mha-runtime-grid-units",
  "--mha-runtime-grid-rows",
  "--mha-grid-column-size",
  "--mha-grid-row-size",
];

function listCssFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return listCssFiles(fullPath);
    return entry.name.endsWith(".css") ? [fullPath] : [];
  });
}

test("host shell no longer exposes the dead dock-bottom preset wrapper", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "mha-widget-hub.js"),
    "utf8",
  );

  assert.doesNotMatch(
    source,
    /_getDockBottomColumnBonus\s*\(/,
  );
  assert.doesNotMatch(
    source,
    /_gridRuntime\.getDockBottomColumnBonus\s*\(/,
  );
  assert.match(
    source,
    /getActiveGridUnits:\(\)=>this\._getRuntimeGridUnits\(\)/,
  );
});

test("theme stylesheets do not override structural geometry variables", () => {
  const offenders = [];

  for (const file of listCssFiles(THEME_ROOT)) {
    const source = fs.readFileSync(file, "utf8");
    const matchedVars = GEOMETRY_VARS.filter(variableName => source.includes(variableName));
    if (matchedVars.length) {
      offenders.push({
        file: path.relative(REPO_ROOT, file),
        matchedVars,
      });
    }
  }

  assert.deepEqual(offenders, []);
});

test("OneUI dock and active pill derive their visible tint from the theme accent", () => {
  const source = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");
  const tintConsumers = source.match(/var\(--mha-oneui-dock-tint\)/g) || [];

  assert.match(source, /--mha-oneui-dock-tint:\s*var\(--mha-accent\);/);
  assert.match(source, /--mha-oneui-dock-filter:\s*blur\(18px\) saturate\(132%\);/);
  assert.equal(tintConsumers.length, 12);
});

test("OneUI glass uses a dense fine-grain texture across persistent and panel surfaces", () => {
  const source = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");

  assert.match(source, /--mha-oneui-glass-noise-texture:\s*url\("data:image\/svg\+xml,[^\n]*baseFrequency='\.96'[^\n]*numOctaves='4'/);
  assert.match(source, /--mha-glass-noise-opacity:\s*\.14;/);
  assert.match(source, /--mha-glass-noise-size:\s*56px 56px;/);
  assert.match(source, /--mha-glass-noise-blend-mode:\s*soft-light;/);
  assert.match(
    source,
    /\.mha-settings-sheet::before,[\s\S]*\.mha-page-creator-sheet::before,[\s\S]*\.mha-media-page-widget-panel::before,[\s\S]*\.mha-mobile-dock::before\s*\{[\s\S]*background-image:\s*var\(--mha-glass-noise-image\);[\s\S]*opacity:\s*var\(--mha-glass-noise-opacity\);/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\[data-wallpaper-source="theme"\]\[data-wallpaper-kind="advanced"\]\) \.mha-widget:not\(\.mha-media-page-auto-player\)::before\s*\{[\s\S]*opacity:\s*var\(--mha-oneui-adaptive-widget-noise-opacity, var\(--mha-glass-noise-opacity\)\);/,
  );
  assert.doesNotMatch(
    source,
    /:host\([^\n]*data-wallpaper-source="custom"[^\n]*\) \.mha-widget[^\n]*::before/,
  );
});

test("OneUI light canvas uses subdued base colors behind primary surfaces", () => {
  const source = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");

  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\[data-theme="light"\]\)\s*\{[\s\S]*--mha-bg-base-1:\s*color-mix\(in srgb, var\(--mha-accent\) 16%, #eef0f2\);[\s\S]*--mha-bg-base-2:\s*color-mix\(in srgb, var\(--mha-accent\) 24%, #e0e7f2\);/,
  );
});

test("OneUI light releases its background filter reset while the screensaver is visible", () => {
  const themeSource = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");
  const screensaverSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "screensaver", "screensaver.css"),
    "utf8",
  );

  assert.match(
    themeSource,
    /:host\(\[data-theme-style="oneui"\]\[data-theme="light"\]:not\(\.is-screensaver-visible\)\) \.mha-background,[\s\S]*filter:\s*none;/,
  );
  assert.match(
    screensaverSource,
    /:host\(\[data-theme="light"\]\)\s*\{[\s\S]*--mha-screensaver-background-filter:\s*blur\(18px\)\s*saturate\(\.82\)\s*brightness\(\.88\);/,
  );
});

test("OneUI primary surface reuses the dock colors at reduced opacity", () => {
  const source = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");
  const semanticSource = fs.readFileSync(path.join(THEME_ROOT, "semantic-tokens.css"), "utf8");
  const sharedAdapter = semanticSource.match(
    /\/\* iOS and OneUI canonical layer adapters\.[\s\S]*?\n\}/,
  )?.[0] || "";

  assert.match(source, /--mha-oneui-primary-blur:\s*46px;/);
  assert.match(source, /--mha-oneui-primary-saturation:\s*118%;/);
  assert.match(source, /--mha-oneui-primary-surface-opacity:\s*68%;/);
  assert.match(
    source,
    /--mha-oneui-primary-surface:[\s\S]*var\(--mha-oneui-dock-surface-start\) var\(--mha-oneui-primary-surface-opacity\)[\s\S]*var\(--mha-oneui-dock-surface-end\) var\(--mha-oneui-primary-surface-opacity\)/,
  );
  assert.match(
    source,
    /--mha-oneui-mobile-dock-surface:[\s\S]*var\(--mha-oneui-dock-surface-start\),[\s\S]*var\(--mha-oneui-dock-surface-end\)/,
  );
  assert.match(source, /--mha-oneui-primary-brightness:\s*\.99;/);
  assert.match(source, /--mha-oneui-primary-brightness:\s*\.90;/);
  assert.match(
    semanticSource,
    /:host\(\[data-theme-style="oneui"\]\),\s*:root\[data-theme-style="oneui"\]\s*\{[\s\S]*--mha-primary-surface:\s*var\(--mha-oneui-primary-surface\);[\s\S]*--mha-surface-primary:\s*var\(--mha-primary-surface\);[\s\S]*--mha-blur-primary:\s*var\(--mha-oneui-primary-blur\);[\s\S]*--mha-brightness-primary:\s*var\(--mha-oneui-primary-brightness\);/,
  );
  assert.doesNotMatch(sharedAdapter, /--mha-primary-surface:/);
});

test("OneUI Now Bar tiles reuse the dock surface material", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "screensaver", "screensaver-contract.css"),
    "utf8",
  );

  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-screensaver-nowbar-tile\s*\{[\s\S]*--mha-nowbar-oneui-surface:\s*var\([\s\S]*--mha-oneui-mobile-dock-surface,[\s\S]*--mha-shell-dock-surface[\s\S]*background:\s*var\(--mha-nowbar-oneui-surface\);[\s\S]*border-color:\s*var\(--mha-oneui-mobile-dock-border, var\(--mha-shell-border\)\);[\s\S]*box-shadow:\s*var\(--mha-shell-shadow\);[\s\S]*backdrop-filter:\s*var\(--mha-oneui-dock-filter\);/,
  );
});

test("OneUI dark panels keep a flat outer frame", () => {
  const themeSource = fs.readFileSync(path.join(THEME_ROOT, "oneui.css"), "utf8");
  const settingsSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "settings", "settings-panel.css"),
    "utf8",
  );
  const mediaSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "pages", "media-page.css"),
    "utf8",
  );

  assert.match(
    themeSource,
    /:host\(\[data-theme-style="oneui"\]\[data-theme="dark"\]\)\s*\{[\s\S]*--mha-oneui-panel-border:\s*transparent;[\s\S]*--mha-panel-border:\s*var\(--mha-oneui-panel-border\);[\s\S]*--mha-popup-border:\s*var\(--mha-oneui-panel-border\);[\s\S]*--mha-panel-shadow:\s*none;[\s\S]*--mha-popup-shadow:\s*none;/,
  );
  assert.match(
    settingsSource,
    /:host\(\[data-theme-style="oneui"\]\[data-theme="dark"\]\) \.mha-settings-sheet\s*\{[\s\S]*border-color:\s*var\(--mha-oneui-panel-border\);[\s\S]*box-shadow:\s*none;/,
  );
  assert.match(
    mediaSource,
    /:host\(\[data-theme-style="oneui"\]\[data-theme="dark"\]\) \.mha-media-page-widget-panel\s*\{[\s\S]*--mha-panel-border:\s*var\(--mha-oneui-panel-border\);[\s\S]*--mha-panel-shadow:\s*none;/,
  );
});

test("side docks do not keep a mirrored bottom inset once the shell top reserve is applied", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );

  assert.match(
    source,
    /--mha-shell-content-bottom-inset:\s*0px\s*!important;/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-position="left"\]\) \.mha-workspace\s*\{[\s\S]*?--mha-shell-content-bottom-inset:\s*0px\s*!important;/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-position="right"\]\) \.mha-workspace,\s*:host\(:not\(\[data-dock-position\]\)\) \.mha-workspace\s*\{[\s\S]*?--mha-shell-content-bottom-inset:\s*0px\s*!important;/,
  );
  assert.match(
    source,
    /padding-block-end:\s*max\(\s*var\(--mha-widget-area-edge-padding\),\s*var\(--mha-widget-area-bottom-gutter\)\s*\)\s*!important;/,
  );
});

test("generic side dock labels reuse the bottom-dock item proportions", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "dock.css"),
    "utf8",
  );

  assert.match(
    source,
    /\[data-dock-labels="true"\]\[data-dock-position="left"\]:not\(\[data-theme-style="oneui"\]\)/,
  );
  assert.match(
    source,
    /\[data-dock-labels="true"\]\[data-dock-position="right"\]:not\(\[data-theme-style="oneui"\]\)/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-position="left"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-dock,[\s\S]*--mha-dock-empty-padding-inline:\s*var\(--mha-dock-empty-padding-block\);/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-position="left"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-dock,[\s\S]*--mha-dock-rail-padding-inline:\s*var\(--mha-dock-rail-padding-block\);/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-labels="true"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-dock,\s*:host\(\[data-dock-labels="true"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-mobile-dock\s*\{[\s\S]*--mha-dock-item-label-display:\s*block;/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-labels="true"\]\[data-dock-position="left"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-dock,[\s\S]*--mha-dock-item-inline-size:\s*max\(5rem,\s*calc\(var\(--mha-icon-size\) \+ 1rem\)\);/,
  );
  assert.match(
    source,
    /--mha-dock-item-min-block-size:\s*calc\(var\(--mha-icon-size\) \+ \.78rem\);/,
  );
  assert.match(
    source,
    /--mha-dock-empty-width:\s*calc\(var\(--mha-dock-item-inline-size\) \+ \(var\(--mha-dock-rail-padding-inline\) \* 2\)\);/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-labels="true"\]\[data-dock-position="bottom"\]:not\(\[data-theme-style="oneui"\]\)\) \.mha-dock,[\s\S]*--mha-dock-item-inline-size:\s*max\(5rem,\s*calc\(var\(--mha-icon-size\) \+ 1rem\)\);/,
  );
  assert.match(
    source,
    /--mha-dock-item-overflow:\s*visible;/,
  );
  assert.match(
    source,
    /--mha-dock-empty-height:\s*calc\(var\(--mha-dock-labeled-capsule-size\) \+ 1rem\);/,
  );
  assert.doesNotMatch(
    source,
    /--mha-dock-empty-height:\s*calc\(var\(--mha-icon-size\) \+/,
  );
  assert.doesNotMatch(
    source,
    /--mha-side-dock-rail-width:\s*clamp\(8\.5rem,\s*11vw,\s*10rem\);/,
  );
});

test("frame alignment stylesheet no longer pilots grid alignment directly from dock position", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "frame-alignment.css"),
    "utf8",
  );

  assert.doesNotMatch(source, /data-dock-position=.*mha-grid/);
  assert.doesNotMatch(source, /--mha-grid-track-justify:\s*(start|end|center)/);
});

test("pill status bar uses page padding as its tablet/desktop frame inset on both sides", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "frame-alignment.css"),
    "utf8",
  );
  const statusSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "status-bar.css"),
    "utf8",
  );

  assert.match(
    source,
    /left:\s*var\(--mha-ha-sidebar-reserved-inline-start,\s*0px\)\s*!important;/,
  );
  assert.match(
    source,
    /right:\s*var\(--mha-page-padding\)\s*!important;/,
  );
  assert.match(
    statusSource,
    /left:\s*var\(--mha-ha-sidebar-reserved-inline-start,\s*0px\);/,
  );
  assert.match(
    statusSource,
    /right:\s*var\(--mha-page-padding\);/,
  );
  assert.doesNotMatch(
    source,
    /--mha-frame-edge-inset:/,
  );
  assert.doesNotMatch(
    source,
    /left:\s*calc\(\s*var\(--mha-page-padding\)\s*\+\s*var\(--mha-ha-sidebar-reserved-inline-start,\s*0px\)\s*\)\s*!important;/,
  );
  assert.doesNotMatch(
    statusSource,
    /right:\s*max\(\s*var\(--mha-safe-area-right, env\(safe-area-inset-right\)\),\s*clamp\(0\.75rem,\s*1\.8vw,\s*1\.25rem\)\s*\);/,
  );
  assert.doesNotMatch(
    statusSource,
    /left:\s*calc\(\s*var\(--mha-page-padding\)\s*\+\s*var\(--mha-ha-sidebar-reserved-inline-start,\s*0px\)\s*\);/,
  );
});

test("bottom dock labels reserve extra shell height without coupling it to icon size", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );

  assert.match(
    source,
    /:host\(\[data-dock-position="bottom"\]\[data-dock-labels="true"\]:not\(\[data-theme-style="oneui"\]\)\)\s*\{[\s\S]*--mha-shell-bottom-dock-height:\s*calc\([\s\S]*calc\(var\(--mha-shell-bottom-dock-capsule-size\) \* \.88\)[\s\S]*1rem[\s\S]*var\(--mha-shell-bottom-dock-clearance\)/,
  );
  assert.doesNotMatch(
    source,
    /--mha-shell-bottom-dock-height:\s*calc\([\s\S]*var\(--mha-icon-size\)/,
  );
});

test("status bar mode remains a shell-owned layout input instead of a settings-only style toggle", () => {
  const gridSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );
  const statusSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "status-bar.css"),
    "utf8",
  );

  assert.match(
    gridSource,
    /\[data-status-bar-mode="top-bar"\][\s\S]*--mha-statusbar-reserved-top:/,
  );
  assert.match(
    gridSource,
    /\[data-status-bar-mode="hidden"\][\s\S]*--mha-statusbar-reserved-top:\s*0px;/,
  );
  assert.match(
    gridSource,
    /\.mha-shell\s*\{[\s\S]*--mha-statusbar-widget-gap:\s*var\(--mha-page-padding\)\s*!important;/,
  );
  assert.doesNotMatch(
    gridSource,
    /\[data-status-bar-mode="top-bar"\][\s\S]*--mha-statusbar-widget-gap:\s*0px\s*!important;/,
  );
  assert.doesNotMatch(
    gridSource,
    /\[data-status-bar-mode="hidden"\][\s\S]*--mha-statusbar-widget-gap:\s*0px\s*!important;/,
  );
  assert.match(
    statusSource,
    /\[data-status-bar-mode="hidden"\]\)\s+\.mha-status-bar,\s*:host\(\[data-status-bar-mode="hidden"\]\)\s+\.mha-statusbar-fill\s*\{[\s\S]*display:\s*none\s*!important;/,
  );
  assert.match(
    statusSource,
    /\[data-status-bar-visible="false"\]\)\s+\.mha-status-bar,\s*:host\(\[data-status-bar-visible="false"\]\)\s+\.mha-statusbar-fill\s*\{[\s\S]*display:\s*none\s*!important;/,
  );
  const mobileGridSection = gridSource.match(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
  const mobileStatusSection = statusSource.match(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
  assert.doesNotMatch(
    mobileGridSection,
    /\[data-status-bar-mode="top-bar"\][\s\S]*--mha-statusbar-reserved-top:/,
  );
  assert.doesNotMatch(
    mobileStatusSection,
    /\[data-status-bar-mode="top-bar"\]\)\s+\.mha-status-bar\s*\{[\s\S]*display:\s*flex;/,
  );
});

test("status bar clearance stays consistent across top-bar and media-page layouts", () => {
  const gridSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );

  assert.match(
    gridSource,
    /--mha-shell-statusbar-bottom-gap:\s*var\(--mha-page-padding\);/,
  );
  assert.match(
    gridSource,
    /\[data-status-bar-mode="top-bar"\][\s\S]*--mha-statusbar-reserved-top:\s*calc\([\s\S]*var\(--mha-statusbar-top-bar-height\)[\s\S]*var\(--mha-shell-statusbar-bottom-gap\)[\s\S]*\);/,
  );
  assert.match(
    gridSource,
    /\[data-status-bar-visible="true"\]:not\(\[data-status-bar-mode="hidden"\]\)\[data-media-page-active="true"\]\)\s+\.mha-widget-area\s*\{[\s\S]*--mha-widget-area-top-gutter:\s*var\(--mha-statusbar-reserved-top,\s*var\(--mha-page-padding\)\)\s*!important;/,
  );
});

test("mobile shell keeps the background viewport-anchored while widget content owns scrolling", () => {
  const gridSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );
  const backgroundSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "core", "background.css"),
    "utf8",
  );

  const mobileGridSection = gridSource.match(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\n\}/)?.[0] || "";
  const mobileBackgroundSection = backgroundSource.match(/@media\s*\(max-width:\s*767px\)\s*\{[\s\S]*?\n\}/)?.[0] || "";

  assert.match(
    mobileGridSection,
    /:host\s*\{[\s\S]*overflow-y:\s*hidden;/,
  );
  assert.match(
    mobileGridSection,
    /\.mha-shell\s*\{[\s\S]*block-size:\s*100dvh;[\s\S]*padding-inline:\s*0;[\s\S]*overflow:\s*hidden;/,
  );
  assert.match(
    mobileGridSection,
    /\.mha-workspace\s*\{[\s\S]*--mha-shell-content-bottom-inset:\s*var\(--mha-mobile-dock-footprint\)\s*!important;/,
  );
  assert.match(
    mobileGridSection,
    /\.mha-widget-area\s*\{[\s\S]*--mha-widget-area-edge-padding:\s*var\(--mha-mobile-grid-gutter\)\s*!important;[\s\S]*block-size:\s*100%;/,
  );
  assert.match(
    mobileGridSection,
    /\.mha-widget-area\s*\{[\s\S]*--mha-widget-area-top-gutter:\s*var\(--mha-mobile-content-top-space\)\s*!important;[\s\S]*padding-block-start:\s*var\(--mha-widget-area-top-gutter\)\s*!important;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]\) \.mha-page-panel--grid > \.mha-grid\s*\{[\s\S]*--mha-grid-padding-inline-start-runtime:\s*0px;[\s\S]*--mha-grid-padding-inline-end-runtime:\s*0px;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]\) \.mha-page-panel--grid > \.mha-grid\s*\{[\s\S]*--mha-grid-padding-block-start:\s*0px;[\s\S]*--mha-grid-padding-block-end:\s*0px;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-active-page-type="weather"\]\) \.mha-widget-area\s*\{[\s\S]*overflow-y:\s*auto;[\s\S]*touch-action:\s*pan-y;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-active-page-type="weather"\]\) \.mha-page-panel\[data-page-type="weather"\] > \.mha-grid\s*\{[\s\S]*block-size:\s*auto;[\s\S]*max-block-size:\s*none;/,
  );
  assert.doesNotMatch(
    gridSource,
    /:host\(\[data-layout="mobile"\]\) \.mha-page-panel--grid\s*\{[\s\S]*padding-block-start:\s*var\(--mha-page-padding\);/,
  );
  assert.match(
    mobileBackgroundSection,
    /\.mha-background\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*-20%;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\)\s*\{[\s\S]*--mha-mobile-grid-gutter:\s*clamp\(/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-shell\s*\{[\s\S]*row-gap:\s*0\s*!important;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-workspace\s*\{[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\);/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-dock-zone\s*\{[\s\S]*display:\s*none;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-widget-area\s*\{[\s\S]*grid-column:\s*1;[\s\S]*grid-row:\s*1;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-page-stage\s*\{[\s\S]*min-block-size:\s*100%;/,
  );
  assert.match(
    backgroundSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-background\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*-20%;/,
  );
});

test("media page mobile layout scrolls as snapped sheets in portrait and landscape", () => {
  const androidEdgeSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "core", "android-edge-to-edge.css"),
    "utf8",
  );
  const gridSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "widget-grid.css"),
    "utf8",
  );
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "pages", "media-page.css"),
    "utf8",
  );

  assert.match(
    gridSource,
    /:host\(\[data-media-page-active="true"\]\)\s+\.mha-widget-area\s*\{[\s\S]*overflow:\s*hidden;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-media-page-active="true"\]\)\s+\.mha-page-stage\s*\{[\s\S]*block-size:\s*100%;[\s\S]*min-block-size:\s*0;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]\[data-media-page-active="true"\]\)\s+\.mha-widget-area\s*\{[\s\S]*overflow-y:\s*hidden;[\s\S]*-webkit-overflow-scrolling:\s*auto;[\s\S]*touch-action:\s*pan-y;[\s\S]*overscroll-behavior-y:\s*contain;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]\[data-media-page-active="true"\]\)\s+\.mha-page-stage\s*\{[\s\S]*block-size:\s*100%;[\s\S]*min-block-size:\s*0;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\[data-media-page-active="true"\]\)\s+\.mha-page-stage\s*\{[\s\S]*block-size:\s*100%;[\s\S]*min-block-size:\s*0;/,
  );
  assert.match(
    source,
    /@media \(min-width:\s*768px\)\s*\{[\s\S]*\.mha-media-page-layout\s*\{[\s\S]*grid-template-columns:\s*repeat\(12,\s*minmax\(0,\s*1fr\)\);[\s\S]*\.mha-media-page-now-playing\s*\{[\s\S]*grid-column:\s*1\s*\/\s*span\s*6;[\s\S]*\.mha-media-page-widget-panel\s*\{[\s\S]*grid-column:\s*8\s*\/\s*span\s*5;/,
  );
  assert.match(
    source,
    /@media \(min-width:\s*768px\)\s*\{[\s\S]*\.mha-media-page-widget-panel-surface\s*\{[\s\S]*display:\s*contents;/,
  );
  assert.match(
    source,
    /\.mha-media-page\s*\{[\s\S]*overflow-anchor:\s*none;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page\s*\{[\s\S]*--mha-media-page-mobile-sheet-block-size:\s*100dvh;[\s\S]*padding-block:\s*0;[\s\S]*overflow-y:\s*auto;[\s\S]*scroll-snap-type:\s*y mandatory;[\s\S]*touch-action:\s*pan-y;/,
  );
  assert.match(
    source,
    /--mha-media-page-safe-block-end:\s*max\([\s\S]*var\(--mha-mobile-dock-footprint,\s*var\(--mha-safe-bottom,\s*0px\)\)/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-now-playing,\s*:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel-surface\s*\{[\s\S]*scroll-snap-align:\s*start;[\s\S]*scroll-snap-stop:\s*always;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-now-playing\s*\{[\s\S]*block-size:\s*var\(--mha-media-page-mobile-sheet-block-size\);[\s\S]*padding-block:\s*var\(--mha-media-page-safe-block-start\)\s+var\(--mha-media-page-safe-block-end\);/,
  );
  assert.match(
    androidEdgeSource,
    /:host\(\.mha-android-edge-to-edge\)\s*\{[\s\S]*--mha-statusbar-fill-bleed:\s*clamp\(/,
  );
  assert.match(
    source,
    /:host\(\.mha-android-edge-to-edge\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-media-page\s*\{[\s\S]*--mha-media-page-safe-block-start:\s*calc\([\s\S]*var\(--mha-safe-top,\s*0px\)[\s\S]*var\(--mha-statusbar-fill-bleed,\s*0px\)/,
  );
  assert.match(
    source,
    /:host\(\.mha-android-edge-to-edge\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-media-page-widget-panel\.mha-settings-sheet\s*\{[\s\S]*--mha-mobile-sheet-top-gap:\s*calc\([\s\S]*var\(--mha-safe-top,\s*0px\)[\s\S]*var\(--mha-statusbar-fill-bleed,\s*0px\)[\s\S]*--mha-mobile-sheet-max-height:\s*calc\(100dvh - var\(--mha-mobile-sheet-top-gap\)\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel-surface\s*\{[\s\S]*block-size:\s*var\(--mha-media-page-mobile-sheet-block-size\);[\s\S]*min-block-size:\s*var\(--mha-media-page-mobile-sheet-block-size\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel-body,\s*:host\(\[data-layout="mobile"\]\) \.mha-media-page-player-list\s*\{[\s\S]*block-size:\s*100%;[\s\S]*min-block-size:\s*0;/,
  );
  assert.match(
    source,
    /\.mha-media-page-widget-panel-surface\s*\{[\s\S]*position:\s*static;[\s\S]*pointer-events:\s*auto;/,
  );
  assert.match(
    source,
    /> \.mha-media-widget\.mha-media-page-player-widget\s*\{[\s\S]*--mha-media-padding:\s*var\(--mha-widget-content-inset\);[\s\S]*--mha-media-page-player-artwork-size:\s*calc\([\s\S]*100cqb[\s\S]*var\(--mha-media-padding\)[\s\S]*\);[\s\S]*grid-template-columns:\s*var\(--mha-media-page-player-artwork-size\) minmax\(0, 1fr\) max-content;/,
  );
  assert.match(
    source,
    /\.mha-media-page-player-widget\[data-media-page-player="true"\] > \.mha-media-widget-artwork\s*\{[\s\S]*inline-size:\s*100%;[\s\S]*block-size:\s*100%;[\s\S]*min-inline-size:\s*0;[\s\S]*aspect-ratio:\s*1;[\s\S]*align-self:\s*stretch;/,
  );
  assert.match(
    source,
    /:host\(:is\(\[data-theme-style="oneui"\], \[data-theme-style="material"\]\)\) \.mha-media-page \.mha-media-page-player-list > \.mha-media-page-auto-player \.mha-media-page-player-widget\[data-media-page-player="true"\] > \.mha-media-widget-artwork\s*\{[\s\S]*display:\s*grid;[\s\S]*position:\s*relative;[\s\S]*inset:\s*auto;[\s\S]*inline-size:\s*100%;[\s\S]*block-size:\s*100%;[\s\S]*aspect-ratio:\s*1;/,
  );
  assert.match(
    source,
    /\.mha-media-page-player-info \.mha-media-widget-text\s*\{[\s\S]*align-self:\s*end;[\s\S]*justify-self:\s*stretch;[\s\S]*text-align:\s*start;/,
  );
  assert.match(
    source,
    /\.mha-media-page-player-widget\[data-media-controls-mode="volume-only"\] > \.mha-media-widget-controls-shell\s*\{[\s\S]*align-self:\s*end;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\)[\s\S]*\.mha-media-page-player-info \.mha-media-widget-text\s*\{[\s\S]*grid-row:\s*1;[\s\S]*align-self:\s*end;/,
  );
  assert.match(
    source,
    /\.mha-media-page \.mha-media-page-player-list > \.mha-media-page-auto-player \.mha-media-page-player-widget\[data-media-page-player="true"\] \.mha-media-widget-source-badge\s*\{[\s\S]*display:\s*inline-flex;[\s\S]*background:\s*linear-gradient\([\s\S]*--mha-media-page-artwork-control-tint[\s\S]*var\(--mha-control-surface, var\(--mha-surface-secondary\)\);/,
  );
  assert.match(
    source,
    /--mha-media-page-surface:\s*var\(--mha-surface-panel, var\(--mha-widget-surface\)\);[\s\S]*--mha-media-page-panel-surface:\s*var\(--mha-panel-surface, var\(--mha-media-page-surface\)\);[\s\S]*--mha-media-page-on-surface:\s*var\(--mha-text-primary, var\(--mha-text\)\);/,
  );
  assert.match(
    source,
    /\.mha-media-page-player-list > \.mha-media-page-auto-player\[data-media-page-player="true"\]\s*\{[\s\S]*--mha-media-page-player-card-surface:\s*var\([\s\S]*--mha-widget-shell-surface,[\s\S]*--mha-surface-primary[\s\S]*background:\s*linear-gradient\([\s\S]*--mha-media-page-artwork-card-tint[\s\S]*var\(--mha-media-page-player-card-surface\);/,
  );
  assert.match(
    source,
    /\.mha-media-page-player-widget\[data-media-page-player="true"\]\s*\{[\s\S]*color:\s*var\(--mha-text-primary, var\(--mha-text\)\);[\s\S]*--mha-media-artwork-foreground:\s*var\(--mha-text-primary, var\(--mha-text\)\);[\s\S]*--mha-media-artwork-control-surface:\s*var\(--mha-control-surface, var\(--mha-surface-secondary\)\);/,
  );
  assert.match(
    source,
    /\.mha-media-page\[data-artwork-tone\] \.mha-media-page-now-playing \.mha-media-widget-title\s*\{[\s\S]*color:\s*var\(--mha-media-artwork-foreground\);/,
  );
  assert.doesNotMatch(source, /\.mha-media-page-player-widget\[data-artwork-tone=/);
  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-media-page\[data-artwork-palette="true"\]\s*\{[\s\S]*--mha-media-page-dynamic-panel-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 22%,[\s\S]*--mha-media-page-dynamic-card-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 28%,[\s\S]*--mha-media-page-dynamic-selected-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 40%,/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="material"\]\) \.mha-media-page\[data-artwork-palette="true"\]\s*\{[\s\S]*--mha-media-page-dynamic-panel-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 18%,[\s\S]*--mha-media-page-dynamic-card-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 26%,[\s\S]*--mha-media-page-dynamic-selected-surface:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 38%,/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="ios"\]\) \.mha-media-page\[data-artwork-palette="true"\]\s*\{[\s\S]*--mha-media-page-artwork-panel-tint:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 5%, transparent\);[\s\S]*--mha-media-page-artwork-card-tint:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 3%, transparent\);[\s\S]*--mha-media-page-artwork-selected-tint:\s*color-mix\(in srgb, var\(--mha-media-palette-surface\) 6%, transparent\);/,
  );
  assert.match(
    source,
    /\.mha-media-page-widget-panel\s*\{[\s\S]*background:\s*linear-gradient\([\s\S]*--mha-media-page-artwork-panel-tint[\s\S]*var\(--mha-media-page-panel-surface\);/,
  );
  assert.match(
    source,
    /:host\(:is\(\[data-theme-style="oneui"\], \[data-theme-style="material"\]\)\) \.mha-media-page\[data-artwork-palette="true"\] \.mha-media-page-widget-panel\s*\{[\s\S]*background:\s*var\(--mha-media-page-dynamic-panel-surface\);/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-media-page-widget-panel\s*\{[\s\S]*--mha-media-page-available-players-surface:\s*var\([\s\S]*--mha-oneui-mobile-dock-surface,[\s\S]*--mha-shell-dock-surface[\s\S]*--mha-panel-surface:\s*var\(--mha-media-page-available-players-surface\);[\s\S]*--mha-panel-filter:\s*var\(--mha-oneui-dock-filter\);/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-media-page \.mha-media-page-player-list > \.mha-media-page-auto-player\[data-media-page-player="true"\]\s*\{[\s\S]*--mha-media-page-player-card-surface:\s*var\(--mha-oneui-dock-item-surface\);[\s\S]*--mha-media-page-player-card-border:\s*var\(--mha-oneui-dock-item-border\);[\s\S]*box-shadow:\s*var\(--mha-oneui-dock-item-shadow\);/,
  );
  assert.match(
    source,
    /:host\(\[data-theme-style="oneui"\]\) \.mha-media-page \.mha-media-page-player-list > \.mha-media-page-auto-player\[data-media-page-player="true"\]\[data-selected="true"\]\s*\{[\s\S]*background:\s*linear-gradient\([\s\S]*--mha-media-page-artwork-selected-tint[\s\S]*var\(--mha-oneui-dock-active-surface\);[\s\S]*border-color:\s*transparent;[\s\S]*box-shadow:\s*none;/,
  );
  assert.match(
    source,
    /\.mha-media-page\[data-artwork-palette="true"\] \.mha-media-page-player-list > \.mha-media-page-auto-player\[data-media-page-player="true"\]:has\(> \.mha-media-page-player-widget:is\(\[data-media-state="playing"\], \[data-media-state="paused"\]\)\)\s*\{[\s\S]*background:\s*var\(--mha-media-page-dynamic-card-surface\);[\s\S]*border-color:\s*var\(--mha-media-page-dynamic-card-border\);/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\[data-media-page-active="true"\]\.is-mobile-floating-controls-hidden\) \.mha-dock\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\[data-media-players-sheet-open="true"\]\) \.mha-mobile-dock,[\s\S]*:host\(\[data-layout="mobile"\]\[data-media-players-sheet-open="true"\]\) \.mha-dock\s*\{[\s\S]*opacity:\s*0;[\s\S]*visibility:\s*hidden;[\s\S]*pointer-events:\s*none;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\)\s+\.mha-media-page-now-playing-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*\.9fr\) minmax\(0,\s*1fr\);[\s\S]*grid-template-rows:\s*auto auto auto;[\s\S]*align-content:\s*center;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-media-page-primary\s*\{[\s\S]*display:\s*contents;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-media-page \.mha-media-widget-text\s*\{[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*1;[\s\S]*text-align:\s*start;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-media-page-transport\s*\{[\s\S]*grid-row:\s*2;[\s\S]*align-self:\s*center;/,
  );
});

test("floating controls and settings sheet consume responsive variants instead of raw orientation for mobile landscape", () => {
  const floatingControlsSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "floating-controls.css"),
    "utf8",
  );
  const settingsPanelSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "settings", "settings-panel.css"),
    "utf8",
  );
  const settingsBottomSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "settings", "settings-bottom.css"),
    "utf8",
  );
  const panelSurfaceSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "panels", "panel-surface-contract.css"),
    "utf8",
  );
  const pageCreatorSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "panels", "page-creator.css"),
    "utf8",
  );
  const pageCreatorSheetSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "panels", "page-creator-sheet.css"),
    "utf8",
  );
  const widgetManagerSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "widget-manager", "widget-manager.css"),
    "utf8",
  );
  const dockSource = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "dock.css"),
    "utf8",
  );

  assert.match(
    floatingControlsSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-main-edit-button,\s*:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-add-widget-button,\s*:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-mobile-dock-launcher/,
  );
  assert.match(
    floatingControlsSource,
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\.is-mobile-floating-controls-hidden\) \.mha-main-edit-button/,
  );
  assert.match(
    floatingControlsSource,
    /:host\(\[data-layout="tablet"\]\) \.mha-primary-edit-button\[data-touch-edit-close="true"\]\s*\{[\s\S]*position:\s*absolute;/,
  );
  assert.match(
    floatingControlsSource,
    /:host\(\[data-layout="tablet"\]\.is-editing\) \.mha-add-widget-button:not\(\[hidden\]\)\s*\{[\s\S]*position:\s*absolute;[\s\S]*inset-inline-start:\s*max\(/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-sheet\s*\{[\s\S]*--mha-settings-sheet-hidden-transform:\s*translateX\(calc\(100% \+ clamp\(1rem, 2\.6vw, 2rem\)\)\);[\s\S]*transform:\s*var\(--mha-settings-sheet-hidden-transform\);[\s\S]*transform-origin:\s*right center;/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*--mha-settings-sheet-hidden-transform:\s*translateY\(110dvh\);[\s\S]*--mha-settings-sheet-visible-transform:\s*translateY\(0\);[\s\S]*opacity:\s*1;[\s\S]*transform:\s*var\(--mha-settings-sheet-hidden-transform\);[\s\S]*transition:[\s\S]*transform var\(--mha-panel-visibility-duration, 360ms\) cubic-bezier\(\.22,1,.36,1\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-panel-swap-state\] \.mha-settings-sheet\s*\{[\s\S]*animation-duration:\s*var\(--mha-panel-visibility-duration, 360ms\);[\s\S]*-webkit-backdrop-filter:\s*none;[\s\S]*backdrop-filter:\s*none;/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-backdrop\s*\{[\s\S]*z-index:\s*109;[\s\S]*background:\s*var\(--mha-scrim-surface, var\(--mha-surface-scrim, var\(--mha-bg-overlay\)\)\);[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/,
  );
  assert.match(
    settingsPanelSource,
    /:host\(\[data-theme-style="ios"\]\) \.mha-settings-backdrop,\s*:host\(\[data-theme-style="oneui"\]\) \.mha-settings-backdrop\s*\{[\s\S]*-webkit-backdrop-filter:\s*var\(--mha-backdrop-filter, var\(--mha-shell-filter, none\)\);[\s\S]*backdrop-filter:\s*var\(--mha-backdrop-filter, var\(--mha-shell-filter, none\)\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-backdrop\[data-active="true"\]\s*\{[\s\S]*opacity:\s*var\(--mha-scrim-opacity, 1\);/,
  );
  assert.match(
    settingsPanelSource,
    /:host\(\[data-theme-style="ios"\]\.is-settings-open\) \.mha-background,[\s\S]*:host\(\[data-theme-style="oneui"\]\.is-screensaver-settings-open\) \.mha-edit-button\s*\{[\s\S]*-webkit-filter:\s*saturate\(var\(--mha-backdrop-saturation, \.82\)\) brightness\(var\(--mha-backdrop-brightness, \.86\)\);[\s\S]*filter:\s*saturate\(var\(--mha-backdrop-saturation, \.82\)\) brightness\(var\(--mha-backdrop-brightness, \.86\)\);/,
  );
  assert.match(
    settingsPanelSource,
    /@supports \(filter: blur\(1px\)\)\s*\{[\s\S]*:host\(\[data-theme-style="ios"\]\.is-settings-open\) \.mha-background,[\s\S]*filter:\s*var\(--mha-backdrop-filter, blur\(var\(--mha-backdrop-blur, 10px\)\) saturate\(var\(--mha-backdrop-saturation, \.82\)\) brightness\(var\(--mha-backdrop-brightness, \.86\)\)\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-panel-swap-state\] \.mha-settings-scrim\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-settings-scope\]\[data-open="true"\] \.mha-settings-scrim\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*auto;/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-panel-swap-state="entering"\] \.mha-settings-sheet\s*\{[\s\S]*animation-name:\s*mha-settings-panel-sheet-in;[\s\S]*animation-delay:\s*120ms;/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*inset-inline:\s*0;[\s\S]*inset-block-start:\s*auto;[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*auto;[\s\S]*max-block-size:\s*var\(--mha-mobile-sheet-max-height\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-landscape="true"\] \.mha-settings-accent-swatches\s*\{[\s\S]*grid-template-columns:\s*repeat\(10, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    settingsBottomSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*bottom:\s*0;[\s\S]*top:\s*auto;[\s\S]*height:\s*auto;[\s\S]*max-height:\s*var\(--mha-mobile-sheet-max-height\);/,
  );
  assert.match(
    panelSurfaceSource,
    /\[data-mobile-presentation="sheet"\] > \[role="dialog"\]\s*\{[\s\S]*inset-block-start:\s*auto;[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*auto;[\s\S]*max-block-size:\s*var\(--mha-mobile-sheet-max-height\);[\s\S]*border-start-start-radius:\s*var\(--mha-mobile-sheet-top-radius\);/,
  );
  assert.match(
    pageCreatorSheetSource,
    /\.mha-page-creator\[data-mobile-presentation="sheet"\] \.mha-page-creator-sheet\s*\{[\s\S]*inset-block-start:\s*auto;[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*auto;[\s\S]*max-block-size:\s*var\(--mha-mobile-sheet-max-height\);/,
  );
  assert.match(
    pageCreatorSource,
    /\.mha-page-creator\s*\{[\s\S]*place-items:\s*center end;/,
  );
  assert.match(
    pageCreatorSource,
    /\.mha-page-creator-sheet\s*\{[\s\S]*transform:\s*translateX\(calc\(100% \+ clamp\(1rem, 4vw, 2rem\)\)\);[\s\S]*transform-origin:\s*right center;/,
  );
  assert.match(
    pageCreatorSource,
    /@media \(max-width: 767px\)\s*\{[\s\S]*:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-page-creator\[data-mobile-presentation="sheet"\]\s*\{[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;[\s\S]*transition:\s*none;/,
  );
  assert.match(
    pageCreatorSource,
    /@media \(max-width: 767px\)\s*\{[\s\S]*:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-page-creator\[data-open="true"\]\[data-mobile-presentation="sheet"\]\s*\{[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*auto;/,
  );
  assert.match(
    pageCreatorSource,
    /@media \(max-width: 767px\)\s*\{[\s\S]*:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-page-creator\[data-mobile-presentation="sheet"\] \.mha-page-creator-scrim\s*\{[\s\S]*z-index:\s*0;[\s\S]*opacity:\s*0;[\s\S]*pointer-events:\s*none;[\s\S]*transition:\s*opacity 180ms ease;/,
  );
  assert.match(
    pageCreatorSource,
    /@media \(max-width: 767px\)\s*\{[\s\S]*:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\) \.mha-page-creator\[data-mobile-presentation="sheet"\] \.mha-page-creator-sheet\s*\{[\s\S]*z-index:\s*1;[\s\S]*opacity:\s*1;[\s\S]*pointer-events:\s*none;[\s\S]*transform:\s*translateY\(28px\);[\s\S]*transition:\s*transform var\(--mha-panel-visibility-duration, 300ms\) cubic-bezier\(\.22,1,.36,1\);/,
  );
  assert.doesNotMatch(
    widgetManagerSource,
    /@media\s*\(orientation:\s*landscape\)\s*\{[\s\S]*:host\(\[data-layout="mobile"\]\) \.mha-widget-manager-panel\s*\{[\s\S]*display:\s*none\s*!important;/,
  );
  assert.match(
    dockSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-dock\s*\{[\s\S]*display:\s*flex;[\s\S]*flex-direction:\s*column;/,
  );
});
