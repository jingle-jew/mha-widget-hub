import { WIDGET_MODULES } from "./widget-module-registry.js";
import {
  DEFAULT_CAPABILITIES,
  DEFAULT_SHELL,
  DEFAULT_STORAGE,
  DEFAULT_WIDGET_SIZE,
  normalizeCapabilities,
  normalizePreviewRenderer,
  normalizeShellBehavior,
  normalizeStorage,
  STATIC_PREVIEW_RENDERER,
} from "./widget-contract-helpers.js";
import {
  getWidgetCapabilitiesFromDefinition,
  getWidgetCatalogEntriesFromDefinition,
  getWidgetConfigTypeFromDefinition,
  getWidgetCreationDefaultsFromDefinition,
  getWidgetDefinitionFromRegistry,
  getWidgetManagerBehaviorFromDefinition,
  getWidgetPlacementFlowFromDefinition,
  getWidgetPreviewRendererFromDefinition,
  getWidgetRendererNameFromDefinition,
  getWidgetShellBehaviorFromDefinition,
  getWidgetStorageAdapterFromDefinition,
  normalizeRegisteredWidgetSizeFromDefinition,
} from "./widget-contract-accessors.js";
import { buildWidgetRegistry } from "./widget-contract-registry-builder.js";
import {
  buildWidgetManagerCategories,
  normalizeManagerDefinition,
} from "./widget-manager-catalog.js";
import {
  buildWidgetDefinitions,
  buildWidgetKindIndex,
  resolveWidgetKindFromIndex,
} from "./widget-kind-index.js";
import { getLegacyNormalizedContractPatch } from "./widget-legacy-normalization.js";

const DEFAULT_MANAGER = Object.freeze({
  entries: Object.freeze([]),
  hidden: false,
});

const DEFINITIONS = buildWidgetDefinitions(WIDGET_MODULES);
const WIDGET_KIND_INDEX = buildWidgetKindIndex(DEFINITIONS);

export function getWidgetManagerCategories() {
  return buildWidgetManagerCategories(DEFINITIONS, {
    getWidgetManagerBehavior,
    getWidgetCatalogEntries,
  });
}

export const WIDGET_REGISTRY = buildWidgetRegistry(WIDGET_MODULES, {
  defaultManager: DEFAULT_MANAGER,
  defaultCapabilities: DEFAULT_CAPABILITIES,
  defaultStorage: DEFAULT_STORAGE,
  defaultShell: DEFAULT_SHELL,
  staticPreviewRenderer: STATIC_PREVIEW_RENDERER,
  normalizeManagerDefinition,
  normalizeCapabilities,
  normalizeStorage,
  normalizeShellBehavior,
  normalizePreviewRenderer,
});

export function resolveWidgetKind(widget = {}, { fallback = "empty" } = {}) {
  return resolveWidgetKindFromIndex(widget, {
    ...WIDGET_KIND_INDEX,
    fallback,
  });
}

export function getWidgetDefinition(widgetOrKind = {}) {
  return getWidgetDefinitionFromRegistry(widgetOrKind, {
    registry: WIDGET_REGISTRY,
    resolveWidgetKind,
  });
}

export function getWidgetManagerBehavior(widget = {}) {
  return getWidgetManagerBehaviorFromDefinition(widget, {
    getWidgetDefinition,
    defaultManager: DEFAULT_MANAGER,
  });
}

export function getWidgetCatalogEntries(widget = {}) {
  return getWidgetCatalogEntriesFromDefinition(widget, {
    getWidgetManagerBehavior,
    defaultManager: DEFAULT_MANAGER,
  });
}

export function getWidgetPreviewRenderer(widgetOrKind = {}) {
  return getWidgetPreviewRendererFromDefinition(widgetOrKind, {
    getWidgetDefinition,
    staticPreviewRenderer: STATIC_PREVIEW_RENDERER,
  });
}

export function getWidgetRendererName(widget = {}) {
  return getWidgetRendererNameFromDefinition(widget, {
    getWidgetDefinition,
  });
}

export function getWidgetCapabilities(widget = {}) {
  return getWidgetCapabilitiesFromDefinition(widget, {
    getWidgetDefinition,
    defaultCapabilities: DEFAULT_CAPABILITIES,
  });
}

export function getWidgetShellBehavior(widget = {}) {
  return getWidgetShellBehaviorFromDefinition(widget, {
    getWidgetDefinition,
    defaultShell: DEFAULT_SHELL,
  });
}

export function getWidgetStorageAdapter(widget = {}) {
  return getWidgetStorageAdapterFromDefinition(widget, {
    getWidgetDefinition,
    defaultStorage: DEFAULT_STORAGE,
  });
}

export function getWidgetCreationDefaults(widget = {}) {
  return getWidgetCreationDefaultsFromDefinition(widget, {
    getWidgetDefinition,
    resolveWidgetKind,
    defaultWidgetSize: DEFAULT_WIDGET_SIZE,
  });
}

export function getWidgetPlacementFlow(widget = {}) {
  return getWidgetPlacementFlowFromDefinition(widget, {
    getWidgetDefinition,
  });
}

export function getWidgetConfigType(widget = {}) {
  return getWidgetConfigTypeFromDefinition(widget, {
    getWidgetDefinition,
    getWidgetCapabilities,
  });
}

export function isWidgetKind(widget, expectedKind) {
  return resolveWidgetKind(widget) === expectedKind;
}

export function normalizeRegisteredWidgetSize(widget = {}, normalizeBottomeSize) {
  return normalizeRegisteredWidgetSizeFromDefinition(widget, normalizeBottomeSize, {
    getWidgetDefinition,
    getWidgetCreationDefaults,
  });
}

export function getRegisteredWidgetVariants(widget = {}, normalizeBottomeSize) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return [];
  if (!definition.variantGroups) return definition.variants;

  const size = normalizeRegisteredWidgetSize(widget, normalizeBottomeSize);
  return size.h > size.w
    ? definition.variantGroups.vertical
    : definition.variantGroups.horizontal;
}

export function normalizeWidgetContract(widget = {}, normalizeBottomeSize) {
  const kind = resolveWidgetKind(widget);
  const definition = WIDGET_REGISTRY[kind];
  if (!definition) {
    const legacyKind = widget.kind || widget.type || "empty";
    return { ...widget, kind: legacyKind, type: legacyKind };
  }

  const size = normalizeRegisteredWidgetSize(widget, normalizeBottomeSize);
  const defaults = getWidgetCreationDefaults(kind);
  const normalized = {
    ...widget,
    kind,
    type: kind,
    component: defaults.component,
    category: widget.category || defaults.category,
    variant: widget.variant || defaults.defaultVariant || "",
    w: size.w,
    h: size.h,
  };

  const storageAdapter = getWidgetStorageAdapter(widget);
  const normalizedPatch = storageAdapter.normalize?.(widget, {
    definition,
    kind,
    normalizeBottomeSize,
    normalizeRegisteredWidgetSize: (nextWidget = widget) => (
      normalizeRegisteredWidgetSize(nextWidget, normalizeBottomeSize)
    ),
  });

  return {
    ...normalized,
    ...(
      normalizedPatch
      ?? getLegacyNormalizedContractPatch(widget, definition, normalized)
    ),
  };
}
