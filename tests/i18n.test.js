import test from "node:test";
import assert from "node:assert/strict";
import {
  configureI18n,
  detectLanguage,
  getLanguage,
  normalizeLanguage,
  setLanguage,
  t,
} from "../src/i18n/index.js";
import { en } from "../src/i18n/en.js";
import { fr } from "../src/i18n/fr.js";
import { es } from "../src/i18n/es.js";

function flattenKeys(source, prefix = "") {
  return Object.entries(source).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === "object"
      ? flattenKeys(value, path)
      : [path];
  });
}

test("i18n normalizes supported regional language tags", () => {
  assert.equal(normalizeLanguage("fr-CA"), "fr");
  assert.equal(normalizeLanguage("fr_FR"), "fr");
  assert.equal(normalizeLanguage("en-US"), "en");
  assert.equal(normalizeLanguage("es-MX"), "es");
  assert.equal(normalizeLanguage("de-DE"), "en");
});

test("i18n detects config before Home Assistant and navigator languages", () => {
  assert.equal(detectLanguage({
    config: { preferences: { language: "es-ES" } },
    hass: { locale: { language: "fr-CA" } },
    navigatorLanguage: "en-US",
  }), "es");

  assert.equal(detectLanguage({
    hass: { locale: { language: "fr-CA" } },
    navigatorLanguage: "es-MX",
  }), "fr");

  assert.equal(detectLanguage({
    navigatorLanguage: "es-MX",
  }), "es");
});

test("i18n translates, interpolates, and falls back to English", () => {
  setLanguage("fr-CA");
  assert.equal(getLanguage(), "fr");
  assert.equal(t("common.save", "Save"), "Enregistrer");
  assert.equal(t("widgets.config.buttonIndex", "Button {count}", { count: 3 }), "Bouton 3");
  assert.equal(t("missing.key", "Fallback text"), "Fallback text");

  setLanguage("es-MX");
  assert.equal(t("settings.title", "Settings"), "Ajustes");

  configureI18n({ navigatorLanguage: "en-US" });
  assert.equal(getLanguage(), "en");
  assert.equal(t("common.save", "Save"), "Save");
});

test("i18n dictionaries keep language keys aligned", () => {
  const englishKeys = flattenKeys(en).sort();
  assert.deepEqual(flattenKeys(fr).sort(), englishKeys);
  assert.deepEqual(flattenKeys(es).sort(), englishKeys);
});
