import {
  buildWidgetCreationDefaults,
  normalizeRegisteredWidgetSizeWithDefinition,
  resolveContractValue,
} from "./widget-contract-helpers.js";

export function getWidgetDefinitionFromRegistry(widgetOrKind = {}, { registry, resolveWidgetKind } = {}) {
  return registry[resolveWidgetKind(widgetOrKind)] || null;
}

export function getWidgetManagerBehaviorFromDefinition(widget = {}, { getWidgetDefinition, defaultManager } = {}) {
  return getWidgetDefinition(widget)?.manager || defaultManager;
}

export function getWidgetCatalogEntriesFromDefinition(widget = {}, { getWidgetManagerBehavior, defaultManager } = {}) {
  return getWidgetManagerBehavior(widget).entries || defaultManager.entries;
}

export function getWidgetPreviewRendererFromDefinition(widgetOrKind = {}, { getWidgetDefinition, staticPreviewRenderer } = {}) {
  return getWidgetDefinition(widgetOrKind)?.previewRenderer || staticPreviewRenderer;
}

export function getWidgetRendererNameFromDefinition(widget = {}, { getWidgetDefinition } = {}) {
  return getWidgetDefinition(widget)?.renderer || "empty";
}

export function getWidgetCapabilitiesFromDefinition(widget = {}, { getWidgetDefinition, defaultCapabilities } = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return defaultCapabilities;

  return Object.freeze(
    Object.fromEntries(
      Object.entries(definition.capabilities || defaultCapabilities).map(([key, value]) => [
        key,
        resolveContractValue(value, widget, definition),
      ]),
    ),
  );
}

export function getWidgetShellBehaviorFromDefinition(widget = {}, { getWidgetDefinition, defaultShell } = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return defaultShell;

  return Object.freeze({
    ...definition.shell,
    configureMode: resolveContractValue(
      definition.shell?.configureMode ?? defaultShell.configureMode,
      widget,
      definition,
    ),
  });
}

export function getWidgetStorageAdapterFromDefinition(widget = {}, { getWidgetDefinition, defaultStorage } = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return defaultStorage;
  return definition.storage || defaultStorage;
}

export function getWidgetCreationDefaultsFromDefinition(
  widget = {},
  {
    getWidgetDefinition,
    resolveWidgetKind,
    defaultWidgetSize,
  } = {},
) {
  const definition = getWidgetDefinition(widget);
  const kind = resolveWidgetKind(widget, { fallback: "empty" });
  return buildWidgetCreationDefaults(widget, {
    definition,
    kind,
    defaultWidgetSize,
  });
}

export function getWidgetPlacementFlowFromDefinition(widget = {}, { getWidgetDefinition } = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return "direct";
  return resolveContractValue(definition.placementFlow || "direct", widget, definition) || "direct";
}

export function getWidgetConfigTypeFromDefinition(widget = {}, { getWidgetDefinition, getWidgetCapabilities } = {}) {
  const definition = getWidgetDefinition(widget);
  const capabilities = getWidgetCapabilities(widget);
  if (capabilities.weatherEntityConfigurable) return "weather";
  if (!capabilities.configurable) return "";
  return definition?.config || "";
}

export function normalizeRegisteredWidgetSizeFromDefinition(
  widget = {},
  normalizeWidgetSize,
  context = {},
  {
    getWidgetDefinition,
    getWidgetCreationDefaults,
  } = {},
) {
  const definition = getWidgetDefinition(widget);
  const defaults = getWidgetCreationDefaults(widget);
  return normalizeRegisteredWidgetSizeWithDefinition(widget, normalizeWidgetSize, {
    definition,
    defaults,
    context,
  });
}
