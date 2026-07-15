export const WIDGET_MANAGER_METADATA = Object.freeze({
  categories: Object.freeze({
    utilities: Object.freeze({ label: "Utilities", description: "Clocks and quick info.", icon: "clock", order: 10 }),
    actions: Object.freeze({ label: "Actions", description: "Buttons and shortcuts.", icon: "plus", order: 20 }),
    lights: Object.freeze({ label: "Lights", description: "Quick controls and brightness.", icon: "light", order: 30 }),
    climate: Object.freeze({ label: "Climate", description: "Temperature and comfort.", icon: "temperature", order: 40 }),
    media: Object.freeze({ label: "Media", description: "Playback and volume.", icon: "media-player", order: 50 }),
    security: Object.freeze({ label: "Security", description: "Alarms, locks, and state.", icon: "shield", order: 60 }),
    system: Object.freeze({ label: "System", description: "Maintenance, network, and energy.", icon: "gear", order: 70 }),
  }),
});

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

export function normalizeManagerDefinition(definition = {}, defaultManager) {
  const manager = definition.manager || defaultManager;
  return Object.freeze({
    ...defaultManager,
    ...manager,
    hidden: Boolean(manager.hidden),
    entries: Object.freeze((manager.entries || []).map(normalizeManagerEntry)),
  });
}

export function buildWidgetManagerCategories(
  definitions,
  {
    getWidgetManagerBehavior,
    getWidgetCatalogEntries,
  },
) {
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

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  Object.keys(definitions).forEach((kind) => {
    if (getWidgetManagerBehavior(kind).hidden) return;

    getWidgetCatalogEntries(kind).forEach((entry) => {
      if (entry.hidden) return;

      const category = categoryById.get(entry.category);
      if (!category) return;

      category.widgets.push({
        ...entry,
        kind,
        variant: entry.variant,
        label: entry.label,
        labelKey: entry.labelKey || `widgets.catalog.${catalogKeyForEntry(entry)}.label`,
        title: entry.label,
        description: entry.description,
        descriptionKey: entry.descriptionKey || `widgets.catalog.${catalogKeyForEntry(entry)}.description`,
        icon: entry.icon || WIDGET_MANAGER_METADATA.categories[entry.category]?.icon || "clock",
        size: entry.size,
        order: entry.order || 0,
      });
    });
  });

  categories.forEach((category) => {
    category.widgets.sort((a, b) => (a.order || 0) - (b.order || 0));
  });

  return categories.filter((category) => category.widgets.length > 0);
}
