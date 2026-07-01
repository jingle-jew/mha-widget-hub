import { t } from "../i18n/index.js";
import { resolveDockItems } from "./dock-content-registry.js";
import { createDockItemElement, invokeDockItem } from "./dock-item-renderer.js";

function appendDockItems(container, items, renderItem) {
  for (const item of items) {
    const node = renderItem(item);
    if (node) container.append(node);
  }
}

export function createDock(props = {}) {
  if (props.usesDock === false) return document.createDocumentFragment();

  const {
    activePageId = "",
    onPageSelect,
    onAddPage,
    onDockSettings,
    onSettings,
  } = props;
  const dock = document.createElement("nav");
  dock.className = "mha-dock";
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
    itemClassName: "mha-dock-item",
    spacerClassName: "mha-dock-spacer",
    resolvedClassName: item.className || "",
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

  appendDockItems(dock, items, renderItem);

  return dock;
}
