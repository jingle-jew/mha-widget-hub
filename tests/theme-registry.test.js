import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  getDefaultIconShape,
  getDefaultThemeStyle,
  getDefaultThemeVariant,
  getThemeAccentContract,
  getThemeCssPaths,
  getThemeDockCssPaths,
  getThemeDockDefinition,
  getThemeDefinition,
  getThemeDefinitions,
  getThemeStyleIds,
  getThemeStyleOptions,
  getThemeVariantOptions,
  getThemeVariants,
  normalizeThemeVariantSelection,
} from "../src/settings/theme-registry.js";
import { getAccentOptions } from "../src/settings/accent-palettes.js";

describe("theme registry", () => {
  it("exposes the registered theme styles in display order", () => {
    assert.deepEqual(getThemeStyleIds(), ["ios", "oneui", "material", "alexa"]);
    assert.deepEqual(getThemeStyleOptions(), [
      { value: "ios", label: "iOS" },
      { value: "oneui", label: "OneUI" },
      { value: "material", label: "Material You" },
      { value: "alexa", label: "Alexa" },
    ]);
  });

  it("exposes theme CSS paths from the registry", () => {
    assert.deepEqual(getThemeCssPaths(), [
      "styles/themes/ios.css",
      "styles/themes/oneui.css",
      "styles/themes/material.css",
      "styles/themes/alexa.css",
    ]);
  });

  it("exposes optional dock CSS paths separately from base theme CSS", () => {
    assert.deepEqual(getThemeDockCssPaths(), [
      "styles/themes/ios-dock.css",
      "styles/themes/oneui-dock.css",
      "styles/themes/material-dock.css",
    ]);
  });

  it("keeps the existing default theme and icon shapes", () => {
    assert.equal(getDefaultThemeStyle(), "oneui");
    assert.equal(getDefaultIconShape("ios"), "rounded-square");
    assert.equal(getDefaultIconShape("oneui"), "squircle");
    assert.equal(getDefaultIconShape("material"), "circle");
    assert.equal(getDefaultIconShape("alexa"), "circle");
  });

  it("falls back to the default theme for unknown theme styles", () => {
    assert.equal(getThemeDefinition("unknown").id, "oneui");
    assert.equal(getDefaultIconShape("unknown"), "squircle");
  });

  it("normalizes a theme-level dock manifest contract", () => {
    assert.deepEqual(getThemeDockDefinition("oneui"), {
      usesDock: true,
      contentBuilder: "oneui-default",
      css: ["styles/themes/oneui-dock.css"],
      supportedPositions: ["left", "right", "bottom"],
    });
    assert.deepEqual(getThemeDockDefinition("unknown"), getThemeDockDefinition("oneui"));
  });

  it("normalizes the future variant contract without changing current consumers", () => {
    assert.deepEqual(getThemeVariants("ios"), [
      { id: "liquid", label: "Liquid Glass", order: 10, default: true },
      { id: "frosted", label: "Frosted Glass", order: 20, default: false },
    ]);
    assert.deepEqual(getThemeVariantOptions("ios"), [
      { value: "liquid", label: "Liquid Glass" },
      { value: "frosted", label: "Frosted Glass" },
    ]);
    assert.equal(getDefaultThemeVariant("ios"), "liquid");
    assert.deepEqual(getThemeVariants("oneui"), []);
    assert.deepEqual(getThemeVariantOptions("oneui"), []);
    assert.equal(getDefaultThemeVariant("oneui"), "");
  });

  it("normalizes theme variant selections", () => {
    assert.equal(normalizeThemeVariantSelection("ios", "frosted"), "frosted");
    assert.equal(normalizeThemeVariantSelection("ios", "unknown"), "liquid");
    assert.equal(normalizeThemeVariantSelection("oneui", "anything"), "");
    assert.equal(normalizeThemeVariantSelection("unknown", "anything"), "");
  });

  it("exposes accent options from the theme registry", () => {
    const ios = getThemeAccentContract("ios");
    const oneui = getThemeAccentContract("oneui");
    const material = getThemeAccentContract("material");
    const alexa = getThemeAccentContract("alexa");

    assert.equal(ios.accents.length, 19);
    assert.equal(oneui.accents.length, 19);
    assert.equal(material.accents.length, 19);
    assert.equal(alexa.accents.length, 11);

    assert.equal(ios.defaultAccent, "blue");
    assert.equal(oneui.defaultAccent, "sky");
    assert.equal(material.defaultAccent, "purple");
    assert.equal(alexa.defaultAccent, "cyan");

    assert.equal(ios.supportsAutoAccent, true);
    assert.equal(oneui.supportsAutoAccent, true);
    assert.equal(material.supportsAutoAccent, true);
    assert.equal(alexa.supportsAutoAccent, true);

    assert.deepEqual(getThemeAccentContract("unknown"), oneui);
  });

  it("keeps accent options compatible with accent-palettes consumers", () => {
    assert.deepEqual(getAccentOptions("ios"), getThemeAccentContract("ios").accents);
    assert.deepEqual(getAccentOptions("oneui"), getThemeAccentContract("oneui").accents);
    assert.deepEqual(getAccentOptions("material"), getThemeAccentContract("material").accents);
    assert.deepEqual(getAccentOptions("alexa"), getThemeAccentContract("alexa").accents);
    assert.deepEqual(getAccentOptions("unknown"), getThemeAccentContract("oneui").accents);
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
