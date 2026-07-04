import { t } from "../i18n/index.js";
import { resolveDockItems } from "./dock-content-registry.js";
import { createDockItemElement, invokeDockItem } from "./dock-item-renderer.js";

const DOCK_PAGE_SIZE = 4;
const DRAG_THRESHOLD_PX = 8;

function appendDockItems(container, items, renderItem) {
  for (const item of items) {
    const node = renderItem(item);
    if (node) container.append(node);
  }
}

function appendPagedDockItems(dock, items, renderItem) {
  dock.classList.add("is-paged");
  const pageCount = Math.max(1, Math.ceil(items.length / DOCK_PAGE_SIZE));
  dock.style?.setProperty?.("--mha-mobile-dock-page-count", String(pageCount));
  const track = document.createElement("div");
  track.className = "mha-mobile-dock-track";
  const pages = document.createElement("div");
  pages.className = "mha-dock-pages";

  for (let index = 0; index < items.length; index += DOCK_PAGE_SIZE) {
    const page = document.createElement("div");
    page.className = "mha-dock-page";
    appendDockItems(page, items.slice(index, index + DOCK_PAGE_SIZE), renderItem);
    pages.append(page);
  }

  track.append(pages);
  dock.append(track);
  return track;
}

function attachPagedDockDragBehavior(dock) {
  if (!dock?.addEventListener) return;

  let session = null;
  let suppressClick = false;

  const hasHorizontalOverflow = () => (
    (dock.scrollWidth || 0) > ((dock.clientWidth || 0) + 1)
  );

  const finishSession = () => {
    if (!session) return;
    if (session.captured && session.pointerId != null) {
      dock.releasePointerCapture?.(session.pointerId);
    }
    session = null;
    delete dock.dataset.dragging;
  };

  const onPointerDown = (event) => {
    if (!hasHorizontalOverflow()) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) return;

    session = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollLeft: dock.scrollLeft || 0,
      dragging: false,
      captured: false,
    };
  };

  const onPointerMove = (event) => {
    if (!session || event.pointerId !== session.pointerId) return;

    const deltaX = event.clientX - session.startX;
    const deltaY = event.clientY - session.startY;

    if (!session.dragging) {
      if (Math.abs(deltaX) < DRAG_THRESHOLD_PX) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        finishSession();
        return;
      }

      session.dragging = true;
      dock.setPointerCapture?.(event.pointerId);
      session.captured = true;
      suppressClick = true;
      dock.dataset.dragging = "true";
    }

    event.preventDefault?.();
    dock.scrollLeft = session.startScrollLeft - deltaX;
  };

  const onPointerEnd = (event) => {
    if (!session || event.pointerId !== session.pointerId) return;
    finishSession();
  };

  const onClickCapture = (event) => {
    if (!suppressClick) return;
    suppressClick = false;
    event.preventDefault?.();
    event.stopImmediatePropagation?.();
    event.stopPropagation?.();
  };

  dock.addEventListener("pointerdown", onPointerDown);
  dock.addEventListener("pointermove", onPointerMove);
  dock.addEventListener("pointerup", onPointerEnd);
  dock.addEventListener("pointercancel", onPointerEnd);
  dock.addEventListener("lostpointercapture", finishSession);
  dock.addEventListener("click", onClickCapture, true);

  dock.__mhaDestroy = () => {
    finishSession();
    dock.removeEventListener?.("pointerdown", onPointerDown);
    dock.removeEventListener?.("pointermove", onPointerMove);
    dock.removeEventListener?.("pointerup", onPointerEnd);
    dock.removeEventListener?.("pointercancel", onPointerEnd);
    dock.removeEventListener?.("lostpointercapture", finishSession);
    dock.removeEventListener?.("click", onClickCapture, true);
  };
}

function appendStaticDockItems(dock, items, renderItem) {
  dock.classList?.remove?.("is-paged");
  dock.style?.removeProperty?.("--mha-mobile-dock-page-count");
  appendDockItems(dock, items, renderItem);
  return dock;
}

export function createMobileDock(props = {}) {
  if (props.usesDock === false) return document.createDocumentFragment();

  const {
    activePageId = "",
    onPageSelect,
    onAddPage,
    onDockSettings,
    onSettings,
    themeStyle = "",
  } = props;
  const dock = document.createElement("nav");
  dock.className = "mha-mobile-dock";
  dock.setAttribute("aria-label", t("settings.dock", "Dock"));

  const items = resolveDockItems({
    ...props,
    labels: {
      addPage: t("settings.addPage", "Add page"),
      manageDock: t("settings.manageDock", "Manage dock"),
      settings: t("settings.title", "Settings"),
    },
  });

  const renderItem = item => createDockItemElement(item, {
    itemClassName: "mha-mobile-dock-item",
    spacerClassName: "mha-mobile-dock-spacer",
    resolvedClassName: item.mobileClassName || item.className || "",
    activePageId,
    onInvoke: currentItem => invokeDockItem(currentItem, {
      onPageSelect,
      onAddPage,
      onDockSettings,
      onSettings,
      onSettingsFallback: () => {
        dock.dispatchEvent(new CustomEvent("mha-open-settings", {
          bubbles: true,
          composed: true,
        }));
      },
    }),
  });
  const shouldUsePagedStructure = items.length > DOCK_PAGE_SIZE || themeStyle === "oneui";
  const scrollTrack = shouldUsePagedStructure
    ? appendPagedDockItems(dock, items, renderItem)
    : appendStaticDockItems(dock, items, renderItem);
  if (items.length > DOCK_PAGE_SIZE) {
    attachPagedDockDragBehavior(scrollTrack || dock);
  }
  return dock;
}
