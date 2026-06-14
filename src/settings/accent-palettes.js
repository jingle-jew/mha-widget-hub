/*
 * MHA accent palettes.
 *
 * Each visual style owns a curated 10-color accent palette.
 * Accent selection is stable across light/dark theme.
 */

export const ACCENT_PALETTES = Object.freeze({
  ios: Object.freeze([
    { value: "blue", label: "Blue" },
    { value: "indigo", label: "Indigo" },
    { value: "purple", label: "Purple" },
    { value: "pink", label: "Pink" },
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "mint", label: "Mint" },
    { value: "teal", label: "Teal" },
  ]),

  oneui: Object.freeze([
    { value: "sky", label: "Sky" },
    { value: "blue", label: "Blue" },
    { value: "violet", label: "Violet" },
    { value: "pink", label: "Pink" },
    { value: "coral", label: "Coral" },
    { value: "orange", label: "Orange" },
    { value: "amber", label: "Amber" },
    { value: "green", label: "Green" },
    { value: "aqua", label: "Aqua" },
    { value: "slate", label: "Slate" },
  ]),

  material: Object.freeze([
    { value: "blue", label: "Blue" },
    { value: "indigo", label: "Indigo" },
    { value: "purple", label: "Purple" },
    { value: "pink", label: "Pink" },
    { value: "red", label: "Red" },
    { value: "orange", label: "Orange" },
    { value: "yellow", label: "Yellow" },
    { value: "green", label: "Green" },
    { value: "teal", label: "Teal" },
    { value: "cyan", label: "Cyan" },
  ]),
});


export const ACCENT_REFERENCE_COLORS = Object.freeze({
  oneui: Object.freeze({
    sky: "#4ba3ff",
    blue: "#3f7cff",
    violet: "#8b72ff",
    pink: "#ff6aa2",
    coral: "#ff7b73",
    orange: "#ff9b43",
    amber: "#f7bf45",
    green: "#54c873",
    aqua: "#35c7c9",
    slate: "#6f7f99",
  }),
  material: Object.freeze({
    blue: "#0061a4",
    indigo: "#4d57a9",
    purple: "#6750a4",
    pink: "#984061",
    red: "#ba1a1a",
    orange: "#8f4c00",
    yellow: "#745b00",
    green: "#386a20",
    teal: "#006a60",
    cyan: "#006879",
  }),
});

export const AUTO_ACCENT_STYLES = new Set(["oneui", "material"]);

export function supportsAutoAccent(themeStyle = "oneui") {
  return AUTO_ACCENT_STYLES.has(themeStyle);
}

