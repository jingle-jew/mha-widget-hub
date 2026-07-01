import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { t } from "../i18n/index.js";

/*
 * Dock container populated with normal reusable icon components.
 *
 * The dock now acts as a page switcher. In edit mode, the final "+"
 * button creates a new empty grid page. Settings stays as a normal dock
 * action and does not belong to the page set.
 */

function createDockIconButton(item, { className = "", active = false, onClick } = {}) {
  const button = document.createElement("button");
  const label = document.createElement("span");
  button.className = ["mha-dock-item", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", item.label);
  button.dataset.active = String(active);
  if (item.pageId) button.dataset.pageId = item.pageId;
  if (item.action) button.dataset.dockAction = item.action;
  button.setAttribute("aria-current", active ? "page" : "false");
  if (onClick) button.addEventListener("click", onClick);

  button.append(
    createIcon({
      name: item.symbol,
      category: item.category,
      label: item.label,
      children: createIconSymbol({
        name: item.symbol,
        label: item.label,
      }),
    }),
  );
  label.className = "mha-dock-item-label";
  label.textContent = item.label;
  label.setAttribute("aria-hidden", "true");
  button.append(label);

  return button;
}

export function createDock({
  pages = [],
  activePageId = "",
  isEditing = false,
  onPageSelect,
  onAddPage,
  onDockSettings,
  onSettings,
} = {}) {
  const dock = document.createElement("nav");
  dock.className = "mha-dock";
  dock.setAttribute("aria-label", t("settings.dock", "Dock"));

  const pageItems = (Array.isArray(pages) && pages.length ? pages : [
    { id: "home", name: "Home", icon: "home" },
  ]).map((page, index) => ({
    pageId: page.id,
    symbol: page.icon || (index === 0 ? "home" : "grid"),
    category: index === 0 ? "home" : "utility",
    label: page.name || `Page ${index + 1}`,
    action: "page",
  }));

  for (const item of pageItems) {
    dock.append(createDockIconButton(item, {
      active: item.pageId === activePageId,
      onClick: () => onPageSelect?.(item.pageId),
    }));
  }

  if (isEditing) {
    dock.append(createDockIconButton({
      symbol: "plus",
      category: "utility",
      label: t("settings.addPage", "Add page"),
      action: "add-page",
    }, {
      className: "mha-dock-add-page",
      onClick: () => onAddPage?.(),
    }));

    dock.append(createDockIconButton({
      symbol: "edit",
      category: "utility",
      label: t("settings.manageDock", "Manage dock"),
      action: "dock-settings",
    }, {
      className: "mha-dock-edit",
      onClick: () => onDockSettings?.(),
    }));
  }

  dock.append(createDockIconButton({
    symbol: "gear",
    category: "system",
    label: t("settings.title", "Settings"),
    action: "settings",
  }, {
    onClick: () => {
      if (onSettings) {
        onSettings();
        return;
      }

      dock.dispatchEvent(new CustomEvent("mha-open-settings", {
        bubbles: true,
        composed: true,
      }));
    },
  }));

  return dock;
}
