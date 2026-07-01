import { t } from "../i18n/index.js";
import { resolveDockItems } from "./dock-content-registry.js";
import { createDockItemElement, invokeDockItem } from "./dock-item-renderer.js";

export function createMobileDock(props = {}) {
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

  for (const item of resolveDockItems({
    ...props,
    labels: {
      addPage: t("settings.addPage", "Add page"),
      manageDock: t("settings.manageDock", "Manage dock"),
      settings: t("settings.title", "Settings"),
    },
  })) {
    const node = createDockItemElement(item, {
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
    if (node) dock.append(node);
  }
  return dock;
}
