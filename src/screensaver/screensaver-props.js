import { normalizeNowBarConfig } from "./nowbar-data.js";

export function buildScreensaverViewState({
  isVisible = false,
  screensaverState = {},
  nowBarTiles = null,
} = {}) {
  return {
    isVisible,
    showNowBar: screensaverState.nowBar,
    nowBarItems: screensaverState.nowBarItems,
    nowBarTiles,
    clockVariant: screensaverState.clockVariant,
  };
}

export function getNowBarCalendarSignature(config = {}) {
  return normalizeNowBarConfig(config).entities.calendar.join("|");
}
