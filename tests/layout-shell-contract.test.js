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

test("frame alignment stylesheet no longer pilots grid alignment directly from dock position", () => {
  const source = fs.readFileSync(
    path.join(REPO_ROOT, "styles", "layout", "frame-alignment.css"),
    "utf8",
  );

  assert.doesNotMatch(source, /data-dock-position=.*mha-grid/);
  assert.doesNotMatch(source, /--mha-grid-track-justify:\s*(start|end|center)/);
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
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-workspace\s*\{[\s\S]*grid-template-columns:\s*var\(--mha-dock-zone-width\) minmax\(0, 1fr\);/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-dock-zone\s*\{[\s\S]*display:\s*grid;[\s\S]*grid-column:\s*1;/,
  );
  assert.match(
    backgroundSource,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-background\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*-20%;/,
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
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*transform:\s*translateY\(18px\) scale\(\.98\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*inset-inline:\s*0;[\s\S]*inset-block-start:\s*var\(--mha-mobile-sheet-top-gap\);[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*var\(--mha-mobile-sheet-height\);/,
  );
  assert.match(
    settingsPanelSource,
    /\.mha-settings-panel\[data-mobile-landscape="true"\] \.mha-settings-accent-swatches\s*\{[\s\S]*grid-template-columns:\s*repeat\(10, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    settingsBottomSource,
    /\.mha-settings-panel\[data-mobile-layout="true"\] \.mha-settings-sheet\s*\{[\s\S]*position:\s*fixed;[\s\S]*bottom:\s*0;[\s\S]*top:\s*var\(--mha-mobile-sheet-top-gap\);[\s\S]*height:\s*var\(--mha-mobile-sheet-height\);/,
  );
  assert.match(
    panelSurfaceSource,
    /\[data-mobile-presentation="sheet"\] > \[role="dialog"\]\s*\{[\s\S]*inset-block-start:\s*var\(--mha-mobile-sheet-top-gap\);[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*var\(--mha-mobile-sheet-height\);[\s\S]*border-radius:\s*0;/,
  );
  assert.match(
    pageCreatorSheetSource,
    /\.mha-page-creator\[data-mobile-presentation="sheet"\] \.mha-page-creator-sheet\s*\{[\s\S]*inset-block-start:\s*var\(--mha-mobile-sheet-top-gap\);[\s\S]*inset-block-end:\s*0;[\s\S]*block-size:\s*var\(--mha-mobile-sheet-height\);/,
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
