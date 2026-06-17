import { normalizeSliderWidgetSize } from "../layout/layout-engine.js";
import { createLatestValueAction, runSliderAction } from "../ha/actions.js";
import { getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import { getSliderBinding } from "../ha/slider.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createSlider } from "../ui/slider.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";
import { buildSliderWidgetConfig, createSliderConfigDraft } from "../widget-config/slider-config.js";

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
  return isLocalWidgetKind(widget, "slider", ["slider-widget"], []);
}


export const SLIDER_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, size, activeGridUnits, hass, entityVisibilityConfig }) => createSliderWidgetContent(widget, {
    size,
    activeGridUnits,
    hass,
    entityVisibilityConfig,
    value: widget.value ?? 68,
    orientation: "auto",
    className: "mha-widget-runtime-slider",
  }),
});

export const SLIDER_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "slider",
  title: "Configurer le slider",
  hint: "Choisis l’action, l’appareil et le nom à afficher.",
  createDraft: createSliderConfigDraft,
  build: buildSliderWidgetConfig,
});

export const SLIDER_WIDGET_DEFINITION = Object.freeze({
  component: "slider-widget",
  category: "lights",
  manager: Object.freeze({
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "light-slider-wide", label: "Intensité horizontale", size: freezeSize(4, 1), description: "Slider large.", order: 40 }),
      Object.freeze({ category: "lights", variant: "light-slider-vertical", label: "Intensité verticale", size: freezeSize(1, 4), description: "Slider vertical.", order: 50 }),
      Object.freeze({ category: "climate", variant: "temperature-slider", label: "Température slider", size: freezeSize(4, 1), description: "Contrôle linéaire.", order: 70 }),
      Object.freeze({ category: "media", variant: "volume-slider", label: "Volume", size: freezeSize(4, 1), description: "Slider volume.", order: 30 }),
    ]),
  }),
  renderer: "slider",
  css: css("styles/widgets/slider-widget.css"),
  preview: "slider",
  config: "slider",
  aliases: ["slider-widget"],
  variantAliases: [
    "light-slider-horizontal",
    "light-slider-wide",
    "light-slider-vertical",
    "temperature-slider",
    "volume-slider",
  ],
  defaultSize: freezeSize(2, 1),
  normalizeSize: (size) => size.h > size.w
    ? { w: 1, h: Math.max(2, Math.min(4, size.h)) }
    : { w: Math.max(2, Math.min(4, size.w)), h: 1 },
  variantGroups: {
    horizontal: [
      variant("light-slider-horizontal", "Horizontal 2×1", 2, 1),
      variant("light-slider-horizontal", "Horizontal 3×1", 3, 1),
      variant("light-slider-horizontal", "Horizontal 4×1", 4, 1),
    ],
    vertical: [
      variant("light-slider-vertical", "Vertical 1×2", 1, 2),
      variant("light-slider-vertical", "Vertical 1×3", 1, 3),
      variant("light-slider-vertical", "Vertical 1×4", 1, 4),
    ],
  },
});

export const WIDGET_MODULE = Object.freeze({
  kind: "slider",
  definition: SLIDER_WIDGET_DEFINITION,
  renderer: SLIDER_WIDGET_CONTENT_RENDERER,
  config: SLIDER_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({ mode: "static" }),
});
