export function canToggleEditMode({ isEditing = false, isMobileLandscape = false } = {}) {
  return Boolean(isEditing) || !Boolean(isMobileLandscape);
}

export function getNextEditMode(editing = false) {
  return !Boolean(editing);
}

export function clearWidgetPlacementState(host) {
  host._activeMoveWidgetId = "";
  host._pendingWidgetPlacement = null;
  host._widgetManagerOpen = false;
  host._widgetManagerCategory = "";
  host.classList?.remove?.("is-widget-drag-pending", "is-widget-dragging");

  return host;
}
