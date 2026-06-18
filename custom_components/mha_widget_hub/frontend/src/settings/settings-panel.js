import { getAccentOptions, normalizeAccent, supportsAutoAccent } from "./accent-palettes.js";
import { createToggle } from "../ui/toggle.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createBackButton, createCloseButton, createMoveUpButton, createMoveDownButton, createRemoveButton } from "../system/system-buttons.js";
import { validateWallpaperFile } from "./wallpaper-storage.js";
import { getThemeStyleOptions } from "./theme-registry.js";
import { t } from "../i18n/index.js";
/*
 * MHA Settings panel.
 *
 * This panel owns user-facing shell/settings controls that used to live in the
 * dev panel. It updates host attributes and localStorage directly, without
 * forcing a full dashboard render.
 */

const THEME_OPTIONS = [
  { value: "auto", label: "Auto", labelKey: "settings.themeOptions.auto" },
  { value: "dark", label: "Dark", labelKey: "settings.themeOptions.dark" },
  { value: "light", label: "Light", labelKey: "settings.themeOptions.light" },
];

const STYLE_OPTIONS = getThemeStyleOptions();

const IOS_GLASS_OPTIONS = [
  { value: "liquid", label: "Liquid Glass" },
  { value: "frosted", label: "Frosted Glass" },
];


const DOCK_POSITION_OPTIONS = [
  { value: "left", label: "Left", labelKey: "settings.dockPositions.left" },
  { value: "right", label: "Right", labelKey: "settings.dockPositions.right" },
  { value: "bottom", label: "Bottom", labelKey: "settings.dockPositions.bottom" },
];

const ICON_SHAPE_OPTIONS = [
  { value: "auto", label: "Auto", labelKey: "settings.iconShapes.auto" },
  { value: "rounded-square", label: "Rounded square", labelKey: "settings.iconShapes.rounded-square" },
  { value: "squircle", label: "Squircle", labelKey: "settings.iconShapes.squircle" },
  { value: "circle", label: "Circle", labelKey: "settings.iconShapes.circle" },
];

const SCREENSAVER_DELAY_OPTIONS = [
  { value: "15000", label: "15 seconds", labelKey: "settings.delays.15000" },
  { value: "30000", label: "30 seconds", labelKey: "settings.delays.30000" },
  { value: "120000", label: "2 minutes", labelKey: "settings.delays.120000" },
  { value: "300000", label: "5 minutes", labelKey: "settings.delays.300000" },
];

const NOW_BAR_ITEM_OPTIONS = [
  { value: "media", label: "Media", labelKey: "settings.nowBarItems.media" },
  { value: "weather", label: "Weather", labelKey: "settings.nowBarItems.weather" },
  { value: "calendar", label: "Calendar", labelKey: "settings.nowBarItems.calendar" },
  { value: "now", label: "Now", labelKey: "settings.nowBarItems.now" },
];

const COMPACT_ACCENT_FAMILIES = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "violet",
];

const ACCENT_FAMILY_ALIASES = Object.freeze({
  red: "red",
  coral: "red",
  orange: "orange",
  peach: "orange",
  amber: "yellow",
  lemon: "yellow",
  yellow: "yellow",
  lime: "green",
  olive: "green",
  green: "green",
  emerald: "green",
  mint: "cyan",
  seafoam: "cyan",
  sea: "cyan",
  teal: "cyan",
  aqua: "cyan",
  cyan: "cyan",
  sky: "blue",
  blue: "blue",
  navy: "blue",
  indigo: "violet",
  violet: "violet",
  lavender: "violet",
  purple: "violet",
  lilac: "violet",
  berry: "pink",
  magenta: "pink",
  pink: "pink",
  rose: "pink",
  brown: "neutral",
  graphite: "neutral",
  gray: "neutral",
  slate: "neutral",
});

function formatImportDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function createWallpaperControls({ mode, wallpaper, onImport, onReset } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "mha-settings-wallpaper";

  const status = document.createElement("p");
  status.className = "mha-settings-wallpaper-status";

  const message = document.createElement("p");
  message.className = "mha-settings-wallpaper-message";
  message.setAttribute("role", "status");
  message.setAttribute("aria-live", "polite");

  const hasWallpaper = Boolean(wallpaper?.dataUrl);
  const importedDate = formatImportDate(wallpaper?.importedAt);
  status.textContent = hasWallpaper
    ? `${wallpaper.name || t("settings.importedImage", "Imported image")}${importedDate ? ` · ${importedDate}` : ""}`
    : t("settings.noCustomWallpaper", "No custom wallpaper for the {mode}.", { mode: optionLabel(THEME_OPTIONS.find(item => item.value === mode) || { label: mode }) });

  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
  input.className = "mha-settings-wallpaper-input";

  const importButton = document.createElement("button");
  importButton.className = "mha-settings-reset mha-settings-wallpaper-button";
  importButton.type = "button";
  importButton.textContent = t("settings.importImage", "Import image");
  importButton.addEventListener("click", () => input.click());

  const resetButton = document.createElement("button");
  resetButton.className = "mha-settings-reset mha-settings-wallpaper-button";
  resetButton.type = "button";
  resetButton.textContent = t("common.reset", "Reset");
  resetButton.disabled = !hasWallpaper;
  resetButton.addEventListener("click", () => onReset?.(mode));

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    const validationMessage = validateWallpaperFile(file);
    if (validationMessage) {
      message.textContent = validationMessage;
      input.value = "";
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      const dataUrl = String(reader.result || "");
      if (!dataUrl.startsWith("data:image/")) {
        message.textContent = t("settings.wallpaperReadInvalid", "The image could not be read correctly.");
        input.value = "";
        return;
      }

      const image = new Image();
      image.addEventListener("load", () => {
        try {
          onImport?.(mode, {
            dataUrl,
            name: file.name,
            importedAt: new Date().toISOString(),
            mime: file.type,
          });
          message.textContent = t("settings.wallpaperSaved", "Wallpaper {mode} saved on this device.", { mode: optionLabel(THEME_OPTIONS.find(item => item.value === mode) || { label: mode }) });
        } catch (error) {
          message.textContent = t("settings.wallpaperSaveFailed", "Unable to save this image locally. Try a smaller image.");
        } finally {
          input.value = "";
        }
      }, { once: true });
      image.addEventListener("error", () => {
        message.textContent = t("settings.wallpaperInvalidFile", "This file does not contain a valid image.");
        input.value = "";
      }, { once: true });
      image.src = dataUrl;
    });
    reader.addEventListener("error", () => {
      message.textContent = t("settings.wallpaperReadFailed", "Unable to read this image.");
      input.value = "";
    });
    reader.readAsDataURL(file);
  });

  const actions = document.createElement("div");
  actions.className = "mha-settings-wallpaper-actions";
  actions.append(importButton, resetButton);

  const preview = document.createElement("div");
  preview.className = "mha-settings-wallpaper-preview";
  preview.dataset.empty = String(!hasWallpaper);
  preview.setAttribute("role", "img");
  preview.setAttribute(
    "aria-label",
    hasWallpaper
      ? t("settings.wallpaperPreview", "Wallpaper preview for {mode}", { mode: optionLabel(THEME_OPTIONS.find(item => item.value === mode) || { label: mode }) })
      : t("settings.wallpaperNoPreview", "No preview for the {mode}", { mode: optionLabel(THEME_OPTIONS.find(item => item.value === mode) || { label: mode }) }),
  );
  if (hasWallpaper) {
    preview.style.backgroundImage = `url("${wallpaper.dataUrl}")`;
  } else {
    const empty = document.createElement("span");
    empty.textContent = t("settings.noImage", "No image");
    preview.append(empty);
  }

  wrapper.append(status, actions, input, message, preview);
  return wrapper;
}


const DOCK_ICON_OPTIONS = [
  { name: "home", label: "Home", labelKey: "settings.dockIconLabels.home", category: "home" },
  { name: "dashboard", label: "Dashboard", labelKey: "settings.dockIconLabels.dashboard", category: "navigation" },
  { name: "apps", label: "Applications", labelKey: "settings.dockIconLabels.apps", category: "system" },
  { name: "grid", label: "Grid", labelKey: "settings.dockIconLabels.grid", category: "navigation" },
  { name: "light", label: "Lights", labelKey: "settings.dockIconLabels.light", category: "lighting" },
  { name: "weather", label: "Weather", labelKey: "settings.dockIconLabels.weather", category: "weather" },
  { name: "media-player", label: "Media", labelKey: "settings.dockIconLabels.media-player", category: "media_player" },
  { name: "calendar", label: "Calendar", labelKey: "settings.dockIconLabels.calendar", category: "utility" },
  { name: "star", label: "Favorite", labelKey: "settings.dockIconLabels.star", category: "utility" },
  { name: "gear", label: "Settings", labelKey: "settings.dockIconLabels.gear", category: "system" },
];

