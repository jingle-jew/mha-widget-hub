import {
  createScreensaver,
  syncScreensaverNowBarWallpaperSample,
  updateScreensaverClockVariant,
  updateScreensaverNowBar,
  updateScreensaverState,
} from "./screensaver.js";
import { buildScreensaverViewState } from "./screensaver-props.js";

const NOWBAR_INTERACTION_GUARD = "__mhaNowBarInteractionGuard";
const NOWBAR_WALLPAPER_SAMPLE_SYNC = "__mhaNowBarWallpaperSampleSync";
const NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER = "__mhaNowBarWallpaperSampleResizeObserver";
const NOWBAR_WHEEL_COOLDOWN = 820;
const NOWBAR_STACK_POSITIONS = Object.freeze([
  { y: 0, scale: 1, z: 4 },
  { y: 10, scale: .96, z: 3 },
  { y: 20, scale: .92, z: 2 },
  { y: 30, scale: .88, z: 1 },
]);

function getHostLayout(nowBar) {
  const host = nowBar?.getRootNode?.()?.host;
  return host?.dataset?.layout || "";
}

function getNow() {
  return globalThis.performance?.now?.() || Date.now();
}

function resetNowBarDragPreview(nowBar) {
  const tiles = [...nowBar.querySelectorAll(".mha-screensaver-nowbar-tile")];
  tiles.forEach((tile) => {
    const relativePosition = Math.min(
      Number(tile.dataset.stackPosition || 0) || 0,
      NOWBAR_STACK_POSITIONS.length - 1,
    );
    const position = NOWBAR_STACK_POSITIONS[relativePosition] || NOWBAR_STACK_POSITIONS[0];
    tile.style.setProperty("--mha-nowbar-y", `${position.y}px`);
    tile.style.setProperty("--mha-nowbar-scale", String(position.scale));
    tile.style.zIndex = String(position.z);
  });
}

function installNowBarInteractionGuard(root) {
  const nowBar = root?.querySelector?.(".mha-screensaver-nowbar");
  if (!nowBar || nowBar[NOWBAR_INTERACTION_GUARD]) return;

  nowBar[NOWBAR_INTERACTION_GUARD] = true;
  let suppressClick = false;
  let suppressClickTimer = 0;
  let suppressWheelUntil = 0;

  const suppressNextClick = () => {
    suppressClick = true;
    window.clearTimeout(suppressClickTimer);
    suppressClickTimer = window.setTimeout(() => {
      suppressClick = false;
    }, 360);
  };

  nowBar.addEventListener("pointermove", () => {
    if (getHostLayout(nowBar) === "desktop") return;
    if (!nowBar.classList.contains("is-nowbar-dragging")) return;
    if (nowBar.classList.contains("is-nowbar-snapping")) return;

    resetNowBarDragPreview(nowBar);
  });

  nowBar.addEventListener("wheel", (event) => {
    if (Math.abs(event.deltaY) < 8) return;

    const currentTime = getNow();
    if (currentTime < suppressWheelUntil) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      return;
    }

    suppressWheelUntil = currentTime + NOWBAR_WHEEL_COOLDOWN;
    suppressNextClick();
  }, { capture: true, passive: false });

  nowBar.addEventListener("click", (event) => {
    const isDesktopLayout = getHostLayout(nowBar) === "desktop";
    if (isDesktopLayout && !suppressClick) return;

    suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
  }, { capture: true });
}

function scheduleNowBarWallpaperSampleSync(root) {
  if (!root || root[NOWBAR_WALLPAPER_SAMPLE_SYNC]) return;

  const run = () => {
    root[NOWBAR_WALLPAPER_SAMPLE_SYNC] = 0;
    syncScreensaverNowBarWallpaperSample(root);
  };

  if (typeof globalThis.requestAnimationFrame === "function") {
    root[NOWBAR_WALLPAPER_SAMPLE_SYNC] = globalThis.requestAnimationFrame(run);
  }
}

function installNowBarWallpaperSampleSync(root) {
  if (!root || root[NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER]) return;

  root.addEventListener("mha-nowbar-active-change", () => {
    scheduleNowBarWallpaperSampleSync(root);
  });

  if (typeof globalThis.ResizeObserver === "function") {
    const observer = new globalThis.ResizeObserver(() => {
      scheduleNowBarWallpaperSampleSync(root);
    });
    observer.observe(root);
    root[NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER] = observer;
  } else {
    root[NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER] = true;
  }

  scheduleNowBarWallpaperSampleSync(root);
}

function disposeNowBarWallpaperSampleSync(root) {
  root?.[NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER]?.disconnect?.();
  if (root) root[NOWBAR_WALLPAPER_SAMPLE_RESIZE_OBSERVER] = null;
}

export function buildScreensaverProps({
  isVisible = false,
  screensaverState = {},
  nowBarTiles = [],
  hass = null,
  entityVisibilityConfig = null,
  weatherEntityId = "",
  onClockVariantChange = () => {},
  onOpenScreensaverSettings = () => {},
  onWake = () => {},
} = {}) {
  return {
    ...buildScreensaverViewState({
      isVisible,
      screensaverState,
      nowBarTiles,
    }),
    hass,
    entityVisibilityConfig,
    weatherEntityId,
    onClockVariantChange,
    onOpenScreensaverSettings,
    onWake,
  };
}

export function createScreensaverElement(props = {}) {
  const element = createScreensaver(buildScreensaverProps(props));
  installNowBarInteractionGuard(element);
  installNowBarWallpaperSampleSync(element);
  return element;
}

export function syncScreensaverElement({
  root,
  existing,
  props = {},
  force = false,
} = {}) {
  if (!existing) {
    const next = createScreensaverElement(props);
    root?.append?.(next);
    syncScreensaverNowBarWallpaperSample(next);
    return next;
  }

  if (force) {
    const next = createScreensaverElement(props);
    disposeNowBarWallpaperSampleSync(existing);
    existing.replaceWith(next);
    syncScreensaverNowBarWallpaperSample(next);
    return next;
  }

  updateScreensaverState(existing, { isVisible: Boolean(props.isVisible) });
  updateScreensaverClockVariant(existing, props.screensaverState?.clockVariant, {
    hass: props.hass,
    entityVisibilityConfig: props.entityVisibilityConfig,
    weatherEntityId: props.weatherEntityId,
  });
  updateScreensaverNowBar(existing, {
    showNowBar: props.screensaverState?.nowBar,
    nowBarItems: props.screensaverState?.nowBarItems,
    nowBarTiles: props.nowBarTiles,
  });
  installNowBarInteractionGuard(existing);
  installNowBarWallpaperSampleSync(existing);
  syncScreensaverNowBarWallpaperSample(existing);
  return existing;
}
