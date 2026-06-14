import {
  migrateLegacyWallpaper,
  readLegacyWallpaper,
  readWallpapers,
  resetWallpaper,
  saveWallpaper,
} from "./wallpaper-storage.js";

export class WallpaperController {
  constructor(host, {
    storage = localStorage,
    getTheme = () => "dark",
  } = {}) {
    this.host = host;
    this.storage = storage;
    this.getTheme = getTheme;
    this.wallpapers = { light: null, dark: null };
  }

  migrateLegacy() {
    return migrateLegacyWallpaper(this.storage, this.getTheme());
  }

  read() {
    const wallpapers = readWallpapers(this.storage);
    const theme = this.getTheme();
    if (!wallpapers[theme]) {
      wallpapers[theme] = readLegacyWallpaper(this.storage);
    }
    this.wallpapers = wallpapers;
    return wallpapers;
  }

  apply(theme = this.getTheme()) {
    const wallpapers = this.read();
    const wallpaper = wallpapers[theme];
    const hasWallpaper = Boolean(wallpaper?.dataUrl);

    this.host.dataset.customWallpaper = String(hasWallpaper);
    if (hasWallpaper) {
      this.host.style.setProperty(
        "--mha-custom-wallpaper-image",
        `url("${wallpaper.dataUrl}")`,
      );
    } else {
      this.host.style.removeProperty("--mha-custom-wallpaper-image");
    }

    return wallpapers;
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
