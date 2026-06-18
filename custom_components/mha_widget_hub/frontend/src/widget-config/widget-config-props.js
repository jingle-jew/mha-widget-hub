export function buildWidgetConfigPopupState({
  session = null,
  hass = null,
  visibilityConfig = null,
} = {}) {
  return {
    session,
    hass,
    visibilityConfig,
  };
}

export function getScenesDefaultButtonIndex(widget = {}) {
  const buttons = Array.isArray(widget?.buttons) ? widget.buttons : [];
  const firstEmpty = buttons.findIndex((button) => !String(button?.entityId || button?.entity_id || "").trim());
  return firstEmpty >= 0 ? firstEmpty : 0;
}
