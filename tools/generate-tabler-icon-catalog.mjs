import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { ICON_SYMBOL_CATALOG } from "../src/icons/icon-symbol-catalog.js";

const repoRoot = fileURLToPath(new URL("../", import.meta.url));
const tablerRoot = path.join(repoRoot, "node_modules/@tabler/icons");
const outputPath = path.join(repoRoot, "src/ui/tabler-icons.js");
const checkOnly = process.argv.includes("--check");

const CATEGORY_SPECS = Object.freeze([
  { id: "home", quota: 45, official: ["Buildings", "Laundry"], keywords: ["home", "house", "building", "door", "window", "bed", "bath", "kitchen", "sofa", "armchair", "garage", "garden", "stairs", "elevator", "pool", "tent"] },
  { id: "lighting", quota: 40, official: ["Electrical"], keywords: ["bulb", "lamp", "light", "brightness", "candle", "flashlight", "color", "paint", "highlight", "sparkle", "exposure", "prism", "traffic", "torch", "spotlight", "flare", "laser", "wand", "shadow"] },
  { id: "switch", quota: 30, official: ["Electrical"], keywords: ["toggle", "switch", "power", "plug", "outlet", "button", "automation", "relay", "circuit"] },
  { id: "climate", quota: 40, official: [], keywords: ["temperature", "thermometer", "flame", "snowflake", "fan", "air", "wind", "droplet", "humidity", "heater", "radiator", "conditioning", "tornado", "storm", "firewall"] },
  { id: "media_player", quota: 50, official: ["Media"], keywords: ["player", "play", "pause", "volume", "speaker", "device-tv", "headphones", "music", "microphone", "radio", "cast", "playlist", "movie", "camera"] },
  { id: "security", quota: 40, official: ["System"], keywords: ["lock", "shield", "key", "alarm", "camera", "eye", "scan", "fingerprint", "bell", "siren", "fire", "alert"] },
  { id: "network", quota: 35, official: ["Computers", "Devices"], keywords: ["wifi", "network", "router", "bluetooth", "antenna", "server", "cloud", "rss", "signal", "satellite", "broadcast"] },
  { id: "energy", quota: 35, official: ["Electrical"], keywords: ["bolt", "battery", "solar", "charging", "electric", "leaf", "gauge", "meter", "windmill"] },
  { id: "weather", quota: 50, official: ["Weather"], keywords: ["sun", "moon", "cloud", "rain", "snow", "storm", "umbrella", "wind", "fog", "mist", "temperature", "thermometer", "droplet", "haze", "rainbow", "tornado", "comet", "flood", "whirl", "windsock", "uv"] },
  { id: "utility", quota: 55, official: ["System"], keywords: ["clock", "calendar", "timer", "tool", "settings", "search", "trash", "pencil", "plus", "minus", "check", "filter", "adjustment", "download", "upload", "refresh", "info", "help"] },
  { id: "navigation", quota: 40, official: ["Arrows", "Map"], keywords: ["arrow", "chevron", "map", "location", "gps", "compass", "route", "navigation", "maximize", "minimize", "menu", "layout", "grid"] },
  { id: "system", quota: 40, official: ["Devices", "Computers", "Database", "Development"], keywords: ["device", "computer", "phone", "tablet", "printer", "database", "cpu", "memory", "code", "terminal", "bug", "app"] },
]);

const LEGACY_ALIASES = Object.freeze({
  apps: "apps",
  "air-quality": "wind",
  check: "check",
  close: "x",
  edit: "pencil",
  fan: "propeller",
  fog: "mist",
  gear: "settings",
  grid: "layout-grid",
  humidity: "droplet",
  image: "photo",
  light: "bulb",
  "media-player": "device-speaker",
  next: "player-skip-forward",
  pause: "player-pause",
  play: "player-play",
  pressure: "gauge",
  previous: "player-skip-back",
  temperature: "temperature",
  trash: "trash",
  tv: "device-tv",
  uv: "sun-high",
  visibility: "eye",
  button: "square-toggle",
  cloudy: "cloud",
  dashboard: "layout-dashboard",
  error: "alert-circle",
  hail: "cloud-storm",
  "heavy-rain": "cloud-storm",
  info: "info-circle",
  lightning: "bolt",
  mute: "volume-off",
  "partly-cloudy": "cloud",
  rain: "cloud-rain",
  room: "home",
  snow: "cloud-snow",
  speaker: "device-speaker",
  "speaker-off": "volume-off",
  "speaker-on": "volume",
  "speaker-volume": "volume",
  sunny: "sun",
  toggle: "toggle-right",
  warning: "alert-triangle",
});

const REQUIRED_ICONS = Object.freeze([
  ...Object.values(LEGACY_ALIASES),
  "alert-triangle",
  "battery",
  "bell",
  "bolt",
  "camera",
  "cloud",
  "coffee",
  "compass",
  "door",
  "flame",
  "home",
  "lamp",
  "layout-grid",
  "lock",
  "minus",
  "moon",
  "music",
  "palette",
  "plug",
  "plus",
  "power",
  "search",
  "shield",
  "snowflake",
  "sun",
  "sunrise",
  "sunset",
  "umbrella",
  "volume",
  "volume-off",
  "wind",
]);

function normalizeWords(value = "") {
  return String(value).toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
}

