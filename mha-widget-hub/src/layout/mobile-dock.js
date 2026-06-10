import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

/*
 * Custom mobile dock.
 *
 * The shell/layout is custom, but icon visuals are NOT custom:
 * all icons are normal .mha-icon components and still follow the global
 * data-icon-shape contract.
 */

const MOBILE_DOCK_ITEMS = [
  { symbol: "gear", category: "system", label: "Paramètres", action: "settings" },
];

function createMobileDockIconButton(item, { className = "", onSettings } = {}) {
  const button = document.createElement("button");
  button.className = ["mha-mobile-dock-item", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", item.label);
  if (item.action === "settings") {
    button.addEventListener("click", () => {
      if (onSettings) {
        onSettings();
        return;
      }

      button.dispatchEvent(new CustomEvent("mha-open-settings", {
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

  return button;
}

export function createMobileDock({ onSettings } = {}) {
  const root = document.createElement("div");
  root.className = "mha-mobile-dock";
  root.dataset.open = "false";

  const launcher = document.createElement("button");
  launcher.className = "mha-mobile-dock-launcher";
  launcher.type = "button";
  launcher.setAttribute("aria-label", "Ouvrir le dock mobile");
  launcher.setAttribute("aria-expanded", "false");

  launcher.append(
    createIcon({
      name: "apps",
      category: "system",
      label: "Dock",
      children: createIconSymbol({
        name: "apps",
        label: "Dock",
      }),
    }),
  );

  const panel = document.createElement("div");
  panel.className = "mha-mobile-dock-panel";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-label", "Dock mobile");

  const scrim = document.createElement("button");
  scrim.className = "mha-mobile-dock-scrim";
  scrim.type = "button";
  scrim.setAttribute("aria-label", "Fermer le dock mobile");

  const close = document.createElement("button");
  close.className = "mha-mobile-dock-close";
  close.type = "button";
  close.setAttribute("aria-label", "Fermer");
  close.textContent = "×";

  const grid = document.createElement("div");
  grid.className = "mha-mobile-dock-grid";

  for (const item of MOBILE_DOCK_ITEMS) {
    grid.append(createMobileDockIconButton(item, { onSettings }));
  }

  panel.append(close, grid);
  root.append(scrim, panel, launcher);

  const setOpen = (open) => {
    root.dataset.open = String(open);
    launcher.setAttribute("aria-expanded", String(open));
  };

  launcher.addEventListener("click", () => {
    setOpen(root.dataset.open !== "true");
  });

  scrim.addEventListener("click", () => setOpen(false));
  close.addEventListener("click", () => setOpen(false));

  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setOpen(false);
  });

  return root;
}
