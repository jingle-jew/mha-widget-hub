import { normalizeSliderWidgetSize } from "../layout/layout-engine.js";
import { createSlider } from "../ui/slider.js";
import { createWidgetInnerGrid, createWidgetSliderUnit } from "./widget-layout.js";

/*
 * SliderWidget
 *
 * A full widget whose primary content is a slider.
 *
 * This is intentionally separate from src/ui/slider.js:
 * - ui/slider.js = reusable low-level control;
 * - widgets/slider-widget.js = widget-level layout/orientation/HA binding surface.
 *
 * Future HA binding should live here, not inside the low-level slider control.
 */
function normalizeSliderWidgetOrientation(orientation = "auto") {
  if (orientation === "horizontal" || orientation === "vertical") return orientation;
  return "auto";
}

function getEffectiveWidgetWidth(size, activeGridUnits = size.w) {
  return Math.max(1, Math.min(size.w, activeGridUnits));
}

function clampSliderWidgetSize(size) {
  /*
   * Use the SliderWidget contract size directly.
   *
   * Do not reduce the internal span with activeGridUnits here. The outer widget
   * shell already exposes the effective size through --mha-widget-w/h. If this
   * content layer clamps again, a 4x1 / 1x4 slider can collapse back to 3 units.
   */
  const normalized = normalizeSliderWidgetSize(size);
  const isVertical = normalized.h > normalized.w;

  if (isVertical) {
    return {
      orientationHint: "vertical",
      colSpan: 1,
      rowSpan: normalized.h,
    };
  }

  return {
    orientationHint: "horizontal",
    colSpan: normalized.w,
    rowSpan: 1,
  };
}

export function createSliderWidgetContent(
  widget,
  {
    size,
    activeGridUnits,
    value = widget.value ?? 68,
    min = widget.min ?? 0,
    max = widget.max ?? 100,
    orientation = widget.sliderOrientation ?? widget.orientation ?? "auto",
    className = "",
    onInput,
  } = {},
) {
  const sliderSize = clampSliderWidgetSize(size);
  const resolvedOrientation = normalizeSliderWidgetOrientation(orientation);
  const innerGrid = createWidgetInnerGrid({
    className: "mha-slider-widget-grid",
  });

  innerGrid.append(
    createWidgetSliderUnit({
      col: 1,
      row: 1,
      colSpan: sliderSize.colSpan,
      rowSpan: sliderSize.rowSpan,
      orientation: resolvedOrientation,
      hasLabel: false,
      className: [
        "mha-slider-widget-unit",
        `mha-slider-widget-unit--${sliderSize.orientationHint}`,
        className,
      ].filter(Boolean).join(" "),
      children: createSlider({
        value,
        min,
        max,
        orientation: resolvedOrientation,
        className: "mha-slider-widget-control",
        onInput,
      }),
    }),
  );

  return innerGrid;
}

export function isSliderWidget(widget) {
  return widget?.type === "slider" || widget?.kind === "slider" || widget?.component === "slider-widget";
}
