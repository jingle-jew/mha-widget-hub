import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

/*
 * Custom mobile dock.
 *
 * The shell/layout is custom, but icon visuals are NOT custom:
 * all icons are normal .mha-icon components and still follow the global
 * data-icon-shape contract.
 */

function createMobileDockIconButton(item, { className = "", active = false, onClick } = {}) {
  const button = document.createElement("button");
  button.className = ["mha-mobile-dock-item", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", item.label);
  button.dataset.active = String(active);
  if (item.pageId) button.dataset.pageId = item.pageId;
  if (item.action) button.dataset.dockAction = item.action;
  button.setAttribute("aria-current", active ? "page" : "false");
  if (onClick) button.addEventListener("click", onClick);

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

export function createMobileDock({
  pages = [],
  activePageId = "",
  isEditing = false,
  onPageSelect,
  onAddPage,
  onSettings,
} = {}) {
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

  const pageItems = (Array.isArray(pages) && pages.length ? pages : [
    { id: "home", name: "Accueil", icon: "home" },
  ]).map((page, index) => ({
    pageId: page.id,
    symbol: page.icon || (index === 0 ? "home" : "grid"),
    category: index === 0 ? "home" : "utility",
    label: page.name || `Page ${index + 1}`,
    action: "page",
  }));

  for (const item of pageItems) {
    grid.append(createMobileDockIconButton(item, {
      active: item.pageId === activePageId,
      onClick: () => {
        onPageSelect?.(item.pageId);
        setOpen(false);
      },
    }));
  }

  if (isEditing) {
    grid.append(createMobileDockIconButton({
      symbol: "plus",
      category: "utility",
      label: "Ajouter une page",
      action: "add-page",
    }, {
      className: "mha-mobile-dock-add-page",
      onClick: () => {
        onAddPage?.();
        setOpen(false);
      },
    }));
  }

  grid.append(createMobileDockIconButton({
    symbol: "gear",
    category: "system",
    label: "Paramètres",
    action: "settings",
  }, {
    onClick: () => {
      if (onSettings) onSettings();
      else root.dispatchEvent(new CustomEvent("mha-open-settings", { bubbles: true, composed: true }));
      setOpen(false);
    },
  }));

  panel.append(close, grid);
  root.append(scrim, panel, launcher);

  function setOpen(open) {
    root.dataset.open = String(open);
    launcher.setAttribute("aria-expanded", String(open));
  }

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
