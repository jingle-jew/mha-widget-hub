import { getAccentOptions, normalizeAccent } from "./accent-palettes.js";
import { createToggle } from "../ui/toggle.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createBackButton, createCloseButton, createMoveUpButton, createMoveDownButton, createRemoveButton } from "../system/system-buttons.js";
/*
 * MHA Settings panel.
 *
 * This panel owns user-facing shell/settings controls that used to live in the
 * dev panel. It updates host attributes and localStorage directly, without
 * forcing a full dashboard render.
 */

const THEME_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
];

const STYLE_OPTIONS = [
  { value: "ios", label: "iOS" },
  { value: "oneui", label: "OneUI" },
  { value: "material", label: "Material You" },
];

const IOS_GLASS_OPTIONS = [
  { value: "liquid", label: "Liquid Glass" },
  { value: "frosted", label: "Frosted Glass" },
];

const ICON_SHAPE_OPTIONS = [
  { value: "auto", label: "Auto" },
  { value: "rounded-square", label: "Rounded square" },
  { value: "squircle", label: "Squircle" },
  { value: "circle", label: "Circle" },
];

const SCREENSAVER_DELAY_OPTIONS = [
  { value: "15000", label: "15 secondes" },
  { value: "30000", label: "30 secondes" },
  { value: "120000", label: "2 minutes" },
  { value: "300000", label: "5 minutes" },
];


const DOCK_ICON_OPTIONS = [
  { name: "home", label: "Accueil", category: "home" },
  { name: "dashboard", label: "Dashboard", category: "navigation" },
  { name: "apps", label: "Applications", category: "system" },
  { name: "grid", label: "Grille", category: "navigation" },
  { name: "light", label: "Lumières", category: "lighting" },
  { name: "weather", label: "Météo", category: "weather" },
  { name: "media-player", label: "Média", category: "media_player" },
  { name: "calendar", label: "Calendrier", category: "utility" },
  { name: "star", label: "Favori", category: "utility" },
  { name: "gear", label: "Réglages", category: "system" },
];

const CLOCK_VARIANTS = [
  { value: "none", label: "Pas d’horloge" },
  { value: "digital", label: "Numérique" },
  { value: "digital-weather", label: "Numérique météo" },
  { value: "analog", label: "Analogique" },
  { value: "ios-analog", label: "Analogique iOS" },
];

function option(value, label, selectedValue) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  opt.selected = value === selectedValue;
  return opt;
}

function createSelect({ label, value, options, onChange }) {
  const field = document.createElement("label");
  field.className = "mha-settings-field";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const select = document.createElement("select");
  select.className = "mha-settings-select";
  select.append(...options.map((item) => option(item.value, item.label, value)));
  select.addEventListener("change", () => onChange?.(select.value));

  field.append(text, select);
  return field;
}

function createSwitch({ label, checked = false, onChange }) {
  const field = document.createElement("div");
  field.className = "mha-settings-switch";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const toggle = createToggle({
    label,
    checked,
    className: "mha-settings-toggle",
    onChange: (event) => onChange?.(Boolean(event.currentTarget?.checked)),
  });

  text.addEventListener("click", () => {
    toggle.querySelector(".mha-toggle-input")?.click();
  });

  field.append(text, toggle);
  return field;
}


function createAccentPicker({ label, themeStyle = "oneui", value = "", onChange }) {
  const options = getAccentOptions(themeStyle);
  const resolved = normalizeAccent(themeStyle, value);

  const field = document.createElement("div");
  field.className = "mha-settings-accent-field";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const swatches = document.createElement("div");
  swatches.className = "mha-settings-accent-swatches";
  swatches.dataset.themeStyle = themeStyle;

  for (const item of options) {
    const button = document.createElement("button");
    button.className = "mha-settings-accent-swatch";
    button.type = "button";
    button.dataset.accent = item.value;
    button.setAttribute("aria-label", item.label);
    button.setAttribute("aria-pressed", String(item.value === resolved));
    button.title = item.label;
    button.addEventListener("click", () => onChange?.(item.value));
    swatches.append(button);
  }

  field.append(text, swatches);
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
  meta.textContent = `${count} widget${count > 1 ? "s" : ""}`;
  text.append(title, meta);

  const actions = document.createElement("span");
  actions.className = "mha-settings-dock-row-actions";
  const up = createMoveUpButton({
    label: `Monter ${page.name || "la page"}`,
    className: "mha-settings-mini-button",
    disabled: index === 0,
    onClick: (event) => { event.stopPropagation(); onMove?.(page.id, -1); },
  });
  const down = createMoveDownButton({
    label: `Descendre ${page.name || "la page"}`,
    className: "mha-settings-mini-button",
    disabled: index >= pages.length - 1,
    onClick: (event) => { event.stopPropagation(); onMove?.(page.id, 1); },
  });
  const remove = createRemoveButton({
    label: `Supprimer ${page.name || "la page"}`,
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
    label: "Retour au dock",
    className: "mha-settings-back",
    onClick: () => onBack?.(),
  });

  const nameField = document.createElement("label");
  nameField.className = "mha-settings-field";
  const nameLabel = document.createElement("span");
  nameLabel.className = "mha-settings-label";
  nameLabel.textContent = "Nom";
  const input = document.createElement("input");
  input.className = "mha-settings-select mha-settings-text-input";
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
    button.setAttribute("aria-label", option.label);
    button.append(createIcon({
      name: option.name,
      category: option.category,
      label: option.label,
      children: createIconSymbol({ name: option.name, label: option.label }),
    }));
    const label = document.createElement("span");
    label.textContent = option.label;
    button.append(label);
    button.addEventListener("click", () => onIconChange?.(page.id, option.name));
    iconGrid.append(button);
  });

  wrapper.append(back, nameField, createSection("Icône", [iconGrid]));
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

