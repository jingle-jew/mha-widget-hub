import { WIDGET_MODULES } from "./widget-module-registry.js";

const STATIC_PREVIEW_RENDERER = Object.freeze({ mode: "static" });

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
    description: metadata.description,
    icon: metadata.icon,
    widgets: [],
  }));
  
  const categoryById = new Map(categories.map(category => [category.id, category]));
  
  Object.entries(DEFINITIONS).forEach(([kind, definition]) => {
    if (["empty", "toggle-buttons"].includes(kind)) return;
    
    definition.manager?.entries?.forEach(entry => {
      if (entry.variant === "temperature-slider") return;
      
      const category = categoryById.get(entry.category);
      if (!category) return;
      
      category.widgets.push({
        kind,
        variant: entry.variant,
        label: entry.label,
        title: entry.label,
        description: entry.description,
        icon: entry.icon || WIDGET_MANAGER_METADATA.categories[entry.category]?.icon || "◷",
        size: entry.size,
      });
    });
  });
  
  categories.forEach(category => {
    category.widgets.sort((a, b) => {
      const entryA = DEFINITIONS[a.kind]?.manager?.entries?.find(entry =>
        entry.category === category.id &&
        entry.variant === a.variant &&
        entry.label === a.title &&
        entry.size?.w === a.size?.w &&
        entry.size?.h === a.size?.h
      );
      
      const entryB = DEFINITIONS[b.kind]?.manager?.entries?.find(entry =>
        entry.category === category.id &&
        entry.variant === b.variant &&
        entry.label === b.title &&
        entry.size?.w === b.size?.w &&
        entry.size?.h === b.size?.h
      );
      
      return (entryA?.order || 0) - (entryB?.order || 0);
    });
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
            manager: definition.manager,
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

export function getWidgetConfigType(widget = {}) {
  const definition = getWidgetDefinition(widget);
  if (resolveWidgetKind(widget) === "clock") {
    return widget.variant === "digital-weather" ? "weather" : "";
  }
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

  if (kind === "clock" && definition.variantAliases.includes(widget.variant)) {
    normalized.variant = widget.variant;
    normalized.entityId = widget.entityId || widget.entity_id || "";
  } else if (kind === "slider") {
    normalized.variant = widget.variant || normalized.variant;
    normalized.entityId = widget.entityId || widget.entity_id || "";
    normalized.sliderAction = widget.sliderAction === "volume" || widget.sliderAction === "brightness"
      ? widget.sliderAction
      : widget.variant === "volume-slider"
        ? "volume"
        : "brightness";
  } else if (kind === "toggle") {
    normalized.entityId = widget.entityId || widget.entity_id || "";
  } else if (kind === "button" || kind === "weather") {
    normalized.entityId = widget.entityId || widget.entity_id || "";
    if (kind === "weather") normalized.forecastType = widget.forecastType === "hourly" ? "hourly" : "daily";
  } else if (kind === "scenes") {
    normalized.buttons = Array.isArray(widget.buttons)
      ? widget.buttons.map(button => ({
        ...button,
        entityId: button?.entityId || button?.entity_id || "",
      }))
      : [];
  }

  if (kind === "toggle-slider") {
    const entityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
    normalized.lightEntityId = entityId;
    normalized.entityId = entityId;
    normalized.sliderMode = "brightness";
  }

  return normalized;
}
