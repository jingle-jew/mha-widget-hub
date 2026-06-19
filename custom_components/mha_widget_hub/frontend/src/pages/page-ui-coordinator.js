import { buildDockStateProps } from "../layout/dock-props.js";
import { createDockProps, syncDocks } from "../layout/dock-controller.js";
import {
  buildPageCreatorPanelProps,
  syncPageCreatorPanel,
} from "../widgets/widget-placement-orchestrator.js";
import {
  addPage,
  changePageIcon,
  deletePage,
  movePage,
  removePageWidgetPositions,
  renamePage,
  selectPage,
} from "./page-controller.js";
import { updatePageCreatorIconSelection } from "./page-creator.js";

export class PageUiCoordinator {
  constructor({
    getRoot = () => null,
    getPages = () => [],
    setPages = () => {},
    getActivePageId = () => "",
    setActivePageId = () => {},
    getWidgets = () => [],
    setWidgets = () => {},
    getWidgetPositions = () => ({}),
    setWidgetPositions = () => {},
    getPageCreatorOpen = () => false,
    setPageCreatorOpen = () => {},
    getNewPageIcon = () => "grid",
    setNewPageIcon = () => {},
    getDockSettingsPageId = () => "",
    setDockSettingsPageId = () => {},
    setSettingsPage = () => {},
    getIsEditing = () => false,
    isMobileLandscapeLayout = () => false,
    normalizeWidget,
    savePages = () => false,
    readWidgets = () => [],
    writeActivePage = () => false,
    writeWidgetPositions = () => false,
    recordPersistenceResult = () => false,
    refreshActiveGridOnly = () => {},
    syncWidgetDropSlots = () => {},
    syncSettingsDom = () => {},
    openDockSettings = () => {},
    openSettings = () => {},
    clearPlacementState = () => {},
    syncDocksFn = syncDocks,
    createDockPropsFn = createDockProps,
    buildDockStatePropsFn = buildDockStateProps,
    syncPageCreatorPanelFn = syncPageCreatorPanel,
    buildPageCreatorPanelPropsFn = buildPageCreatorPanelProps,
    updatePageCreatorIconSelectionFn = updatePageCreatorIconSelection,
  } = {}) {
    this.getRoot = (...args) => getRoot(...args);
    this.getPages = (...args) => getPages(...args);
    this.setPages = (...args) => setPages(...args);
    this.getActivePageId = (...args) => getActivePageId(...args);
    this.setActivePageId = (...args) => setActivePageId(...args);
    this.getWidgets = (...args) => getWidgets(...args);
    this.setWidgets = (...args) => setWidgets(...args);
    this.getWidgetPositions = (...args) => getWidgetPositions(...args);
    this.setWidgetPositions = (...args) => setWidgetPositions(...args);
    this.getPageCreatorOpen = (...args) => getPageCreatorOpen(...args);
    this.setPageCreatorOpen = (...args) => setPageCreatorOpen(...args);
    this.getNewPageIcon = (...args) => getNewPageIcon(...args);
    this.setNewPageIcon = (...args) => setNewPageIcon(...args);
    this.getDockSettingsPageId = (...args) => getDockSettingsPageId(...args);
    this.setDockSettingsPageId = (...args) => setDockSettingsPageId(...args);
    this.setSettingsPage = (...args) => setSettingsPage(...args);
    this.getIsEditing = (...args) => getIsEditing(...args);
    this.isMobileLandscapeLayout = (...args) => isMobileLandscapeLayout(...args);
    this.normalizeWidget = normalizeWidget;
    this.savePages = (...args) => savePages(...args);
    this.readWidgets = (...args) => readWidgets(...args);
    this.writeActivePage = (...args) => writeActivePage(...args);
    this.writeWidgetPositions = (...args) => writeWidgetPositions(...args);
    this.recordPersistenceResult = (...args) => recordPersistenceResult(...args);
    this.refreshActiveGridOnly = (...args) => refreshActiveGridOnly(...args);
    this.syncWidgetDropSlots = (...args) => syncWidgetDropSlots(...args);
    this.syncSettingsDom = (...args) => syncSettingsDom(...args);
    this.openDockSettings = (...args) => openDockSettings(...args);
    this.openSettings = (...args) => openSettings(...args);
    this.clearPlacementState = (...args) => clearPlacementState(...args);
    this.syncDocksFn = (...args) => syncDocksFn(...args);
    this.createDockPropsFn = (...args) => createDockPropsFn(...args);
    this.buildDockStatePropsFn = (...args) => buildDockStatePropsFn(...args);
    this.syncPageCreatorPanelFn = (...args) => syncPageCreatorPanelFn(...args);
    this.buildPageCreatorPanelPropsFn = (...args) => buildPageCreatorPanelPropsFn(...args);
    this.updatePageCreatorIconSelectionFn = (...args) => updatePageCreatorIconSelectionFn(...args);
  }

