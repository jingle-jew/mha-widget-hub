import {
  createScreensaver,
  updateScreensaverClockVariant,
  updateScreensaverNowBar,
  updateScreensaverState,
} from "./screensaver.js";
import { buildScreensaverViewState } from "./screensaver-props.js";

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
  return createScreensaver(buildScreensaverProps(props));
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
  return existing;
}