const CLOCK_VARIANTS = [
  { value: "none", label: "No clock", labelKey: "settings.clockVariants.none" },
  { value: "digital", label: "Digital", labelKey: "settings.clockVariants.digital" },
  { value: "digital-weather", label: "Digital weather", labelKey: "settings.clockVariants.digital-weather" },
  { value: "analog", label: "Analog", labelKey: "settings.clockVariants.analog" },
  { value: "ios-analog", label: "Analog iOS", labelKey: "settings.clockVariants.ios-analog" },
];

function option(value, label, selectedValue) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  opt.selected = value === selectedValue;
  return opt;
}

function optionLabel(item = {}) {
  return item.labelKey ? t(item.labelKey, item.label) : item.label;
}

function createSelect({ label, value, options, onChange }) {
  const field = document.createElement("label");
  field.className = "mha-settings-field";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const select = document.createElement("select");
  select.className = "mha-settings-select";
  select.dataset.settingsControl = label;
  select.dataset.settingsValueControl = "true";
  select.append(...options.map((item) => option(item.value, optionLabel(item), value)));
  select.addEventListener("change", () => onChange?.(select.value));

  field.append(text, select);
  return field;
}

function createSwitch({ label, description = "", checked = false, onChange }) {
  const field = document.createElement("div");
  field.className = "mha-settings-switch";

  const text = document.createElement("span");
  text.className = "mha-settings-text";

  const labelText = document.createElement("span");
  labelText.className = "mha-settings-label";
  labelText.textContent = label;
  text.append(labelText);

  if (description) {
    const desc = document.createElement("small");
    desc.className = "mha-settings-description";
    desc.textContent = description;
    text.append(desc);
  }

  const toggle = createToggle({
    label,
    checked,
    className: "mha-settings-toggle",
    onChange: (event) => onChange?.(Boolean(event.currentTarget?.checked)),
  });
  const toggleInput = toggle.querySelector(".mha-toggle-input");
  if (toggleInput) {
    toggleInput.dataset.settingsControl = label;
    toggleInput.dataset.settingsValueControl = "true";
  }

  text.addEventListener("click", () => {
    toggleInput?.click();
  });

  field.append(text, toggle);
  return field;
}

function createCheckbox({ label, checked = false, onChange }) {
  const field = document.createElement("label");
  field.className = "mha-settings-checkbox";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const input = document.createElement("input");
  input.className = "mha-settings-checkbox-input";
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.dataset.settingsControl = label;
  input.dataset.settingsValueControl = "true";
  input.addEventListener("change", () => onChange?.(Boolean(input.checked)));

  field.append(text, input);
  return field;
}


function getAccentFamily(value = "") {
  return ACCENT_FAMILY_ALIASES[value] || "neutral";
}

function getCompactAccentValues(options = []) {
  const byFamily = new Map();
  options.forEach(item => {
    const family = getAccentFamily(item.value);
    if (!byFamily.has(family)) byFamily.set(family, item.value);
  });

  return new Set(
    COMPACT_ACCENT_FAMILIES
      .map(family => byFamily.get(family))
      .filter(Boolean),
  );
}

function createAccentPicker({
  label,
  themeStyle = "oneui",
  value = "",
  accentMode = "manual",
  expanded = false,
  onChange,
  onModeChange,
  onExpandedChange,
}) {
  const options = getAccentOptions(themeStyle);
  const resolved = normalizeAccent(themeStyle, value);
  const isAuto = supportsAutoAccent(themeStyle) && accentMode === "auto";
  const compactValues = getCompactAccentValues(options);

  const field = document.createElement("div");
  field.className = "mha-settings-accent-field";
  field.dataset.accentExpanded = String(Boolean(expanded));

  const header = document.createElement("div");
  header.className = "mha-settings-accent-header";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const expandButton = document.createElement("button");
  expandButton.className = "mha-settings-accent-expand";
  expandButton.type = "button";
  expandButton.dataset.accentExpanded = String(Boolean(expanded));
  expandButton.setAttribute("aria-label", expanded ? t("settings.accentCollapse", "Collapse accent palette") : t("settings.accentExpand", "Show full accent palette"));
  expandButton.setAttribute("aria-expanded", String(Boolean(expanded)));
  expandButton.textContent = expanded ? "⌃" : "⌄";
  expandButton.addEventListener("click", (event) => {
    const isExpanded = event.currentTarget?.getAttribute("aria-expanded") === "true";
    onExpandedChange?.(!isExpanded);
  });

  header.append(text, expandButton);

  const swatches = document.createElement("div");
  swatches.className = "mha-settings-accent-swatches";
  swatches.dataset.themeStyle = themeStyle;
  swatches.dataset.accentSignature = options.map(item => item.value).join("|");

  if (supportsAutoAccent(themeStyle)) {
    const button = document.createElement("button");
    button.className = "mha-settings-accent-swatch mha-settings-accent-swatch-auto";
    button.type = "button";
    button.dataset.accent = "auto";
    button.dataset.compactAccent = "true";
    button.setAttribute("aria-label", t("settings.accentAuto", "Automatic from wallpaper"));
    button.setAttribute("aria-pressed", String(isAuto));
    button.title = "Auto";
    button.textContent = "A";
    button.addEventListener("click", () => onModeChange?.("auto"));
    swatches.append(button);
  }

  for (const item of options) {
    const button = document.createElement("button");
    button.className = "mha-settings-accent-swatch";
    button.type = "button";
    button.dataset.accent = item.value;
    button.dataset.compactAccent = String(compactValues.has(item.value));
    button.setAttribute("aria-label", item.label);
    button.setAttribute("aria-pressed", String(!isAuto && item.value === resolved));
    button.title = item.label;
    button.addEventListener("click", () => onChange?.(item.value));
    swatches.append(button);
  }

  field.append(header, swatches);
  return field;
}


