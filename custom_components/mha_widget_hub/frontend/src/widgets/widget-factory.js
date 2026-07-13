import {
  normalizeWidgetForKind,
  normalizeWidgetSize,
} from "../layout/layout-engine.js";
import {
  getWidgetCreationDefaults,
  normalizeWidgetContract,
  resolveWidgetKind,
} from "./widget-registry.js";

const CATALOG_WIDGET_CONFIG_KEYS = Object.freeze([
  "entityId",
  "entity_id",
  "forecastType",
  "displayMode",
  "metricKey",
  "icon",
  "sourceType",
  "valueKind",
  "weatherEntityId",
  "attribute",
  "unit",
]);

function getCatalogWidgetConfig(item = {}) {
  const config = Object.fromEntries(
    CATALOG_WIDGET_CONFIG_KEYS
      .filter(key => item[key] !== undefined)
      .map(key => [key, item[key]]),
  );
  if (resolveWidgetKind(item) === "weather-metric" && item.label !== undefined) {
    config.label = item.label;
  }
  return config;
}

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
  const defaults = getWidgetCreationDefaults(kind);
  const variant = item.variant || defaults.defaultVariant || kind;
  const category = item.category || defaults.category || "custom";
  const baseSize = item.size || defaults.defaultSize || { w: 2, h: 2 };
  const size = normalizeWidgetForKind({
    kind,
    type: kind,
    category,
    variant,
    ...baseSize,
  });

  return normalizeWidgetContract({
    ...getCatalogWidgetConfig(item),
    id: `widget-${category}-${variant || kind}-${timestamp}-${randomToken}`,
    kind,
    type: kind,
    component: defaults.component,
    category,
    variant,
    title: item.title || item.label || "Widget",
    w: size.w,
    h: size.h,
  }, normalizeWidgetSize);
}
