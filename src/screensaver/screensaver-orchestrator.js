import {
  createScreensaver,
  updateScreensaverClockVariant,
  updateScreensaverNowBar,
  updateScreensaverState,
} from "./screensaver.js";
import { buildScreensaverViewState } from "./screensaver-props.js";

const NOWBAR_INTERACTION_GUARD = "__mhaNowBarInteractionGuard";
const NOWBAR_WHEEL_COOLDOWN = 820;

function getHostLayout(nowBar) {
  const host = nowBar?.getRootNode?.()?.host;
  return host?.dataset?.layout || "";
}

function getNow() {
  return globalThis.performance?.now?.() || Date.now();
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

export function buildScreensaverProps({
  isVisible = false,
  screensaverState = {},
  nowBarTiles = [],
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
    onClockVariantChange,
    onOpenScreensaverSettings,
    onWake,
  };
}

export function createScreensaverElement(props = {}) {
  const element = createScreensaver(buildScreensaverProps(props));
  installNowBarInteractionGuard(element);
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
    return next;
  }

  if (force) {
    const next = createScreensaverElement(props);
    existing.replaceWith(next);
    return next;
  }

  updateScreensaverState(existing, { isVisible: Boolean(props.isVisible) });
  updateScreensaverClockVariant(existing, props.screensaverState?.clockVariant);
  updateScreensaverNowBar(existing, {
    showNowBar: props.screensaverState?.nowBar,
    nowBarItems: props.screensaverState?.nowBarItems,
    nowBarTiles: props.nowBarTiles,
  });
  installNowBarInteractionGuard(existing);
  return existing;
}
