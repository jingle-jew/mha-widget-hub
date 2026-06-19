export function getLegacyNormalizedContractPatch(widget = {}, definition, normalized) {
  const kind = normalized.kind;

  if (kind === "clock" && definition.variantAliases.includes(widget.variant)) {
    return {
      variant: widget.variant,
      entityId: widget.entityId || widget.entity_id || "",
    };
  }

  if (kind === "slider") {
    return {
      variant: widget.variant || normalized.variant,
      entityId: widget.entityId || widget.entity_id || "",
      sliderAction: widget.sliderAction === "volume" || widget.sliderAction === "brightness"
        ? widget.sliderAction
        : widget.variant === "volume-slider"
          ? "volume"
          : "brightness",
    };
  }

  if (kind === "toggle") {
    return {
      entityId: widget.entityId || widget.entity_id || "",
    };
  }

  if (kind === "button" || kind === "weather") {
    return {
      entityId: widget.entityId || widget.entity_id || "",
      ...(kind === "weather"
        ? { forecastType: widget.forecastType === "hourly" ? "hourly" : "daily" }
        : {}),
    };
  }

  if (kind === "scenes") {
    return {
      buttons: Array.isArray(widget.buttons)
        ? widget.buttons.map((button) => ({
          ...button,
          entityId: button?.entityId || button?.entity_id || "",
        }))
        : [],
    };
  }

  if (kind === "toggle-slider") {
    const entityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
    return {
      lightEntityId: entityId,
      entityId,
      sliderMode: "brightness",
    };
  }

  return {};
}
