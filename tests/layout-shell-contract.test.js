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
    /\.mha-workspace\s*\{[\s\S]*--mha-shell-content-bottom-inset:\s*calc\(/,
  );
  assert.match(
    mobileGridSection,
    /\.mha-widget-area\s*\{[\s\S]*--mha-widget-area-edge-padding:\s*var\(--mha-mobile-grid-gutter\)\s*!important;[\s\S]*block-size:\s*100%;/,
  );
  assert.match(
    gridSource,
    /:host\(\[data-layout="mobile"\]\) \.mha-page-panel--grid > \.mha-grid\s*\{[\s\S]*--mha-grid-padding-inline-start-runtime:\s*0px;[\s\S]*--mha-grid-padding-inline-end-runtime:\s*0px;/,
  );
  assert.match(
    mobileBackgroundSection,
    /\.mha-background\s*\{[\s\S]*position:\s*fixed;[\s\S]*inset:\s*-20%;/,
  );
});
