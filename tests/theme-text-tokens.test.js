import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const contract = readFileSync(
  new URL("../styles/themes/light-text-contract.css", import.meta.url),
  "utf8",
);

const expectedPalettes = [
  {
    selector: ':host([data-theme-style="ios"][data-theme="light"])',
    values: [
      "--mha-text-primary: rgba(0,0,0,.92);",
      "--mha-text-secondary: rgba(0,0,0,.62);",
      "--mha-text-tertiary: rgba(0,0,0,.42);",
      "--mha-text-disabled: rgba(0,0,0,.24);",
    ],
  },
  {
    selector: ':host([data-theme-style="ios"][data-theme="dark"])',
    values: [
      "--mha-text-primary: rgba(255,255,255,.92);",
      "--mha-text-secondary: rgba(255,255,255,.68);",
      "--mha-text-tertiary: rgba(255,255,255,.48);",
      "--mha-text-disabled: rgba(255,255,255,.28);",
    ],
  },
  {
    selector: ':host([data-theme-style="oneui"][data-theme="light"])',
    values: [
      "--mha-text-primary: rgba(0,0,0,.88);",
      "--mha-text-secondary: rgba(0,0,0,.68);",
      "--mha-text-tertiary: rgba(0,0,0,.52);",
      "--mha-text-disabled: rgba(0,0,0,.32);",
    ],
  },
  {
    selector: ':host([data-theme-style="oneui"][data-theme="dark"])',
    values: [
      "--mha-text-primary: rgba(255,255,255,.96);",
      "--mha-text-secondary: rgba(255,255,255,.78);",
      "--mha-text-tertiary: rgba(255,255,255,.58);",
      "--mha-text-disabled: rgba(255,255,255,.34);",
    ],
  },
];

test("OneUI and iOS expose stable four-level text palettes", () => {
  for (const palette of expectedPalettes) {
    const start = contract.indexOf(palette.selector);
    assert.notEqual(start, -1, `missing ${palette.selector}`);
    const block = contract.slice(start, contract.indexOf("}", start) + 1);
    for (const value of palette.values) {
      assert.match(block, new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }
});

test("legacy muted text remains a tertiary compatibility alias", () => {
  assert.match(contract, /--mha-text-muted:\s*var\(--mha-text-tertiary\);/);
});
