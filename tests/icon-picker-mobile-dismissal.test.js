import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shouldAutoFocusIconPickerSearch } from "../src/widget-config/icon-picker.js";

const pickerSource = readFileSync(
  new URL("../src/widget-config/icon-picker.js", import.meta.url),
  "utf8",
);
const pickerStyles = readFileSync(
  new URL("../styles/components/icon-picker.css", import.meta.url),
  "utf8",
);

test("mobile icon picker owns the outside-tap layer without changing desktop dismissal", () => {
  assert.match(
    pickerSource,
    /if \(!isExpanded\(\) \|\| !panel\.isConnected \|\| !isMobileViewport\(\)\) \{\s*backdrop\.remove\(\)/,
  );
  assert.match(
    pickerSource,
    /backdrop\.addEventListener\("pointerdown",[\s\S]*?event\.preventDefault\(\);\s*event\.stopPropagation\(\)/,
  );
  assert.match(
    pickerSource,
    /backdrop\.addEventListener\("click",[\s\S]*?event\.stopPropagation\(\);\s*closePanel\(\)/,
  );
  assert.match(pickerSource, /eventPath\.includes\(backdrop\)/);
  assert.match(
    pickerStyles,
    /\.mha-widget-icon-picker-backdrop\s*\{[\s\S]*?position:\s*fixed;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*9999;/,
  );
});

test("icon picker autofocuses search only in the desktop layout", () => {
  assert.equal(shouldAutoFocusIconPickerSearch({ layout: "mobile", viewportWidth: 390 }), false);
  assert.equal(shouldAutoFocusIconPickerSearch({ layout: "tablet", viewportWidth: 1180 }), false);
  assert.equal(shouldAutoFocusIconPickerSearch({ layout: "desktop", viewportWidth: 1180 }), true);
  assert.equal(shouldAutoFocusIconPickerSearch({ viewportWidth: 1399 }), false);
  assert.equal(shouldAutoFocusIconPickerSearch({ viewportWidth: 1400 }), true);
});
