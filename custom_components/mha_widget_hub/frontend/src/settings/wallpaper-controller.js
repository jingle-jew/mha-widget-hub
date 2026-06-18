import {
  migrateLegacyWallpaper,
  readLegacyWallpaper,
  readWallpapers,
  resetWallpaper,
  saveWallpaper,
} from "./wallpaper-storage.js";
import { getThemeWallpaper } from "./theme-registry.js";

const WALLPAPER_TONE_DARK = "dark";
const WALLPAPER_TONE_LIGHT = "light";
const WALLPAPER_TONE_THRESHOLD = 128;
const WALLPAPER_TONE_SAMPLE_SIZE = 48;

function classifyAverageLuminance(imageData) {
  const data = imageData?.data;
  if (!data?.length) return null;

  let luminanceTotal = 0;
  let visiblePixels = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha <= 0) continue;

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    luminanceTotal += (0.2126 * red + 0.7152 * green + 0.0722 * blue) * alpha;
    visiblePixels += alpha;
  }

  if (!visiblePixels) return null;
  const averageLuminance = luminanceTotal / visiblePixels;
  return averageLuminance >= WALLPAPER_TONE_THRESHOLD
    ? WALLPAPER_TONE_LIGHT
    : WALLPAPER_TONE_DARK;
}

export async function detectWallpaperTone(dataUrl, {
  sampleSize = WALLPAPER_TONE_SAMPLE_SIZE,
  imageFactory = () => new Image(),
  documentRef = globalThis.document,
} = {}) {
  if (!dataUrl || !documentRef?.createElement || typeof imageFactory !== "function") {
    return null;
  }

  const image = imageFactory();
  if (!image) return null;

  const decoded = new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Wallpaper image could not be loaded."));
    image.src = dataUrl;
  });

  await decoded;

  const width = Math.max(1, Math.min(sampleSize, image.naturalWidth || image.width || sampleSize));
  const height = Math.max(1, Math.min(sampleSize, image.naturalHeight || image.height || sampleSize));
  const canvas = documentRef.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext?.("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(image, 0, 0, width, height);
  return classifyAverageLuminance(context.getImageData(0, 0, width, height));
}

export class WallpaperController {
  constructor(host, {
    storage = localStorage,
    getTheme = () => "dark",
    getThemeState = null,
  } = {}) {
    this.host = host;
    this.storage = storage;
    this.getTheme = getTheme;
    this.getThemeState = typeof getThemeState === "function"
      ? getThemeState
      : () => ({ theme: this.getTheme(), themeStyle: "oneui" });
    this.wallpapers = { light: null, dark: null };
    this.toneRequestId = 0;
  }

  resolveThemeState(themeState = this.getThemeState()) {
    if (typeof themeState === "string") {
      return {
        theme: themeState === "light" ? "light" : "dark",
        themeStyle: this.getThemeState()?.themeStyle || "oneui",
      };
    }

    return {
      theme: themeState?.theme === "light" ? "light" : "dark",
      themeStyle: String(themeState?.themeStyle || this.getThemeState()?.themeStyle || "oneui"),
    };
  }

  migrateLegacy() {
    return migrateLegacyWallpaper(this.storage, this.getTheme());
  }

  read(themeState = this.getThemeState()) {
    const wallpapers = readWallpapers(this.storage);
    const theme = this.resolveThemeState(themeState).theme;
    if (!wallpapers[theme]) {
      wallpapers[theme] = readLegacyWallpaper(this.storage);
    }
    this.wallpapers = wallpapers;
    return wallpapers;
  }

  getActiveWallpaper(themeState = this.getThemeState(), wallpapers = this.read(themeState)) {
    const resolvedThemeState = this.resolveThemeState(themeState);
    const customWallpaper = wallpapers[resolvedThemeState.theme];
    if (customWallpaper?.dataUrl) {
      return {
        source: "custom",
        image: customWallpaper.dataUrl,
        wallpaper: customWallpaper,
      };
    }

    const themeWallpaper = getThemeWallpaper(
      resolvedThemeState.themeStyle,
      resolvedThemeState.theme,
    );
    if (themeWallpaper) {
      return {
        source: "theme",
        image: themeWallpaper,
        wallpaper: null,
      };
    }

    return {
      source: "fallback",
      image: "",
      wallpaper: null,
    };
  }

  apply(themeState = this.getThemeState()) {
    const resolvedThemeState = this.resolveThemeState(themeState);
    const wallpapers = this.read(resolvedThemeState);
    const activeWallpaper = this.getActiveWallpaper(resolvedThemeState, wallpapers);
    const hasCustomWallpaper = activeWallpaper.source === "custom";
    const hasThemeWallpaper = activeWallpaper.source === "theme";

    this.host.dataset.customWallpaper = String(hasCustomWallpaper);
    this.host.dataset.themeWallpaper = String(hasThemeWallpaper);
    this.host.dataset.wallpaperSource = activeWallpaper.source;
    if (activeWallpaper.image) {
      this.host.style.setProperty(
        "--mha-active-wallpaper-image",
        `url("${activeWallpaper.image}")`,
      );
      if (hasCustomWallpaper) {
        this.host.style.setProperty(
          "--mha-custom-wallpaper-image",
          `url("${activeWallpaper.image}")`,
        );
      } else {
        this.host.style.removeProperty("--mha-custom-wallpaper-image");
      }
      this.syncWallpaperTone(activeWallpaper.image);
    } else {
      delete this.host.dataset.wallpaperSource;
      this.host.dataset.themeWallpaper = "false";
      this.host.dataset.customWallpaper = "false";
      this.host.style.removeProperty("--mha-active-wallpaper-image");
      this.host.style.removeProperty("--mha-custom-wallpaper-image");
      this.resetWallpaperTone();
    }

    return wallpapers;
  }

  resetWallpaperTone() {
    this.toneRequestId += 1;
    delete this.host.dataset.wallpaperTone;
  }

  async syncWallpaperTone(dataUrl) {
    const requestId = ++this.toneRequestId;
    delete this.host.dataset.wallpaperTone;

    try {
      const tone = await detectWallpaperTone(dataUrl);
      if (requestId === this.toneRequestId && tone) {
        this.host.dataset.wallpaperTone = tone;
      }
    } catch (error) {
      if (requestId === this.toneRequestId) {
        delete this.host.dataset.wallpaperTone;
      }
      console.warn("[MHA] Wallpaper tone could not be detected.", error);
    }
  }

  save(mode, payload) {
    if (!saveWallpaper(this.storage, mode, payload)) {
      throw new Error("Invalid wallpaper payload");
    }
    return this.apply();
  }

  reset(mode) {
    resetWallpaper(this.storage, mode);
    return this.apply();
  }
}

export function createWallpaperController(host, options) {
  return new WallpaperController(host, options);
}
