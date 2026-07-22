import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const styles = readFileSync(
  new URL("../styles/widgets/toggle-slider-widget.css", import.meta.url),
  "utf8",
);

test("toggle-slider keeps toggle hit targets inside the toggle row", () => {
  const toggleRootRule = styles.match(
    /\.combined-toggle-slider__toggle\s*>\s*\.mha-toggle-widget\s*\{([^}]*)\}/,
  )?.[1] || "";

  assert.match(toggleRootRule, /position:\s*relative\s*;/);
  assert.doesNotMatch(toggleRootRule, /position:\s*static\s*;/);
});

test("toggle-slider restores pointer hit testing on the native range input", () => {
  const sliderInputRule = styles.match(
    /\.combined-toggle-slider__control\s+\.mha-slider-input\s*\{([^}]*)\}/,
  )?.[1] || "";

  assert.match(sliderInputRule, /pointer-events:\s*auto\s*;/);
});
