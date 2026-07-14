import test from "node:test";
import assert from "node:assert/strict";
import { getIconSymbol } from "../src/icons/icon-symbol-catalog.js";
import {
  resolveTablerIconForMhaName,
  TABLER_ICON_CATALOG,
  TABLER_ICON_REGISTRY,
} from "../src/ui/tabler-icons.js";
import { ICON_PICKER_INVENTORY } from "../src/widget-config/icon-picker.js";

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

test("Tabler provider resolves the first migrated MHA icon names", () => {
  assert.equal(resolveTablerIconForMhaName("apps")?.name, "apps");
  assert.equal(resolveTablerIconForMhaName("coffee")?.name, "coffee");
  assert.equal(resolveTablerIconForMhaName("tv")?.name, "device-tv");
  assert.equal(resolveTablerIconForMhaName("lamp")?.name, "lamp");
  assert.equal(resolveTablerIconForMhaName("fan")?.name, "propeller");
  assert.equal(resolveTablerIconForMhaName("home")?.name, "home");
  assert.equal(resolveTablerIconForMhaName("grid")?.name, "layout-grid");
  assert.equal(resolveTablerIconForMhaName("gear")?.name, "settings");
  assert.equal(resolveTablerIconForMhaName("media-player")?.name, "device-speaker");
  assert.equal(resolveTablerIconForMhaName("play")?.name, "player-play");
  assert.equal(resolveTablerIconForMhaName("volume-off")?.name, "volume-off");
  assert.equal(resolveTablerIconForMhaName("humidity")?.name, "droplet");
  assert.equal(resolveTablerIconForMhaName("wind")?.name, "wind");
  assert.equal(resolveTablerIconForMhaName("pressure")?.name, "gauge");
  assert.equal(resolveTablerIconForMhaName("uv")?.name, "sun-high");
  assert.equal(resolveTablerIconForMhaName("air-quality")?.name, "wind");
  assert.equal(resolveTablerIconForMhaName("visibility")?.name, "eye");
  assert.equal(resolveTablerIconForMhaName("fog")?.name, "mist");
  assert.equal(resolveTablerIconForMhaName("sunrise")?.name, "sunrise");
  assert.equal(resolveTablerIconForMhaName("sunset")?.name, "sunset");
});

test("Tabler provider owns the full runtime fallback path", () => {
  assert.equal(resolveTablerIconForMhaName("dashboard")?.name, "layout-dashboard");
  assert.equal(resolveTablerIconForMhaName("unknown-icon")?.name, "layout-grid");
});

test("curated Tabler catalog exposes 500 outlined icons across every MHA category", () => {
  assert.equal(TABLER_ICON_CATALOG.length, 500);
  assert.equal(ICON_PICKER_INVENTORY.length, 500);
  assert.deepEqual(
    [...new Set(TABLER_ICON_CATALOG.map(icon => icon.category))].sort(),
    [
      "climate",
      "energy",
      "home",
      "lighting",
      "media_player",
      "navigation",
      "network",
      "security",
      "switch",
      "system",
      "utility",
      "weather",
    ],
  );

  TABLER_ICON_CATALOG.forEach(({ name }) => {
    const definition = TABLER_ICON_REGISTRY[name];
    assert.equal(definition?.provider, "tabler", `${name} should use Tabler`);
    assert.equal(definition?.renderMode, "stroke", `${name} should stay outlined`);
    assert.ok(definition?.nodes?.length, `${name} should expose SVG nodes`);
  });
});
