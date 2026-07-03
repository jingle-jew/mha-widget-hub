import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createButton } from "../ui/button.js";
import { createPanelShell } from "../panels/panel-shell.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { t } from "../i18n/index.js";

export function createPageCreatorPanel({
  open = false,
  pageTypeOptions = [],
  onClose = () => {},
  onSelectPageType = () => {},
  onCreate = () => {},
} = {}) {
  const hint = document.createElement("p");
  hint.className = "mha-page-creator-hint";
  hint.textContent = t("settings.pageCreatorHint", "Choose the kind of page to create.");

  const typeLabel = document.createElement("p");
  typeLabel.className = "mha-page-creator-hint";
  typeLabel.textContent = t("settings.pageCreatorTypeLabel", "Page type");

  const typeGrid = document.createElement("div");
  typeGrid.className = "mha-page-creator-types";
  pageTypeOptions.forEach((option) => {
    const button = document.createElement("button");
    button.className = "mha-page-creator-type";
    button.type = "button";
    button.dataset.pageType = option.value;
    button.dataset.selected = String(option.selected);
    button.setAttribute("aria-pressed", String(option.selected));
    button.onclick = () => onSelectPageType(option.value);
    button.append(
      createIcon({
        name: option.icon,
        category: "navigation",
        label: option.label,
        children: createIconSymbol({ name: option.icon, label: option.label }),
      }),
    );
    const text = document.createElement("div");
    text.className = "mha-page-creator-type-copy";
    const title = document.createElement("strong");
    title.textContent = option.label;
    const description = document.createElement("span");
    description.textContent = option.description;
    text.append(title, description);
    button.append(text);
    typeGrid.append(button);
  });

  const actions = document.createElement("div");
  actions.className = "mha-page-creator-actions";
  const cancel = createButton({
    label: t("common.cancel", "Cancel"),
    variant: "default",
    className: "mha-page-creator-secondary",
    onClick: onClose,
  });
  const create = createButton({
    label: t("settings.pageCreatorCreate", "Create page"),
    variant: "primary",
    className: "mha-page-creator-primary",
    onClick: onCreate,
  });
  actions.append(cancel, create);

  const root = applyPanelSurfaceContract(createPanelShell({
    open,
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
    children: [hint, typeLabel, typeGrid, actions],
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.POPUP,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });
  root.hidden = !open;
  return root;
}

export function syncPageCreatorPanel(root, props) {
  root?.querySelectorAll?.("section.mha-page-creator:not(.mha-widget-config-popup)")
    ?.forEach((panel) => panel.remove());
  const panel = createPageCreatorPanel(props);
  root?.append?.(panel);
  return panel;
}

export function updatePageCreatorTypeSelection(root, selectedPageType) {
  root?.querySelectorAll?.("section.mha-page-creator:not(.mha-widget-config-popup) .mha-page-creator-type")
    ?.forEach((button) => {
      const selected = button.dataset?.pageType === selectedPageType;
      button.dataset.selected = String(selected);
      button.setAttribute("aria-pressed", String(selected));
    });
}
