import {
  normalizeWidgetForKind,
  normalizeWidgetSize,
} from "../layout/layout-engine.js";
import {
  getWidgetDefinition,
  normalizeWidgetContract,
  resolveWidgetKind,
} from "./widget-registry.js";

export function createWidgetFromCatalogItem(
  item = {},
  {
    now = Date.now,
    random = Math.random,
  } = {},
) {
  const timestamp = now().toString(36);
  const randomToken = random().toString(36).slice(2, 7);
  const kind = resolveWidgetKind(item);
  const definition = getWidgetDefinition(kind);
  const variant = item.variant || definition?.defaultVariant || kind;
  const category = item.category || definition?.category || "custom";
  const baseSize = item.size || definition?.defaultSize || { w: 2, h: 2 };
  const size = normalizeWidgetForKind({
    kind,
    type: kind,
    category,
    variant,
    ...baseSize,
  });

  return normalizeWidgetContract({
    id: `widget-${category}-${variant || kind}-${timestamp}-${randomToken}`,
    kind,
    type: kind,
    component: definition?.component || "empty-widget",
    category,
    variant,
    title: item.label || "Widget",
    w: size.w,
    h: size.h,
  }, normalizeWidgetSize);
}
