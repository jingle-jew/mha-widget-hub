export function applyDockLabelsSetting(
  host,
  enabled = false,
  {
    storageKey,
    writeStorageValueRef,
  } = {},
) {
  const shouldShow = Boolean(enabled);

  host._showDockLabels = shouldShow;
  host._recordPersistenceResult(writeStorageValueRef(storageKey, shouldShow));
  host.dataset.dockLabels = String(shouldShow);
  host._syncSettingsDom();

  return shouldShow;
}
