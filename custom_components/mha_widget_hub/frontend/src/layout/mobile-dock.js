import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { t } from "../i18n/index.js";

function createMobileDockIconButton(item, { className = "", active = false, onClick } = {}) {
  const button = document.createElement("button");
  button.className = ["mha-mobile-dock-item", className].filter(Boolean).join(" ");
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

  return button;
}

export function createMobileDock({
  pages = [],
  activePageId = "",
  isEditing = false,
  onPageSelect,
  onAddPage,
  onDockSettings,
  onSettings,
} = {}) {
  const dock = document.createElement("nav");
  dock.className = "mha-mobile-dock";
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
    dock.append(createMobileDockIconButton(item, {
      active: item.pageId === activePageId,
      onClick: () => onPageSelect?.(item.pageId),
    }));
  }

  if (isEditing) {
    dock.append(createMobileDockIconButton({
      symbol: "plus",
      category: "utility",
      label: t("settings.addPage", "Add page"),
      action: "add-page",
    }, {
      className: "mha-mobile-dock-add-page",
      onClick: () => onAddPage?.(),
    }));

    dock.append(createMobileDockIconButton({
      symbol: "edit",
      category: "utility",
      label: t("settings.manageDock", "Manage dock"),
      action: "dock-settings",
    }, {
      className: "mha-mobile-dock-edit",
      onClick: () => onDockSettings?.(),
    }));
  }

  dock.append(createMobileDockIconButton({
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
