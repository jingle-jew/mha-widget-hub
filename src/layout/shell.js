import {createDock} from "./dock.js";
import {createStatusBar} from "./status-bar.js";

export function createShell(meta = {}) {
  const bg = document.createElement("div");
  bg.className = "mha-background";
  bg.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 4; i++) bg.append(document.createElement("span"));

  const shell = document.createElement("main");
  shell.className = "mha-shell";

  const statusBar = createStatusBar(meta);

  const workspace = document.createElement("section");
  workspace.className = "mha-workspace";
  workspace.setAttribute("aria-label", "Main dashboard area");

  const widgetArea = document.createElement("section");
  widgetArea.className = "mha-widget-area";
  widgetArea.setAttribute("aria-label", "Widget area");

  const grid = document.createElement("section");
  grid.className = "mha-grid";
  grid.setAttribute("aria-label", "Widget grid");

  const dockZone = document.createElement("aside");
  dockZone.className = "mha-dock-zone";
  dockZone.setAttribute("aria-label", "Dock area");

  dockZone.append(createDock({
    pages: meta.pages,
    activePageId: meta.activePageId,
    isEditing: meta.isEditing,
    onPageSelect: meta.onPageSelect,
    onAddPage: meta.onAddPage,
    onDockSettings: meta.onDockSettings,
    onSettings: meta.onSettings,
  }));
  widgetArea.append(grid);
  workspace.append(widgetArea, dockZone);
  shell.append(statusBar, workspace);

  return { bg, shell, grid };
}
