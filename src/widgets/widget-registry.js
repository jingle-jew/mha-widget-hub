import { WIDGET_MODULES } from "./widget-module-registry.js";
import {
  buildWidgetCreationDefaults,
  DEFAULT_CAPABILITIES,
  DEFAULT_SHELL,
  DEFAULT_STORAGE,
  DEFAULT_WIDGET_SIZE,
  normalizeCapabilities,
  normalizePreviewRenderer,
  normalizeRegisteredWidgetSizeWithDefinition,
  normalizeShellBehavior,
  normalizeStorage,
  resolveContractValue,
  STATIC_PREVIEW_RENDERER,
} from "./widget-contract-helpers.js";
import { buildWidgetRegistry } from "./widget-contract-registry-builder.js";
import {
  buildWidgetManagerCategories,
  normalizeManagerDefinition,
} from "./widget-manager-catalog.js";
import { getLegacyNormalizedContractPatch } from "./widget-legacy-normalization.js";

const DEFAULT_MANAGER = Object.freeze({
  entries: Object.freeze([]),
  hidden: false,
});

const DEFINITIONS = Object.freeze(
  Object.fromEntries(
    WIDGET_MODULES
      .filter((module) => module?.kind && module?.definition)
      .map((module) => [module.kind, module.definition]),
  ),
);

const aliasToKind = new Map();
const variantToKind = new Map();

Object.entries(DEFINITIONS).forEach(([kind, definition]) => {
  aliasToKind.set(kind, kind);
  definition.aliases.forEach(alias => aliasToKind.set(alias, kind));
  definition.variantAliases.forEach(alias => variantToKind.set(alias, kind));
});

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
  if (typeof widget === "string") {
    return aliasToKind.get(widget) || widget || fallback;
  }

  let emptyMatch = "";
  for (const value of [widget.kind, widget.type, widget.component]) {
    if (!aliasToKind.has(value)) continue;
    const kind = aliasToKind.get(value);
    if (kind !== "empty") return kind;
    emptyMatch = kind;
  }

  if (variantToKind.has(widget.variant)) return variantToKind.get(widget.variant);
  if (["slot-f", "slot-i"].includes(widget.id)) return "slider";
  return emptyMatch || widget.kind || widget.type || fallback;
}

export function getWidgetDefinition(widgetOrKind = {}) {
  return WIDGET_REGISTRY[resolveWidgetKind(widgetOrKind)] || null;
}

export function getWidgetManagerBehavior(widget = {}) {
  return getWidgetDefinition(widget)?.manager || DEFAULT_MANAGER;
}

export function getWidgetCatalogEntries(widget = {}) {
  return getWidgetManagerBehavior(widget).entries || DEFAULT_MANAGER.entries;
}

export function getWidgetPreviewRenderer(widgetOrKind = {}) {
  return getWidgetDefinition(widgetOrKind)?.previewRenderer || STATIC_PREVIEW_RENDERER;
}

export function getWidgetRendererName(widget = {}) {
  return getWidgetDefinition(widget)?.renderer || "empty";
}

export function getWidgetCapabilities(widget = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return DEFAULT_CAPABILITIES;

  return Object.freeze(
    Object.fromEntries(
      Object.entries(definition.capabilities || DEFAULT_CAPABILITIES).map(([key, value]) => [
        key,
        resolveContractValue(value, widget, definition),
      ]),
    ),
  );
}

export function getWidgetShellBehavior(widget = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return DEFAULT_SHELL;

  return Object.freeze({
    ...definition.shell,
    configureMode: resolveContractValue(
      definition.shell?.configureMode ?? DEFAULT_SHELL.configureMode,
      widget,
      definition,
    ),
  });
}

export function getWidgetStorageAdapter(widget = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return DEFAULT_STORAGE;
  return definition.storage || DEFAULT_STORAGE;
}

export function getWidgetCreationDefaults(widget = {}) {
  const definition = getWidgetDefinition(widget);
  const kind = resolveWidgetKind(widget, { fallback: "empty" });
  return buildWidgetCreationDefaults(widget, {
    definition,
    kind,
    defaultWidgetSize: DEFAULT_WIDGET_SIZE,
  });
}

export function getWidgetPlacementFlow(widget = {}) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return "direct";
  return resolveContractValue(definition.placementFlow || "direct", widget, definition) || "direct";
}

export function getWidgetConfigType(widget = {}) {
  const definition = getWidgetDefinition(widget);
  const capabilities = getWidgetCapabilities(widget);
  if (capabilities.weatherEntityConfigurable) return "weather";
  if (!capabilities.configurable) return "";
  return definition?.config || "";
}

export function isWidgetKind(widget, expectedKind) {
  return resolveWidgetKind(widget) === expectedKind;
}

export function normalizeRegisteredWidgetSize(widget = {}, normalizeBottomeSize) {
  const definition = getWidgetDefinition(widget);
  const defaults = getWidgetCreationDefaults(widget);
  return normalizeRegisteredWidgetSizeWithDefinition(widget, normalizeBottomeSize, {
    definition,
    defaults,
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
