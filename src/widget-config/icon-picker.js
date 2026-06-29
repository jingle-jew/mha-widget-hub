import { ICON_SYMBOL_CATALOG, ICON_SYMBOLS_BY_NAME } from "../icons/icon-symbol-catalog.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { MHA_TABLER_ICON_REGISTRY } from "../ui/tabler-icons.js";

const CATEGORY_ORDER = Object.freeze([
  "suggested",
  "home",
  "lighting",
  "switch",
  "climate",
  "media_player",
  "security",
  "network",
  "energy",
  "weather",
  "utility",
  "navigation",
  "system",
]);

const CATEGORY_LABELS = Object.freeze({
  suggested: "Suggested",
  home: "Home",
  lighting: "Lighting",
  switch: "Switches",
  climate: "Climate",
  media_player: "Media",
  security: "Security",
  network: "Network",
  energy: "Energy",
  weather: "Weather",
  utility: "Utility",
  navigation: "Navigation",
  system: "System",
});

const CATEGORY_TABS = Object.freeze([
  Object.freeze({ id: "suggested", icon: "gear" }),
  Object.freeze({ id: "home", icon: "home" }),
  Object.freeze({ id: "lighting", icon: "lamp" }),
  Object.freeze({ id: "switch", icon: "toggle" }),
  Object.freeze({ id: "climate", icon: "temperature" }),
  Object.freeze({ id: "media_player", icon: "media-player" }),
  Object.freeze({ id: "security", icon: "shield" }),
  Object.freeze({ id: "utility", icon: "search" }),
]);

const TABLER_ONLY_ICON_CATEGORIES = Object.freeze({
  coffee: "utility",
  "device-tv": "media_player",
  lamp: "lighting",
  flame: "climate",
  snowflake: "climate",
  propeller: "climate",
  door: "home",
  lock: "security",
  music: "media_player",
  camera: "security",
  plug: "switch",
  power: "switch",
  movie: "media_player",
});