  buildDockProps() {
    return this.createDockPropsFn({
      ...this.buildDockStatePropsFn({
        pages: this.getPages(),
        activePageId: this.getActivePageId(),
        isEditing: this.getIsEditing(),
      }),
      onPageSelect: (id) => this.selectPage(id),
      onAddPage: () => this.openPageCreator(),
      onDockSettings: () => this.openDockSettings(),
      onSettings: () => this.openSettings(),
    });
  }

  syncDocks() {
    this.syncDocksFn(this.getRoot(), this.buildDockProps());
  }

  buildPageCreatorProps() {
    return this.buildPageCreatorPanelPropsFn({
      open: this.getPageCreatorOpen(),
      selectedIcon: this.getNewPageIcon() || "grid",
      onClose: () => this.closePageCreator(),
      onSelectIcon: (icon) => this.setPageCreatorIcon(icon),
      onCreate: () => this.createPageFromCreator(),
    });
  }

  syncPageCreator() {
    this.syncPageCreatorPanelFn(this.getRoot(), this.buildPageCreatorProps());
  }

  selectPage(id) {
    const result = selectPage(this.getPages(), this.getActivePageId(), id);
    if (!result) return false;

    this.clearPlacementState();
    this.setActivePageId(result.activePageId);
    this.recordPersistenceResult(this.writeActivePage(result.activePageId));
    this.setWidgets(this.readWidgets());
    this.refreshActiveGridOnly();
    this.syncDocks();
    return true;
  }

  addGridPage({ icon = "grid" } = {}) {
    const result = addPage(this.getPages(), {
      icon,
      normalizeWidget: this.normalizeWidget,
    });

    this.setPages(result.pages);
    this.setActivePageId(result.activePageId);
    this.setWidgets([]);
    this.setPageCreatorOpen(false);
    this.setNewPageIcon("grid");
    this.savePages();
    this.syncDocks();
    this.syncPageCreator();
    this.refreshActiveGridOnly();
    this.syncWidgetDropSlots();
    return true;
  }

  openPageCreator() {
    if (!this.getIsEditing() || this.isMobileLandscapeLayout()) return false;
    this.setPageCreatorOpen(true);
    this.setNewPageIcon(this.getNewPageIcon() || "grid");
    this.syncPageCreator();
    return true;
  }

  closePageCreator() {
    this.setPageCreatorOpen(false);
    this.syncPageCreator();
    return true;
  }

  setPageCreatorIcon(icon = "grid") {
    const nextIcon = String(icon || "grid");
    this.setNewPageIcon(nextIcon);
    this.updatePageCreatorIconSelectionFn(this.getRoot(), nextIcon);
    return true;
  }

  createPageFromCreator() {
    if (!this.getIsEditing() || this.isMobileLandscapeLayout()) return false;
    return this.addGridPage({ icon: this.getNewPageIcon() || "grid" });
  }

  moveDockPage(id = "", direction = 0) {
    const result = movePage(this.getPages(), id, direction);
    if (!result) return false;
    this.setPages(result.pages);
    this.savePages();
    this.syncDocks();
    this.syncSettingsDom();
    return true;
  }

  renameDockPage(id = "", name = "") {
    const result = renamePage(this.getPages(), id, name);
    if (!result) return false;
    this.setPages(result.pages);
    this.savePages();
    this.syncDocks();
    this.syncSettingsDom();
    return true;
  }

  changeDockPageIcon(id = "", icon = "grid") {
    const result = changePageIcon(this.getPages(), id, icon);
    this.setPages(result.pages);
    this.savePages();
    this.syncDocks();
    this.syncSettingsDom();
    return true;
  }

  deleteDockPage(id = "") {
    const result = deletePage(this.getPages(), this.getActivePageId(), id);
    if (!result) return false;

    this.setPages(result.pages);
    this.setActivePageId(result.activePageId);
    if (result.activePageChanged) {
      this.setWidgets(this.readWidgets());
    }

    const nextPositions = removePageWidgetPositions(
      this.getWidgetPositions(),
      id,
      result.removedWidgetIds,
    );
    this.setWidgetPositions(nextPositions);
    const positionsSaved = this.writeWidgetPositions(nextPositions);

    if (this.getDockSettingsPageId() === id) {
      this.setSettingsPage("dock");
      this.setDockSettingsPageId("");
    }

    const pagesSaved = this.savePages();
    this.recordPersistenceResult(positionsSaved && pagesSaved);
    this.syncDocks();
    this.syncSettingsDom();
    this.refreshActiveGridOnly();
    this.syncWidgetDropSlots();
    return true;
  }
}

export function createPageUiCoordinator(options = {}) {
  return new PageUiCoordinator(options);
}