export function createSettingsPanel({
  open = false,
  scope = "all",
  theme = "auto",
  themeStyle = "oneui",
  iosGlass = "liquid",
  accent = "",
  iconShape = "auto",
  effectiveIconShape = "",
  screensaverEnabled = false,
  screensaverDelay = 30000,
  screensaverPreview = false,
  screensaverNowBar = true,
  screensaverClockVariant = "digital",
  settingsPage = "main",
  dockPages = [],
  activeDockPageId = "",
  selectedDockPageId = "",
  onClose,
  onThemeChange,
  onThemeStyleChange,
  onIosGlassChange,
  onAccentChange,
  onIconShapeChange,
  onScreensaverEnabledChange,
  onScreensaverDelayChange,
  onScreensaverPreviewChange,
  onScreensaverNowBarChange,
  onScreensaverClockVariantChange,
  onResetGrid,
  onOpenDockSettings,
  onDockBack,
  onDockPageSelect,
  onDockMovePage,
  onDockDeletePage,
  onDockMainBack,
  onDockRenamePage,
  onDockIconChange,
} = {}) {
  const isScreensaverScope = scope === "screensaver";
  const root = document.createElement("aside");
  root.className = "mha-settings-panel";
  root.dataset.settingsScope = scope;
  root.dataset.open = String(Boolean(open));
  root.dataset.iconShape = effectiveIconShape;
  root.setAttribute("aria-hidden", String(!open));
  root.hidden = !open;

  const scrim = document.createElement("button");
  scrim.className = "mha-settings-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer les paramètres");
  scrim.addEventListener("click", (event) => {
    event.stopPropagation();
    onClose?.();
  });

  const sheet = document.createElement("div");
  sheet.className = "mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", isScreensaverScope ? "Paramètres de l’économiseur d’écran" : "Paramètres MHA");
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
  h2.textContent = isScreensaverScope ? "Économiseur d’écran" : settingsPage === "dock" ? "Dock" : settingsPage === "dock-detail" ? "Icône du dock" : "Paramètres";

  title.append(eyebrow, h2);

  const close = createCloseButton({
    label: "Fermer",
    className: "mha-settings-close",
    onClick: () => onClose?.(),
  });

  const headerActions = document.createElement("div");
  headerActions.className = "mha-settings-header-actions";

  if (!isScreensaverScope && settingsPage === "dock") {
    headerActions.append(createBackButton({
      label: "Retour aux paramètres",
      className: "mha-settings-back",
      onClick: () => onDockMainBack?.(),
    }));
  }

  headerActions.append(close);
  header.append(title, headerActions);

  const body = document.createElement("div");
  body.className = "mha-settings-body";

  const sections = [];

  if (!isScreensaverScope && settingsPage === "dock") {
    sections.push(createSection("Icônes du dock", [
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

  if (!isScreensaverScope) {
    const appearanceControls = [
      createSelect({
        label: "Thème",
        value: theme,
        options: THEME_OPTIONS,
        onChange: onThemeChange,
      }),
      createSelect({
        label: "Style visuel",
        value: themeStyle,
        options: STYLE_OPTIONS,
        onChange: onThemeStyleChange,
      }),
    ];

    if (themeStyle === "ios") {
      appearanceControls.push(createSelect({
        label: "Verre iOS",
        value: iosGlass,
        options: IOS_GLASS_OPTIONS,
        onChange: onIosGlassChange,
      }));
    }

    appearanceControls.push(
      createAccentPicker({
        label: "Accent",
        themeStyle,
        value: accent,
        onChange: onAccentChange,
      }),
      createSelect({
        label: "Forme des icônes",
        value: iconShape,
        options: ICON_SHAPE_OPTIONS,
        onChange: onIconShapeChange,
      }),
    );

    sections.push(createSection("Apparence", appearanceControls));
    sections.push(createSection("Navigation", [
      createSettingsNavTile({
        icon: "apps",
        label: "Dock",
        description: "Réorganiser les pages du dock et changer leurs icônes.",
        onClick: onOpenDockSettings,
      }),
    ]));
  } else {
    sections.push(createSection("Apparence", [
      createSelect({
        label: "Thème",
        value: theme,
        options: THEME_OPTIONS,
        onChange: onThemeChange,
      }),
    ]));
  }

  sections.push(createSection("Économiseur d’écran", [
      createSwitch({
        label: "Activer",
        checked: screensaverEnabled,
        onChange: onScreensaverEnabledChange,
      }),
      createSelect({
        label: "Délai",
        value: String(screensaverDelay),
        options: SCREENSAVER_DELAY_OPTIONS,
        onChange: onScreensaverDelayChange,
      }),
      createSwitch({
        label: "Now bar",
        checked: screensaverNowBar,
        onChange: onScreensaverNowBarChange,
      }),
      createSelect({
        label: "Horloge",
        value: screensaverClockVariant,
        options: CLOCK_VARIANTS,
        onChange: onScreensaverClockVariantChange,
      }),
    ]));

  body.append(...sections);

  const resetButton = document.createElement("button");
  resetButton.className = "mha-settings-reset";
  resetButton.type = "button";
  resetButton.textContent = "Réinitialiser la grille";
  resetButton.addEventListener("click", () => onResetGrid?.());

  if (!isScreensaverScope) {
    body.append(createSection("Layout", [resetButton]));
  }

  sheet.append(header, body);
  root.append(scrim, sheet);

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") onClose?.();
  });

  return root;
}
