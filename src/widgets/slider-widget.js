import { normalizeSliderWidgetSize } from "../layout/layout-engine.js";
import { createLatestValueAction, runSliderAction } from "../ha/actions.js";
import { getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import { getSliderBinding } from "../ha/slider.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { isWidgetKind } from "./widget-registry.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";

const SLIDER_SERVICE_INTERVAL_MS = 80;

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
    onChange,
    hass,
    entityVisibilityConfig,
  } = {},
) {
  const orientationHint = getSliderWidgetOrientationHint(size);
  const resolvedOrientation = normalizeSliderWidgetOrientation(orientation);
  const entityId = getWidgetEntityId(widget);
  const context = {
    hass,
    entityState: null,
    sliderBinding: null,
    entityAvailable: false,
    entityAllowed: true,
  };
  const sliderAction = createLatestValueAction(
    nextValue => runSliderAction(context.hass, context.entityState, nextValue),
    { intervalMs: SLIDER_SERVICE_INTERVAL_MS },
  );

  const frame = document.createElement("div");
  frame.className = [
    "mha-slider-widget-frame",
    className,
  ].filter(Boolean).join(" ");
  frame.dataset.widgetComponent = "slider";
  frame.dataset.orientationMode = resolvedOrientation;
  frame.dataset.orientationHint = orientationHint;
  frame.dataset.sliderAction = widget.sliderAction || "brightness";

  const unit = document.createElement("div");
  unit.className = [
    "mha-slider-widget-unit",
    `mha-slider-widget-unit--${orientationHint}`,
  ].join(" ");

  const slider = createSlider({
    value,
    min,
    max,
    orientation: resolvedOrientation,
    className: "mha-slider-widget-control",
    onInput: event => {
      const nextValue = Number(event.currentTarget.value);
      if (entityId && context.entityAvailable && context.sliderBinding) {
        sliderAction.update(nextValue);
      }
      onInput?.(event);
    },
    onChange: event => {
      const nextValue = Number(event.currentTarget.value);
      if (entityId && context.entityAvailable && context.sliderBinding) {
        sliderAction.commit(nextValue);
      }
      onChange?.(event);
    },
  });
  slider.querySelector(".mha-slider-input")
    ?.setAttribute("aria-label", widget.label || "Slider");

  const iconName = widget.sliderAction === "volume" ? "speaker-volume" : "globe";
  const iconLabel = widget.sliderAction === "volume" ? "Volume" : "Intensité lumière";
  const icon = createIcon({
    name: iconName,
    category: widget.sliderAction === "volume" ? "media_player" : "lighting",
    label: iconLabel,
    className: "mha-slider-widget-icon",
    children: createIconSymbol({ name: iconName }),
  });

  const label = document.createElement("span");
  label.className = "mha-slider-widget-label";
  label.textContent = widget.label || "";
  label.hidden = !label.textContent;

  const meta = document.createElement("span");
  meta.className = "mha-slider-widget-meta";
  meta.append(icon, label);

  unit.append(slider, meta);

  frame.append(unit);

  frame.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    context.entityAllowed = isEntityAllowedForCurrentUser(
      nextHass,
      entityId,
      entityVisibilityConfig,
    );
    context.entityState = context.entityAllowed
      ? getEntityState(nextHass, widget)
      : null;
    context.sliderBinding = getSliderBinding(context.entityState);
    context.entityAvailable = !entityId || isEntityAvailable(context.entityState);

    const supportsSlider = context.entityAvailable && (
      widget.supportsSlider
      ?? (!entityId || Boolean(context.sliderBinding))
    );
    const nextValue = context.sliderBinding?.value ?? widget.value ?? value;
    const isDragging = slider.classList.contains("is-slider-dragging");

    frame.dataset.entityAvailable = String(context.entityAvailable);
    frame.dataset.entityAllowed = String(context.entityAllowed);
    frame.dataset.sliderSupported = String(Boolean(supportsSlider));
    slider.setAttribute(
      "aria-label",
      context.entityAllowed ? widget.label || "Slider" : "Entité non autorisée",
    );
    slider.querySelector(".mha-slider-input")?.setAttribute(
      "aria-label",
      context.entityAllowed ? widget.label || "Slider" : "Entité non autorisée",
    );
    label.textContent = context.entityAllowed
      ? widget.label || ""
      : "Entité non autorisée";
    label.hidden = !label.textContent;
    frame.title = context.entityAllowed ? "" : "Entité non autorisée";
    if (!context.entityAvailable) sliderAction.clear();

    slider.__mhaSliderApi?.setDisabled(!supportsSlider);
    if (!isDragging) {
      slider.__mhaSliderApi?.setValue(nextValue);
    }
  };

  frame.__mhaDestroy = () => {
    sliderAction.clear();
    context.hass = null;
    context.entityState = null;
    context.sliderBinding = null;
    context.entityAvailable = false;
    context.entityAllowed = true;
    delete frame.__mhaUpdateFromHass;
  };

  frame.__mhaUpdateFromHass(hass);

  return frame;
}

export function isSliderWidget(widget) {
  return isWidgetKind(widget, "slider");
}
