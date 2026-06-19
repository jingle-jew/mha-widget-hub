export function buildWidgetDefinitions(widgetModules = []) {
  return Object.freeze(
    Object.fromEntries(
      widgetModules
        .filter((module) => module?.kind && module?.definition)
        .map((module) => [module.kind, module.definition]),
    ),
  );
}

export function buildWidgetKindIndex(definitions = {}) {
  const aliasToKind = new Map();
  const variantToKind = new Map();

  Object.entries(definitions).forEach(([kind, definition]) => {
    aliasToKind.set(kind, kind);
    definition.aliases.forEach((alias) => aliasToKind.set(alias, kind));
    definition.variantAliases.forEach((alias) => variantToKind.set(alias, kind));
  });

  return Object.freeze({
    aliasToKind,
    variantToKind,
  });
}

export function resolveWidgetKindFromIndex(
  widget = {},
  {
    aliasToKind,
    variantToKind,
    fallback = "empty",
  } = {},
) {
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
