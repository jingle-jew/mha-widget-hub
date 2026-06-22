import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultIconShape,
  getDefaultThemeStyle,
  getDefaultThemeVariant,
  getThemeAccentContract,
  getThemeCssPaths,
  getThemeDefinition,
  getThemeDefinitions,
  getThemeStyleIds,
  getThemeStyleOptions,
  getThemeVariants,
} from "../src/settings/theme-registry.js";

describe("theme registry", () => {
  it("exposes the registered theme styles in display order", () => {
    assert.deepEqual(getThemeStyleIds(), ["ios", "oneui", "material"]);
    assert.deepEqual(getThemeStyleOptions(), [
      { value: "ios", label: "iOS" },
      { value: "oneui", label: "OneUI" },
      { value: "material", label: "Material You" },
    ]);
  });

  it("exposes theme CSS paths from the registry", () => {
    assert.deepEqual(getThemeCssPaths(), [
      "styles/themes/ios.css",
      "styles/themes/oneui.css",
      "styles/themes/material.css",
    ]);
  });

  it("keeps the existing default theme and icon shapes", () => {
    assert.equal(getDefaultThemeStyle(), "oneui");
    assert.equal(getDefaultIconShape("ios"), "rounded-square");
    assert.equal(getDefaultIconShape("oneui"), "squircle");
    assert.equal(getDefaultIconShape("material"), "circle");
  });

  it("falls back to the default theme for unknown theme styles", () => {
    assert.equal(getThemeDefinition("unknown").id, "oneui");
    assert.equal(getDefaultIconShape("unknown"), "squircle");
  });

  it("normalizes the future variant contract without changing current consumers", () => {
    assert.deepEqual(getThemeVariants("ios"), [
      { id: "liquid", label: "Liquid Glass", order: 10, default: true },
      { id: "frosted", label: "Frosted Glass", order: 20, default: false },
    ]);
    assert.equal(getDefaultThemeVariant("ios"), "liquid");
    assert.deepEqual(getThemeVariants("oneui"), []);
    assert.equal(getDefaultThemeVariant("oneui"), "");
  });

  it("exposes the accent defaults owned by the theme registry", () => {
    assert.deepEqual(getThemeAccentContract("ios"), {
      accents: [],
      defaultAccent: "blue",
      supportsAutoAccent: true,
    });
    assert.deepEqual(getThemeAccentContract("oneui"), {
      accents: [],
      defaultAccent: "sky",
      supportsAutoAccent: true,
    });
    assert.deepEqual(getThemeAccentContract("material"), {
      accents: [],
      defaultAccent: "purple",
      supportsAutoAccent: true,
    });
    assert.deepEqual(getThemeAccentContract("unknown"), getThemeAccentContract("oneui"));
  });

  it("keeps theme definitions immutable", () => {
    const definition = getThemeDefinitions()[0];
    assert(Object.isFrozen(definition));
    assert(Object.isFrozen(definition.css));
    assert(Object.isFrozen(definition.aliases));
    assert(Object.isFrozen(definition.wallpaper));
    assert(Object.isFrozen(definition.variants));
  });
});
