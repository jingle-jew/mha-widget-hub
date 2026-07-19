const DEFAULT_WHITES = Object.freeze([2200, 2700, 3500, 5000]);

const DEFAULT_SCENES = Object.freeze([
  Object.freeze({ id: "candle", name: "Bougie", icon: "candle", type: "color_temp", kelvin: 2200, brightness: 40, enabled: true }),
  Object.freeze({ id: "sunset", name: "Coucher de soleil", icon: "sunset", type: "rgb", color: "#ff7a00", brightness: 60, enabled: true }),
  Object.freeze({ id: "reading", name: "Lecture", icon: "book", type: "color_temp", kelvin: 3500, brightness: 80, enabled: true }),
  Object.freeze({ id: "relax", name: "Détente", icon: "leaf", type: "rgb", color: "#9c27b0", brightness: 30, enabled: true }),
]);

const DEFAULT_COLORS = Object.freeze([
  "#ff3b30",
  "#ff9500",
  "#ffd60a",
  "#30d158",
  "#64d2ff",
  "#0a84ff",
  "#bf5af2",
]);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, Number(value) || 0));
}

function normalizeHex(value, fallback = "#ffffff") {
  const match = String(value || "").trim().match(/^#?([0-9a-f]{6})$/i);
  return match ? `#${match[1].toLowerCase()}` : fallback;
}

function normalizeScene(scene = {}, index = 0) {
  const type = scene.type === "rgb" || scene.type === "color" ? "rgb" : "color_temp";
  return {
    id: String(scene.id || `scene-${index + 1}`),
    name: String(scene.name || `Ambiance ${index + 1}`),
    icon: String(scene.icon || "sparkles"),
    type,
    ...(type === "rgb"
      ? { color: normalizeHex(scene.color, DEFAULT_COLORS[index % DEFAULT_COLORS.length]) }
      : { kelvin: Math.round(clamp(scene.kelvin, 1500, 9000) || 2700) }),
    brightness: Math.round(clamp(scene.brightness ?? 60, 1, 100)),
    enabled: scene.enabled !== false,
  };
}

export function normalizeLightPopupConfig(config = {}) {
  const whites = Array.isArray(config.whites)
    ? [...new Set(config.whites.map((value) => Math.round(clamp(value, 1500, 9000))).filter(Boolean))].slice(0, 4)
    : [...DEFAULT_WHITES];
  const scenes = Array.isArray(config.scenes)
    ? config.scenes.slice(0, 8).map(normalizeScene)
    : DEFAULT_SCENES.map((scene, index) => normalizeScene(scene, index));
  const colors = Array.isArray(config.colors)
    ? [...new Set(config.colors.map((color) => normalizeHex(color)))].slice(0, 10)
    : [...DEFAULT_COLORS];

  return {
    orientation: config.orientation === "horizontal" ? "horizontal" : "vertical",
    whites: whites.length ? whites : [...DEFAULT_WHITES],
    scenes,
    colors: colors.length ? colors : [...DEFAULT_COLORS],
  };
}

export function cloneLightPopupConfig(config = {}) {
  const normalized = normalizeLightPopupConfig(config);
  return {
    ...normalized,
    whites: [...normalized.whites],
    colors: [...normalized.colors],
    scenes: normalized.scenes.map((scene) => ({ ...scene })),
  };
}

export { DEFAULT_COLORS, DEFAULT_SCENES, DEFAULT_WHITES, normalizeHex };
