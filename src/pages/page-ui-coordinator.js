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
  discoverWeatherPageWidgets,
  getDefaultPageIcon,
  isMediaPageExperienceActive,
  isMediaPlayersPage,
  PAGE_TYPES,
  supportsMediaPageTheme,
} from "./page-types.js?v=media-persistence-v2";

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
    getNewPageName = () => "",
    setNewPageName = () => {},
    getNewPageIcon = () => "grid",
    setNewPageIcon = () => {},
    getDockSettingsPageId = () => "",
    setDockSettingsPageId = () => {},
    setSettingsPage = () => {},
    getIsEditing = () => false,
    getThemeStyle = () => "oneui",
    getDockPosition = () => "left",
    getHass = () => null,
    getEntityVisibilityConfig = () => null,
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
    syncActivePageBackdrop = () => {},
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
    this.getNewPageName = (...args) => getNewPageName(...args);
    this.setNewPageName = (...args) => setNewPageName(...args);
    this.getNewPageIcon = (...args) => getNewPageIcon(...args);
    this.setNewPageIcon = (...args) => setNewPageIcon(...args);
    this.getDockSettingsPageId = (...args) => getDockSettingsPageId(...args);
    this.setDockSettingsPageId = (...args) => setDockSettingsPageId(...args);
    this.setSettingsPage = (...args) => setSettingsPage(...args);
    this.getIsEditing = (...args) => getIsEditing(...args);
    this.getThemeStyle = (...args) => getThemeStyle(...args);
    this.getDockPosition = (...args) => getDockPosition(...args);
    this.getHass = (...args) => getHass(...args);
    this.getEntityVisibilityConfig = (...args) => getEntityVisibilityConfig(...args);
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
    this.syncActivePageBackdrop = (...args) => syncActivePageBackdrop(...args);
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
    const activePage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
    const isMediaPage = isMediaPageExperienceActive(activePage, themeStyle);
    return this.createDockPropsFn({
      ...this.buildDockStatePropsFn({
        pages: this.getPages(),
        activePageId: this.getActivePageId(),
        isEditing: this.getIsEditing() && !isMediaPage,
      }),
      themeStyle,
      dockPosition: this.getDockPosition(),
      usesDock: dockDefinition.usesDock,
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
      themeStyle: this.getThemeStyle(),
      selectedPageType: this.getNewPageType() || PAGE_TYPES.GRID,
      pageName: this.getNewPageName(),
      pageIcon: this.getNewPageIcon(),
      onClose: () => this.closePageCreator(),
      onSelectPageType: (type) => this.setPageCreatorType(type),
      onPageNameChange: (name) => this.setPageCreatorName(name),
      onPageIconChange: (icon) => this.setPageCreatorIcon(icon),
      onCreate: () => this.createPageFromCreator(),
    });
  }

  syncPageCreator() {
    this.syncPageCreatorPanelFn(this.getRoot(), this.buildPageCreatorProps());
  }

  pageNeedsFullRender(page = null) {
    return isMediaPageExperienceActive(page, this.getThemeStyle());
  }

  shouldUseFullRenderForPageTransition(previousPage, nextPage) {
    return this.pageNeedsFullRender(previousPage) || this.pageNeedsFullRender(nextPage);
  }

  refreshAfterActivePageChange(previousPage, nextPage) {
    this.syncActivePageBackdrop(nextPage);
    if (
      previousPage?.id
      && nextPage?.id
      && previousPage.id !== nextPage.id
      && this.shouldUseFullRenderForPageTransition(previousPage, nextPage)
    ) {
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
    this.refreshAfterActivePageChange(previousPage, nextPage);
    this.syncDocks();
    return true;
  }

  addPage({ icon = "grid", name = "", pageType = PAGE_TYPES.GRID, pageConfig = {}, initialWidgets = [] } = {}) {
    const previousPage = this.getPages().find(page => page.id === this.getActivePageId()) || null;
    const result = addPage(this.getPages(), {
      icon,
      name,
      pageType,
      pageConfig,
      initialWidgets,
      normalizeWidget: this.normalizeWidget,
    });

    this.setPages(result.pages);
    this.setActivePageId(result.activePageId);
    this.setWidgets(result.page?.widgets || []);
    this.setPageCreatorOpen(false);
    this.setNewPageType(PAGE_TYPES.GRID);
    this.setNewPageName("");
    this.setNewPageIcon("grid");
    this.savePages();
    this.syncDocks();
    this.syncPageCreator();
    this.refreshAfterActivePageChange(previousPage, result.page);
    return true;
  }

  openPageCreator() {
    if (!this.getIsEditing()) return false;
    this.setPageCreatorOpen(true);
    const type = this.getNewPageType() || PAGE_TYPES.GRID;
    this.setNewPageType(type);
    if (!this.getNewPageIcon()) this.setNewPageIcon(getDefaultPageIcon(type));
    this.syncPageCreator();
    return true;
  }

  closePageCreator() {
    this.setPageCreatorOpen(false);
    this.syncPageCreator();
    return true;
  }

  setPageCreatorName(name = "") {
    this.setNewPageName(String(name || ""));
    return true;
  }

  setPageCreatorIcon(icon = "grid") {
    this.setNewPageIcon(String(icon || "grid"));
    return true;
  }

  setPageCreatorType(type = PAGE_TYPES.GRID) {
    const nextType = !supportsMediaPageTheme(this.getThemeStyle()) && type === PAGE_TYPES.MEDIA_PLAYERS
      ? PAGE_TYPES.GRID
      : (type || PAGE_TYPES.GRID);
    const nextIcon = getDefaultPageIcon(nextType);
    this.setNewPageType(nextType);
    this.setNewPageIcon(nextIcon);
    this.updatePageCreatorTypeSelectionFn(this.getRoot(), nextType, nextIcon);
    return true;
  }

  async createWeatherPageFromCreator() {
    if (!this.getIsEditing()) return false;
    const weatherSeed = await discoverWeatherPageWidgets({
      hass: this.getHass(),
      visibilityConfig: this.getEntityVisibilityConfig(),
      pageId: `weather-${Date.now().toString(36)}`,
    });
    if (!this.getIsEditing()) return false;
    return this.addPage({
      pageType: PAGE_TYPES.WEATHER,
      icon: this.getNewPageIcon() && this.getNewPageIcon() !== "grid"
        ? this.getNewPageIcon()
        : getDefaultPageIcon(PAGE_TYPES.WEATHER),
      name: this.getNewPageName(),
      pageConfig: weatherSeed.config,
      initialWidgets: weatherSeed.widgets,
    });
  }

  createPageFromCreator() {
    if (!this.getIsEditing()) return false;
    const requestedPageType = this.getNewPageType() || PAGE_TYPES.GRID;
    const pageType = requestedPageType === PAGE_TYPES.MEDIA_PLAYERS
      && !supportsMediaPageTheme(this.getThemeStyle())
      ? PAGE_TYPES.GRID
      : requestedPageType;
    if (pageType === PAGE_TYPES.WEATHER) {
      return this.createWeatherPageFromCreator();
    }
    return this.addPage({
      pageType,
      name: this.getNewPageName(),
      icon: this.getNewPageIcon() && (pageType === PAGE_TYPES.GRID || this.getNewPageIcon() !== "grid")
        ? this.getNewPageIcon()
        : getDefaultPageIcon(pageType),
      pageConfig: createDefaultPageConfig(pageType),
      initialWidgets: [],
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
