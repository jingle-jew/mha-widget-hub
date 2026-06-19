export function buildWidgetRegistry(
  widgetModules,
  {
    defaultManager,
    defaultCapabilities,
    defaultStorage,
    defaultShell,
    staticPreviewRenderer,
    normalizeManagerDefinition,
    normalizeCapabilities,
    normalizeStorage,
    normalizeShellBehavior,
    normalizePreviewRenderer,
  },
) {
  return Object.freeze(
    Object.fromEntries(
      widgetModules
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
              manager: normalizeManagerDefinition(definition, defaultManager),
              capabilities: normalizeCapabilities(definition, defaultCapabilities),
              storage: normalizeStorage(definition, defaultStorage),
              shell: normalizeShellBehavior(definition, defaultShell),
              placementFlow: definition.placementFlow || (definition.config ? "configure-first" : "direct"),
              css: Object.freeze([...(definition.css || [])]),
              previewRenderer: normalizePreviewRenderer(module, staticPreviewRenderer),
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
}
