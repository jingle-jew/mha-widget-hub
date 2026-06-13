import { normalizeSliderWidgetSize } from "../layout/layout-engine.js";
import { createSlider } from "../ui/slider.js";
import { isWidgetKind } from "./widget-registry.js";

/*
 * SliderWidget
 *
 * A full widget whose primary content is a slider.
 *
 * This is intentionally separate from src/ui/slider.js:
 * - ui/slider.js = reusable low-level control;
 * - widgets/slider-widget.js = widget-level layout/orientation/HA binding surface.
 *
 * The full SliderWidget no longer uses the legacy micro-grid system. It renders
 * into a direct frame that respects the widget content inset, like the newer
 * button/weather/clock widgets.
 */
function normalizeSliderWidgetOrientation(orientation = "auto") {
  if (orientation === "horizontal" || orientation === "vertical") return orientation;
  return "auto";
}

function getSliderWidgetOrientationHint(size) {
  const normalized = normalizeSliderWidgetSize(size);
  return normalized.h > normalized.w ? "vertical" : "horizontal";
}

export function createSliderWidgetContent(
  widget,
  {
    size,
    value = widget.value ?? 68,
    min = widget.min ?? 0,
    max = widget.max ?? 100,
    orientation = widget.sliderOrientation ?? widget.orientation ?? "auto",
    className = "",
    onInput,
  } = {},
) {
  const orientationHint = getSliderWidgetOrientationHint(size);
  const resolvedOrientation = normalizeSliderWidgetOrientation(orientation);

  const frame = document.createElement("div");
  frame.className = [
    "mha-slider-widget-frame",
    className,
  ].filter(Boolean).join(" ");
  frame.dataset.orientationMode = resolvedOrientation;
  frame.dataset.orientationHint = orientationHint;

  const unit = document.createElement("div");
  unit.className = [
    "mha-slider-widget-unit",
    `mha-slider-widget-unit--${orientationHint}`,
  ].join(" ");

  unit.append(
    createSlider({
      value,
      min,
      max,
      orientation: resolvedOrientation,
      className: "mha-slider-widget-control",
      onInput,
    }),
  );

  frame.append(unit);

  return frame;
}

export function isSliderWidget(widget) {
  return isWidgetKind(widget, "slider");
}
