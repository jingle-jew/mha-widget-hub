export function buildWidgetShellState({
  widgetId = "",
  activeGridUnits = 2,
  isEditing = false,
  activeMoveWidgetId = "",
  position = undefined,
  hass = null,
  entityVisibilityConfig = null,
} = {}) {
  return {
    activeGridUnits,
    isEditing,
    isMoveTarget: Boolean(isEditing && widgetId && activeMoveWidgetId === widgetId),
    position,
    hass,
    entityVisibilityConfig,
  };
}
