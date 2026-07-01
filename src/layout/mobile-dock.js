import { t } from "../i18n/index.js";
import { resolveDockItems } from "./dock-content-registry.js";
import { createDockItemElement, invokeDockItem } from "./dock-item-renderer.js";

const DOCK_PAGE_SIZE = 4;

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
  const pages = document.createElement("div");
  pages.className = "mha-dock-pages";

  for (let index = 0; index < items.length; index += DOCK_PAGE_SIZE) {
    const page = document.createElement("div");
    page.className = "mha-dock-page";
    appendDockItems(page, items.slice(index, index + DOCK_PAGE_SIZE), renderItem);
    pages.append(page);
  }

  dock.append(pages);
}

export function createMobileDock(props = {}) {
  if (props.usesDock === false) return document.createDocumentFragment();

  const {
    activePageId = "",
    onPageSelect,
    onAddPage,
    onDockSettings,
    onSettings,
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

  appendPagedDockItems(
    dock,
    items,
    item => createDockItemElement(item, {
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
    }),
  );
  return dock;
}
