import { findClosestAccent, supportsAutoAccent } from "./accent-palettes.js";

const ANALYSIS_SIZE = 72;
const HUE_BUCKETS = 24;
const SATURATION_BUCKETS = 4;
const LIGHTNESS_BUCKETS = 4;

function loadImage(dataUrl = "") {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.addEventListener("load", () => resolve(image), { once: true });
    image.addEventListener("error", () => reject(new Error("Wallpaper image could not be loaded.")), { once: true });
    image.src = dataUrl;
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function rgbToHsl(r, g, b) {
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

function colorWeight({ s, l }, x, y, width, height) {
  // Auto accent should feel like the wallpaper's intentional color, not like
  // the average paint bucket. Whites, blacks and grays are useful backdrop
  // pixels, but they should almost never decide the accent.
  if (s < 0.16 || l < 0.16 || l > 0.9) return 0;

  const centerX = width > 1 ? (x / (width - 1)) - 0.5 : 0;
  const centerY = height > 1 ? (y / (height - 1)) - 0.5 : 0;
  const distanceFromCenter = Math.hypot(centerX, centerY) / Math.SQRT1_2;
  const centerBias = 1 - (clamp(distanceFromCenter, 0, 1) * 0.35);

  const saturationBias = 0.35 + (s ** 1.8 * 2.2);
  const readableLightnessBias = 1 - Math.abs(l - 0.55) * 1.15;
  return centerBias * saturationBias * clamp(readableLightnessBias, 0.25, 1);
}

function bucketKey({ h, s, l }) {
  const hueBucket = Math.floor(clamp(h, 0, 0.9999) * HUE_BUCKETS);
  const saturationBucket = Math.floor(clamp(s, 0, 0.9999) * SATURATION_BUCKETS);
  const lightnessBucket = Math.floor(clamp(l, 0, 0.9999) * LIGHTNESS_BUCKETS);
  return `${hueBucket}:${saturationBucket}:${lightnessBucket}`;
}

function createEmptyBucket() {
  return {
    score: 0,
    count: 0,
    r: 0,
    g: 0,
    b: 0,
    h: 0,
    s: 0,
    l: 0,
  };
}

function getWallpaperColorProfile(imageData) {
  const data = imageData.data;
  const buckets = new Map();
  let fallback = createEmptyBucket();

  for (let y = 0; y < imageData.height; y += 1) {
    for (let x = 0; x < imageData.width; x += 1) {
      const index = ((y * imageData.width) + x) * 4;
      const alpha = data[index + 3] / 255;
      if (alpha < 0.5) continue;

      const r = data[index];
      const g = data[index + 1];
      const b = data[index + 2];
      const hsl = rgbToHsl(r, g, b);
      const weight = alpha * colorWeight(hsl, x, y, imageData.width, imageData.height);

      // Fallback keeps a very small vote from colored-ish pixels, so beige or
      // muted wallpapers still get a stable accent instead of bouncing around.
      const fallbackWeight = alpha * Math.max(0, hsl.s - 0.05) * clamp(1 - Math.abs(hsl.l - 0.55), 0.15, 1);
      if (fallbackWeight > 0) {
        fallback.score += fallbackWeight;
        fallback.count += 1;
        fallback.r += r * fallbackWeight;
        fallback.g += g * fallbackWeight;
        fallback.b += b * fallbackWeight;
      }

      if (weight <= 0) continue;
      const key = bucketKey(hsl);
      const bucket = buckets.get(key) || createEmptyBucket();
      bucket.score += weight;
      bucket.count += 1;
      bucket.r += r * weight;
      bucket.g += g * weight;
      bucket.b += b * weight;
      bucket.h += hsl.h * weight;
      bucket.s += hsl.s * weight;
      bucket.l += hsl.l * weight;
      buckets.set(key, bucket);
    }
  }

  const candidates = [...buckets.values()]
    .filter(bucket => bucket.score > 0)
    .map(bucket => ({
      ...bucket,
      // A tiny but saturated color detail should not beat a large, intentional
      // wallpaper color. This balances visual area and color expressiveness.
      rank: bucket.score * Math.log2(bucket.count + 2),
    }))
    .sort((a, b) => b.rank - a.rank);

  const best = candidates[0] || fallback;
  if (!best?.score) return null;

  const normalizeBucket = (bucket) => ({
    r: Math.round(bucket.r / bucket.score),
    g: Math.round(bucket.g / bucket.score),
    b: Math.round(bucket.b / bucket.score),
    h: bucket.h ? bucket.h / bucket.score : rgbToHsl(Math.round(bucket.r / bucket.score), Math.round(bucket.g / bucket.score), Math.round(bucket.b / bucket.score)).h,
    s: bucket.s ? bucket.s / bucket.score : rgbToHsl(Math.round(bucket.r / bucket.score), Math.round(bucket.g / bucket.score), Math.round(bucket.b / bucket.score)).s,
    l: bucket.l ? bucket.l / bucket.score : rgbToHsl(Math.round(bucket.r / bucket.score), Math.round(bucket.g / bucket.score), Math.round(bucket.b / bucket.score)).l,
    score: bucket.score,
    count: bucket.count,
    rank: bucket.rank || bucket.score,
  });

  const primary = normalizeBucket(best);
  const normalizedCandidates = candidates
    .slice(0, 8)
    .map(normalizeBucket);

  return {
    ...primary,
    candidates: normalizedCandidates.length ? normalizedCandidates : [primary],
  };
}

export async function extractAccentFromWallpaper(dataUrl = "", themeStyle = "oneui") {
  if (!supportsAutoAccent(themeStyle) || !dataUrl) return "";

  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return "";

  const ratio = image.naturalWidth && image.naturalHeight
    ? image.naturalWidth / image.naturalHeight
    : 1;
  canvas.width = ratio >= 1 ? ANALYSIS_SIZE : Math.max(1, Math.round(ANALYSIS_SIZE * ratio));
  canvas.height = ratio >= 1 ? Math.max(1, Math.round(ANALYSIS_SIZE / ratio)) : ANALYSIS_SIZE;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const colorProfile = getWallpaperColorProfile(context.getImageData(0, 0, canvas.width, canvas.height));
  return findClosestAccent(themeStyle, colorProfile);
}
