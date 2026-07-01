import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { DOCK_ITEM_TYPES } from "./dock-content-registry.js";

function createDockButtonElement(item, {
  itemClassName = "",
  resolvedClassName = "",
  active = false,
  onClick,
} = {}) {
  const button = document.createElement("button");
  const label = document.createElement("span");

  button.className = [itemClassName, resolvedClassName].filter(Boolean).join(" ");
  button.type = "button";
  button.dataset.dockItemType = item.type;
  button.dataset.active = String(active);
  button.setAttribute("aria-label", item.label);
  button.setAttribute("aria-current", active ? "page" : "false");
  if (item.pageId) button.dataset.pageId = item.pageId;
  if (item.action) button.dataset.dockAction = item.action;
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

function createDockSpacerElement(item, {
  spacerClassName = "",
  resolvedClassName = "",
} = {}) {
  const spacer = document.createElement("div");
  spacer.className = [spacerClassName, resolvedClassName].filter(Boolean).join(" ");
  spacer.dataset.dockItemType = item.type;
  spacer.setAttribute("aria-hidden", "true");
  return spacer;
}

export function createDockItemElement(item, {
  itemClassName = "",
  spacerClassName = "",
  resolvedClassName = "",
  activePageId = "",
  onInvoke,
} = {}) {
  if (item.type === DOCK_ITEM_TYPES.SPACER) {
    return createDockSpacerElement(item, { spacerClassName, resolvedClassName });
  }

  if (item.type !== DOCK_ITEM_TYPES.PAGE && item.type !== DOCK_ITEM_TYPES.ACTION) {
    return null;
  }

  return createDockButtonElement(item, {
    itemClassName,
    resolvedClassName,
    active: item.type === DOCK_ITEM_TYPES.PAGE && item.pageId === activePageId,
    onClick: () => onInvoke?.(item),
  });
}

export function invokeDockItem(item, {
  onPageSelect,
  onAddPage,
  onDockSettings,
  onSettings,
  onSettingsFallback,
} = {}) {
  if (item.type === DOCK_ITEM_TYPES.PAGE) {
    onPageSelect?.(item.pageId);
    return;
  }

  if (item.type !== DOCK_ITEM_TYPES.ACTION) return;

  if (item.action === "add-page") onAddPage?.();
  else if (item.action === "dock-settings") onDockSettings?.();
  else if (item.action === "settings") {
    if (onSettings) {
      onSettings();
      return;
    }

    onSettingsFallback?.();
  }
}