function createSettingsNavTile({ icon = "gear", label, description = "", onClick }) {
  const button = document.createElement("button");
  button.className = "mha-settings-nav-tile";
  button.type = "button";
  button.addEventListener("click", () => onClick?.());

  button.append(createIcon({
    name: icon,
    category: "utility",
    label,
    children: createIconSymbol({ name: icon, label }),
  }));

  const text = document.createElement("span");
  text.className = "mha-settings-nav-text";
  const title = document.createElement("strong");
  title.textContent = label;
  const desc = document.createElement("small");
  desc.textContent = description;
  text.append(title, desc);

  const chevron = document.createElement("span");
  chevron.className = "mha-settings-nav-chevron";
  chevron.textContent = "›";
  button.append(text, chevron);
  return button;
}

function createDockPageRow(page, index, pages, { activePageId = "", onSelect, onMove, onDelete } = {}) {
  const row = document.createElement("div");
  row.className = "mha-settings-dock-row";
  row.dataset.active = String(page.id === activePageId);
  row.setAttribute("role", "button");
  row.tabIndex = 0;
  row.addEventListener("click", () => onSelect?.(page.id));
  row.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(page.id);
    }
  });

  row.append(createIcon({
    name: page.icon || "grid",
    category: "utility",
    label: page.name || `Page ${index + 1}`,
    children: createIconSymbol({ name: page.icon || "grid", label: page.name || `Page ${index + 1}` }),
  }));

  const text = document.createElement("span");
  text.className = "mha-settings-dock-row-text";
  const title = document.createElement("strong");
  title.textContent = page.name || `Page ${index + 1}`;
  const meta = document.createElement("small");
  const count = Array.isArray(page.widgets) ? page.widgets.length : 0;
  meta.textContent = t(count > 1 ? "settings.widgetsCountPlural" : "settings.widgetsCount", "{count} widgets", { count });
  text.append(title, meta);

  const actions = document.createElement("span");
  actions.className = "mha-settings-dock-row-actions";
  const up = createMoveUpButton({
    label: t("settings.movePageUp", "Move {name} up", { name: page.name || t("settings.page", "page") }),
    className: "mha-settings-mini-button",
    disabled: index === 0,
    onClick: (event) => { event.stopPropagation(); onMove?.(page.id, -1); },
  });
  const down = createMoveDownButton({
    label: t("settings.movePageDown", "Move {name} down", { name: page.name || t("settings.page", "page") }),
    className: "mha-settings-mini-button",
    disabled: index >= pages.length - 1,
    onClick: (event) => { event.stopPropagation(); onMove?.(page.id, 1); },
  });
  const remove = createRemoveButton({
    label: t("settings.deletePage", "Delete {name}", { name: page.name || t("settings.page", "page") }),
    className: "mha-settings-mini-button mha-settings-mini-button-danger",
    disabled: pages.length <= 1,
    onClick: (event) => { event.stopPropagation(); onDelete?.(page.id); },
  });
  actions.append(up, down, remove);

  row.append(text, actions);
  return row;
}

function createDockSettingsList({ pages = [], activePageId = "", onSelect, onMove, onDelete } = {}) {
  const list = document.createElement("div");
  list.className = "mha-settings-dock-list";
  const normalized = Array.isArray(pages) ? pages : [];
  normalized.forEach((page, index) => list.append(createDockPageRow(page, index, normalized, { activePageId, onSelect, onMove, onDelete })));
  return list;
}

