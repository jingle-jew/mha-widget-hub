import { buildPageCreatorState } from "./page-creator-props.js?v=phase6";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createPanelShell } from "../panels/panel-shell.js";
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

  return createPanelShell({
    open: pageCreatorState.open,
    rootClassName: "mha-page-creator",
    scrimClassName: "mha-page-creator-scrim",
    sheetClassName: "mha-page-creator-sheet",
    headerClassName: "mha-page-creator-header",
    closeClassName: "mha-page-creator-close",
    title: t("settings.pageCreatorTitle", "New page"),
    ariaLabel: t("settings.pageCreatorTitle", "New page"),
    closeLabel: t("common.close", "Close"),
    scrimLabel: t("settings.pageCreatorClose", "Close icon picker"),
    onClose,
    children: [hint, grid, actions],
  });
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
