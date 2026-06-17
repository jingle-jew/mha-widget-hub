export const freezeSize = (w, h) => Object.freeze({ w, h });

export const variant = (name, label, w, h) => Object.freeze({
  variant: name,
  label,
  size: freezeSize(w, h),
});

export const css = (...paths) => Object.freeze(paths);

export const clampWidth = (size, min, max) => ({
  w: Math.max(min, Math.min(max, size.w)),
  h: size.h,
});

export function isLocalWidgetKind(widget = {}, expectedKind = "", aliases = [], components = []) {
  if (typeof widget === "string") return widget === expectedKind || aliases.includes(widget);
  return [widget.kind, widget.type, widget.component].some((value) => (
    value === expectedKind || aliases.includes(value) || components.includes(value)
  ));
}
