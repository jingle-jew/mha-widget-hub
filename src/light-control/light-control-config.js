const MAX_WHITE_PRESETS = 4;
const MAX_AMBIENCE_PRESETS = 4;
const MAX_QUICK_COLORS = 6;

const DEFAULT_WHITE_TEMPERATURES = Object.freeze([2200, 2700, 3500, 5000]);

const DEFAULT_AMBIENCES = Object.freeze([
  Object.freeze({
    id: "candle",
    enabled: true,
    name: "",
    icon: "candle",
    mode: "temperature",
    color: "#ff9f1a",
    colorTemperature: 2200,
    brightness: 34,
  }),
  Object.freeze({
    id: "sunset",
    enabled: true,
    name: "",
    icon: "sunset-2",
    mode: "color",
    color: "#ef744f",
    colorTemperature: 2700,
    brightness: 58,
  }),
  Object.freeze({
    id: "reading",
    enabled: true,
    name: "",
    icon: "book-2",
    mode: "temperature",
    color: "#7357d9",
    colorTemperature: 3500,
    brightness: 82,
  }),
  Object.freeze({
    id: "relax",
    enabled: true,
    name: "",
    icon: "armchair-2",
    mode: "color",
    color: "#2d6fbd",
    colorTemperature: 2700,
    brightness: 46,
  }),
]);

const DEFAULT_QUICK_COLORS = Object.freeze([
  "#8d24ed",
  "#2962ff",
  "#21c7ad",
  "#64dd17",
  "#ff9800",
  "#ff3d25",
]);

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

export function normalizeHexColor(value, fallback = "#ffffff") {
  const normalized = String(value || "").trim().toLowerCase();
  if (/^#[\da-f]{6}$/u.test(normalized)) return normalized;
  if (/^#[\da-f]{3}$/u.test(normalized)) {
    return `#${normalized.slice(1).split("").map(part => `${part}${part}`).join("")}`;
  }
  return fallback;
}

function normalizeWhiteTemperatures(value) {
  const source = Array.isArray(value) ? value : DEFAULT_WHITE_TEMPERATURES;
  const normalized = source
    .slice(0, MAX_WHITE_PRESETS)
    .map(item => clampNumber(item, 1500, 9000, 3500));
  while (normalized.length < MAX_WHITE_PRESETS) {
    normalized.push(DEFAULT_WHITE_TEMPERATURES[normalized.length]);
  }
  return normalized;
}

function normalizeAmbience(preset = {}, index = 0) {
  const fallback = DEFAULT_AMBIENCES[index] || DEFAULT_AMBIENCES[0];
  return {
    id: String(preset.id || fallback.id || `ambience-${index + 1}`).trim(),
    enabled: preset.enabled !== false,
    name: String(preset.name ?? fallback.name).trim().slice(0, 32),
    icon: String(preset.icon || fallback.icon).trim() || fallback.icon,
    mode: preset.mode === "color" ? "color" : "temperature",
    color: normalizeHexColor(preset.color, fallback.color),
    colorTemperature: clampNumber(
      preset.colorTemperature,
      1500,
      9000,
      fallback.colorTemperature,
    ),
    brightness: clampNumber(preset.brightness, 1, 100, fallback.brightness),
  };
}

function normalizeAmbiences(value) {
  const source = Array.isArray(value) ? value : DEFAULT_AMBIENCES;
  const normalized = source
    .slice(0, MAX_AMBIENCE_PRESETS)
    .map((preset, index) => normalizeAmbience(preset, index));
  while (normalized.length < MAX_AMBIENCE_PRESETS) {
    normalized.push(normalizeAmbience(DEFAULT_AMBIENCES[normalized.length], normalized.length));
  }
  return normalized;
}

function normalizeQuickColors(value) {
  const source = Array.isArray(value) ? value : DEFAULT_QUICK_COLORS;
  const normalized = source
    .slice(0, MAX_QUICK_COLORS)
    .map((color, index) => normalizeHexColor(color, DEFAULT_QUICK_COLORS[index]));
  while (normalized.length < MAX_QUICK_COLORS) {
    normalized.push(DEFAULT_QUICK_COLORS[normalized.length]);
  }
  return normalized;
}

export function normalizeLightControlConfig(value = {}) {
  return {
    orientation: value?.orientation === "horizontal" ? "horizontal" : "vertical",
    whiteTemperatures: normalizeWhiteTemperatures(value?.whiteTemperatures),
    ambiences: normalizeAmbiences(value?.ambiences),
    quickColors: normalizeQuickColors(value?.quickColors),
  };
}

export function cloneLightControlConfig(value = {}) {
  const normalized = normalizeLightControlConfig(value);
  return {
    ...normalized,
    whiteTemperatures: [...normalized.whiteTemperatures],
    ambiences: normalized.ambiences.map(preset => ({ ...preset })),
    quickColors: [...normalized.quickColors],
  };
}

export {
  DEFAULT_AMBIENCES,
  DEFAULT_QUICK_COLORS,
  DEFAULT_WHITE_TEMPERATURES,
  MAX_AMBIENCE_PRESETS,
  MAX_QUICK_COLORS,
  MAX_WHITE_PRESETS,
};
