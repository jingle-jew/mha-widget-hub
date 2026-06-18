function identity(value) {
  return value;
}

export function normalizePage(
  page = {},
  index = 0,
  { normalizeWidget = identity } = {},
) {
  const fallbackId = `page-${index + 1}`;
  const id = String(page.id || fallbackId).trim() || fallbackId;

  return {
    id,
    name: String(
      page.name
      || page.label
      || (index === 0 ? "Home" : `Page ${index + 1}`),
    ),
    icon: String(page.icon || (index === 0 ? "home" : "grid")),
    widgets: Array.isArray(page.widgets)
      ? page.widgets.map(normalizeWidget)
      : [],
  };
}

export function normalizePages(
  storedPages,
  { normalizeWidget = identity } = {},
) {
  if (!Array.isArray(storedPages)) {
    return { pages: [], repaired: false };
  }

  const usedIds = new Set();
  let repaired = false;
  const pages = storedPages.map((page, index) => {
    const normalized = normalizePage(page, index, { normalizeWidget });
    const baseId = normalized.id;
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    if (id !== baseId) repaired = true;
    return id === baseId ? normalized : { ...normalized, id };
  }).filter(page => page.id);

  return { pages, repaired };
}

export function createFallbackPage({ normalizeWidget = identity } = {}) {
  return normalizePage(
    {
      id: "home",
      name: "Home",
      icon: "home",
      widgets: [],
    },
    0,
    { normalizeWidget },
  );
}

export function getActivePage(pages = [], activePageId = "") {
  return pages.find(page => page.id === activePageId) || pages[0] || null;
}
