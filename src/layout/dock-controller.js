import { createDock } from "./dock.js";
import { createMobileDock } from "./mobile-dock.js";
import { resolveDockItems } from "./dock-content-registry.js";

export const DOCK_STRUCTURE_ITEM_SELECTOR = ".mha-dock-item, .mha-dock-spacer";
export const MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR = ".mha-mobile-dock-item, .mha-mobile-dock-spacer";
const ALL_DOCK_STRUCTURE_ITEM_SELECTOR = [
  DOCK_STRUCTURE_ITEM_SELECTOR,
  MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR,
].join(", ");

function serializeDockStructureItem(item = {}) {
  const type = item.type || item.dataset?.dockItemType || "";
  const action = item.action || item.dataset?.dockAction || "page";
  const pageId = item.pageId || item.dataset?.pageId || "";
  const symbol = item.symbol || item.querySelector?.(".mha-icon")?.dataset?.icon || "";
  return [type, action, pageId, symbol].join(":");
}

function getMobileDockScrollContainer(dock) {
  return dock?.querySelector?.(".mha-mobile-dock-track") || dock || null;
}

export function buildDockStructureSignature(items = []) {
  return (Array.isArray(items) ? items : [])
    .map(item => serializeDockStructureItem(item))
    .join("|");
}

export function buildDockStructureSignatureFromProps(props = {}) {
  return buildDockStructureSignature(resolveDockItems(props));
}

export function buildDockStructureSignatureFromDom(
  dock,
  itemSelector = ALL_DOCK_STRUCTURE_ITEM_SELECTOR,
) {
  return buildDockStructureSignature(
    Array.from(dock?.querySelectorAll?.(itemSelector) || []),
  );
}

export function captureDockRenderState(root) {
  const dock = root?.querySelector?.(".mha-dock") || null;
  const mobileDock = root?.querySelector?.(".mha-mobile-dock") || null;
  const mobileDockScrollContainer = getMobileDockScrollContainer(mobileDock);
  const mobileDockScrollLeft = mobileDockScrollContainer?.scrollLeft || 0;
  const mobileDockPageIndex = mobileDock?.classList?.contains?.("is-paged") && mobileDockScrollContainer?.clientWidth
    ? Math.round(mobileDockScrollLeft / mobileDockScrollContainer.clientWidth)
    : -1;

  return {
    dock,
    dockSignature: buildDockStructureSignatureFromDom(dock, DOCK_STRUCTURE_ITEM_SELECTOR),
    mobileDock,
    mobileDockSignature: buildDockStructureSignatureFromDom(mobileDock, MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR),
    mobileDockScrollLeft,
    mobileDockPageIndex,
  };
}

function restoreMobileDockScroll(root, {
  mobileDockPageIndex = -1,
  mobileDockScrollLeft = 0,
} = {}) {
  const dock = root?.querySelector?.(".mha-mobile-dock");
  const scrollContainer = getMobileDockScrollContainer(dock);
  if (!dock || !scrollContainer) return false;
  if (mobileDockPageIndex >= 0 && scrollContainer.clientWidth) {
    scrollContainer.scrollLeft = mobileDockPageIndex * scrollContainer.clientWidth;
    return true;
  }
  scrollContainer.scrollLeft = mobileDockScrollLeft;
  return true;
}

export function restoreDockRenderState(
  root,
  dockState = {},
  {
    scheduleMobileDockOverflowState = () => {},
    updateDockActiveState = () => {},
    requestFrame = callback => requestAnimationFrame(callback),
  } = {},
) {
  if (!root) {
    updateDockActiveState();
    return { desktopPreserved: false, mobilePreserved: false };
  }

  const result = {
    desktopPreserved: false,
    mobilePreserved: false,
  };

  const nextDock = root.querySelector(".mha-dock");
  if (
    dockState.dock
    && nextDock
    && dockState.dockSignature
    && dockState.dockSignature === buildDockStructureSignatureFromDom(nextDock, DOCK_STRUCTURE_ITEM_SELECTOR)
  ) {
    nextDock.replaceWith(dockState.dock);
    result.desktopPreserved = true;
  }

  const nextMobileDock = root.querySelector(".mha-mobile-dock");
  if (
    dockState.mobileDock
    && nextMobileDock
    && dockState.mobileDockSignature
    && dockState.mobileDockSignature === buildDockStructureSignatureFromDom(nextMobileDock, MOBILE_DOCK_STRUCTURE_ITEM_SELECTOR)
  ) {
    nextMobileDock.replaceWith(dockState.mobileDock);
    scheduleMobileDockOverflowState();
    result.mobilePreserved = true;
  }

  updateDockActiveState();
  restoreMobileDockScroll(root, dockState);
  requestFrame(() => restoreMobileDockScroll(root, dockState));
  return result;
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
  dockPosition = "left",
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
    dockPosition,
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
