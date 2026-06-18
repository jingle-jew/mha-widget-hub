import { getWidgetManagerCategories } from "../widgets/widget-registry.js";
import { createBackButton, createCloseButton } from "../system/system-buttons.js";
import { createLiveWidgetPreview } from "../widgets/widget-preview-renderer.js";
import { resolveWidgetKind } from "../widgets/widget-registry.js";
import { t } from "../i18n/index.js";
export { WIDGET_VARIANTS, getWidgetVariants, getNextWidgetVariantEntries } from "../widgets/widget-variants.js";

export const WIDGET_MANAGER_CATEGORIES = Object.freeze(
  getWidgetManagerCategories(),
);

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

function createGenericPreviewFallback(item = {}) {
  const preview = el("div", "mha-widget-manager-preview-generic-fallback");
  preview.dataset.kind = resolveWidgetKind(item);
  preview.dataset.size = previewSizeKey(item);
  const title = item.labelKey
    ? t(item.labelKey, item.title || item.label || t("common.widget", "Widget"))
    : item.title || item.label || t("common.widget", "Widget");
  const description = item.descriptionKey
    ? t(item.descriptionKey, item.description || t("widgets.manager.previewUnavailable", "Preview unavailable"))
    : item.description || t("widgets.manager.previewUnavailable", "Preview unavailable");
  preview.append(
    el("span", "mha-widget-manager-preview-generic-title", title),
    el("span", "mha-widget-manager-preview-generic-detail", description),
  );
  return preview;
}

function createWidgetPreview(item) {
  const kind = resolveWidgetKind(item);
  const area = el("div", "mha-widget-manager-preview-area");
  area.setAttribute("aria-hidden", "true");
  area.dataset.kind = kind;
  area.dataset.size = previewSizeKey(item);
  area.dataset.variant = item.variant || "";

  const media = el("div", "mha-widget-manager-preview-media-frame");
  area.append(media);

  const preview = createLiveWidgetPreview(item) || createGenericPreviewFallback(item);
  if (preview.classList.contains("mha-widget-manager-live-preview")) {
    media.dataset.previewMode = "live";
  } else {
    media.dataset.previewMode = "fallback";
    preview.classList.add("mha-widget-manager-preview-fallback");
  }

  media.append(preview);
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
  label.textContent = t(`widgets.categories.${category.id}`, category.label);
  const description = document.createElement("small");
  description.textContent = t(`widgets.categoryDescriptions.${category.id}`, category.description || "");
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
  label.textContent = item.labelKey
    ? t(item.labelKey, item.title || item.label)
    : item.title || item.label;
  const meta = document.createElement("small");
  meta.className = "mha-widget-manager-card-detail";
  const description = item.descriptionKey
    ? t(item.descriptionKey, item.description || "")
    : item.description || "";
  meta.textContent = [sizeLabel(item.size), description].filter(Boolean).join(" · ");
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
  scrim.setAttribute("aria-label", t("widgets.manager.close", "Close widget manager"));
  scrim.addEventListener("click", (event) => { event.stopPropagation(); onClose?.(); });
  const sheet = document.createElement("div");
  sheet.className = "mha-widget-manager-sheet mha-settings-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", t("widgets.manager.ariaLabel", "Widget manager"));
  ["pointerdown","pointerup","click","touchstart","touchmove","touchend","wheel"].forEach((type) => {
    root.addEventListener(type, (event) => event.stopPropagation(), { passive: type !== "wheel" });
  });
  const header = document.createElement("header");
  header.className = "mha-widget-manager-header mha-settings-header";
  const title = document.createElement("div");
  title.className = "mha-settings-title-block";
  const eyebrow = document.createElement("span");
  eyebrow.className = "mha-settings-eyebrow";
  eyebrow.textContent = selectedCategory ? t("widgets.manager.title", "Widgets") : "MHA";
  const h2 = document.createElement("h2");
  h2.className = "mha-settings-title";
  h2.textContent = selectedCategory ? t(`widgets.categories.${selectedCategory.id}`, selectedCategory.label) : t("widgets.manager.title", "Widgets");
  title.append(eyebrow, h2);
  const actions = document.createElement("div");
  actions.className = "mha-widget-manager-actions";
  if (selectedCategory) {
    const back = createBackButton({
      label: t("widgets.manager.backToCategories", "Back to categories"),
      className: "mha-widget-manager-back",
      onClick: () => onBack?.(),
    });
    actions.append(back);
  }
  const close = createCloseButton({
    label: t("common.close", "Close"),
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
