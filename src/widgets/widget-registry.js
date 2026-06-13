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

const DEFINITIONS = {
  empty: {
    component: "empty-widget",
    category: "custom",
    renderer: "empty",
    preview: "status",
    aliases: ["empty-widget"],
    variantAliases: [],
    defaultSize: freezeSize(2, 2),
  },
  clock: {
    component: "clock-widget",
    category: "utilities",
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
    renderer: "button",
    preview: "button",
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
    renderer: "toggle",
    preview: "toggle",
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
    renderer: "weather",
    preview: "weather",
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

export const WIDGET_REGISTRY = Object.freeze(
  Object.fromEntries(
    Object.entries(DEFINITIONS).map(([kind, definition]) => [
      kind,
      Object.freeze({
        kind,
        ...definition,
        aliases: Object.freeze([...definition.aliases]),
        variantAliases: Object.freeze([...definition.variantAliases]),
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
  } else if (kind === "slider") {
    normalized.variant = widget.variant || normalized.variant;
    normalized.entityId = widget.entityId || widget.entity_id || "";
    normalized.sliderAction = widget.sliderAction === "volume" || widget.sliderAction === "brightness"
      ? widget.sliderAction
      : widget.variant === "volume-slider"
        ? "volume"
        : "brightness";
  }

  if (kind === "toggle-slider") {
    const entityId = widget.lightEntityId || widget.entityId || widget.entity_id || "";
    normalized.lightEntityId = entityId;
    normalized.entityId = entityId;
    normalized.sliderMode = "brightness";
  }

  return normalized;
}
