import { createDock } from "./dock.js";
import { createMobileDock } from "./mobile-dock.js";

export function createDockProps({
  pages = [],
  activePageId = "",
  isEditing = false,
  onPageSelect,
  onAddPage,
  onDockSettings,
  onSettings,
} = {}) {
  return {
    pages,
    activePageId,
    isEditing,
    onPageSelect,
    onAddPage,
    onDockSettings,
    onSettings,
  };
}

export function syncDockActiveState(root, activePageId = "") {
  root?.querySelectorAll?.("[data-page-id]").forEach(button => {
    const active = button.dataset.pageId === activePageId;
    button.dataset.active = String(active);
    button.setAttribute("aria-current", active ? "page" : "false");
  });
}

export function syncDocks(root, props = {}) {
  if (!root) return false;

  const dock = root.querySelector(".mha-dock");
  if (dock) dock.replaceWith(createDock(props));

  const mobileDock = root.querySelector(".mha-mobile-dock");
  if (mobileDock) mobileDock.replaceWith(createMobileDock(props));

  syncDockActiveState(root, props.activePageId);
  return true;
}
