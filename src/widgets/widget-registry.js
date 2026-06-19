import { WIDGET_MODULES } from "./widget-module-registry.js";

const STATIC_PREVIEW_RENDERER = Object.freeze({ mode: "static" });
const DEFAULT_MANAGER = Object.freeze({
  entries: Object.freeze([]),
  hidden: false,
});
const DEFAULT_CAPABILITIES = Object.freeze({
  configurable: false,
  resizable: true,
  slotConfigurable: false,
  weatherEntityConfigurable: false,
});
const DEFAULT_SHELL = Object.freeze({
  configureMode: "variant",
});
const DEFAULT_STORAGE = Object.freeze({});

function normalizePreviewRenderer(module = {}) {
  const previewRenderer = module.preview || STATIC_PREVIEW_RENDERER;
  return Object.freeze({
    mode: previewRenderer.mode || "static",
    createWidget: previewRenderer.createWidget,
    render: previewRenderer.render,
  });
}

const WIDGET_MANAGER_METADATA = Object.freeze({
  categories: Object.freeze({
    utilities: Object.freeze({ label: "Utilities", description: "Clocks and quick info.", icon: "◷", order: 10 }),
    actions: Object.freeze({ label: "Actions", description: "Buttons and shortcuts.", icon: "●", order: 20 }),
    lights: Object.freeze({ label: "Lights", description: "Quick controls and brightness.", icon: "💡", order: 30 }),
    climate: Object.freeze({ label: "Climate", description: "Temperature and comfort.", icon: "🌡", order: 40 }),
    media: Object.freeze({ label: "Media", description: "Playback and volume.", icon: "♪", order: 50 }),
    security: Object.freeze({ label: "Security", description: "Alarms, locks, and state.", icon: "⌂", order: 60 }),
    system: Object.freeze({ label: "System", description: "Maintenance, network, and energy.", icon: "⚙", order: 70 }),
  }),
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

function catalogKeyForEntry(entry = {}) {
  const raw = entry.catalogKey || entry.label || entry.variant || "widget";
  return String(raw)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeManagerEntry(entry = {}) {
  return Object.freeze({
    ...entry,
    hidden: Boolean(entry.hidden),
  });
}

function normalizeManagerDefinition(definition = {}) {
  const manager = definition.manager || DEFAULT_MANAGER;
  return Object.freeze({
    ...DEFAULT_MANAGER,
    ...manager,
    hidden: Boolean(manager.hidden),
    entries: Object.freeze((manager.entries || []).map(normalizeManagerEntry)),
  });
}

function normalizeCapabilities(definition = {}) {
  return Object.freeze({
    ...DEFAULT_CAPABILITIES,
    configurable: Boolean(definition.config),
    ...definition.capabilities,
  });
}

function normalizeShellBehavior(definition = {}) {
  return Object.freeze({
    ...DEFAULT_SHELL,
    configureMode: definition.config ? "config" : "variant",
    ...definition.shell,
  });
}

function normalizeStorage(definition = {}) {
  return Object.freeze({
    ...DEFAULT_STORAGE,
    ...(definition.storage || {}),
  });
}

function resolveContractValue(value, widget, definition) {
  return typeof value === "function" ? value(widget, definition) : value;
}

function getLegacyNormalizedContractPatch(widget = {}, definition, normalized) {
  const kind = normalized.kind;

  if (kind === "clock" && definition.variantAliases.includes(widget.variant)) {
    return {
      variant: widget.variant,
      entityId: widget.entityId || widget.entity_id || "",
    };
  }

  if (kind === "slider") {
    return {
      variant: widget.variant || normalized.variant,
      entityId: widget.entityId || widget.entity_id || "",
      sliderAction: widget.sliderAction === "volume" || widget.sliderAction === "brightness"
        ? widget.sliderAction
        : widget.variant === "volume-slider"
          ? "volume"
          : "brightness",
    };
  }

  if (kind === "toggle") {
    return {
      entityId: widget.entityId || widget.entity_id || "",
    };
  }

  if (kind === "button" || kind === "weather") {
    return {
      entityId: widget.entityId || widget.entity_id || "",
      ...(kind === "weather"
        ? { forecastType: widget.forecastType === "hourly" ? "hourly" : "daily" }
        : {}),
    };
  }

  if (kind === "scenes") {
    return {
      buttons: Array.isArray(widget.buttons)
        ? widget.buttons.map((button) => ({
          ...button,
          entityId: button?.entityId || button?.entity_id || "",
        }))
        : [],
    };
  }

  if (kind === "toggle-slider") {
    const entityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
    return {
      lightEntityId: entityId,
      entityId,
      sliderMode: "brightness",
    };
  }

  return {};
}

Object.entries(DEFINITIONS).forEach(([kind, definition]) => {
  aliasToKind.set(kind, kind);
  definition.aliases.forEach(alias => aliasToKind.set(alias, kind));
  definition.variantAliases.forEach(alias => variantToKind.set(alias, kind));
});

export function getWidgetManagerCategories() {
  const categories = Object.entries(WIDGET_MANAGER_METADATA.categories)
  .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
  .map(([id, metadata]) => ({
    id,
    label: metadata.label,
    labelKey: `widgets.categories.${id}`,
    description: metadata.description,
    descriptionKey: `widgets.categoryDescriptions.${id}`,
    icon: metadata.icon,
    widgets: [],
  }));
  
  const categoryById = new Map(categories.map(category => [category.id, category]));
  
  Object.entries(DEFINITIONS).forEach(([kind, definition]) => {
    if (definition.manager?.hidden) return;
    
    definition.manager?.entries?.forEach(entry => {
      if (entry.hidden) return;
      
      const category = categoryById.get(entry.category);
      if (!category) return;
      
      category.widgets.push({
        kind,
        variant: entry.variant,
        label: entry.label,
        labelKey: entry.labelKey || `widgets.catalog.${catalogKeyForEntry(entry)}.label`,
        title: entry.label,
        description: entry.description,
        descriptionKey: entry.descriptionKey || `widgets.catalog.${catalogKeyForEntry(entry)}.description`,
        icon: entry.icon || WIDGET_MANAGER_METADATA.categories[entry.category]?.icon || "◷",
        size: entry.size,
        order: entry.order || 0,
      });
    });
  });
  
  categories.forEach(category => {
    category.widgets.sort((a, b) => (a.order || 0) - (b.order || 0));
  });
  
  return categories.filter(category => category.widgets.length > 0);
}

export const WIDGET_REGISTRY = Object.freeze(
  Object.fromEntries(
    WIDGET_MODULES
      .filter((module) => module?.kind && module?.definition)
      .map((module) => {
        const definition = module.definition;
        return [
          module.kind,
          Object.freeze({
            kind: module.kind,
            ...definition,
            aliases: Object.freeze([...definition.aliases]),
            variantAliases: Object.freeze([...definition.variantAliases]),
            manager: normalizeManagerDefinition(definition),
            capabilities: normalizeCapabilities(definition),
            storage: normalizeStorage(definition),
            shell: normalizeShellBehavior(definition),
            placementFlow: definition.placementFlow || (definition.config ? "configure-first" : "direct"),
            css: Object.freeze([...(definition.css || [])]),
            previewRenderer: normalizePreviewRenderer(module),
            variants: Object.freeze([...(definition.variants || [])]),
            variantGroups: definition.variantGroups
              ? Object.freeze({
                horizontal: Object.freeze([...definition.variantGroups.horizontal]),
                vertical: Object.freeze([...definition.variantGroups.vertical]),
              })
              : undefined,
          }),
        ];
      }),
  ),
);

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

export function getWidgetPreviewRenderer(widgetOrKind = {}) {
  return getWidgetDefinition(widgetOrKind)?.previewRenderer || STATIC_PREVIEW_RENDERER;
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
  const rawSize = {
    ...(definition?.defaultSize || { w: 2, h: 2 }),
    w: widget.w ?? definition?.defaultSize?.w,
    h: widget.h ?? definition?.defaultSize?.h,
  };
  const size = normalizeBottomeSize(rawSize);
  return definition?.normalizeSize ? definition.normalizeSize(size) : size;
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
  const normalized = {
    ...widget,
    kind,
    type: kind,
    component: definition.component,
    category: widget.category || definition.category,
    variant: definition.defaultVariant || widget.variant || "",
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
