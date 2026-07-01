import { createDock } from "./dock.js";
import { createMobileDock } from "./mobile-dock.js";

function buildDockStructureSignatureFromProps(props = {}) {
  const pageItems = (Array.isArray(props.pages) && props.pages.length ? props.pages : [
    { id: "home", icon: "home" },
  ]).map((page, index) => ({
    action: "page",
    pageId: page.id,
    icon: page.icon || (index === 0 ? "home" : "grid"),
  }));

  if (props.isEditing) {
    pageItems.push(
      { action: "add-page", pageId: "", icon: "plus" },
      { action: "dock-settings", pageId: "", icon: "edit" },
    );
  }

  pageItems.push({ action: "settings", pageId: "", icon: "gear" });

  return pageItems
    .map(item => [item.action, item.pageId || "", item.icon || ""].join(":"))
    .join("|");
}

function buildDockStructureSignatureFromDom(dock) {
  return Array.from(dock?.querySelectorAll?.(".mha-dock-item, .mha-mobile-dock-item") || [])
    .map(item => [
      item.dataset.dockAction || "page",
      item.dataset.pageId || "",
      item.querySelector?.(".mha-icon")?.dataset.icon || "",
    ].join(":"))
    .join("|");
}

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

  const nextStructureSignature = buildDockStructureSignatureFromProps(props);
  const dock = root.querySelector(".mha-dock");
  if (dock && buildDockStructureSignatureFromDom(dock) !== nextStructureSignature) {
    dock.replaceWith(createDock(props));
  }

  const mobileDock = root.querySelector(".mha-mobile-dock");
  if (mobileDock && buildDockStructureSignatureFromDom(mobileDock) !== nextStructureSignature) {
    mobileDock.replaceWith(createMobileDock(props));
  }

  syncDockActiveState(root, props.activePageId);
  return true;
}
