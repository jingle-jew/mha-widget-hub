import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

/*
 * Dock container populated with normal reusable icon components.
 *
 * The dock chooses which actions/symbols appear here, but the visuals still
 * come from the generic icon and icon-symbol components.
 */

export function createDock() {
  const dock = document.createElement("nav");
  dock.className = "mha-dock";
  dock.setAttribute("aria-label", "Dock");

  const items = [
    { symbol: "home", category: "home", label: "Accueil" },
    { symbol: "lightbulb", category: "lighting", label: "Lumières" },
    { symbol: "thermostat", category: "climate", label: "Climat" },
    { symbol: "media-player", category: "media_player", label: "Média" },
    { symbol: "lock", category: "security", label: "Sécurité" },
    { symbol: "wifi", category: "network", label: "Réseau" },
    { symbol: "energy", category: "energy", label: "Énergie" },
    { symbol: "settings", category: "system", label: "Réglages" },
  ];

  for (const item of items) {
    const button = document.createElement("button");
    button.className = "mha-dock-item";
    button.type = "button";
    button.setAttribute("aria-label", item.label);

    button.append(
      createIcon({
        name: item.symbol,
        category: item.category,
        label: item.label,
        children: createIconSymbol({
          name: item.symbol,
          label: item.label,
        }),
      })
    );

    dock.append(button);
  }

  return dock;
}
