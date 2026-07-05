import {createDock} from "./dock.js";
import { createIosOrganicWallpaper } from "./ios-organic-wallpaper.js?v=ios-wallpaper-svg-1";
import {createStatusBar} from "./status-bar.js";
import { t } from "../i18n/index.js";

export function createShell(meta = {}) {
  const bg = document.createElement("div");
  bg.className = "mha-background";
  bg.setAttribute("aria-hidden", "true");
  const wallpaper = document.createElement("img");
  wallpaper.className = "mha-background-wallpaper";
  wallpaper.alt = "";
  wallpaper.setAttribute("aria-hidden", "true");
  const mediaLayer = document.createElement("div");
  mediaLayer.className = "mha-background-media";
  const mediaOverlay = document.createElement("div");
  mediaOverlay.className = "mha-background-media-overlay";
  for (let i = 0; i < 4; i++) bg.append(document.createElement("span"));
  bg.append(createIosOrganicWallpaper());
  bg.append(wallpaper, mediaLayer, mediaOverlay);

  const shell = document.createElement("main");
  shell.className = "mha-shell";

  const statusBar = createStatusBar(meta);
  const statusBarFill = document.createElement("div");
  statusBarFill.className = "mha-statusbar-fill";
  statusBarFill.setAttribute("aria-hidden", "true");
  if (meta.statusBarMode) {
    statusBarFill.dataset.statusBarMode = meta.statusBarMode;
  }

  const workspace = document.createElement("section");
  workspace.className = "mha-workspace";
  workspace.setAttribute("aria-label", t("settings.mainDashboardArea", "Main dashboard area"));

  const widgetArea = document.createElement("section");
  widgetArea.className = "mha-widget-area";
  widgetArea.setAttribute("aria-label", t("settings.widgetArea", "Widget area"));

  const pageStage = document.createElement("section");
  pageStage.className = "mha-page-stage";
  pageStage.setAttribute("aria-label", t("settings.widgetGrid", "Widget grid"));

  widgetArea.append(pageStage);
  workspace.append(widgetArea);

  if (meta.usesDock !== false) {
    const dockZone = document.createElement("aside");
    dockZone.className = "mha-dock-zone";
    dockZone.setAttribute("aria-label", t("settings.dockArea", "Dock area"));
    dockZone.append(createDock(meta));
    workspace.append(dockZone);
  }

  shell.append(statusBar, statusBarFill, workspace);

  return { bg, shell, pageStage };
}
