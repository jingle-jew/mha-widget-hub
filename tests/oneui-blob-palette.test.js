import test from "node:test";
import assert from "node:assert/strict";

import { deriveOneUiBlobPalette } from "../src/settings/accent-palettes.js";

test("OneUI blob palette derives four distinct sibling colors from a named accent", () => {
  const palette = deriveOneUiBlobPalette("sky");
  const colors = Object.values(palette);

  assert.equal(colors.length, 4);
  assert.equal(new Set(colors).size, 4);
  assert.ok(colors.every((color) => color.startsWith("rgb(")));
  assert.ok(!colors.includes("rgb(75 163 255)"));
});

test("OneUI blob palette can derive sibling colors from an auto accent CSS color", () => {
  const palette = deriveOneUiBlobPalette("sky", "hsl(210 72% 58%)");
  const colors = Object.values(palette);

  assert.equal(colors.length, 4);
  assert.equal(new Set(colors).size, 4);
  assert.ok(colors.every((color) => color.startsWith("rgb(")));
});
