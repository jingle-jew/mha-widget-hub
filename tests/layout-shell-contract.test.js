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

test("media page mobile layout scrolls as snapped sheets in portrait and landscape", () => {
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
    /:host\(\[data-layout="mobile"\]:not\(\[data-layout-variant="mobile-landscape"\]\)\[data-media-page-active="true"\]\)\s+\.mha-page-stage\s*\{[\s\S]*block-size:\s*calc\([\s\S]*100%[\s\S]*var\(--mha-shell-content-bottom-inset,\s*var\(--mha-mobile-dock-footprint,\s*0px\)\)[\s\S]*\);/,
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
    /\.mha-media-page\s*\{[\s\S]*overflow-anchor:\s*none;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page\s*\{[\s\S]*overflow-y:\s*auto;[\s\S]*scroll-snap-type:\s*y mandatory;[\s\S]*touch-action:\s*pan-y;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-now-playing,\s*:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel\s*\{[\s\S]*scroll-snap-align:\s*start;[\s\S]*scroll-snap-stop:\s*always;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout="mobile"\]\) \.mha-media-page-widget-panel\s*\{[\s\S]*min-block-size:\s*max\([\s\S]*var\(--mha-media-page-mobile-sheet-block-size\),[\s\S]*var\(--mha-grid-track-height, 100%\)/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\)\s+\.mha-media-page-now-playing-shell\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*\.9fr\) minmax\(0,\s*1fr\);[\s\S]*grid-template-rows:\s*minmax\(0,\s*1fr\) auto;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-media-page-primary\s*\{[\s\S]*display:\s*contents;/,
  );
  assert.match(
    source,
    /:host\(\[data-layout-variant="mobile-landscape"\]\) \.mha-media-page-transport\s*\{[\s\S]*grid-row:\s*1;[\s\S]*align-self:\s*end;/,
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
