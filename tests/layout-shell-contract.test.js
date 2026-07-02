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

test("side docks mirror the shell top inset with a shell-owned bottom inset", () => {
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
    /:host\(\[data-dock-position="left"\]\) \.mha-workspace\s*\{[\s\S]*?--mha-shell-content-bottom-inset:\s*var\(--mha-shell-content-top-inset\)\s*!important;/,
  );
  assert.match(
    source,
    /:host\(\[data-dock-position="right"\]\) \.mha-workspace,\s*:host\(:not\(\[data-dock-position\]\)\) \.mha-workspace\s*\{[\s\S]*?--mha-shell-content-bottom-inset:\s*var\(--mha-shell-content-top-inset\)\s*!important;/,
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