function titleCase(value = "") {
  return String(value || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeQuery(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function humanizeIconName(name = "") {
  return titleCase(String(name || "").replace(/[-_]+/g, " "));
}

function resolveIconCategory(name = "") {
  return ICON_SYMBOLS_BY_NAME[name]?.category
    || TABLER_ONLY_ICON_CATEGORIES[name]
    || "utility";
}

function buildInventoryItem(name = "") {
  const category = resolveIconCategory(name);
  const label = humanizeIconName(name);
  const searchText = normalizeQuery(`${name} ${label} ${category}`);
  return Object.freeze({
    name,
    label,
    category,
    searchText,
  });
}

function buildInventory() {
  const names = new Set([
    ...ICON_SYMBOL_CATALOG.map(icon => icon.name),
    ...Object.keys(MHA_TABLER_ICON_REGISTRY),
  ]);

  return Object.freeze(
    [...names]
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right))
      .map(buildInventoryItem),
  );
}

export const ICON_PICKER_INVENTORY = buildInventory();

export function normalizeIconPickerValue(value = "") {
  const normalized = String(value || "").trim();
  return normalized || "auto";
}

export function filterIconPickerInventory(query = "") {
  const normalizedQuery = normalizeQuery(query);
  if (!normalizedQuery) return ICON_PICKER_INVENTORY;

  return ICON_PICKER_INVENTORY.filter(item => item.searchText.includes(normalizedQuery));
}

function createPickerTile({
  name = "",
  label = "",
  selected = false,
  compact = false,
  onClick,
} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "mha-widget-icon-picker-tile",
    compact ? "mha-widget-icon-picker-tile--compact" : "",
    selected ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  button.dataset.iconName = name;
  button.setAttribute("aria-pressed", String(selected));
  button.title = label || name;
  button.append(createIconSymbol({
    name,
    className: "mha-widget-icon-picker-tile-glyph",
  }));
  button.addEventListener("click", () => onClick?.(name));
  return button;
}

function createAutoTile({
  selectedValue = "",
  suggestedIcon = "",
  suggestedLabel = "",
  onSelect,
  t = (key, fallback) => fallback,
} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "mha-widget-icon-picker-auto",
    selectedValue === "auto" ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-pressed", String(selectedValue === "auto"));
  button.addEventListener("click", () => onSelect?.("auto"));

  const iconWrap = document.createElement("span");
  iconWrap.className = "mha-widget-icon-picker-auto-icon";
  iconWrap.append(createIconSymbol({
    name: suggestedIcon || "gear",
    className: "mha-widget-icon-picker-auto-glyph",
  }));

  const textWrap = document.createElement("span");
  textWrap.className = "mha-widget-icon-picker-auto-text";

  const title = document.createElement("span");
  title.className = "mha-widget-icon-picker-auto-title";
  title.textContent = t("widgets.config.iconAuto", "Auto");

  const detail = document.createElement("span");
  detail.className = "mha-widget-icon-picker-auto-detail";
  detail.textContent = suggestedLabel
    ? t("widgets.config.iconAutoHint", `Suggested: ${suggestedLabel}`)
    : t("widgets.config.iconAutoFallback", "Follow display name");

  textWrap.append(title, detail);
  button.append(iconWrap, textWrap);
  return button;
}

function groupItemsByCategory(items = []) {
  const groups = new Map();
  items.forEach((item) => {
    const category = item.category || "utility";
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push(item);
  });

  return CATEGORY_ORDER
    .map(category => [category, groups.get(category) || []])
    .filter(([, grouped]) => grouped.length > 0);
}

function createCategoryTab({
  id = "",
  icon = "",
  selected = false,
  label = "",
  onSelect,
} = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = [
    "mha-widget-icon-picker-tab",
    selected ? "is-selected" : "",
  ].filter(Boolean).join(" ");
  button.setAttribute("aria-pressed", String(selected));
  button.title = label;
  button.append(createIconSymbol({
    name: icon,
    className: "mha-widget-icon-picker-tab-glyph",
  }));
  button.addEventListener("click", () => onSelect?.(id));
  return button;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function createIconPickerControl({
  value = "auto",
  suggestedIcon = "",
  searchPlaceholder = "Search icons",
  emptyLabel = "No icons found",
  onChange,
  t = (key, fallback) => fallback,
} = {}) {
  let selectedValue = normalizeIconPickerValue(value);
  let query = "";
  let activeCategory = suggestedIcon ? resolveIconCategory(suggestedIcon) : "suggested";
  let cleanupMutationObserver = null;

  const root = document.createElement("div");
  root.className = "mha-widget-icon-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mha-widget-icon-picker-trigger mha-widget-config-control";
  trigger.setAttribute("aria-haspopup", "dialog");

  const panelId = `mha-widget-icon-picker-${Math.random().toString(36).slice(2)}`;
  trigger.setAttribute("aria-controls", panelId);

  const triggerIcon = document.createElement("span");
  triggerIcon.className = "mha-widget-icon-picker-trigger-icon";

  const triggerText = document.createElement("span");
  triggerText.className = "mha-widget-icon-picker-trigger-text";

  const triggerTitle = document.createElement("span");
  triggerTitle.className = "mha-widget-icon-picker-trigger-title";

  const triggerDetail = document.createElement("span");
  triggerDetail.className = "mha-widget-icon-picker-trigger-detail";

  triggerText.append(triggerTitle, triggerDetail);
  trigger.append(triggerIcon, triggerText);

  const panel = document.createElement("div");
  panel.id = panelId;
  panel.className = "mha-widget-icon-picker-panel";
  panel.setAttribute("role", "dialog");

  const searchWrap = document.createElement("label");
  searchWrap.className = "mha-widget-icon-picker-search";

  const searchIcon = document.createElement("span");
  searchIcon.className = "mha-widget-icon-picker-search-icon";
  searchIcon.append(createIconSymbol({
    name: "search",
    className: "mha-widget-icon-picker-search-glyph",
  }));

  const searchInput = document.createElement("input");
  searchInput.className = "mha-widget-icon-picker-search-input";
  searchInput.type = "search";
  searchInput.placeholder = searchPlaceholder;
  searchInput.autocomplete = "off";
  searchInput.addEventListener("input", (event) => {
    query = event.currentTarget.value;
    renderResults();
    renderTabs();
  });
  searchWrap.append(searchIcon, searchInput);

  const results = document.createElement("div");
  results.className = "mha-widget-icon-picker-results";

  const footer = document.createElement("div");
  footer.className = "mha-widget-icon-picker-footer";

  const categoryTabs = document.createElement("div");
  categoryTabs.className = "mha-widget-icon-picker-tabs";

  footer.append(categoryTabs);
  panel.append(searchWrap, results, footer);
  root.append(trigger);

  const ownerDocument = root.ownerDocument || globalThis.document;
  const ownerWindow = ownerDocument?.defaultView || globalThis.window;

  function dispatchInput() {
    root.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function isExpanded() {
    return root.dataset.expanded === "true";
  }

  function getPanelHost() {
    const rootNode = root.getRootNode?.();
    if (rootNode && rootNode !== ownerDocument && typeof rootNode.append === "function") {
      return rootNode;
    }
    return ownerDocument?.body || null;
  }

  function placePanel() {
    if (!root.isConnected) {
      closePanel();
      return;
    }
    if (!ownerDocument?.body || !panel.isConnected) return;

    const viewportWidth = ownerWindow?.innerWidth || ownerDocument.documentElement.clientWidth || 0;
    const viewportHeight = ownerWindow?.innerHeight || ownerDocument.documentElement.clientHeight || 0;
    const margin = 12;
    const gap = 8;
    const triggerRect = trigger.getBoundingClientRect();

    panel.style.maxBlockSize = `${Math.max(260, viewportHeight - margin * 2)}px`;

    const panelRect = panel.getBoundingClientRect();
    const panelWidth = panelRect.width || Math.min(344, viewportWidth - margin * 2);
    const panelHeight = panelRect.height || Math.min(496, viewportHeight - margin * 2);

    const maxLeft = Math.max(margin, viewportWidth - panelWidth - margin);
    const left = clampNumber(triggerRect.left, margin, maxLeft);

    const bottomTop = triggerRect.bottom + gap;
    const top = bottomTop + panelHeight <= viewportHeight - margin
      ? bottomTop
      : clampNumber(triggerRect.top - panelHeight - gap, margin, viewportHeight - panelHeight - margin);

    panel.style.left = `${Math.round(left)}px`;
    panel.style.top = `${Math.round(top)}px`;
  }

  function watchRootRemoval() {
    cleanupMutationObserver?.disconnect();
    cleanupMutationObserver = null;
    if (!ownerDocument?.documentElement || !("MutationObserver" in globalThis)) return;

    cleanupMutationObserver = new MutationObserver(() => {
      if (!root.isConnected) cleanupPicker();
    });
    cleanupMutationObserver.observe(ownerDocument.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  function addFloatingListeners() {
    ownerDocument?.addEventListener?.("pointerdown", handleDocumentPointerDown, true);
    ownerDocument?.addEventListener?.("keydown", handleDocumentKeyDown, true);
    ownerWindow?.addEventListener?.("resize", placePanel);
    ownerWindow?.addEventListener?.("scroll", placePanel, true);
  }

  function removeFloatingListeners() {
    ownerDocument?.removeEventListener?.("pointerdown", handleDocumentPointerDown, true);
    ownerDocument?.removeEventListener?.("keydown", handleDocumentKeyDown, true);
    ownerWindow?.removeEventListener?.("resize", placePanel);
    ownerWindow?.removeEventListener?.("scroll", placePanel, true);
  }

  function closePanel() {
    root.dataset.expanded = "false";
    trigger.setAttribute("aria-expanded", "false");
    removeFloatingListeners();
    cleanupMutationObserver?.disconnect();
    cleanupMutationObserver = null;
    panel.remove();
  }

  function cleanupPicker() {
    closePanel();
  }

  function openPanel() {
    if (!ownerDocument?.body || !root.isConnected) return;

    const panelHost = getPanelHost();
    if (!panelHost) return;

    root.dataset.expanded = "true";
    trigger.setAttribute("aria-expanded", "true");

    if (!panel.isConnected) {
      panelHost.append(panel);
    }

    renderTabs();
    renderResults();
    placePanel();
    addFloatingListeners();
    watchRootRemoval();

    ownerWindow?.requestAnimationFrame?.(() => {
      placePanel();
      searchInput.focus({ preventScroll: true });
      searchInput.select();
    });
    if (!ownerWindow?.requestAnimationFrame) {
      searchInput.focus({ preventScroll: true });
      searchInput.select();
    }
  }

  function setSelectedValue(nextValue) {
    selectedValue = normalizeIconPickerValue(nextValue);
    updateTrigger();
    renderResults();
    onChange?.(selectedValue);
    dispatchInput();
    closePanel();
  }

  function updateTrigger() {
    const previewName = selectedValue === "auto"
      ? suggestedIcon || "gear"
      : selectedValue;
    triggerIcon.replaceChildren(createIconSymbol({
      name: previewName,
      className: "mha-widget-icon-picker-trigger-glyph",
    }));
    triggerTitle.textContent = selectedValue === "auto"
      ? t("widgets.config.iconAuto", "Auto")
      : humanizeIconName(selectedValue);
    triggerDetail.textContent = selectedValue === "auto"
      ? (suggestedIcon ? humanizeIconName(suggestedIcon) : t("widgets.config.iconAutoFallback", "Follow display name"))
      : selectedValue;
  }

  function renderResults() {
    results.replaceChildren();
    const filteredItems = filterIconPickerInventory(query);
    const categoryItems = query
      ? filteredItems
      : activeCategory === "suggested"
        ? filteredItems.filter(item => item.name === suggestedIcon)
        : filteredItems.filter(item => item.category === activeCategory);

    results.append(createAutoTile({
      selectedValue,
      suggestedIcon,
      suggestedLabel: suggestedIcon ? humanizeIconName(suggestedIcon) : "",
      onSelect: setSelectedValue,
      t,
    }));

    if (!categoryItems.length) {
      const empty = document.createElement("p");
      empty.className = "mha-widget-icon-picker-empty";
      empty.textContent = emptyLabel;
      results.append(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "mha-widget-icon-picker-grid";
    categoryItems.forEach((item) => {
      grid.append(createPickerTile({
        name: item.name,
        label: item.label,
        selected: item.name === selectedValue,
        compact: true,
        onClick: setSelectedValue,
      }));
    });
    results.append(grid);
  }

  function renderTabs() {
    categoryTabs.replaceChildren();
    CATEGORY_TABS.forEach((tab) => {
      categoryTabs.append(createCategoryTab({
        id: tab.id,
        icon: tab.icon,
        selected: !query && activeCategory === tab.id,
        label: CATEGORY_LABELS[tab.id] || humanizeIconName(tab.id),
        onSelect: (nextCategory) => {
          activeCategory = nextCategory;
          renderTabs();
          renderResults();
          placePanel();
        },
      }));
    });
  }

  function handleDocumentPointerDown(event) {
    if (!isExpanded()) return;
    if (root.contains(event.target) || panel.contains(event.target)) return;
    closePanel();
  }

  function handleDocumentKeyDown(event) {
    if (!isExpanded() || event.key !== "Escape") return;
    event.preventDefault();
    closePanel();
    trigger.focus({ preventScroll: true });
  }

  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (isExpanded()) closePanel();
    else openPanel();
  });

  root.dataset.expanded = "false";
  trigger.setAttribute("aria-expanded", "false");
  updateTrigger();
  renderTabs();
  renderResults();

  return root;
}
