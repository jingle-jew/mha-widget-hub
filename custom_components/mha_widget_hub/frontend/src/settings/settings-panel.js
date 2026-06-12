import { getAccentOptions, normalizeAccent } from "./accent-palettes.js";
import { createToggle } from "../ui/toggle.js";
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
  h2.textContent = isScreensaverScope ? "Économiseur d’écran" : "Paramètres";

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

  const sections = [];

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
