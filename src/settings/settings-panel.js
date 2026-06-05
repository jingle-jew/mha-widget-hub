import { getAccentOptions, normalizeAccent } from "./accent-palettes.js";
/*
 * MHA Settings panel.
 *
 * This panel owns user-facing shell/settings controls that used to live in the
 * dev panel. It updates host attributes and localStorage directly, without
 * forcing a full dashboard render.
 */

const THEME_OPTIONS = [
  { value: "dark", label: "Sombre" },
  { value: "light", label: "Clair" },
];

const STYLE_OPTIONS = [
  { value: "ios", label: "iOS / Liquid Glass" },
  { value: "oneui", label: "OneUI" },
  { value: "material", label: "Material You" },
];

const ICON_SHAPE_OPTIONS = [
  { value: "rounded-square", label: "Rounded square" },
  { value: "squircle", label: "Squircle" },
  { value: "circle", label: "Circle" },
];

const CLOCK_VARIANTS = [
  { value: "digital", label: "Numérique" },
  { value: "analog", label: "Analogique" },
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
  const field = document.createElement("label");
  field.className = "mha-settings-switch";

  const text = document.createElement("span");
  text.className = "mha-settings-label";
  text.textContent = label;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);

  const visual = document.createElement("span");
  visual.className = "mha-settings-switch-visual";

  input.addEventListener("change", () => onChange?.(input.checked));

  field.append(text, input, visual);
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
  theme = "dark",
  themeStyle = "oneui",
  accent = "",
  iconShape = "squircle",
  screensaverPreview = false,
  screensaverNowBar = true,
  screensaverClockVariant = "digital",
  onClose,
  onThemeChange,
  onThemeStyleChange,
  onAccentChange,
  onIconShapeChange,
  onScreensaverPreviewChange,
  onScreensaverNowBarChange,
  onScreensaverClockVariantChange,
  onResetGrid,
} = {}) {
  const root = document.createElement("aside");
  root.className = "mha-settings-panel";
  root.dataset.open = String(Boolean(open));
  root.setAttribute("aria-hidden", String(!open));
  root.hidden = !open;

  const scrim = document.createElement("button");
  scrim.className = "mha-settings-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer les paramètres");
  scrim.addEventListener("click", () => onClose?.());

  const sheet = document.createElement("div");
  sheet.className = "mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Paramètres MHA");

  const header = document.createElement("header");
  header.className = "mha-settings-header";

  const title = document.createElement("div");
  title.className = "mha-settings-title-block";

  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-settings-eyebrow";
  eyebrow.textContent = "MHA";

  const h2 = document.createElement("h2");
  h2.className = "mha-settings-title";
  h2.textContent = "Paramètres";

  title.append(eyebrow, h2);

  const close = document.createElement("button");
  close.className = "mha-settings-close";
  close.type = "button";
  close.setAttribute("aria-label", "Fermer");
  close.textContent = "×";
  close.addEventListener("click", () => onClose?.());

  header.append(title, close);

  const body = document.createElement("div");
  body.className = "mha-settings-body";

  body.append(
    createSection("Apparence", [
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
    ]),

    createSection("Écran de veille", [
      createSwitch({
        label: "Aperçu écran de veille",
        checked: screensaverPreview,
        onChange: onScreensaverPreviewChange,
      }),
      createSwitch({
        label: "Barre Now Playing",
        checked: screensaverNowBar,
        onChange: onScreensaverNowBarChange,
      }),
      createSelect({
        label: "Horloge",
        value: screensaverClockVariant,
        options: CLOCK_VARIANTS,
        onChange: onScreensaverClockVariantChange,
      }),
    ]),
  );

  const resetButton = document.createElement("button");
  resetButton.className = "mha-settings-reset";
  resetButton.type = "button";
  resetButton.textContent = "Réinitialiser la grille";
  resetButton.addEventListener("click", () => onResetGrid?.());

  body.append(createSection("Layout", [resetButton]));

  sheet.append(header, body);
  root.append(scrim, sheet);

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") onClose?.();
  });

  return root;
}
