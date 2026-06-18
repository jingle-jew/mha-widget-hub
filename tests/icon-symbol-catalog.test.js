import test from "node:test";
import assert from "node:assert/strict";
import { getIconSymbol } from "../src/icons/icon-symbol-catalog.js";

test("icon symbol catalog exposes the new media and system icons", () => {
  const requiredIcons = [
    "speaker-on",
    "speaker-off",
    "mute",
    "volume-low",
    "volume-medium",
    "volume-high",
    "play",
    "pause",
    "play-pause",
    "next",
    "previous",
    "loop",
    "shuffle",
    "lightbulb-on",
    "lightbulb-off",
    "gear",
    "gear-shield",
    "gear-wifi",
    "shield",
    "wifi",
    "home",
    "room",
    "sensor",
    "thermometer",
    "humidity",
    "power",
    "lock",
    "unlock",
    "user",
    "users",
    "permission",
    "admin",
    "warning",
    "info",
    "check",
    "close",
    "plus",
    "minus",
    "edit",
    "trash",
    "search",
    "filter",
    "reset",
    "save",
    "refresh",
  ];

  requiredIcons.forEach((name) => {
    const symbol = getIconSymbol(name);
    assert.ok(symbol, `${name} should exist`);
    assert.equal(symbol.viewBox, "0 0 24 24");
    assert.ok(symbol.path.length > 0, `${name} should expose a path`);
  });
});

test("icon symbol catalog resolves useful aliases", () => {
  assert.equal(getIconSymbol("volume-off")?.name, "speaker-off");
  assert.equal(getIconSymbol("mute")?.name, "mute");
  assert.equal(getIconSymbol("volume-muted")?.name, "volume-muted");
  assert.equal(getIconSymbol("skip-next")?.name, "next");
  assert.equal(getIconSymbol("skip-previous")?.name, "previous");
});
