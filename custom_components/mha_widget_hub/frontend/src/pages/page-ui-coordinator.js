import { buildDockStateProps } from "../layout/dock-props.js";
import { createDockProps, syncDocks } from "../layout/dock-controller.js";
import { getThemeDockDefinition } from "../settings/theme-registry.js";
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
  updatePageConfig,
} from "./page-controller.js";
import {
  updatePageCreatorTypeSelection,
} from "./page-creator.js";
import {
  createDefaultPageConfig,
  getDefaultPageIcon,
  isMediaPlayersPage,
  PAGE_TYPES,
} from "./page-types.js";

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
    getNewPageType = () => PAGE_TYPES.GRID,
    setNewPageType = () => {},
    getNewPageIcon = () => "grid",
    setNewPageIcon = () => {},
    getDockSettingsPageId = () => "",
    setDockSettingsPageId = () => {},
    setSettingsPage = () => {},
    getIsEditing = () => false,
    getThemeStyle = () => "oneui",
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
    exitEditMode = () => {},
    clearPlacementState = () => {},
    transitionPageRender = () => {},
    renderRoot = () => {},
    syncDocksFn = syncDocks,
    createDockPropsFn = createDockProps,
    buildDockStatePropsFn = buildDockStateProps,
    syncPageCreatorPanelFn = syncPageCreatorPanel,
    buildPageCreatorPanelPropsFn = buildPageCreatorPanelProps,
    updatePageCreatorTypeSelectionFn = updatePageCreatorTypeSelection,
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
    this.getNewPageType = (...args) => getNewPageType(...args);
    this.setNewPageType = (...args) => setNewPageType(...args);
    this.getNewPageIcon = (...args) => getNewPageIcon(...args);
    this.setNewPageIcon = (...args) => setNewPageIcon(...args);
    this.getDockSettingsPageId = (...args) => getDockSettingsPageId(...args);
    this.setDockSettingsPageId = (...args) => setDockSettingsPageId(...args);
    this.setSettingsPage = (...args) => setSettingsPage(...args);
    this.getIsEditing = (...args) => getIsEditing(...args);
    this.getThemeStyle = (...args) => getThemeStyle(...args);
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
    this.exitEditMode = (...args) => exitEditMode(...args);
    this.clearPlacementState = (...args) => clearPlacementState(...args);
    this.transitionPageRender = (...args) => transitionPageRender(...args);
    this.renderRoot = (...args) => renderRoot(...args);
    this.syncDocksFn = (...args) => syncDocksFn(...args);
    this.createDockPropsFn = (...args) => createDockPropsFn(...args);
    this.buildDockStatePropsFn = (...args) => buildDockStatePropsFn(...args);
    this.syncPageCreatorPanelFn = (...args) => syncPageCreatorPanelFn(...args);
    this.buildPageCreatorPanelPropsFn = (...args) => buildPageCreatorPanelPropsFn(...args);
    this.updatePageCreatorTypeSelectionFn = (...args) => updatePageCreatorTypeSelectionFn(...args);
  }

  buildDockProps() {
    const themeStyle = this.getThemeStyle();
    const dockDefinition = getThemeDockDefinition(themeStyle);
    return this.createDockPropsFn({
      ...this.buildDockStatePropsFn({
        pages: this.getPages(),
        activePageId: this.getActivePageId(),
        isEditing: this.getIsEditing(),
      }),
      themeStyle,
      contentBuilder: dockDefinition.contentBuilder,
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
      selectedPageType: this.getNewPageType() || PAGE_TYPES.GRID,
      onClose: () => this.closePageCreator(),
      onSelectPageType: (type) => this.setPageCreatorType(type),
      onCreate: () => this.createPageFromCreator(),
    });
  }

  syncPageCreator() {
    this.syncPageCreatorPanelFn(this.getRoot(), this.buildPageCreatorProps());
  }

  shouldUseFullRenderForPageTransition(previousPage, nextPage) {
    return isMediaPlayersPage(previousPage) || isMediaPlayersPage(nextPage);
  }

  refreshAfterActivePageChange(previousPage, nextPage) {
    if (previousPage?.id && nextPage?.id && previousPage.id !== nextPage.id) {
      this.transitionPageRender(previousPage, nextPage);
      return true;
    }

    if (this.shouldUseFullRenderForPageTransition(previousPage, nextPage)) {
      this.renderRoot();
      return true;
    }

    this.refreshActiveGridOnly();
    this.syncWidgetDropSlots();
    return true;
  }

  selectPage(id) {
    const previousPage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
    const result = selectPage(this.getPages(), this.getActivePageId(), id);
    if (!result) return false;

    this.clearPlacementState();
    this.setActivePageId(result.activePageId);
    this.recordPersistenceResult(this.writeActivePage(result.activePageId));
    this.setWidgets(this.readWidgets());
    const nextPage = this.getPages().find(page => page.id === result.activePageId) || null;
    if (isMediaPlayersPage(nextPage)) this.exitEditMode();
    this.refreshAfterActivePageChange(previousPage, nextPage);
    this.syncDocks();
    return true;
  }

  addPage({ icon = "grid", pageType = PAGE_TYPES.GRID, pageConfig = {} } = {}) {
    const previousPage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
    const result = addPage(this.getPages(), {
      icon,
      pageType,
      pageConfig,
      normalizeWidget: this.normalizeWidget,
    });

    this.setPages(result.pages);
    this.setActivePageId(result.activePageId);
    this.setWidgets([]);
    this.setPageCreatorOpen(false);
    this.setNewPageType(PAGE_TYPES.GRID);
    this.savePages();
    if (isMediaPlayersPage(result.page)) this.exitEditMode();
    this.syncDocks();
    this.syncPageCreator();
    this.refreshAfterActivePageChange(previousPage, result.page);
    return true;
  }

  openPageCreator() {
    if (!this.getIsEditing() || this.isMobileLandscapeLayout()) return false;
    this.setPageCreatorOpen(true);
    this.setNewPageType(this.getNewPageType() || PAGE_TYPES.GRID);
    this.syncPageCreator();
    return true;
  }

  closePageCreator() {
    this.setPageCreatorOpen(false);
    this.syncPageCreator();
    return true;
  }

  setPageCreatorIcon(icon = "grid") {
    this.setNewPageIcon(String(icon || "grid"));
    return true;
  }

  setPageCreatorType(type = PAGE_TYPES.GRID) {
    const nextType = type || PAGE_TYPES.GRID;
    this.setNewPageType(nextType);
    this.updatePageCreatorTypeSelectionFn(this.getRoot(), nextType);
    return true;
  }

  createPageFromCreator() {
    if (!this.getIsEditing() || this.isMobileLandscapeLayout()) return false;
    const pageType = this.getNewPageType() || PAGE_TYPES.GRID;
    return this.addPage({
      pageType,
      icon: getDefaultPageIcon(pageType),
      pageConfig: createDefaultPageConfig(pageType),
    });
  }

  updatePageConfig(pageId, updater) {
    const previousPage = this.getPages().find(page => page.id === pageId) || null;
    const result = updatePageConfig(this.getPages(), pageId, updater);
    if (!result) return false;
    this.setPages(result.pages);
    this.savePages();
    this.syncSettingsDom();
    const nextPage = result.pages.find(page => page.id === pageId) || null;
    if (pageId === this.getActivePageId() && this.shouldUseFullRenderForPageTransition(previousPage, nextPage)) {
      this.renderRoot();
    }
    return true;
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
    const previousPage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
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
    const nextPage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
    this.refreshAfterActivePageChange(previousPage, nextPage);
    return true;
  }
}

export function createPageUiCoordinator(options = {}) {
  return new PageUiCoordinator(options);
}
