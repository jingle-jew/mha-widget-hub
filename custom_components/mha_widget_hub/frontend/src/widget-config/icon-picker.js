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

  const root = document.createElement("div");
  root.className = "mha-widget-icon-picker";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mha-widget-icon-picker-trigger mha-widget-config-control";

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
  panel.className = "mha-widget-icon-picker-panel";

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
  root.append(trigger, panel);

  function dispatchInput() {
    root.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function closePanel() {
    root.dataset.expanded = "false";
    trigger.setAttribute("aria-expanded", "false");
  }

  function openPanel() {
    root.dataset.expanded = "true";
    trigger.setAttribute("aria-expanded", "true");
    searchInput.focus({ preventScroll: true });
    searchInput.select();
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
        },
      }));
    });
  }

  trigger.addEventListener("click", () => {
    const expanded = root.dataset.expanded === "true";
    if (expanded) closePanel();
    else openPanel();
  });

  const ownerDocument = globalThis.document;
  ownerDocument?.addEventListener?.("pointerdown", (event) => {
    if (root.dataset.expanded !== "true") return;
    if (root.contains(event.target)) return;
    closePanel();
  });

  root.dataset.expanded = "false";
  trigger.setAttribute("aria-expanded", "false");
  updateTrigger();
  renderTabs();
  renderResults();

  return root;
}
