import { buildPageCreatorState } from "./page-creator-props.js?v=phase6";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createCloseButton } from "../system/system-buttons.js";
import { t } from "../i18n/index.js";

export function createPageCreatorPanel({
  open = false,
  selectedIcon = "grid",
  onClose = () => {},
  onSelectIcon = () => {},
  onCreate = () => {},
} = {}) {
  const pageCreatorState = buildPageCreatorState({
    open,
    selectedIcon,
  });
  const panel = document.createElement("section");
  panel.className = "mha-page-creator";
  panel.dataset.open = String(pageCreatorState.open);
  panel.setAttribute("aria-hidden", String(!pageCreatorState.open));

  const scrim = document.createElement("button");
  scrim.className = "mha-page-creator-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", t("settings.pageCreatorClose", "Close icon picker"));
  scrim.onclick = onClose;

  const sheet = document.createElement("div");
  sheet.className = "mha-page-creator-sheet";
  sheet.setAttribute("role", "dialog");
  sheet.setAttribute("aria-modal", "true");
  sheet.setAttribute("aria-label", t("settings.pageCreatorTitle", "New page"));

  const header = document.createElement("div");
  header.className = "mha-page-creator-header";
  const title = document.createElement("h2");
  title.textContent = t("settings.pageCreatorTitle", "New page");
  const close = createCloseButton({
    label: t("common.close", "Close"),
    className: "mha-page-creator-close",
    onClick: onClose,
  });
  header.append(title, close);

  const hint = document.createElement("p");
  hint.className = "mha-page-creator-hint";
  hint.textContent = t("settings.pageCreatorHint", "Choose the icon that will appear in the dock.");

  const grid = document.createElement("div");
  grid.className = "mha-page-creator-icons";
  pageCreatorState.iconOptions.forEach((option) => {
    const button = document.createElement("button");
    button.className = "mha-page-creator-icon";
    button.type = "button";
    button.dataset.icon = option.name;
    button.dataset.selected = String(option.selected);
    button.setAttribute("aria-pressed", String(option.selected));
    button.setAttribute("aria-label", option.label);
    button.onclick = () => onSelectIcon(option.name);
    button.append(createIcon({
      name: option.name,
      category: option.category,
      label: option.label,
      children: createIconSymbol({ name: option.name, label: option.label }),
    }));
    const label = document.createElement("span");
    label.textContent = option.label;
    button.append(label);
    grid.append(button);
  });

  const actions = document.createElement("div");
  actions.className = "mha-page-creator-actions";
  const cancel = document.createElement("button");
  cancel.className = "mha-page-creator-secondary";
  cancel.type = "button";
  cancel.textContent = t("common.cancel", "Cancel");
  cancel.onclick = onClose;
  const create = document.createElement("button");
  create.className = "mha-page-creator-primary";
  create.type = "button";
  create.textContent = t("settings.pageCreatorCreate", "Create page");
  create.onclick = onCreate;
  actions.append(cancel, create);

  sheet.append(header, hint, grid, actions);
  panel.append(scrim, sheet);
  return panel;
}

export function syncPageCreatorPanel(root, props) {
  root?.querySelectorAll?.("section.mha-page-creator:not(.mha-widget-config-popup)")
    ?.forEach((panel) => panel.remove());
  root?.append?.(createPageCreatorPanel(props));
}

export function updatePageCreatorIconSelection(root, selectedIcon) {
  root?.querySelectorAll?.("section.mha-page-creator:not(.mha-widget-config-popup) .mha-page-creator-icon")
    ?.forEach((button) => {
      const selected = button.dataset?.icon === selectedIcon;
      button.dataset.selected = String(selected);
      button.setAttribute("aria-pressed", String(selected));
    });
}
