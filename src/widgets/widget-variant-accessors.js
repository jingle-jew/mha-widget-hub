export function getRegisteredWidgetVariantsFromDefinition(
  widget = {},
  normalizeWidgetSize,
  {
    getWidgetDefinition,
    normalizeRegisteredWidgetSize,
  } = {},
) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return [];
  if (typeof definition.resolveVariants === "function") {
    const variants = definition.resolveVariants(widget, definition);
    return Array.isArray(variants) ? variants : [];
  }
  if (!definition.variantGroups) return definition.variants;

  const size = normalizeRegisteredWidgetSize(widget, normalizeWidgetSize);
  return size.h > size.w
    ? definition.variantGroups.vertical
    : definition.variantGroups.horizontal;
}
