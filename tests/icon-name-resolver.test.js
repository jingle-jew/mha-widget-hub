import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeIconResolverText,
  resolveWidgetIconName,
} from "../src/ui/icon-name-resolver.js";

test("icon resolver preserves explicit icons over automatic label matching", () => {
  assert.equal(resolveWidgetIconName({ explicitIcon: "star", label: "Cafe" }), "star");
});

test("icon resolver treats explicit auto like an implicit icon", () => {
  assert.equal(resolveWidgetIconName({ explicitIcon: "auto", label: "Cafe" }), "coffee");
});
test("icon resolver resolves automatic icons from normalized labels", () => {
  assert.equal(resolveWidgetIconName({ label: "Lampe salon" }), "lamp");
  assert.equal(resolveWidgetIconName({ label: "TV salon" }), "tv");
  assert.equal(resolveWidgetIconName({ label: "Ventilateur chambre" }), "fan");
  assert.equal(resolveWidgetIconName({ label: "Eclairage cuisine" }), "lamp");
  assert.equal(resolveWidgetIconName({ label: "Télévision du salon" }), "tv");
  assert.equal(resolveWidgetIconName({ label: "Ventilo bureau" }), "fan");
  assert.equal(resolveWidgetIconName({ label: "Radiateur chambre" }), "flame");
  assert.equal(resolveWidgetIconName({ label: "Air climatisé salon" }), "snowflake");
  assert.equal(resolveWidgetIconName({ label: "Prise connectée bureau" }), "plug");
  assert.equal(resolveWidgetIconName({ label: "Haut-parleur cuisine" }), "device-speaker");
  assert.equal(resolveWidgetIconName({ label: "Home cinema" }), "movie");
  assert.equal(resolveWidgetIconName({ label: "SDB invités" }), "bathroom");
  assert.equal(resolveWidgetIconName({ label: "Sofa salon" }), "living-room");
  assert.equal(resolveWidgetIconName({ label: "Lit principal" }), "bedroom");
  assert.equal(resolveWidgetIconName({ label: "Table de chevet gauche" }), "bedroom");
  assert.equal(resolveWidgetIconName({ label: "Frigo cuisine" }), "kitchen");
  assert.equal(resolveWidgetIconName({ label: "Bureau travail" }), "office");
});

test("icon resolver falls back to domain and widget fallback when no label match exists", () => {
  assert.equal(resolveWidgetIconName({ entityId: "switch.tv", fallback: "button" }), "toggle");
  assert.equal(resolveWidgetIconName({ label: "Nom inconnu", fallback: "toggle" }), "toggle");
});

test("icon resolver normalizes accents and casing safely", () => {
  assert.equal(normalizeIconResolverText("Café"), "cafe");
  assert.equal(normalizeIconResolverText("Éclairage"), "eclairage");
  assert.equal(normalizeIconResolverText(null), "");
  assert.equal(normalizeIconResolverText(42), "42");
});
