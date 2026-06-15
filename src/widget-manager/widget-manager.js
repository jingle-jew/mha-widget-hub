import { createBackButton, createCloseButton } from "../system/system-buttons.js";
import { WIDGET_PREVIEW_IMAGES } from "../widgets/widget-preview-images.js";
import { getWidgetDefinition, resolveWidgetKind } from "../widgets/widget-registry.js";
export { WIDGET_VARIANTS, getWidgetVariants, getNextWidgetVariantEntries } from "../widgets/widget-variants.js";

const FRONTEND_ROOT_URL = new URL("../../", import.meta.url);

function resolveFrontendAssetUrl(path = "") {
  return new URL(path, FRONTEND_ROOT_URL).href;
}

export const WIDGET_MANAGER_CATEGORIES = Object.freeze([
  { id:"utilities", label:"Utilitaires", description:"Horloges et infos rapides.", icon:"◷", widgets:[
    {kind:"clock",variant:"digital",label:"Horloge numérique",size:{w:2,h:2},description:"Heure et date."},
    {kind:"clock",variant:"digital-weather",label:"Numérique météo",size:{w:2,h:2},description:"Heure, date et météo actuelle."},
    {kind:"clock",variant:"analog",label:"Horloge analogique",size:{w:2,h:2},description:"Cadran simple."},
    {kind:"clock",variant:"ios-analog",label:"Analogique iOS",size:{w:2,h:2},description:"Cadran classique iOS."},
  ]},
  { id:"actions", label:"Actions", description:"Boutons et raccourcis.", icon:"●", widgets:[
    {kind:"button",variant:"simple-button",label:"Bouton simple",size:{w:2,h:1},description:"Icône, libellé et état."},
    {kind:"button",variant:"simple-button",label:"Bouton carré",size:{w:2,h:2},description:"Tuile d’action inspirée Home."},
    {kind:"toggle",variant:"toggle-widget",label:"Toggle",size:{w:3,h:1},description:"Icône, état et interrupteur."},
    {kind:"toggle",variant:"toggle-widget",label:"Toggle large",size:{w:4,h:1},description:"Interrupteur avec plus d’espace."},
  ]},
  { id:"lights", label:"Lumières", description:"Contrôles rapides et intensité.", icon:"💡", widgets:[
    {kind:"toggle-slider",variant:"toggle-slider",label:"Lumière combinée",size:{w:4,h:2},description:"État et intensité dans une seule tuile."},
    {kind:"slider",variant:"light-slider-wide",label:"Intensité horizontale",size:{w:4,h:1},description:"Slider large."},
    {kind:"slider",variant:"light-slider-vertical",label:"Intensité verticale",size:{w:1,h:4},description:"Slider vertical."},
  ]},
  { id:"climate", label:"Climat", description:"Température et confort.", icon:"🌡", widgets:[
    {kind:"weather",variant:"adaptive-weather",label:"Météo horizontale",size:{w:4,h:1},description:"Icône et température."},
    {kind:"weather",variant:"adaptive-weather",label:"Météo compacte",size:{w:2,h:2},description:"Icône et température."},
    {kind:"weather",variant:"adaptive-weather",label:"Météo détails",size:{w:3,h:2},description:"Humidité et vent."},
    {kind:"weather",variant:"adaptive-weather",label:"Météo prévisions",size:{w:4,h:2},description:"Prévisions verticales."},
  ]},
  { id:"media", label:"Média", description:"Lecture et volume.", icon:"♪", widgets:[
    {kind:"slider",variant:"volume-slider",label:"Volume",size:{w:4,h:1},description:"Slider volume."},
  ]},
]);

const sizeLabel = (size = {}) => `${size.w || 2}×${size.h || 2}`;

