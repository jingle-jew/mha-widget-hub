import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

/*
 * Dock container populated with normal reusable icon components.
 *
 * The dock chooses which actions/symbols appear here, but the visuals still
 * come from the generic icon and icon-symbol components.
 */

export function createDock({ onSettings } = {}) {
  const dock = document.createElement("nav");
  dock.className = "mha-dock";
  dock.setAttribute("aria-label", "Dock");

  const items = [
    { symbol: "gear", category: "system", label: "Paramètres", action: "settings" },
  ];

  for (const item of items) {
    const button = document.createElement("button");
    button.className = "mha-dock-item";
    button.type = "button";
    button.setAttribute("aria-label", item.label);
    if (item.action) button.dataset.dockAction = item.action;
    if (item.action === "settings") {
      button.addEventListener("click", () => {
        if (onSettings) {
          onSettings();
          return;
        }

        dock.dispatchEvent(new CustomEvent("mha-open-settings", {
          bubbles: true,
          composed: true,
        }));
      });
    }

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

    dock.append(button);
  }

  return dock;
}