function createDockPageEditor({ page, onBack, onRename, onIconChange } = {}) {
  const wrapper = document.createElement("div");
  wrapper.className = "mha-settings-dock-editor";

  const back = createBackButton({
    label: t("settings.backToDock", "Back to dock"),
    className: "mha-settings-back",
    onClick: () => onBack?.(),
  });

  const nameField = document.createElement("label");
  nameField.className = "mha-settings-field";
  const nameLabel = document.createElement("span");
  nameLabel.className = "mha-settings-label";
  nameLabel.textContent = t("settings.name", "Name");
  const input = document.createElement("input");
  input.className = "mha-settings-select mha-settings-text-input";
  input.dataset.settingsControl = "dock-page-name";
  input.value = page?.name || "";
  input.addEventListener("change", () => onRename?.(page.id, input.value));
  input.addEventListener("keydown", (event) => { if (event.key === "Enter") input.blur(); });
  nameField.append(nameLabel, input);

  const iconGrid = document.createElement("div");
  iconGrid.className = "mha-settings-icon-grid";
  DOCK_ICON_OPTIONS.forEach(option => {
    const button = document.createElement("button");
    button.className = "mha-settings-icon-option";
    button.type = "button";
    button.dataset.selected = String((page?.icon || "grid") === option.name);
    button.setAttribute("aria-label", optionLabel(option));
    button.append(createIcon({
      name: option.name,
      category: option.category,
      label: optionLabel(option),
      children: createIconSymbol({ name: option.name, label: optionLabel(option) }),
    }));
    const label = document.createElement("span");
    label.textContent = optionLabel(option);
    button.append(label);
    button.addEventListener("click", () => onIconChange?.(page.id, option.name));
    iconGrid.append(button);
  });

  wrapper.append(back, nameField, createSection(t("settings.icon", "Icon"), [iconGrid]));
  return wrapper;
}

function createSection(title, children = []) {
  const section = document.createElement("section");
  section.className = "mha-settings-section";

  const heading = document.createElement("h3");
  heading.className = "mha-settings-section-title";
  heading.textContent = title;

  section.append(heading, ...children);
  return section;
}

function createNowBarControls({ enabled = true, items = {}, onEnabledChange, onItemChange } = {}) {
  return [
    createSwitch({
      label: t("settings.nowBarEnabled", "Enable Now Bar"),
      checked: enabled,
      onChange: onEnabledChange,
    }),
    ...NOW_BAR_ITEM_OPTIONS.map(item => createCheckbox({
      label: optionLabel(item),
      checked: items[item.value] !== false,
      onChange: checked => onItemChange?.(item.value, checked),
    })),
  ];
}

function createScreensaverControls({
  enabled = false,
  delay = 30000,
  clockVariant = "digital",
  onEnabledChange,
  onDelayChange,
  onClockVariantChange,
} = {}) {
  return [
    createSwitch({
      label: t("settings.enable", "Enable"),
      checked: enabled,
      onChange: onEnabledChange,
    }),
    createSelect({
      label: t("settings.delay", "Delay"),
      value: String(delay),
      options: SCREENSAVER_DELAY_OPTIONS,
      onChange: onDelayChange,
    }),
    createSelect({
        label: t("settings.clock", "Clock"),
      value: clockVariant,
      options: CLOCK_VARIANTS,
      onChange: onClockVariantChange,
    }),
  ];
}

function getValueControlSignature(root) {
  return [...root.querySelectorAll("[data-settings-value-control]")]
    .map(control => `${control.tagName}:${control.type || ""}:${control.dataset.settingsControl || ""}`)
    .join("|");
}

function updateMatchedValueControls(existing, next) {
  const existingControls = [...existing.querySelectorAll("[data-settings-value-control]")];
  const nextControls = [...next.querySelectorAll("[data-settings-value-control]")];

  existingControls.forEach((control, index) => {
    const source = nextControls[index];
    if (!source) return;

    if (control instanceof HTMLInputElement && source instanceof HTMLInputElement) {
      control.checked = source.checked;
      control.disabled = source.disabled;
      control.value = source.value;
      return;
    }

    if (control instanceof HTMLSelectElement && source instanceof HTMLSelectElement) {
      control.value = source.value;
      control.disabled = source.disabled;
    }
  });
}