function el(tag, className, text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function previewSizeKey(item) {
  return `${item.size?.w || 2}x${item.size?.h || 2}`;
}

function previewImageKey(item) {
  return `${item?.kind || "empty"}:${item?.variant || "default"}:${previewSizeKey(item)}`;
}

function resolvePreviewImage(item, {
  themeStyle = "oneui",
  theme = "dark",
} = {}) {
  const previewImages = WIDGET_PREVIEW_IMAGES[previewImageKey(item)];
  const styleGroup = previewImages?.[themeStyle];
  const defaultGroup = previewImages?.default;

  const resolved = (
    styleGroup?.[theme]
    || styleGroup?.default
    || (typeof defaultGroup === "object" ? defaultGroup?.[theme] : null)
    || defaultGroup
    || (typeof previewImages === "string" ? previewImages : null)
    || ""
  );

  return typeof resolved === "string" ? resolved : "";
}

function readActivePreviewTheme(root) {
  const doc = root?.ownerDocument || document;
  const host = root?.getRootNode?.()?.host || null;
  const themeStyle = host?.dataset?.themeStyle
    || doc.documentElement?.dataset?.themeStyle
    || "oneui";
  const theme = host?.dataset?.theme
    || doc.documentElement?.dataset?.theme
    || "dark";

  return {
    themeStyle,
    theme,
  };
}

function createPreviewHeader(title = "", detail = "") {
  const header = el("div", "mha-widget-manager-static-preview-header");
  header.append(
    el("span", "mha-widget-manager-static-preview-title", title),
    el("span", "mha-widget-manager-static-preview-detail", detail),
  );
  return header;
}

function createIconBubble(icon = "•", { active = false } = {}) {
  const bubble = el("span", "mha-widget-manager-preview-icon-bubble", icon);
  if (active) bubble.dataset.active = "true";
  return bubble;
}

function createButtonStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  preview.dataset.kind = "button";
  preview.dataset.size = previewSizeKey(item);

  const isSquare = preview.dataset.size === "2x2";
  const content = el("div", "mha-widget-manager-static-preview-button");
  content.dataset.layout = isSquare ? "square" : "horizontal";

  const text = el("div", "mha-widget-manager-static-preview-text");
  text.append(
    el("span", "mha-widget-manager-static-preview-title", isSquare ? "Maison" : "Entrée"),
    el("span", "mha-widget-manager-static-preview-detail", "Activé"),
  );

  content.append(createIconBubble("⌂"), text);
  preview.append(content);
  return preview;
}

function createToggleStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  preview.dataset.kind = "toggle";
  preview.dataset.size = previewSizeKey(item);

  const row = el("div", "mha-widget-manager-static-preview-toggle");
  const text = el("div", "mha-widget-manager-static-preview-text");
  text.append(
    el("span", "mha-widget-manager-static-preview-title", item.size?.w >= 4 ? "Salon" : "Lampe"),
    el("span", "mha-widget-manager-static-preview-detail", "Activé"),
  );

  const control = el("span", "mha-widget-manager-preview-switch");
  control.append(el("span", "mha-widget-manager-preview-switch-thumb"));

  row.append(createIconBubble("◉"), text, control);
  preview.append(row);
  return preview;
}

function createSliderStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  const size = previewSizeKey(item);
  const vertical = (item.size?.h || 1) > (item.size?.w || 1);
  preview.dataset.kind = "slider";
  preview.dataset.size = size;
  preview.dataset.orientation = vertical ? "vertical" : "horizontal";

  preview.append(createPreviewHeader(
    item.variant === "volume-slider" ? "Volume" : "Intensité",
    "68%",
  ));

  const body = el("div", "mha-widget-manager-static-preview-slider");
  body.dataset.orientation = vertical ? "vertical" : "horizontal";

  const rail = el("div", "mha-widget-manager-preview-slider-rail");
  rail.append(el("span", "mha-widget-manager-preview-slider-fill"));

  if (vertical) {
    body.append(rail, createIconBubble("✦"));
  } else {
    body.append(createIconBubble(item.variant === "volume-slider" ? "♪" : "✦"), rail);
  }

  preview.append(body);
  return preview;
}

function createToggleSliderStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  preview.dataset.kind = "toggle-slider";
  preview.dataset.size = previewSizeKey(item);

  const toggle = createToggleStaticPreview(item).firstElementChild;
  const slider = createSliderStaticPreview(item);
  slider.querySelector(".mha-widget-manager-static-preview-header")?.remove();

  preview.append(toggle, slider);
  return preview;
}

function createClockStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  preview.dataset.kind = "clock";
  preview.dataset.variant = item.variant || "digital";

  if (item.variant === "analog" || item.variant === "ios-analog") {
    const face = el("div", "mha-widget-manager-preview-clock-face");
    face.dataset.variant = item.variant;
    face.append(
      el("span", "mha-widget-manager-preview-clock-hand mha-widget-manager-preview-clock-hand--hour"),
      el("span", "mha-widget-manager-preview-clock-hand mha-widget-manager-preview-clock-hand--minute"),
      el("span", "mha-widget-manager-preview-clock-center"),
    );
    preview.append(face);
    return preview;
  }

  const digital = el("div", "mha-widget-manager-static-preview-clock");
  digital.append(
    el("span", "mha-widget-manager-static-preview-time", "12:45"),
    el("span", "mha-widget-manager-static-preview-detail", "Mer. 12 juin"),
  );
  if (item.variant === "digital-weather") {
    digital.append(el("span", "mha-widget-manager-static-preview-weather-inline", "22° · Part. nuageux"));
  }
  preview.append(digital);
  return preview;
}

function createWeatherStaticPreview(item) {
  const preview = el("div", "mha-widget-manager-static-preview");
  const size = previewSizeKey(item);
  preview.dataset.kind = "weather";
  preview.dataset.size = size;

  const current = el("div", "mha-widget-manager-static-preview-weather");
  current.append(
    el("span", "mha-widget-manager-static-preview-weather-temp", "22°"),
    el("span", "mha-widget-manager-static-preview-weather-icon", "☀"),
    el("span", "mha-widget-manager-static-preview-detail", "Part. nuageux"),
  );
  preview.append(current);

  if (size === "3x2" || size === "4x2") {
    const chips = el("div", "mha-widget-manager-static-preview-chips");
    chips.append(
      el("span", "mha-widget-manager-static-preview-chip", "54%"),
      el("span", "mha-widget-manager-static-preview-chip", "12 km/h"),
    );
    preview.append(chips);
  }

  if (size === "4x2") {
    const forecast = el("div", "mha-widget-manager-static-preview-forecast");
    ["Lun", "Mar", "Mer"].forEach((day, index) => {
      forecast.append(el("span", "mha-widget-manager-static-preview-forecast-item", `${day} ${22 - index}°`));
    });
    preview.append(forecast);
  }

  return preview;
}

function createStatusStaticPreview(item, {
  kind = "system",
  title = "Widget",
  detail = "En ligne",
  accent = "●",
} = {}) {
  const preview = el("div", "mha-widget-manager-static-preview");
  preview.dataset.kind = kind;
  preview.dataset.size = previewSizeKey(item);
  preview.append(createPreviewHeader(title, detail));

  const rows = el("div", "mha-widget-manager-static-preview-status");
  rows.append(
    el("span", "mha-widget-manager-static-preview-status-row", `${accent} Principal`),
    el("span", "mha-widget-manager-static-preview-status-row", "— Secondaire"),
  );

  preview.append(rows);
  return preview;
}

function createWidgetPreview(item) {
  const kind = resolveWidgetKind(item);
  const previewKind = getWidgetDefinition(kind)?.preview;
  const area = el("div", "mha-widget-manager-preview-area");
  area.setAttribute("aria-hidden", "true");
  area.dataset.kind = kind;
  area.dataset.size = previewSizeKey(item);
  area.dataset.variant = item.variant || "";

  const media = el("div", "mha-widget-manager-preview-media-frame");
  area.append(media);

  let preview;
  if (previewKind === "button") preview = createButtonStaticPreview(item);
  else if (previewKind === "toggle-slider") preview = createToggleSliderStaticPreview(item);
  else if (previewKind === "toggle") preview = createToggleStaticPreview(item);
  else if (previewKind === "slider") preview = createSliderStaticPreview(item);
  else if (previewKind === "clock") preview = createClockStaticPreview(item);
  else if (previewKind === "weather") preview = createWeatherStaticPreview(item);
  else preview = createStatusStaticPreview(item, {
    kind: "generic",
    title: item.label,
    detail: "Aperçu",
    accent: "•",
  });

  preview.classList.add("mha-widget-manager-preview-fallback");
  media.append(preview);

  const previewImage = resolvePreviewImage(item, readActivePreviewTheme(area));
  if (previewImage) {
    const image = document.createElement("img");
    image.className = "mha-widget-manager-preview-image";
    image.src = resolveFrontendAssetUrl(previewImage);
    image.alt = "";
    image.decoding = "async";
    image.loading = "lazy";
    image.draggable = false;

    image.addEventListener("load", () => {
      media.dataset.previewMode = "image";
    });

    image.addEventListener("error", () => {
      media.dataset.previewMode = "fallback";
      image.remove();
    }, { once: true });

    media.prepend(image);
  }

  return area;
}

