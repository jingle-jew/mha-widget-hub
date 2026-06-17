const freezeSize = (w, h) => Object.freeze({ w, h });
const variant = (name, label, w, h) => Object.freeze({
  variant: name,
  label,
  size: freezeSize(w, h),
});

const clampWidth = (size, min, max) => ({
  w: Math.max(min, Math.min(max, size.w)),
  h: size.h,
});

const WIDGET_MANAGER_METADATA = Object.freeze({
  categories: Object.freeze({
    utilities: Object.freeze({ label: "Utilitaires", description: "Horloges et infos rapides.", icon: "◷", order: 10 }),
    actions: Object.freeze({ label: "Actions", description: "Boutons et raccourcis.", icon: "●", order: 20 }),
    lights: Object.freeze({ label: "Lumières", description: "Contrôles rapides et intensité.", icon: "💡", order: 30 }),
    climate: Object.freeze({ label: "Climat", description: "Température et confort.", icon: "🌡", order: 40 }),
    media: Object.freeze({ label: "Média", description: "Lecture et volume.", icon: "♪", order: 50 }),
    security: Object.freeze({ label: "Sécurité", description: "Alarmes, serrures et état.", icon: "⌂", order: 60 }),
    system: Object.freeze({ label: "Système", description: "Maintenance, réseau et énergie.", icon: "⚙", order: 70 }),
  }),
});

