import { createDock } from "./dock.js";
import { createMobileDock } from "./mobile-dock.js";
import { resolveDockItems } from "./dock-content-registry.js";

function buildDockStructureSignatureFromProps(props = {}) {
  return resolveDockItems(props)
    .map(item => [item.type || "", item.action || "", item.pageId || "", item.symbol || ""].join(":"))
    .join("|");
}

function buildDockStructureSignatureFromDom(dock) {
  return Array.from(dock?.querySelectorAll?.(".mha-dock-item, .mha-mobile-dock-item, .mha-dock-spacer, .mha-mobile-dock-spacer") || [])
    .map(item => [
      item.dataset.dockItemType || "",
      item.dataset.dockAction || "page",
      item.dataset.pageId || "",
      item.querySelector?.(".mha-icon")?.dataset.icon || "",
    ].join(":"))
    .join("|");
}

function removeDockNode(dock) {
  if (!dock) return false;
  if (typeof dock.remove === "function") {
    dock.remove();
    return true;
  }
  if (dock.parentNode && typeof dock.parentNode.removeChild === "function") {
    dock.parentNode.removeChild(dock);
    return true;
  }
  return false;
}

export function createDockProps({
  pages = [],
  activePageId = "",
  isEditing = false,
  themeStyle = "oneui",
  usesDock = true,
  contentBuilder = "default",
  items = [],
  onPageSelect,
  onAddPage,
  onDockSettings,
  onSettings,
} = {}) {
  return {
    pages,
    activePageId,
    isEditing,
    themeStyle,
    usesDock,
    contentBuilder,
    items,
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
  const mobileDock = root.querySelector(".mha-mobile-dock");

  if (props.usesDock === false) {
    removeDockNode(dock?.closest?.(".mha-dock-zone") || dock);
    removeDockNode(mobileDock);
    return true;
  }

  const nextStructureSignature = buildDockStructureSignatureFromProps(props);
  if (dock && buildDockStructureSignatureFromDom(dock) !== nextStructureSignature) {
    dock.replaceWith(createDock(props));
  }

  if (mobileDock && buildDockStructureSignatureFromDom(mobileDock) !== nextStructureSignature) {
    mobileDock.replaceWith(createMobileDock(props));
  }

  syncDockActiveState(root, props.activePageId);
  return true;
}
