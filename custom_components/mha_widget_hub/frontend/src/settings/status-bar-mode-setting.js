import { normalizeStatusBarMode } from "../core/status-bar-mode.js";

export function applyStatusBarModeSetting(
  host,
  mode = "top-bar",
  {
    storageKey,
    writeStorageValueRef,
  } = {},
) {
  const nextMode = normalizeStatusBarMode(mode);

  host._statusBarMode = nextMode;
  host.dataset.statusBarMode = nextMode;
  host._recordPersistenceResult(writeStorageValueRef(storageKey, nextMode));
  host._syncSettingsDom();

  if (typeof host._handleViewportChange === "function") {
    host._handleViewportChange();
  } else if (typeof host._scheduleSquareUnitSync === "function") {
    host._scheduleSquareUnitSync();
  }

  return nextMode;
}