const DEFINITIONS = {
  empty: {
    component: "empty-widget",
    category: "custom",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "lights", variant: "light-toggle", label: "Tuile lumière", size: freezeSize(2, 2), description: "Contrôle simple.", order: 30 }),
        Object.freeze({ category: "climate", variant: "climate-compact", label: "Climat compact", size: freezeSize(2, 2), description: "Température rapide.", order: 50 }),
        Object.freeze({ category: "climate", variant: "climate-wide", label: "Climat large", size: freezeSize(4, 2), description: "Température + mode.", order: 60 }),
        Object.freeze({ category: "media", variant: "media-compact", label: "Média compact", size: freezeSize(2, 2), description: "Lecture rapide.", order: 10 }),
        Object.freeze({ category: "media", variant: "media-wide", label: "Média large", size: freezeSize(4, 2), description: "Now playing.", order: 20 }),
        Object.freeze({ category: "security", variant: "security-state", label: "État sécurité", size: freezeSize(2, 2), description: "Statut rapide.", order: 10 }),
        Object.freeze({ category: "security", variant: "security-wide", label: "Sécurité large", size: freezeSize(4, 2), description: "Contrôles principaux.", order: 20 }),
        Object.freeze({ category: "system", variant: "system-compact", label: "Système compact", size: freezeSize(2, 2), description: "État système.", order: 10 }),
        Object.freeze({ category: "system", variant: "system-wide", label: "Système large", size: freezeSize(4, 2), description: "Infos détaillées.", order: 20 }),
        Object.freeze({ category: "system", variant: "system-panel", label: "Panneau système", size: freezeSize(4, 3), description: "Grand panneau.", order: 30 }),
      ]),
    }),
    renderer: "empty",
    preview: "status",
    aliases: ["empty-widget"],
    variantAliases: [],
    defaultSize: freezeSize(2, 2),
  },
  clock: {
    component: "clock-widget",
    category: "utilities",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "utilities", variant: "digital", label: "Horloge numérique", size: freezeSize(2, 2), description: "Heure et date.", order: 10 }),
        Object.freeze({ category: "utilities", variant: "digital-weather", label: "Numérique météo", size: freezeSize(2, 2), description: "Heure, date et météo actuelle.", order: 20 }),
        Object.freeze({ category: "utilities", variant: "analog", label: "Horloge analogique", size: freezeSize(2, 2), description: "Cadran simple.", order: 30 }),
        Object.freeze({ category: "utilities", variant: "ios-analog", label: "Analogique iOS", size: freezeSize(2, 2), description: "Cadran classique iOS.", order: 40 }),
      ]),
    }),
    renderer: "clock",
    preview: "clock",
    aliases: ["clock-widget"],
    variantAliases: ["digital", "digital-weather", "analog", "ios-analog"],
    defaultVariant: "digital",
    defaultSize: freezeSize(2, 2),
    normalizeSize: () => ({ w: 2, h: 2 }),
    variants: [
      variant("digital", "Numérique", 2, 2),
      variant("digital-weather", "Numérique météo", 2, 2),
      variant("analog", "Analogique", 2, 2),
      variant("ios-analog", "Analogique iOS", 2, 2),
    ],
  },
  button: {
    component: "button-widget",
    category: "actions",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "actions", variant: "simple-button", label: "Bouton simple", size: freezeSize(2, 1), description: "Icône, libellé et état.", order: 10 }),
        Object.freeze({ category: "actions", variant: "simple-button", label: "Bouton carré", size: freezeSize(2, 2), description: "Tuile d’action inspirée Home.", order: 20 }),
      ]),
    }),
    renderer: "button",
    preview: "button",
    config: "button",
    aliases: ["button-widget"],
    variantAliases: ["simple-button"],
    defaultVariant: "simple-button",
    defaultSize: freezeSize(2, 1),
    normalizeSize: (size) => size.h >= 2
      ? { w: 2, h: 2 }
      : { ...clampWidth(size, 2, 4), h: 1 },
    variants: [
      variant("simple-button", "Pilule 2×1", 2, 1),
      variant("simple-button", "Pilule 3×1", 3, 1),
      variant("simple-button", "Pilule 4×1", 4, 1),
      variant("simple-button", "Carré 2×2", 2, 2),
    ],
  },
  slider: {
    component: "slider-widget",
    category: "lights",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "lights", variant: "light-slider-wide", label: "Intensité horizontale", size: freezeSize(4, 1), description: "Slider large.", order: 40 }),
        Object.freeze({ category: "lights", variant: "light-slider-vertical", label: "Intensité verticale", size: freezeSize(1, 4), description: "Slider vertical.", order: 50 }),
        Object.freeze({ category: "climate", variant: "temperature-slider", label: "Température slider", size: freezeSize(4, 1), description: "Contrôle linéaire.", order: 70 }),
        Object.freeze({ category: "media", variant: "volume-slider", label: "Volume", size: freezeSize(4, 1), description: "Slider volume.", order: 30 }),
      ]),
    }),
    renderer: "slider",
    preview: "slider",
    config: "slider",
    aliases: ["slider-widget"],
    variantAliases: [
      "light-slider-horizontal",
      "light-slider-wide",
      "light-slider-vertical",
      "temperature-slider",
      "volume-slider",
    ],
    defaultSize: freezeSize(2, 1),
    normalizeSize: (size) => size.h > size.w
      ? { w: 1, h: Math.max(2, Math.min(4, size.h)) }
      : { w: Math.max(2, Math.min(4, size.w)), h: 1 },
    variantGroups: {
      horizontal: [
        variant("light-slider-horizontal", "Horizontal 2×1", 2, 1),
        variant("light-slider-horizontal", "Horizontal 3×1", 3, 1),
        variant("light-slider-horizontal", "Horizontal 4×1", 4, 1),
      ],
      vertical: [
        variant("light-slider-vertical", "Vertical 1×2", 1, 2),
        variant("light-slider-vertical", "Vertical 1×3", 1, 3),
        variant("light-slider-vertical", "Vertical 1×4", 1, 4),
      ],
    },
  },
  toggle: {
    component: "toggle-widget",
    category: "actions",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "actions", variant: "toggle-widget", label: "Toggle", size: freezeSize(3, 1), description: "Icône, état et interrupteur.", order: 30 }),
        Object.freeze({ category: "actions", variant: "toggle-widget", label: "Toggle large", size: freezeSize(4, 1), description: "Interrupteur avec plus d’espace.", order: 40 }),
      ]),
    }),
    renderer: "toggle",
    preview: "toggle",
    config: "toggle",
    aliases: ["toggle-widget"],
    variantAliases: ["toggle-widget", "simple-toggle"],
    defaultVariant: "toggle-widget",
    defaultSize: freezeSize(3, 1),
    normalizeSize: (size) => ({ ...clampWidth(size, 3, 4), h: 1 }),
    variants: [
      variant("toggle-widget", "Toggle 3×1", 3, 1),
      variant("toggle-widget", "Toggle 4×1", 4, 1),
    ],
  },
  "toggle-slider": {
    component: "toggle-slider-widget",
    category: "lights",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "lights", variant: "toggle-slider", label: "Lumière combinée", size: freezeSize(4, 2), description: "État et intensité dans une seule tuile.", order: 10 }),
      ]),
    }),
    renderer: "toggle-slider",
    preview: "toggle-slider",
    config: "toggle-slider",
    aliases: [
      "toggle-slider-widget",
      "combined-slider-toggle",
      "combined-toggle-slider",
    ],
    variantAliases: [
      "toggle-slider",
      "combined-slider-toggle",
      "combined-toggle-slider",
    ],
    defaultVariant: "toggle-slider",
    defaultSize: freezeSize(4, 2),
    normalizeSize: (size) => ({ ...clampWidth(size, 3, 4), h: 2 }),
    variants: [
      variant("toggle-slider", "Combiné 3×2", 3, 2),
      variant("toggle-slider", "Combiné 4×2", 4, 2),
    ],
  },
  "toggle-buttons": {
    component: "toggle-buttons-widget",
    category: "lights",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "lights", variant: "toggle-buttons", label: "Lumière + boutons", size: freezeSize(4, 2), description: "Toggle visuel et 4 boutons rapides.", order: 20 }),
      ]),
    }),
    renderer: "toggle-buttons",
    preview: "toggle-buttons",
    aliases: ["toggle-buttons-widget", "combined-toggle-buttons"],
    variantAliases: [
      "toggle-buttons",
      "combined-toggle-buttons",
      "toggle-button-row",
      "toggle-quick-buttons",
    ],
    defaultVariant: "toggle-buttons",
    defaultSize: freezeSize(4, 2),
    normalizeSize: (size) => ({ ...clampWidth(size, 3, 4), h: 2 }),
    variants: [
      variant("toggle-buttons", "Toggle + boutons 3×2", 3, 2),
      variant("toggle-buttons", "Toggle + boutons 4×2", 4, 2),
    ],
  },
  weather: {
    component: "weather-widget",
    category: "climate",
    manager: Object.freeze({
      entries: Object.freeze([
        Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo horizontale", size: freezeSize(4, 1), description: "Icône et température.", order: 10 }),
        Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo compacte", size: freezeSize(2, 2), description: "Icône et température.", order: 20 }),
        Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo détails", size: freezeSize(3, 2), description: "Humidité et vent.", order: 30 }),
        Object.freeze({ category: "climate", variant: "adaptive-weather", label: "Météo prévisions", size: freezeSize(4, 2), description: "Prévisions verticales.", order: 40 }),
      ]),
    }),
    renderer: "weather",
    preview: "weather",
    config: "weather",
    aliases: ["weather-widget"],
    variantAliases: ["adaptive-weather"],
    defaultVariant: "adaptive-weather",
    defaultSize: freezeSize(2, 2),
    normalizeSize: (size) => {
      if (size.h <= 1) return { w: 4, h: 1 };
      if (size.w >= 4) return { w: 4, h: 2 };
      if (size.w >= 3) return { w: 3, h: 2 };
      return { w: 2, h: 2 };
    },
    variants: [
      variant("adaptive-weather", "Horizontal 4×1", 4, 1),
      variant("adaptive-weather", "Compact 2×2", 2, 2),
      variant("adaptive-weather", "Détails 3×2", 3, 2),
      variant("adaptive-weather", "Prévisions 4×2", 4, 2),
    ],
  },
};

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
    items: [],
  }));
  
  const categoryById = new Map(categories.map(category => [category.id, category]));
  
  Object.entries(DEFINITIONS).forEach(([kind, definition]) => {
    definition.manager?.entries?.forEach(entry => {
      const category = categoryById.get(entry.category);
      if (!category) return;
      
      category.items.push({
        kind,
        variant: entry.variant,
        title: entry.label,
        description: entry.description,
        icon: entry.icon || WIDGET_MANAGER_METADATA.categories[entry.category]?.icon || "◷",
        size: entry.size,
      });
    });
  });
  
  categories.forEach(category => {
    category.items.sort((a, b) => {
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
  
  return categories.filter(category => category.items.length > 0);
}

export const WIDGET_REGISTRY = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINITIONS).map(([kind, definition]) => [
      kind,
      Object.freeze({
        kind,
        ...definition,
        aliases: Object.freeze([...definition.aliases]),
        variantAliases: Object.freeze([...definition.variantAliases]),
        manager: definition.manager,
        variants: Object.freeze([...(definition.variants || [])]),
        variantGroups: definition.variantGroups
          ? Object.freeze({
            horizontal: Object.freeze([...definition.variantGroups.horizontal]),
            vertical: Object.freeze([...definition.variantGroups.vertical]),
          })
          : undefined,
      }),
    ]),
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

export function normalizeRegisteredWidgetSize(widget = {}, normalizeBaseSize) {
  const definition = getWidgetDefinition(widget);
  const rawSize = {
    ...(definition?.defaultSize || { w: 2, h: 2 }),
    w: widget.w ?? definition?.defaultSize?.w,
    h: widget.h ?? definition?.defaultSize?.h,
  };
  const size = normalizeBaseSize(rawSize);
  return definition?.normalizeSize ? definition.normalizeSize(size) : size;
}

export function getRegisteredWidgetVariants(widget = {}, normalizeBaseSize) {
  const definition = getWidgetDefinition(widget);
  if (!definition) return [];
  if (!definition.variantGroups) return definition.variants;

  const size = normalizeRegisteredWidgetSize(widget, normalizeBaseSize);
  return size.h > size.w
    ? definition.variantGroups.vertical
    : definition.variantGroups.horizontal;
}

export function normalizeWidgetContract(widget = {}, normalizeBaseSize) {
  const kind = resolveWidgetKind(widget);
  const definition = WIDGET_REGISTRY[kind];
  if (!definition) {
    const legacyKind = widget.kind || widget.type || "empty";
    return { ...widget, kind: legacyKind, type: legacyKind };
  }

  const size = normalizeRegisteredWidgetSize(widget, normalizeBaseSize);
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
  }

  if (kind === "toggle-slider") {
    const entityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
    normalized.lightEntityId = entityId;
    normalized.entityId = entityId;
    normalized.sliderMode = "brightness";
  }

  return normalized;
}