function scoreIcon(name, metadata, spec) {
  const nameWords = normalizeWords(name);
  const tags = (metadata.tags || []).map(String).flatMap(normalizeWords);
  let score = spec.official.includes(metadata.category) ? 18 : 0;

  spec.keywords.forEach((keyword, index) => {
    const priority = Math.max(2, 12 - Math.floor(index / 2));
    if (name === keyword) score += priority + 30;
    else if (nameWords.includes(keyword)) score += priority + 10;
    if (tags.includes(keyword)) score += 3;
  });

  if (name.endsWith("-off")) score -= 7;
  if (/\d/u.test(name)) score -= 5;
  const stateModifiers = new Set([
    "bitcoin", "bolt", "cancel", "check", "code", "cog", "dollar", "dot",
    "down", "edit", "exclamation", "heart", "minus", "pause", "pin", "plus",
    "question", "search", "share", "spark", "star", "up", "x",
  ]);
  score -= nameWords.filter(word => stateModifiers.has(word)).length * 8;
  if (name.startsWith("brand-")) score -= 100;
  return score;
}

function getIconFamily(name = "") {
  const words = normalizeWords(name);
  if (["device", "map", "message", "player"].includes(words[0])) {
    return words.slice(0, 2).join("-");
  }
  return words[0] || name;
}

function getFamilyLimit(family = "") {
  if (family === "arrow") return 14;
  if (family === "cloud") return 10;
  if (["battery", "circuit", "home", "lock", "temperature"].includes(family)) return 7;
  if (["calendar", "camera", "music", "shield"].includes(family)) return 5;
  return 3;
}

function selectCatalog(metadataByName) {
  const assignment = new Map();
  const requiredIcons = [...new Set([
    ...REQUIRED_ICONS,
    ...ICON_SYMBOL_CATALOG.map(icon => icon.name).filter(name => metadataByName[name]),
  ])];

  for (const name of requiredIcons) {
    if (!metadataByName[name]) throw new Error(`Required Tabler icon is missing: ${name}`);
    const bestSpec = CATEGORY_SPECS
      .map(spec => ({ spec, score: scoreIcon(name, metadataByName[name], spec) }))
      .sort((left, right) => right.score - left.score)[0]?.spec;
    assignment.set(name, bestSpec?.id || "utility");
  }

  for (const spec of CATEGORY_SPECS) {
    const familyCounts = new Map(
      [...assignment.entries()]
        .filter(([, category]) => category === spec.id)
        .map(([name]) => getIconFamily(name))
        .map(family => [family, 1]),
    );
    let categoryCount = [...assignment.values()].filter(category => category === spec.id).length;
    const ranked = Object.entries(metadataByName)
      .filter(([name]) => !assignment.has(name))
      .map(([name, metadata]) => ({ name, metadata, score: scoreIcon(name, metadata, spec) }))
      .filter(item => item.score > 0)
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));

    for (const item of ranked) {
      if (categoryCount >= spec.quota) break;
      const family = getIconFamily(item.name);
      const familyCount = familyCounts.get(family) || 0;
      if (familyCount >= getFamilyLimit(family)) continue;
      assignment.set(item.name, spec.id);
      familyCounts.set(family, familyCount + 1);
      categoryCount += 1;
    }
    if (categoryCount !== spec.quota) {
      throw new Error(`Expected ${spec.quota} icons for ${spec.id}, received ${categoryCount}.`);
    }
  }

  const targetCount = CATEGORY_SPECS.reduce((total, spec) => total + spec.quota, 0);
  if (assignment.size !== targetCount) {
    throw new Error(`Expected ${targetCount} curated Tabler icons, received ${assignment.size}.`);
  }
  return assignment;
}

function serialize(value) {
  return JSON.stringify(value);
}

const metadataByName = JSON.parse(await readFile(path.join(tablerRoot, "icons.json"), "utf8"));
const nodesByName = JSON.parse(await readFile(path.join(tablerRoot, "tabler-nodes-outline.json"), "utf8"));
const assignment = selectCatalog(metadataByName);
const names = [...assignment.keys()].sort((left, right) => left.localeCompare(right));

const catalog = names.map(name => ({
  name,
  label: name.split("-").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(" "),
  category: assignment.get(name),
  tags: (metadataByName[name]?.tags || []).map(String),
}));
const registry = Object.fromEntries(names.map(name => [name, {
  provider: "tabler",
  renderMode: "stroke",
  viewBox: "0 0 24 24",
  strokeWidth: 2,
  nodes: nodesByName[name],
}]));

const output = `/* This file is generated by tools/generate-tabler-icon-catalog.mjs. */

export const TABLER_ICON_CATALOG = Object.freeze(${serialize(catalog)}.map(Object.freeze));

export const TABLER_ICON_REGISTRY = Object.freeze(${serialize(registry)});

export const MHA_TABLER_ICON_ALIASES = Object.freeze(${serialize(LEGACY_ALIASES)});

export function resolveTablerIconName(name = "") {
  const normalized = String(name || "").trim();
  const resolved = MHA_TABLER_ICON_ALIASES[normalized] || normalized;
  return TABLER_ICON_REGISTRY[resolved] ? resolved : "layout-grid";
}

export function getTablerIcon(name = "") {
  return TABLER_ICON_REGISTRY[resolveTablerIconName(name)] || TABLER_ICON_REGISTRY["layout-grid"];
}

export function resolveTablerIconForMhaName(name = "") {
  const resolvedName = resolveTablerIconName(name);
  const icon = TABLER_ICON_REGISTRY[resolvedName];
  return icon ? Object.freeze({ ...icon, name: resolvedName }) : null;
}
`;

if (checkOnly) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) {
    console.error("The generated Tabler icon catalog is out of date. Run npm run generate:icons.");
    process.exitCode = 1;
  } else {
    console.log(`Verified ${catalog.length} curated Tabler Outline icons.`);
  }
} else {
  await writeFile(outputPath, output);
  console.log(`Generated ${catalog.length} curated Tabler Outline icons.`);
}
