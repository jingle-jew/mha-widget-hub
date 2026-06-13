import { normalizeWidgetForKind, normalizeWidgetSize } from "../layout/layout-engine.js";
import {
  getRegisteredWidgetVariants,
  resolveWidgetKind,
  WIDGET_REGISTRY,
} from "./widget-registry.js";

export const WIDGET_VARIANTS = Object.freeze({
  clock: WIDGET_REGISTRY.clock.variants,
  button: WIDGET_REGISTRY.button.variants,
  weather: WIDGET_REGISTRY.weather.variants,
  sliderHorizontal: WIDGET_REGISTRY.slider.variantGroups.horizontal,
  sliderVertical: WIDGET_REGISTRY.slider.variantGroups.vertical,
  toggle: WIDGET_REGISTRY.toggle.variants,
  toggleSlider: WIDGET_REGISTRY["toggle-slider"].variants,
  toggleButtons: WIDGET_REGISTRY["toggle-buttons"].variants,
});

export function getWidgetVariantKind(widget = {}) {
  const kind = resolveWidgetKind(widget);
  if (kind === "toggle-slider") return "toggleSlider";
  if (kind === "toggle-buttons") return "toggleButtons";
  if (kind === "slider") {
    const size = normalizeWidgetForKind(widget);
    return size.h > size.w ? "sliderVertical" : "sliderHorizontal";
  }
  return kind;
}

export function getWidgetVariants(widgetOrKind = {}) {
  if (typeof widgetOrKind === "string" && WIDGET_VARIANTS[widgetOrKind]) {
    return WIDGET_VARIANTS[widgetOrKind];
  }
  return getRegisteredWidgetVariants(widgetOrKind, normalizeWidgetSize);
}

export function sameVariantSize(a = {}, b = {}) {
  return Number(a?.w) === Number(b?.w) && Number(a?.h) === Number(b?.h);
}

export function getWidgetVariantIndex(widget = {}) {
  const variants = getWidgetVariants(widget);
  const size = normalizeWidgetForKind(widget);
  const variant = widget.variant || "";

  const exact = variants.findIndex((entry) => (
    entry.variant === variant &&
    sameVariantSize(entry.size, size)
  ));

  if (exact >= 0) return exact;
  return variants.findIndex((entry) => sameVariantSize(entry.size, size));
}

export function getVariantCandidate(widget = {}, variantEntry = {}) {
  const size = normalizeWidgetForKind({
    ...widget,
    variant: variantEntry.variant || widget.variant,
    ...(variantEntry.size || {}),
  });

  return {
    ...widget,
    variant: variantEntry.variant || widget.variant,
    w: size.w,
    h: size.h,
  };
}

export function getNextWidgetVariantEntries(widget = {}) {
  const variants = getWidgetVariants(widget);
  if (!variants.length) return [];

  const currentIndex = getWidgetVariantIndex(widget);
  const start = currentIndex >= 0 ? currentIndex + 1 : 0;

  return variants.map((_, offset) => variants[(start + offset) % variants.length]);
}
