export function buildWidgetShellState({
  widgetId = "",
  activeGridUnits = 2,
  activeGridRows = 2,
  layout = "desktop",
  isEditing = false,
  activeMoveWidgetId = "",
  position = undefined,
  hass = null,
  entityVisibilityConfig = null,
} = {}) {
  return {
    activeGridUnits,
    activeGridRows,
    layout,
    isEditing,
    isMoveTarget: Boolean(isEditing && widgetId && activeMoveWidgetId === widgetId),
    position,
    hass,
    entityVisibilityConfig,
  };
}