function updateAccentPressedState(existing, next) {
  const existingField = existing.querySelector(".mha-settings-accent-field");
  const nextField = next.querySelector(".mha-settings-accent-field");
  if (existingField && nextField) {
    existingField.dataset.accentExpanded = nextField.dataset.accentExpanded;
  }

  const existingExpand = existing.querySelector(".mha-settings-accent-expand");
  const nextExpand = next.querySelector(".mha-settings-accent-expand");
  if (existingExpand && nextExpand) {
    existingExpand.dataset.accentExpanded = nextExpand.dataset.accentExpanded;
    existingExpand.setAttribute("aria-label", nextExpand.getAttribute("aria-label") || "");
    existingExpand.setAttribute("aria-expanded", nextExpand.getAttribute("aria-expanded") || "false");
    existingExpand.textContent = nextExpand.textContent;
  }

  const nextButtons = [...next.querySelectorAll(".mha-settings-accent-swatch")];
  nextButtons.forEach(source => {
    const accent = source.dataset.accent;
    const target = existing.querySelector(`.mha-settings-accent-swatch[data-accent="${accent}"]`);
    if (target) {
      target.dataset.compactAccent = source.dataset.compactAccent;
      target.setAttribute("aria-pressed", source.getAttribute("aria-pressed") || "false");
    }
  });
}

function getAccentSwatchSignature(root) {
  return root.querySelector(".mha-settings-accent-swatches")?.dataset.accentSignature || "";
}

export function updateSettingsPanel(existing, next) {
  if (!existing || !next) return false;
  if (existing.dataset.settingsScope !== next.dataset.settingsScope) return false;
  if (existing.dataset.settingsPage !== next.dataset.settingsPage) return false;

  const page = existing.dataset.settingsPage || "";
  if (!["main", "screensaver-nowbar", "screensaver"].includes(page)) return false;
  if (getValueControlSignature(existing) !== getValueControlSignature(next)) return false;
  if (getAccentSwatchSignature(existing) !== getAccentSwatchSignature(next)) return false;

  existing.dataset.open = next.dataset.open;
  existing.dataset.iconShape = next.dataset.iconShape;
  existing.hidden = next.hidden;
  existing.setAttribute("aria-hidden", next.getAttribute("aria-hidden") || "false");

  updateMatchedValueControls(existing, next);
  updateAccentPressedState(existing, next);
  return true;
}

