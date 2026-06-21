export function applyHideHaSidebarSetting(
  host,
  enabled = false,
  {
    storageKey,
    writeStorageValueRef,
  } = {},
) {
  const shouldHide = Boolean(enabled);

  host._hideHaSidebar = shouldHide;
  host._recordPersistenceResult(writeStorageValueRef(storageKey, shouldHide));
  host._applyHaSidebarMode(shouldHide);
  host._syncSettingsDom();

  return shouldHide;
}
