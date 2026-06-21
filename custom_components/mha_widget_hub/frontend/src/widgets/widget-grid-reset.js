export function resetWidgetGridState(host, { clearGridStorageRef } = {}) {
  clearGridStorageRef();

  host._widgetPositions = {};
  host._activeMoveWidgetId = "";
  host._pages = host._readPages();
  host._activePageId = host._readActivePageId();
  host._widgets = host._readWidgets();
  host.render();

  return host;
}