export function createSettingsPanel({
  open = false,
  scope = "all",
  theme = "auto",
  themeStyle = "oneui",
  iosGlass = "liquid",
  accent = "",
  accentMode = "manual",
  accentPaletteExpanded = false,
  iconShape = "auto",
  effectiveIconShape = "",
  hideHaSidebar = false,
  screensaverEnabled = false,
  screensaverDelay = 30000,
  screensaverPreview = false,
  screensaverNowBar = true,
  screensaverNowBarItems = {},
  screensaverClockVariant = "digital",
  settingsPage = "main",
  dockPages = [],
  activeDockPageId = "",
  selectedDockPageId = "",
  dockPosition = "left",
  customWallpapers = {},
  onClose,
  onThemeChange,
  onThemeStyleChange,
  onIosGlassChange,
  onAccentChange,
  onAccentModeChange,
  onAccentPaletteExpandedChange,
  onIconShapeChange,
  onHideHaSidebarChange,
  onScreensaverEnabledChange,
  onScreensaverDelayChange,
  onScreensaverPreviewChange,
  onScreensaverNowBarChange,
  onScreensaverNowBarItemChange,
  onScreensaverClockVariantChange,
  onResetGrid,
  onOpenWallpaperSettings,
  onOpenNowBarSettings,
  onWallpaperMainBack,
  onOpenDockSettings,
  onDockBack,
  onDockPageSelect,
  onDockMovePage,
  onDockDeletePage,
  onDockMainBack,
  onDockRenamePage,
  onDockIconChange,
  onDockPositionChange,
  onWallpaperImport,
  onWallpaperReset,
} = {}) {
  const isScreensaverScope = scope === "screensaver";
  const root = document.createElement("aside");
  root.className = "mha-settings-panel";
  root.dataset.settingsScope = scope;
  root.dataset.settingsPage = isScreensaverScope ? "screensaver" : settingsPage;
  root.dataset.open = String(Boolean(open));
  root.dataset.iconShape = effectiveIconShape;
  root.setAttribute("aria-hidden", String(!open));
  root.hidden = !open;

  const scrim = document.createElement("button");
  scrim.className = "mha-settings-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", t("settings.closeSettings", "Close settings"));
  scrim.addEventListener("click", (event) => {
    event.stopPropagation();
    onClose?.();
  });

  const sheet = document.createElement("div");
  sheet.className = "mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", isScreensaverScope ? t("settings.screensaver", "Screensaver") : t("settings.title", "Settings"));
  ["pointerdown", "pointerup", "click", "touchstart", "touchmove", "touchend", "wheel"].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation(), { passive: type !== "wheel" });
  });

  const header = document.createElement("header");
  header.className = "mha-settings-header";

  const title = document.createElement("div");
  title.className = "mha-settings-title-block";

  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-settings-eyebrow";
  eyebrow.textContent = "MHA";

  const h2 = document.createElement("h2");
  h2.className = "mha-settings-title";
  h2.textContent = isScreensaverScope
    ? t("settings.screensaver", "Screensaver")
    : settingsPage === "dock"
      ? t("settings.dock", "Dock")
      : settingsPage === "dock-detail"
        ? t("settings.dockIcon", "Dock icon")
        : settingsPage === "wallpaper"
          ? t("settings.wallpaper", "Wallpaper")
          : settingsPage === "screensaver-nowbar" || settingsPage === "nowbar"
            ? t("settings.screensaverAndNowBar", "Screensaver and Now Bar")
          : t("settings.title", "Settings");

  title.append(eyebrow, h2);

  const close = createCloseButton({
    label: t("common.close", "Close"),
    className: "mha-settings-close",
    onClick: () => onClose?.(),
  });

  const headerActions = document.createElement("div");
  headerActions.className = "mha-settings-header-actions";

  if (!isScreensaverScope && (settingsPage === "dock" || settingsPage === "wallpaper" || settingsPage === "screensaver-nowbar" || settingsPage === "nowbar")) {
    headerActions.append(createBackButton({
      label: t("settings.backToSettings", "Back to settings"),
      className: "mha-settings-back",
      onClick: () => settingsPage === "wallpaper"
        ? onWallpaperMainBack?.()
        : onDockMainBack?.(),
    }));
  }

  headerActions.append(close);
  header.append(title, headerActions);

  const body = document.createElement("div");
  body.className = "mha-settings-body";

  const sections = [];

  if (!isScreensaverScope && settingsPage === "dock") {
    sections.push(createSection(t("settings.position", "Position"), [
      createSelect({
        label: t("settings.dockPosition", "Dock position"),
        value: dockPosition,
        options: DOCK_POSITION_OPTIONS,
        onChange: onDockPositionChange,
      }),
    ]));
    sections.push(createSection(t("settings.dockIcons", "Dock icons"), [
      createDockSettingsList({
        pages: dockPages,
        activePageId: activeDockPageId,
        onSelect: onDockPageSelect,
        onMove: onDockMovePage,
        onDelete: onDockDeletePage,
      }),
    ]));
    body.append(...sections);
    sheet.append(header, body);
    root.append(scrim, sheet);
    root.addEventListener("keydown", (event) => { if (event.key === "Escape") onClose?.(); });
    return root;
  }

  if (!isScreensaverScope && settingsPage === "dock-detail") {
    const selectedDockPage = dockPages.find(page => page.id === selectedDockPageId) || dockPages[0];
    sections.push(createSection(selectedDockPage?.name || "Page", [
      createDockPageEditor({
        page: selectedDockPage,
        onBack: onDockBack,
        onRename: onDockRenamePage,
        onIconChange: onDockIconChange,
      }),
    ]));
    body.append(...sections);
    sheet.append(header, body);
    root.append(scrim, sheet);
    root.addEventListener("keydown", (event) => { if (event.key === "Escape") onClose?.(); });
    return root;
  }

  if (!isScreensaverScope && settingsPage === "wallpaper") {
    sections.push(createSection(t("settings.lightTheme", "Light theme"), [
      createWallpaperControls({
        mode: "light",
        wallpaper: customWallpapers.light,
        onImport: onWallpaperImport,
        onReset: onWallpaperReset,
      }),
    ]));
    sections.push(createSection(t("settings.darkTheme", "Dark theme"), [
      createWallpaperControls({
        mode: "dark",
        wallpaper: customWallpapers.dark,
        onImport: onWallpaperImport,
        onReset: onWallpaperReset,
      }),
    ]));
    body.append(...sections);
    sheet.append(header, body);
    root.append(scrim, sheet);
    root.addEventListener("keydown", (event) => { if (event.key === "Escape") onClose?.(); });
    return root;
  }

  if (!isScreensaverScope && (settingsPage === "screensaver-nowbar" || settingsPage === "nowbar")) {
    sections.push(createSection(t("settings.screensaver", "Screensaver"), createScreensaverControls({
      enabled: screensaverEnabled,
      delay: screensaverDelay,
      clockVariant: screensaverClockVariant,
      onEnabledChange: onScreensaverEnabledChange,
      onDelayChange: onScreensaverDelayChange,
      onClockVariantChange: onScreensaverClockVariantChange,
    })));
    sections.push(createSection(t("settings.nowBar", "Now Bar"), createNowBarControls({
      enabled: screensaverNowBar,
      items: screensaverNowBarItems,
      onEnabledChange: onScreensaverNowBarChange,
      onItemChange: onScreensaverNowBarItemChange,
    })));
    body.append(...sections);
    sheet.append(header, body);
    root.append(scrim, sheet);
    root.addEventListener("keydown", (event) => { if (event.key === "Escape") onClose?.(); });
    return root;
  }

  if (!isScreensaverScope) {
    const appearanceControls = [
      createSelect({
        label: t("settings.theme", "Theme"),
        value: theme,
        options: THEME_OPTIONS,
        onChange: onThemeChange,
      }),
      createSelect({
        label: t("settings.visualStyle", "Visual style"),
        value: themeStyle,
        options: STYLE_OPTIONS,
        onChange: onThemeStyleChange,
      }),
    ];

    if (themeStyle === "ios") {
      appearanceControls.push(createSelect({
        label: t("settings.iosGlass", "iOS glass"),
        value: iosGlass,
        options: IOS_GLASS_OPTIONS,
        onChange: onIosGlassChange,
      }));
    }

    appearanceControls.push(
      createAccentPicker({
        label: t("settings.accent", "Accent"),
        themeStyle,
        value: accent,
        accentMode,
        expanded: accentPaletteExpanded,
        onChange: onAccentChange,
        onModeChange: onAccentModeChange,
        onExpandedChange: onAccentPaletteExpandedChange,
      }),
      createSelect({
        label: t("settings.iconShape", "Icon shape"),
        value: iconShape,
        options: ICON_SHAPE_OPTIONS,
        onChange: onIconShapeChange,
      }),
    );

    sections.push(createSection(t("settings.appearance", "Appearance"), appearanceControls));
    sections.push(createSection(t("settings.customization", "Customization"), [
      createSettingsNavTile({
        icon: "dashboard",
        label: t("settings.wallpaper", "Wallpaper"),
        description: t("settings.wallpaperDescription", "Choose a separate image for light and dark themes."),
        onClick: onOpenWallpaperSettings,
      }),
      createSettingsNavTile({
        icon: "star",
        label: t("settings.screensaverAndNowBar", "Screensaver and Now Bar"),
        description: t("settings.screensaverNowBarDescription", "Configure the screensaver and displayed content."),
        onClick: onOpenNowBarSettings,
      }),
    ]));
    sections.push(createSection(t("settings.navigation", "Navigation"), [
      createSwitch({
        label: t("settings.hideHaSidebar", "Hide Home Assistant sidebar"),
        description: t("settings.hideHaSidebarDescription", "Hide the native Home Assistant sidebar for a more immersive experience."),
        checked: hideHaSidebar,
        onChange: onHideHaSidebarChange,
      }),
      createSettingsNavTile({
        icon: "apps",
        label: t("settings.dock", "Dock"),
        description: t("settings.dockDescription", "Reorder dock pages and change their icons."),
        onClick: onOpenDockSettings,
      }),
    ]));
  } else {
    sections.push(createSection(t("settings.appearance", "Appearance"), [
      createSelect({
        label: t("settings.theme", "Theme"),
        value: theme,
        options: THEME_OPTIONS,
        onChange: onThemeChange,
      }),
    ]));
    sections.push(createSection(t("settings.nowBar", "Now Bar"), createNowBarControls({
      enabled: screensaverNowBar,
      items: screensaverNowBarItems,
      onEnabledChange: onScreensaverNowBarChange,
      onItemChange: onScreensaverNowBarItemChange,
    })));
  }

  if (isScreensaverScope) {
    sections.push(createSection(t("settings.screensaver", "Screensaver"), createScreensaverControls({
      enabled: screensaverEnabled,
      delay: screensaverDelay,
      clockVariant: screensaverClockVariant,
      onEnabledChange: onScreensaverEnabledChange,
      onDelayChange: onScreensaverDelayChange,
      onClockVariantChange: onScreensaverClockVariantChange,
    })));
  }

  body.append(...sections);

  const resetButton = document.createElement("button");
  resetButton.className = "mha-settings-reset";
  resetButton.type = "button";
  resetButton.textContent = t("settings.resetGrid", "Reset grid");
  resetButton.addEventListener("click", () => onResetGrid?.());

  if (!isScreensaverScope) {
    body.append(createSection(t("settings.layout", "Layout"), [resetButton]));
  }

  sheet.append(header, body);
  root.append(scrim, sheet);

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") onClose?.();
  });

  return root;
}