function createCategoryButton(category, onSelectCategory) {
  const button = document.createElement("button");
  button.className = "mha-widget-manager-category";
  button.type = "button";
  const icon = document.createElement("span");
  icon.className = "mha-widget-manager-category-icon";
  icon.textContent = category.icon || "□";
  const text = document.createElement("span");
  text.className = "mha-widget-manager-category-text";
  const label = document.createElement("strong");
  label.textContent = category.label;
  const description = document.createElement("small");
  description.textContent = category.description || "";
  text.append(label, description);
  button.append(icon, text);
  button.addEventListener("click", () => onSelectCategory?.(category.id));
  return button;
}

function createWidgetButton(category, item, onSelectWidget) {
  const button = document.createElement("button");
  button.className = "mha-widget-manager-widget mha-widget-manager-card";
  button.type = "button";
  button.dataset.kind = item.kind || "empty";
  button.dataset.size = previewSizeKey(item);
  button.dataset.variant = item.variant || "";
  const content = document.createElement("span");
  content.className = "mha-widget-manager-widget-content mha-widget-manager-card-meta";
  const label = document.createElement("strong");
  label.className = "mha-widget-manager-card-title";
  label.textContent = item.label;
  const meta = document.createElement("small");
  meta.className = "mha-widget-manager-card-detail";
  meta.textContent = [sizeLabel(item.size), item.description || ""].filter(Boolean).join(" · ");
  content.append(label, meta);
  button.append(createWidgetPreview(item), content);
  button.addEventListener("click", () => onSelectWidget?.({ ...item, category: category.id }));
  return button;
}

export function createWidgetManager({open=false,activeCategory="",categories=WIDGET_MANAGER_CATEGORIES,onClose,onBack,onSelectCategory,onSelectWidget} = {}) {
  const selectedCategory = categories.find((category) => category.id === activeCategory) || null;
  const root = document.createElement("aside");
  root.className = "mha-widget-manager-panel mha-settings-panel";
  root.dataset.open = String(Boolean(open));
  root.dataset.view = selectedCategory ? "widgets" : "categories";
  root.setAttribute("aria-hidden", String(!open));
  root.hidden = !open;
  const scrim = document.createElement("button");
  scrim.className = "mha-widget-manager-scrim mha-settings-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer le gestionnaire de widgets");
  scrim.addEventListener("click", (event) => { event.stopPropagation(); onClose?.(); });
  const sheet = document.createElement("div");
  sheet.className = "mha-widget-manager-sheet mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", "Gestionnaire de widgets");
  ["pointerdown","pointerup","click","touchstart","touchmove","touchend","wheel"].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation(), { passive: type !== "wheel" });
  });
  const header = document.createElement("header");
  header.className = "mha-widget-manager-header mha-settings-header";
  const title = document.createElement("div");
  title.className = "mha-settings-title-block";
  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-settings-eyebrow";
  eyebrow.textContent = selectedCategory ? "Widgets" : "MHA";
  const h2 = document.createElement("h2");
  h2.className = "mha-settings-title";
  h2.textContent = selectedCategory ? selectedCategory.label : "Widgets";
  title.append(eyebrow, h2);
  const actions = document.createElement("div");
  actions.className = "mha-widget-manager-actions";
  if (selectedCategory) {
    const back = createBackButton({
      label: "Retour aux catégories",
      className: "mha-widget-manager-back",
      onClick: () => onBack?.(),
    });
    actions.append(back);
  }
  const close = createCloseButton({
    label: "Fermer",
    className: "mha-settings-close",
    onClick: () => onClose?.(),
  });
  actions.append(close);
  header.append(title, actions);
  const body = document.createElement("div");
  body.className = "mha-widget-manager-body mha-settings-body";
  if (selectedCategory) {
    const list = document.createElement("div");
    list.className = "mha-widget-manager-widget-list";
    selectedCategory.widgets.forEach((item) => list.append(createWidgetButton(selectedCategory, item, onSelectWidget)));
    body.append(list);
  } else {
    const grid = document.createElement("div");
    grid.className = "mha-widget-manager-category-grid";
    categories.forEach((category) => grid.append(createCategoryButton(category, onSelectCategory)));
    body.append(grid);
  }
  sheet.append(header, body);
  root.append(scrim, sheet);
  return root;
}
