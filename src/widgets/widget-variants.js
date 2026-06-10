import { normalizeWidgetForKind } from "../layout/layout-engine.js";

export const WIDGET_VARIANTS = Object.freeze({
  clock: Object.freeze([
    Object.freeze({ variant: "digital", label: "Numérique", size: Object.freeze({ w: 2, h: 2 }) }),
    Object.freeze({ variant: "digital-weather", label: "Numérique météo", size: Object.freeze({ w: 2, h: 2 }) }),
    Object.freeze({ variant: "analog", label: "Analogique", size: Object.freeze({ w: 2, h: 2 }) }),
    Object.freeze({ variant: "ios-analog", label: "Analogique iOS", size: Object.freeze({ w: 2, h: 2 }) }),
  ]),

  button: Object.freeze([
    Object.freeze({ variant: "simple-button", label: "Pilule 2×1", size: Object.freeze({ w: 2, h: 1 }) }),
    Object.freeze({ variant: "simple-button", label: "Pilule 3×1", size: Object.freeze({ w: 3, h: 1 }) }),
    Object.freeze({ variant: "simple-button", label: "Pilule 4×1", size: Object.freeze({ w: 4, h: 1 }) }),
    Object.freeze({ variant: "simple-button", label: "Carré 2×2", size: Object.freeze({ w: 2, h: 2 }) }),
  ]),

  weather: Object.freeze([
    Object.freeze({ variant: "adaptive-weather", label: "Horizontal 4×1", size: Object.freeze({ w: 4, h: 1 }) }),
    Object.freeze({ variant: "adaptive-weather", label: "Compact 2×2", size: Object.freeze({ w: 2, h: 2 }) }),
    Object.freeze({ variant: "adaptive-weather", label: "Détails 3×2", size: Object.freeze({ w: 3, h: 2 }) }),
    Object.freeze({ variant: "adaptive-weather", label: "Prévisions 4×2", size: Object.freeze({ w: 4, h: 2 }) }),
  ]),

  sliderHorizontal: Object.freeze([
    Object.freeze({ variant: "light-slider-horizontal", label: "Horizontal 2×1", size: Object.freeze({ w: 2, h: 1 }) }),
    Object.freeze({ variant: "light-slider-horizontal", label: "Horizontal 3×1", size: Object.freeze({ w: 3, h: 1 }) }),
    Object.freeze({ variant: "light-slider-horizontal", label: "Horizontal 4×1", size: Object.freeze({ w: 4, h: 1 }) }),
  ]),

  sliderVertical: Object.freeze([
    Object.freeze({ variant: "light-slider-vertical", label: "Vertical 1×2", size: Object.freeze({ w: 1, h: 2 }) }),
    Object.freeze({ variant: "light-slider-vertical", label: "Vertical 1×3", size: Object.freeze({ w: 1, h: 3 }) }),
    Object.freeze({ variant: "light-slider-vertical", label: "Vertical 1×4", size: Object.freeze({ w: 1, h: 4 }) }),
  ]),

  toggle: Object.freeze([
    Object.freeze({ variant: "toggle-widget", label: "Toggle 3×1", size: Object.freeze({ w: 3, h: 1 }) }),
    Object.freeze({ variant: "toggle-widget", label: "Toggle 4×1", size: Object.freeze({ w: 4, h: 1 }) }),
  ]),
});

export function getWidgetVariantKind(widget = {}) {
  const kind = widget.kind || widget.type || widget.component || "empty";
  const variant = widget.variant || "";

  if (
    kind === "clock" ||
    kind === "clock-widget" ||
    ["digital", "digital-weather", "analog", "ios-analog"].includes(variant)
  ) return "clock";

  if (kind === "button" || kind === "button-widget" || variant === "simple-button") return "button";
  if (kind === "weather" || kind === "weather-widget" || variant === "adaptive-weather") return "weather";

  if (
    kind === "toggle" ||
    kind === "toggle-widget" ||
    variant === "toggle-widget" ||
    variant === "simple-toggle"
  ) return "toggle";

  if (
    kind === "slider" ||
    kind === "slider-widget" ||
    variant === "light-slider-horizontal" ||
    variant === "light-slider-vertical" ||
    variant === "temperature-slider" ||
    variant === "volume-slider"
  ) {
    const size = normalizeWidgetForKind(widget);
    return size.h > size.w ? "sliderVertical" : "sliderHorizontal";
  }

  return kind;
}

export function getWidgetVariants(widgetOrKind = {}) {
  const kind = typeof widgetOrKind === "string" ? widgetOrKind : getWidgetVariantKind(widgetOrKind);
  return WIDGET_VARIANTS[kind] || [];
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