function hexToRgb(hex = "") {
  const normalized = String(hex).replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbToLab({ r, g, b }) {
  const pivotRgb = (value) => {
    const normalized = value / 255;
    return normalized > 0.04045
      ? ((normalized + 0.055) / 1.055) ** 2.4
      : normalized / 12.92;
  };

  const rr = pivotRgb(r);
  const gg = pivotRgb(g);
  const bb = pivotRgb(b);

  const x = (rr * 0.4124 + gg * 0.3576 + bb * 0.1805) / 0.95047;
  const y = (rr * 0.2126 + gg * 0.7152 + bb * 0.0722) / 1.00000;
  const z = (rr * 0.0193 + gg * 0.1192 + bb * 0.9505) / 1.08883;

  const pivotXyz = (value) => value > 0.008856
    ? Math.cbrt(value)
    : (7.787 * value) + (16 / 116);

  const fx = pivotXyz(x);
  const fy = pivotXyz(y);
  const fz = pivotXyz(z);

  return {
    l: (116 * fy) - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

function labDistance(a, b) {
  return Math.hypot(a.l - b.l, a.a - b.a, a.b - b.b);
}

function rgbToHslForAccent({ r, g, b }) {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l: lightness };

  const saturation = lightness > 0.5
    ? delta / (2 - max - min)
    : delta / (max + min);

  let hue;
  if (max === rr) hue = ((gg - bb) / delta) + (gg < bb ? 6 : 0);
  else if (max === gg) hue = ((bb - rr) / delta) + 2;
  else hue = ((rr - gg) / delta) + 4;

  return { h: hue / 6, s: saturation, l: lightness };
}

function hueDistance(a, b) {
  const distance = Math.abs(a - b);
  return Math.min(distance, 1 - distance);
}


function getHueFamily(hue = 0) {
  const h = ((hue % 1) + 1) % 1;
  if (h < 0.035 || h >= 0.955) return "red";
  if (h < 0.105) return "orange";
  if (h < 0.18) return "yellow";
  if (h < 0.43) return "green";
  if (h < 0.55) return "cyan";
  if (h < 0.68) return "blue";
  if (h < 0.79) return "violet";
  return "pink";
}

function getCandidateHsl(candidate) {
  if (typeof candidate?.h === "number" && typeof candidate?.s === "number" && typeof candidate?.l === "number") {
    return { h: candidate.h, s: candidate.s, l: candidate.l };
  }
  return rgbToHslForAccent(candidate);
}

function getPaletteProfile(input) {
  if (!input) return null;
  const primary = { r: input.r, g: input.g, b: input.b };
  if (![primary.r, primary.g, primary.b].every(Number.isFinite)) return null;

  const candidates = Array.isArray(input.candidates) && input.candidates.length
    ? input.candidates
    : [input];

  const familyScores = Object.create(null);
  let totalScore = 0;
  for (const candidate of candidates) {
    if (![candidate?.r, candidate?.g, candidate?.b].every(Number.isFinite)) continue;
    const hsl = getCandidateHsl(candidate);
    if (hsl.s < 0.12 || hsl.l < 0.12 || hsl.l > 0.92) continue;
    const family = getHueFamily(hsl.h);
    const rawScore = Number.isFinite(candidate.rank) ? candidate.rank : candidate.score || candidate.count || 1;
    const score = rawScore * (0.65 + hsl.s * 0.7) * (1 - Math.abs(hsl.l - 0.54) * 0.35);
    familyScores[family] = (familyScores[family] || 0) + Math.max(0, score);
    totalScore += Math.max(0, score);
  }

  const primaryHsl = getCandidateHsl(input);
  const primaryFamily = getHueFamily(primaryHsl.h);
  const sortedFamilies = Object.entries(familyScores).sort((a, b) => b[1] - a[1]);

  return {
    primary,
    primaryHsl,
    primaryFamily,
    familyScores,
    totalScore,
    dominantFamily: sortedFamilies[0]?.[0] || primaryFamily,
  };
}

function familyShare(profile, family) {
  if (!profile?.totalScore) return 0;
  return (profile.familyScores[family] || 0) / profile.totalScore;
}

function resolveOneUiHarmonizedAccent(profile) {
  const family = profile.dominantFamily || profile.primaryFamily;
  const greenShare = familyShare(profile, "green");
  const yellowShare = familyShare(profile, "yellow");

  // OneUI should feel curated and soft. Keep warm wallpapers warm, but if the
  // wallpaper clearly reads as nature, lean into Samsung-like greens/aquas
  // instead of neon yellows or overly literal browns.
  if (greenShare > 0.42 && yellowShare < 0.36) return "green";
  if (greenShare > 0.35 && family === "cyan") return "aqua";

  switch (family) {
    case "red": return profile.primaryHsl.h < 0.02 || profile.primaryHsl.h > 0.98 ? "coral" : "pink";
    case "orange": return greenShare > 0.36 ? "green" : "orange";
    case "yellow": return "amber";
    case "green": return "green";
    case "cyan": return "aqua";
    case "blue": return profile.primaryHsl.l > 0.46 ? "sky" : "blue";
    case "violet": return "violet";
    case "pink": return "pink";
    default: return "slate";
  }
}

function resolveMaterialHarmonizedAccent(profile) {
  const family = profile.dominantFamily || profile.primaryFamily;
  const greenShare = familyShare(profile, "green");
  const yellowShare = familyShare(profile, "yellow");
  const orangeShare = familyShare(profile, "orange");
  const cyanShare = familyShare(profile, "cyan");
  const blueShare = familyShare(profile, "blue");

  // Material You works best when it picks the wallpaper's pleasant palette,
  // not always the single loudest color. Nature wallpapers often contain a big
  // warm subject, but the interface usually looks better anchored in green/teal.
  if (greenShare > 0.24 && (yellowShare > 0.16 || orangeShare > 0.16)) return "green";
  if (greenShare > 0.34) return "green";
  if (cyanShare + blueShare > 0.42 && cyanShare > blueShare * 0.65) return "teal";

  switch (family) {
    case "red": return "red";
    case "orange": return greenShare > 0.24 ? "green" : "orange";
    case "yellow": return greenShare > 0.18 ? "green" : "yellow";
    case "green": return "green";
    case "cyan": return "teal";
    case "blue": return blueShare > cyanShare * 1.4 ? "blue" : "cyan";
    case "violet": return profile.primaryHsl.h < 0.74 ? "indigo" : "purple";
    case "pink": return "pink";
    default: return "purple";
  }
}

function resolveHarmonizedAccent(themeStyle = "oneui", input = null) {
  const profile = getPaletteProfile(input);
  if (!profile) return "";
  if (themeStyle === "oneui") return resolveOneUiHarmonizedAccent(profile);
  if (themeStyle === "material") return resolveMaterialHarmonizedAccent(profile);
  return "";
}

function accentDistance(targetRgb, referenceRgb) {
  const targetHsl = rgbToHslForAccent(targetRgb);
  const referenceHsl = rgbToHslForAccent(referenceRgb);
  const targetLab = rgbToLab(targetRgb);
  const referenceLab = rgbToLab(referenceRgb);

  // Lab alone overvalues brightness differences because Material reference
  // colors are intentionally darker than most wallpapers. Hue should carry
  // the choice, while Lab only breaks close ties inside the same color family.
  return (hueDistance(targetHsl.h, referenceHsl.h) * 120)
    + (Math.abs(targetHsl.s - referenceHsl.s) * 18)
    + (Math.abs(targetHsl.l - referenceHsl.l) * 8)
    + (labDistance(targetLab, referenceLab) * 0.22);
}

export function findClosestAccent(themeStyle = "oneui", rgb = null) {
  if (!supportsAutoAccent(themeStyle) || !rgb) {
    return DEFAULT_ACCENT_BY_STYLE[themeStyle] || DEFAULT_ACCENT_BY_STYLE.oneui;
  }

  const harmonizedAccent = resolveHarmonizedAccent(themeStyle, rgb);
  if (harmonizedAccent) return normalizeAccent(themeStyle, harmonizedAccent);

  const reference = ACCENT_REFERENCE_COLORS[themeStyle] || {};
  let bestAccent = DEFAULT_ACCENT_BY_STYLE[themeStyle] || DEFAULT_ACCENT_BY_STYLE.oneui;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [accent, hex] of Object.entries(reference)) {
    const refRgb = hexToRgb(hex);
    if (!refRgb) continue;
    const distance = accentDistance(rgb, refRgb);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestAccent = accent;
    }
  }

  return normalizeAccent(themeStyle, bestAccent);
}

export const DEFAULT_ACCENT_BY_STYLE = Object.freeze({
  ios: "blue",
  oneui: "sky",
  material: "purple",
});

export function getAccentOptions(themeStyle = "oneui") {
  return ACCENT_PALETTES[themeStyle] || ACCENT_PALETTES.oneui;
}

export function normalizeAccent(themeStyle = "oneui", accent = "") {
  const options = getAccentOptions(themeStyle);
  const exists = options.some((item) => item.value === accent);
  if (exists) return accent;
  return DEFAULT_ACCENT_BY_STYLE[themeStyle] || DEFAULT_ACCENT_BY_STYLE.oneui;
}
