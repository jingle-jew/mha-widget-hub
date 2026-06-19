import {
  readJson,
  writeJson,
  writeStorageValue,
} from "./src/core/storage.js?v=storage-v1";
import {
  createCriticalBootStyle,
} from "./src/core/mha-frontend-assets.js?v=phase1";
import {
  ACTIVE_PAGE,
  HIDE_HA_SIDEBAR,
  PAGES,
  POSITIONS,
  clearGridStorage,
  getStoredDockPosition,
  getStoredHideHaSidebar,
  getStoredLanguageSetting,
} from "./src/core/mha-persistence.js?v=phase1";
import {
  getHubActivePage,
  migrateHubPageStorage,
  normalizeHubPage,
  readActivePageWidgets,
  readHubActivePageId,
  readHubPages,
  saveHubPages,
  syncActivePageWidgets,
} from "./src/core/mha-state.js?v=phase2";
import {destroyDomSubtree} from "./src/core/dom-lifecycle.js";
import { createBootLifecycleCoordinator } from "./src/core/boot-lifecycle-coordinator.js";
import {ICONS} from "./src/components/icons.js";
import { createRenderPipeline } from "./src/layout/render-pipeline.js";
import { createResponsiveDockCoordinator } from "./src/layout/responsive-dock-coordinator.js";
import { createPageUiCoordinator } from "./src/pages/page-ui-coordinator.js?v=phase10";
import { createI18nSettingsSync } from "./src/settings/i18n-settings-sync.js";
import { createWidgetFlowCoordinator } from "./src/widgets/widget-flow-coordinator.js";
import {
  createThemeController,
} from "./src/settings/theme-controller.js";
import { createAppearanceCoordinator } from "./src/settings/appearance-coordinator.js";
import { createWallpaperController } from "./src/settings/wallpaper-controller.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import { normalizeStoredWidgetContract } from "./src/widgets/widget-storage.js?v=phase1";
import {updateClockWidgets} from "./src/widgets/clock-widget.js";
import { syncDropSlotRenderer } from "./src/widgets/drop-slot-renderer.js";
import { createScreensaverSettingsBridge } from "./src/screensaver/screensaver-settings-bridge.js";
import { createWidgetLayoutStateCoordinator } from "./src/widgets/widget-layout-state-coordinator.js";
import { createWidgetResizeCoordinator } from "./src/widgets/widget-resize-coordinator.js";
import { createWidgetSurfaceCoordinator } from "./src/widgets/widget-surface-coordinator.js";
import {DEFAULT_WIDGETS,getActiveGridRows,getActiveGridUnits,getEffectiveLayout,getLayoutMode,getGridPreset,normalizeWidgetForKind} from "./src/layout/layout-engine.js";
import { isPositionMapValidForWidgets } from "./src/layout/placement-geometry.js";
import {
  doesWidgetLayoutFitGrid,
  getAvailableDropSlotsForCandidate,
} from "./src/layout/placement-calculations.js";
import { createPlacementController } from "./src/layout/placement-controller.js";
import { createGridRuntime } from "./src/layout/grid-runtime.js";
import {normalizeClockVariant,updateScreensaverClock} from "./src/screensaver/screensaver.js";
import { createScreensaverController } from "./src/screensaver/screensaver-controller.js";
import { createScreensaverCoordinator } from "./src/screensaver/screensaver-coordinator.js?v=phase9";
import { loadEntityVisibilityConfig } from "./src/admin/entity-visibility-store.js";
import { normalizeEntityVisibilityConfig } from "./src/admin/entity-permissions.js";
import { getStyleManifest } from "./src/styles/style-manifest.js";

const MHA_FRONTEND_ROOT_URL = new URL(".", import.meta.url);
const MHA_FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");

const MHA_STYLE_MANIFEST = getStyleManifest();
function getRenderPipelineForHost(host){
  if(!host._renderPipeline){
    host._renderPipeline=createRenderPipeline(host,{
      frontendRootUrl:MHA_FRONTEND_ROOT_URL,
      frontendVersion:MHA_FRONTEND_VERSION,
      styleManifest:MHA_STYLE_MANIFEST,
    });
  }
  return host._renderPipeline;
}
function getWidgetFlowCoordinatorForHost(host){
  if(!host._widgetFlowCoordinator){
    host._widgetFlowCoordinator=createWidgetFlowCoordinator({
      getRoot:()=>host.shadowRoot,
      getIsEditing:()=>host._isEditing,
      isMobileLandscapeLayout:()=>host._isMobileLandscapeLayout(),
      getWidgetManagerOpen:()=>host._widgetManagerOpen,
      setWidgetManagerOpen:(open)=>{host._widgetManagerOpen=open;},
      getWidgetManagerCategory:()=>host._widgetManagerCategory,
      setWidgetManagerCategory:(category)=>{host._widgetManagerCategory=category;},
      getWidgetConfigSession:()=>host._widgetConfigSession,
      setWidgetConfigSession:(session)=>{host._widgetConfigSession=session;},
      getHass:()=>host._hass,
      getWidgetConfigHassReady:()=>host._widgetConfigHassReady,
      setWidgetConfigHassReady:(ready)=>{host._widgetConfigHassReady=ready;},
      getEntityVisibilityConfig:()=>host._entityVisibilityConfig,
      getPendingWidgetPlacement:()=>host._pendingWidgetPlacement,
      setPendingWidgetPlacement:(widget)=>{host._pendingWidgetPlacement=widget;},
      getActiveMoveWidgetId:()=>host._activeMoveWidgetId,
      setActiveMoveWidgetId:(id)=>{host._activeMoveWidgetId=id;},
      getWidgets:()=>host._widgets,
      setWidgets:(widgets)=>{host._widgets=widgets;},
      syncEditModeDom:()=>host._syncEditModeDom(),
      syncWidgetDropSlots:()=>host._syncWidgetDropSlots(),
      replaceWidgetDom:(id)=>host._replaceWidgetDom(id),
      saveWidgets:()=>host._saveWidgets(),
    });
  }
  return host._widgetFlowCoordinator;
}
function getBootLifecycleCoordinatorForHost(host){
  if(!host._bootLifecycleCoordinator){
    host._bootLifecycleCoordinator=createBootLifecycleCoordinator(host);
  }
  return host._bootLifecycleCoordinator;
}
function getScreensaverSettingsBridgeForHost(host){
  if(!host._screensaverSettingsBridge){
    host._screensaverSettingsBridge=createScreensaverSettingsBridge(host);
  }
  return host._screensaverSettingsBridge;
}
function getI18nSettingsSyncForHost(host){
  if(!host._i18nSettingsSync){
    host._i18nSettingsSync=createI18nSettingsSync(host);
  }
  return host._i18nSettingsSync;
}
function getResponsiveDockCoordinatorForHost(host){
  if(!host._responsiveDockCoordinator){
    host._responsiveDockCoordinator=createResponsiveDockCoordinator(host);
  }
  return host._responsiveDockCoordinator;
}
// Keeps existing local widget order/sizes after the public naming cleanup.

/*
 * FIRST LAUNCH DEFAULTS
 * These are fallback values only. Stored user choices in localStorage always win.
 *
 * Theme: auto
 * Visual style: OneUI
 * Accent: first OneUI blue / sky
 * Icon shape: auto
 * Screensaver: enabled on tablet/desktop, disabled on mobile
 * Screensaver delay: 30 seconds
 * Screensaver Now Bar: enabled
 * Screensaver clock: digital
 */
class MhaControlHub extends HTMLElement{
constructor(){
  super();
  this._themeController=createThemeController(this);
  this._wallpaperController=createWallpaperController(this,{
    getTheme:()=>this._themeController.read().theme,
    getThemeState:()=>this._themeController.read(),
  });
  this._appearanceCoordinator=createAppearanceCoordinator({
    host:this,
    getRoot:()=>this.shadowRoot,
    isConnected:()=>this.isConnected,
    getCustomWallpapers:()=>this._customWallpapers,
    setCustomWallpapers:(wallpapers)=>{this._customWallpapers=wallpapers;},
    readThemeState:()=>this._themeController.read(),
    syncTheme:()=>this._themeController.sync(),
    setTheme:(value)=>this._themeController.setTheme(value),
    setThemeStyle:(value)=>this._themeController.setThemeStyle(value),
    setIosGlass:(value)=>this._themeController.setIosGlass(value),
    setAccent:(value)=>this._themeController.setAccent(value),
    setAccentMode:(value)=>this._themeController.setAccentMode(value),
    setIconShape:(value)=>this._themeController.setIconShape(value),
    migrateLegacyWallpaper:()=>this._wallpaperController.migrateLegacy(),
    readWallpapers:()=>this._wallpaperController.read(),
    applyWallpaperState:(themeState)=>this._wallpaperController.apply(themeState),
    saveWallpaper:(mode,payload)=>this._wallpaperController.save(mode,payload),
    resetWallpaper:(mode)=>this._wallpaperController.reset(mode),
    getActiveAccentSource:(themeState,wallpapers)=>this._wallpaperController.getActiveAccentSource(themeState,wallpapers),
    syncSettingsDom:()=>this._syncSettingsDom(),
    syncScreensaverSettingsDom:()=>this._syncScreensaverSettingsDom(),
    syncDocksDom:()=>this._syncDocksDom(),
    refreshActiveGridOnly:()=>this._refreshActiveGridOnly(),
    scheduleIconSymbolRefresh:()=>this._scheduleIconSymbolRefresh(),
  });
  this._screensaverController=createScreensaverController({
    normalizeClockVariant,
    isBlocked:()=>this._isScreensaverBlocked(),
    onIdle:()=>this._setScreensaverActive(true),
  });
  this._screensaverCoordinator=createScreensaverCoordinator({
    getScreensaverState:()=>this._screensaverController.read(),
    getIsVisible:()=>this._getScreensaverVisible(),
    getHass:()=>this._hass,
    getNowBarConfig:()=>this._screensaverController.read().nowBarConfig,
    onClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
    onOpenScreensaverSettings:()=>this._openScreensaverSettings(),
    onWake:()=>this._wakeScreensaver(),
    onSyncVisibilityState:()=>this._syncScreensaverVisibilityState(),
    onCalendarEventsChange:()=>this._syncScreensaverDom(),
  });
  this._pageUiCoordinator=createPageUiCoordinator({
    getRoot:()=>this.shadowRoot,
    getPages:()=>this._pages,
    setPages:(pages)=>{this._pages=pages;},
    getActivePageId:()=>this._activePageId,
    setActivePageId:(id)=>{this._activePageId=id;},
    getWidgets:()=>this._widgets,
    setWidgets:(widgets)=>{this._widgets=widgets;},
    getWidgetPositions:()=>this._widgetPositions,
    setWidgetPositions:(positions)=>{this._widgetPositions=positions;},
    getPageCreatorOpen:()=>this._pageCreatorOpen,
    setPageCreatorOpen:(open)=>{this._pageCreatorOpen=open;},
    getNewPageIcon:()=>this._newPageIcon,
    setNewPageIcon:(icon)=>{this._newPageIcon=icon;},
    getDockSettingsPageId:()=>this._dockSettingsPageId,
    setDockSettingsPageId:(id)=>{this._dockSettingsPageId=id;},
    setSettingsPage:(page)=>{this._settingsPage=page;},
    getIsEditing:()=>this._isEditing,
    isMobileLandscapeLayout:()=>this._isMobileLandscapeLayout(),
    normalizeWidget:normalizeStoredWidgetContract,
    savePages:()=>this._savePages(),
    readWidgets:()=>this._readWidgets(),
    writeActivePage:(id)=>writeStorageValue(ACTIVE_PAGE,id),
    writeWidgetPositions:(positions)=>writeJson(POSITIONS,positions),
    recordPersistenceResult:(success)=>this._recordPersistenceResult(success),
    refreshActiveGridOnly:()=>this._refreshActiveGridOnly(),
    syncWidgetDropSlots:()=>this._syncWidgetDropSlots(),
    syncSettingsDom:()=>this._syncSettingsDom(),
    openDockSettings:()=>this._openDockSettings(),
    openSettings:()=>this._openSettings(),
    clearPlacementState:()=>{
      this._activeMoveWidgetId="";
      this._pendingWidgetPlacement=null;
      this._widgetManagerOpen=false;
      this._widgetManagerCategory="";
    },
  });
  this._widgetLayoutStateCoordinator=createWidgetLayoutStateCoordinator({
    getWidgets:()=>this._widgets,
    getWidgetPositions:()=>this._widgetPositions,
    setWidgetPositions:(positions)=>{this._widgetPositions=positions;},
    getActivePageId:()=>this._activePageId,
    getGridBounds:()=>this._getGridBounds(),
    getEffectiveLayout:()=>getEffectiveLayout(this),
    getRuntimeGridPreset:()=>this._getRuntimeGridPreset(),
    getWidgetAreaMetrics:()=>this._getWidgetAreaMetrics(),
    isMobileLayout:()=>this._isMobileLauncherLayout(),
    recordPersistenceResult:(success)=>this._recordPersistenceResult(success),
    writeWidgetPositions:(positions)=>writeJson(POSITIONS,positions),
    getRoot:()=>this.shadowRoot,
  });
  this._widgetResizeCoordinator=createWidgetResizeCoordinator({
    getResizeState:()=>this._resizeState,
    setResizeState:(state)=>{this._resizeState=state;},
    getWidgets:()=>this._widgets,
    setWidgets:(widgets)=>{this._widgets=widgets;},
    getGridMetrics:()=>this._getGridMetrics(),
    getActiveGridUnits:()=>getActiveGridUnits(this),
    doesWidgetLayoutFitGrid:(widgets)=>this._doesWidgetLayoutFitGrid(widgets),
    normalizeWidgetsToGridBounds:(widgets)=>this._normalizeWidgetsToGridBounds(widgets),
    clampWidgetSizeToGridBounds:(widget,size)=>this._clampWidgetSizeToGridBounds(widget,size),
    queryWidgetElement:(widgetId)=>this.shadowRoot?.querySelector?.(`[data-widget-id="${widgetId}"]`),
    saveWidgets:()=>this._saveWidgets(),
    scheduleSquareUnitSync:()=>this._scheduleSquareUnitSync(),
  });
  this._widgetSurfaceCoordinator=createWidgetSurfaceCoordinator({
    getRoot:()=>this.shadowRoot,
    renderRoot:()=>this.render(),
    cancelWidgetRenderFrame:()=>{
      cancelAnimationFrame(this._widgetRenderFrame);
      this._widgetRenderFrame=0;
    },
    getWidgets:()=>this._widgets,
    setWidgets:(widgets)=>{this._widgets=widgets;},
    getPendingWidgetPlacement:()=>this._pendingWidgetPlacement,
    setPendingWidgetPlacement:(widget)=>{this._pendingWidgetPlacement=widget;},
    getActiveMoveWidgetId:()=>this._activeMoveWidgetId,
    setActiveMoveWidgetId:(id)=>{this._activeMoveWidgetId=id;},
    getIsEditing:()=>this._isEditing,
    getHass:()=>this._hass,
    getEntityVisibilityConfig:()=>this._entityVisibilityConfig,
    getGridBounds:()=>this._getGridBounds(),
    getActiveWidgetPositions:(options)=>this._getActiveWidgetPositions(options),
    isPositionMapValidForWidgets:(positions,widgets,units,rowUnits)=>this._isPositionMapValidForWidgets(positions,widgets,units,rowUnits),
    normalizeWidgetsToGridBounds:(widgets)=>this._normalizeWidgetsToGridBounds(widgets),
    saveCurrentWidgetPositions:(positions)=>this._saveCurrentWidgetPositions(positions),
    saveWidgets:()=>this._saveWidgets(),
    applyWidgetPositionsToDom:(positions)=>this._applyWidgetPositionsToDom(positions),
    wireDrag:(element,widget)=>this._wireDrag(element,widget),
    renderWidgetDropSlots:(grid)=>this._renderWidgetDropSlots(grid),
    syncWidgetDropSlots:()=>this._syncWidgetDropSlots(),
    syncEditModeDom:()=>this._syncEditModeDom(),
    scheduleSquareUnitSync:()=>this._scheduleSquareUnitSync(),
    updateDockActiveState:()=>this._updateDockActiveState(),
    toggleWidgetMoveMode:(id)=>this._toggleWidgetMoveMode(id),
    moveWidgetByDirection:(id,direction)=>this._moveWidgetByDirection(id,direction),
    removeWidget:(id)=>this._removeWidget(id),
    openWidgetConfig:(id)=>this._openWidgetConfig(id),
    openScenesButtonConfig:(id,slotIndex)=>this._openScenesButtonConfig(id,slotIndex),
  });
  this._widgetFlowCoordinator=getWidgetFlowCoordinatorForHost(this);
  this._bootLifecycleCoordinator=getBootLifecycleCoordinatorForHost(this);
  this._screensaverSettingsBridge=getScreensaverSettingsBridgeForHost(this);
  this._i18nSettingsSync=getI18nSettingsSyncForHost(this);
  this._responsiveDockCoordinator=getResponsiveDockCoordinatorForHost(this);
  this._initialized=false;
  this._bootComplete=false;
  this._bootWatchdog=0;
  this._stylesReadyRenderId=0;
  this._widgetRenderFrame=0;
  this._secondaryUiFrame=0;
  this._pendingDeferredUi=null;
  this._hass=null;
  this._entityVisibilityConfig=normalizeEntityVisibilityConfig(null);
  this._entityVisibilityUserId="";
  this._hassUpdateFrame=0;
  this._hasConnectedOnce=false;
  this._connectionActive=false;
  this._connectionListenersAttached=false;
  this._lifecycleRecoveryListener=null;
  this._visibilityRecoveryListener=null;
  this._isEditing=false;
  this._activeMoveWidgetId="";
  this._widgetPositions={};
  this._draggedId="";
  this._isResizingWidget=false;
  this._resizeState=null;
  this._widgetDropSlotsFrame=0;
  this._renderId=0;
  this._readyRaf=0;
  this._viewportRaf=0;
  this._relayoutTimer=0;
  this._systemThemeListener=null;
  this._iconSymbolRefreshFrame=0;
  this._gridScrollCleanup=null;
  this._settingsOpen=false;
  this._settingsPage="main";
  this._accentPaletteExpanded=false;
  this._dockSettingsPageId="";
  this._screensaverSettingsOpen=false;
  this._lastResponsiveSignature="";
  this._responsiveRelayoutTimer=null;
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._widgetConfigSession=null;
  this._widgetConfigHassReady=false;
  this._pendingWidgetPlacement=null;
  this._pageCreatorOpen=false;
  this._newPageIcon="grid";
  this._dockPosition="left";
  this._hideHaSidebar=false;
  this._language="auto";
  this._customWallpapers={light:null,dark:null};
  this._pages=[];
  this._activePageId="";
  this._widgets=[];
  this._placementController=createPlacementController({
    getWidgets:()=>this._widgets,
    getPositions:()=>this._getActiveWidgetPositions({create:true}),
    getGridBounds:()=>this._getGridBounds(),
    isMobileLayout:()=>this._isMobileLauncherLayout(),
    canMoveWidget:id=>this._isEditing&&this._activeMoveWidgetId===id,
    savePositions:positions=>this._saveCurrentWidgetPositions(positions),
    applyPositions:positions=>this._applyWidgetPositionsToDom(positions),
    applySinglePosition:({widgetId,position,width,height})=>{
      const el=this.shadowRoot?.querySelector?.(`[data-widget-id="${widgetId}"]`);
      if(!el)return;
      el.style.gridColumn=`${position.x} / span ${width}`;
      el.style.gridRow=`${position.y} / span ${height}`;
    },
    setActiveMoveWidgetId:id=>{this._activeMoveWidgetId=id},
    refreshDropSlots:()=>{
      const grid=this.shadowRoot?.querySelector?.(".mha-grid");
      if(grid)this._renderWidgetDropSlots(grid);
    },
    syncEditMode:()=>this._syncEditModeDom(),
    scheduleLayoutSync:()=>this._scheduleSquareUnitSync(),
    syncDropSlots:()=>this._syncWidgetDropSlots(),
  });
  this._gridRuntime=createGridRuntime({
    host:this,
    getLayoutMode,
    getEffectiveLayout,
    getGridPreset,
    getDockPosition:()=>this._dockPosition,
    isMobileLayout:()=>this._isMobileLauncherLayout(),
    getWidgets:()=>this._widgets,
    getPositions:()=>this._getActiveWidgetPositions({create:true}),
    applyPositions:positions=>this._applyWidgetPositionsToDom(positions),
    syncDropSlots:()=>this._syncWidgetDropSlots(),
    setResponsiveSignature:signature=>{this._lastResponsiveSignature=signature},
  });
  this._renderPipeline=getRenderPipelineForHost(this);
}
_getRenderPipeline(){
  return getRenderPipelineForHost(this);
}
_initialize(){
  if(this._initialized)return;
  this._initialized=true;
  this.attachShadow({mode:"open"});
  this.dataset.bootState="booting";
  this.dataset.dataState=this._hass?"ready":"loading";
  this.dataset.widgetsState="pending";
  this.dataset.ready="false";
  this.shadowRoot.innerHTML=createCriticalBootStyle();
  this._migrateStorageSchema();
  this._widgetPositions=readJson(POSITIONS,{})||{};
  this._screensaverController.load({
    enabledFallback: !this._isMobileDefaultLayout(),
  });
  this._dockPosition=getStoredDockPosition();
  this._hideHaSidebar=getStoredHideHaSidebar();
  this._language=getStoredLanguageSetting();
  this._configureI18n();
  this._applyHaSidebarMode(this._hideHaSidebar);
  this._migrateLegacyCustomWallpaper();
  this._customWallpapers=this._readCustomWallpapers();
  this._applyCustomWallpaperState();
  this._syncAutoAccentFromWallpaper();
  this._pages=this._readPages();
  this._activePageId=this._readActivePageId();
  this._widgets=this._readWidgets();
  this._upgradePredefinedProperty("hass");
}
_upgradePredefinedProperty(name){
  if(!Object.prototype.hasOwnProperty.call(this,name))return;
  const value=this[name];
  delete this[name];
  this[name]=value;
}
set hass(h){
  this._hass=h;
  this._configureI18n();
  this._loadEntityVisibilityConfig(h);
  this.dataset.dataState=h?"ready":"loading";
  if(this._widgetConfigSession&&h&&!this._widgetConfigHassReady){
    this._widgetConfigHassReady=true;
    this._syncWidgetConfigDom();
  }
  this._ensureMounted({reason:"hass update"});
  this._scheduleHassUpdate();
}
get hass(){return this._hass}
_configureI18n(){
  return getI18nSettingsSyncForHost(this).configure();
}
async _loadEntityVisibilityConfig(hass){
  const userId=String(hass?.user?.id||"");
  if(!userId||userId===this._entityVisibilityUserId)return;
  this._entityVisibilityUserId=userId;
  try{
    const config=await loadEntityVisibilityConfig(hass);
    if(this._entityVisibilityUserId!==userId)return;
    this._entityVisibilityConfig=config;
    if(this._widgetConfigSession)this._syncWidgetConfigDom();
    this._syncSettingsDom();
    this._syncScreensaverSettingsDom();
    if(this.isConnected)this._refreshActiveGridOnly();
  }catch(error){
    console.warn("[MHA] Entity visibility configuration could not be loaded.",error);
  }
}
_hasMountedApp(){
  return getBootLifecycleCoordinatorForHost(this).hasMountedApp();
}
_ensureMounted({force=false,reason="lifecycle recovery"}={}){
  return getBootLifecycleCoordinatorForHost(this).ensureMounted({force,reason});
}
_addConnectionListeners(){
  return getBootLifecycleCoordinatorForHost(this).addConnectionListeners();
}
_removeConnectionListeners(){
  return getBootLifecycleCoordinatorForHost(this).removeConnectionListeners();
}
_scheduleHassUpdate(){
  return getBootLifecycleCoordinatorForHost(this).scheduleHassUpdate();
}
updateFromHass(){
  return getBootLifecycleCoordinatorForHost(this).updateFromHass();
}
_finishBoot({fallback=false,reason=""}={}){
  return getBootLifecycleCoordinatorForHost(this).finishBoot({fallback,reason});
}
_startBootWatchdog(){
  return getBootLifecycleCoordinatorForHost(this).startBootWatchdog();
}
_markReadyAfterPaint(renderId=this._renderId){
  return getBootLifecycleCoordinatorForHost(this).markReadyAfterPaint(renderId);
}
_tryCompleteBoot(){
  return getBootLifecycleCoordinatorForHost(this).tryCompleteBoot();
}
connectedCallback(){
  return getBootLifecycleCoordinatorForHost(this).connectedCallback();
}
disconnectedCallback(){
  return getBootLifecycleCoordinatorForHost(this).disconnectedCallback();
}
requestRender(){this.render()}
_syncEditModeDom(){
  if(!this._isEditing||this._isMobileLandscapeLayout()){
    const hadWidgetConfig=Boolean(this._widgetConfigSession);
    const preserveScenesSlotConfig=Boolean(
      this._widgetConfigSession
      &&this._widgetConfigSession.configType==="scenes"
      &&Number.isInteger(this._widgetConfigSession.buttonIndex)
      &&!this._isMobileLandscapeLayout()
    );
    this._activeMoveWidgetId="";
    this._pendingWidgetPlacement=null;
    this._widgetManagerOpen=false;
    this._widgetManagerCategory="";
    this._widgetConfigSession=preserveScenesSlotConfig?this._widgetConfigSession:null;
    this._pageCreatorOpen=false;
    const grid=this.shadowRoot?.querySelector?.(".mha-grid");
    if(grid)this._renderWidgetDropSlots(grid);
    this._syncPageCreatorDom?.();
    if(hadWidgetConfig)this._syncWidgetConfigDom?.();
  }
  this.classList.toggle("is-editing",this._isEditing);
  this.classList.toggle("is-placing-widget",Boolean(this._pendingWidgetPlacement));
  this.dataset.editing=String(this._isEditing);
  if(this._isEditing)this.classList.remove("is-mobile-floating-controls-hidden","is-dock-hidden");
  const edit=this.shadowRoot.querySelector(".mha-primary-edit-button");
  if(edit)edit.innerHTML=this._getEditButtonIcon();
  const add=this.shadowRoot.querySelector(".mha-add-widget-button");
  if(add)add.hidden=!this._isEditing||this._isMobileLandscapeLayout();
  this.shadowRoot.querySelectorAll(".mha-widget").forEach(el=>{
    el.draggable=false;el.removeAttribute("draggable");
    el.classList.toggle("is-editing",this._isEditing);
    const active=this._isEditing&&el.dataset.widgetId===this._activeMoveWidgetId;
    el.classList.toggle("is-move-target",active);
    el.querySelector('[data-action="move"]')?.setAttribute("aria-pressed",String(active));
  });
}
_openSettings(page="main"){
  return getI18nSettingsSyncForHost(this).openSettings(page);
}
_closeSettings(){
  return getI18nSettingsSyncForHost(this).closeSettings();
}
_syncSettingsModalState(){
  return getI18nSettingsSyncForHost(this).syncSettingsModalState();
}
_syncSettingsDom(){
  return getI18nSettingsSyncForHost(this).syncSettingsDom();
}
_getSettingsPanelsProps(){
  return getScreensaverSettingsBridgeForHost(this).getSettingsPanelsProps();
}

_migrateLegacyCustomWallpaper(){
  return this._appearanceCoordinator.migrateLegacyCustomWallpaper();
}
_readCustomWallpapers(){
  return this._appearanceCoordinator.readCustomWallpapers();
}
_applyCustomWallpaperState(themeState=this._themeController.read()){
  return this._appearanceCoordinator.applyCustomWallpaperState(themeState);
}
_saveCustomWallpaper(mode,payload){
  return this._appearanceCoordinator.saveCustomWallpaper(mode,payload);
}
_resetCustomWallpaper(mode){
  return this._appearanceCoordinator.resetCustomWallpaper(mode);
}
async _syncAutoAccentFromWallpaper(){
  return this._appearanceCoordinator.syncAutoAccentFromWallpaper();
}
_getEditButtonIcon(editing=this._isEditing){
  return editing?ICONS.close:ICONS.edit;
}
_getWidgetManagerCategories(){
  return getWidgetFlowCoordinatorForHost(this).getWidgetManagerCategories();
}
_updateStatusDom(){
  updateStatusTime(this.shadowRoot);
}
_updateClockWidgets(){
  updateClockWidgets(this.shadowRoot);
}
_updateScreensaverClockVariant(variant){
  updateScreensaverClock(this.shadowRoot,variant);
}
_destroyDomRoot(){
  destroyDomSubtree(this.shadowRoot);
}
_isMobileLandscapeLayout(){
  return getResponsiveDockCoordinatorForHost(this).isMobileLandscapeLayout();
}
_syncWidgetManagerDom(){
  return getWidgetFlowCoordinatorForHost(this).syncWidgetManagerDom();
}
_openWidgetManager(){
  return getWidgetFlowCoordinatorForHost(this).openWidgetManager();
}
_closeWidgetManager(){
  return getWidgetFlowCoordinatorForHost(this).closeWidgetManager();
}
_showWidgetManagerCategories(){
  return getWidgetFlowCoordinatorForHost(this).showWidgetManagerCategories();
}
_selectWidgetManagerCategory(id){
  return getWidgetFlowCoordinatorForHost(this).selectWidgetManagerCategory(id);
}
_beginWidgetPlacement(item){
  return getWidgetFlowCoordinatorForHost(this).beginWidgetPlacement(item);
}
_startWidgetPlacement(widget){
  return getWidgetFlowCoordinatorForHost(this).startWidgetPlacement(widget);
}
_syncWidgetConfigDom(){
  return getWidgetFlowCoordinatorForHost(this).syncWidgetConfigDom();
}
_closeWidgetConfig(){
  return getWidgetFlowCoordinatorForHost(this).closeWidgetConfig();
}
_saveWidgetConfig(){
  return getWidgetFlowCoordinatorForHost(this).saveWidgetConfig();
}
_openWidgetConfig(id){
  return getWidgetFlowCoordinatorForHost(this).openWidgetConfig(id);
}
_getScenesDefaultButtonIndex(widget){
  return getWidgetFlowCoordinatorForHost(this).getDefaultScenesButtonIndex(widget);
}
_openScenesButtonConfig(id,buttonIndex){
  return getWidgetFlowCoordinatorForHost(this).openScenesButtonConfig(id,buttonIndex);
}
_openScreensaverSettings(){
  return getScreensaverSettingsBridgeForHost(this).openScreensaverSettings();
}
_closeScreensaverSettings(){
  return getScreensaverSettingsBridgeForHost(this).closeScreensaverSettings();
}
_syncScreensaverSettingsDom(){
  return getScreensaverSettingsBridgeForHost(this).syncScreensaverSettingsDom();
}

_applyDockPositionFromSettings(position="left"){
  return getResponsiveDockCoordinatorForHost(this).applyDockPositionFromSettings(position);
}
_applyHaSidebarMode(enabled=false){
  const shouldHide=Boolean(enabled);
  document.documentElement.classList.toggle("mha-hide-ha-sidebar",shouldHide);
  window.dispatchEvent(new CustomEvent("hass-kiosk-mode",{
    detail:{enable:shouldHide},
  }));
  window.dispatchEvent(new CustomEvent("hass-dock-sidebar",{
    detail:{dock:shouldHide?"always_hidden":"docked"},
  }));
}
_applyHideHaSidebarFromSettings(enabled=false){
  const shouldHide=Boolean(enabled);
  this._hideHaSidebar=shouldHide;
  this._recordPersistenceResult(writeStorageValue(HIDE_HA_SIDEBAR,shouldHide));
  this._applyHaSidebarMode(shouldHide);
  this._syncSettingsDom();
}
_openDockSettings(){
  this._settingsOpen=true;
  this._settingsPage="dock";
  this._dockSettingsPageId="";
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_openWallpaperSettings(){
  this._settingsOpen=true;
  this._settingsPage="wallpaper";
  this._dockSettingsPageId="";
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_openNowBarSettings(){
  this._settingsOpen=true;
  this._settingsPage="screensaver-nowbar";
  this._dockSettingsPageId="";
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_openDockPageSettings(id=""){
  if(!this._pages.some(page=>page.id===id))return;
  this._settingsOpen=true;
  this._settingsPage="dock-detail";
  this._dockSettingsPageId=id;
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_moveDockPage(id="",direction=0){
  return this._pageUiCoordinator.moveDockPage(id,direction);
}
_renameDockPage(id="",name=""){
  return this._pageUiCoordinator.renameDockPage(id,name);
}
_changeDockPageIcon(id="",icon="grid"){
  return this._pageUiCoordinator.changeDockPageIcon(id,icon);
}
_deleteDockPage(id=""){
  return this._pageUiCoordinator.deleteDockPage(id);
}

/*
 * THEME SYSTEM APPLY METHODS — IMPORTANT
 *
 * These methods are the bridge between the settings UI and the live theme
 * system. The settings panel calls them directly when the user changes:
 * theme mode, visual style, accent color, or icon shape.
 *
 * If these methods are removed, the settings UI may still render and receive
 * clicks, but theme changes will fail at runtime with errors like:
 * `this._applyAccentFromSettings is not a function`.
 *
 * Keep this block together when cleaning/refactoring the theme system.
 */

_scheduleIconSymbolRefresh(){
  cancelAnimationFrame(this._iconSymbolRefreshFrame);
  this._iconSymbolRefreshFrame=requestAnimationFrame(()=>{
    if(!this.isConnected||!this.shadowRoot)return;
    const symbols=[...this.shadowRoot.querySelectorAll(".mha-icon-symbol")];
    for(const symbol of symbols){
      // Force the browser to repaint SVG glyphs after theme token changes.
      symbol.style.transform="translateZ(0)";
      symbol.getBoundingClientRect();
      symbol.style.transform="";
    }
    this._iconSymbolRefreshFrame=0;
  });
}

_applyLanguageFromSettings(value="auto"){
  return getI18nSettingsSyncForHost(this).applyLanguageFromSettings(value);
}

_refreshAppearanceDom(){
  return this._appearanceCoordinator.refreshAppearanceDom();
}

_scheduleAppearanceDomRefresh(){
  return this._appearanceCoordinator.scheduleAppearanceDomRefresh();
}

_applyThemeFromSettings(value="auto"){
  return this._appearanceCoordinator.applyThemeFromSettings(value);
}

_transitionSystemThemeChange(){
  return this._appearanceCoordinator.transitionSystemThemeChange();
}

_applyThemeStyleFromSettings(value="oneui"){
  return this._appearanceCoordinator.applyThemeStyleFromSettings(value);
}

_applyIosGlassFromSettings(value="liquid"){
  return this._appearanceCoordinator.applyIosGlassFromSettings(value);
}

_applyAccentFromSettings(value=""){
  return this._appearanceCoordinator.applyAccentFromSettings(value);
}

_applyAccentModeFromSettings(value="manual"){
  return this._appearanceCoordinator.applyAccentModeFromSettings(value);
}

_applyIconShapeFromSettings(value="auto"){
  return this._appearanceCoordinator.applyIconShapeFromSettings(value);
}
_setAccentPaletteExpanded(expanded=false){
  this._accentPaletteExpanded=Boolean(expanded);
  this._syncSettingsDom();
}

_isScreensaverBlocked(){
  return getScreensaverSettingsBridgeForHost(this).isBlocked();
}
_getScreensaverVisible(){
  return getScreensaverSettingsBridgeForHost(this).getVisible();
}
_setScreensaverActive(active=false){
  return getScreensaverSettingsBridgeForHost(this).setActive(active);
}
_scheduleScreensaverIdleTimer(){
  return getScreensaverSettingsBridgeForHost(this).scheduleIdleTimer();
}
_handleUserActivity(){
  return getScreensaverSettingsBridgeForHost(this).handleUserActivity();
}
_applyScreensaverEnabledFromSettings(enabled=false){
  return getScreensaverSettingsBridgeForHost(this).applyEnabledFromSettings(enabled);
}
_applyScreensaverDelayFromSettings(delay=30000){
  return getScreensaverSettingsBridgeForHost(this).applyDelayFromSettings(delay);
}
_applyScreensaverPreviewFromSettings(enabled=false){
  return getScreensaverSettingsBridgeForHost(this).applyPreviewFromSettings(enabled);
}
_applyScreensaverNowBarFromSettings(enabled=true){
  return getScreensaverSettingsBridgeForHost(this).applyNowBarFromSettings(enabled);
}
_applyScreensaverNowBarItemFromSettings(item="",enabled=true){
  return getScreensaverSettingsBridgeForHost(this).applyNowBarItemFromSettings(item,enabled);
}
_applyScreensaverNowBarTileEnabledFromSettings(tile="",enabled=true){
  return getScreensaverSettingsBridgeForHost(this).applyNowBarTileEnabledFromSettings(tile,enabled);
}
_applyScreensaverNowBarEntitySelectionFromSettings(section="",entityId="",selected=true){
  return getScreensaverSettingsBridgeForHost(this).applyNowBarEntitySelectionFromSettings(section,entityId,selected);
}
_applyScreensaverNowBarNowItemFromSettings(item="",selected=true){
  return getScreensaverSettingsBridgeForHost(this).applyNowBarNowItemFromSettings(item,selected);
}
_applyScreensaverClockVariantFromSettings(variant="digital"){
  return getScreensaverSettingsBridgeForHost(this).applyClockVariantFromSettings(variant);
}
_syncScreensaverVisibilityState(){
  return getScreensaverSettingsBridgeForHost(this).syncVisibilityState();
}
_syncScreensaverDom({force=false}={}){
  return getScreensaverSettingsBridgeForHost(this).syncDom({force});
}
toggleEditMode(){
  if(!this._isEditing&&this._isMobileLandscapeLayout())return;
  const wasEditing=this._isEditing;
  this._isEditing=!this._isEditing;

  if(!this._isEditing){
    this._activeMoveWidgetId="";this._pendingWidgetPlacement=null;this._widgetManagerOpen=false;this._widgetManagerCategory="";
    const grid=this.shadowRoot?.querySelector?.(".mha-grid");
    if(grid)this._renderWidgetDropSlots(grid);
  }

  this._syncEditModeDom();
  this._syncDocksDom();
  this._syncWidgetDropSlots();

  if(wasEditing!==this._isEditing)this._scheduleSquareUnitSync();
}toggleScreensaverPreview(){const state=this._screensaverController.read();this._screensaverController.setPreviewState(!state.preview);this._syncScreensaverDom()}toggleNowBarPreview(){const state=this._screensaverController.read();this._screensaverController.setNowBarState(!state.nowBar);this._syncScreensaverDom()}setScreensaverClockVariant(v="digital"){this._screensaverController.setClockVariantState(v);this._syncScreensaverDom()}resetGrid(){clearGridStorage();this._widgetPositions={};this._activeMoveWidgetId="";this._pages=this._readPages();this._activePageId=this._readActivePageId();this._widgets=this._readWidgets();this.render()}
_migrateStorageSchema(){
  const result=migrateHubPageStorage({
    defaultWidgets:DEFAULT_WIDGETS,
    normalizeWidget:normalizeStoredWidgetContract,
    normalizeWidgetForGrid:normalizeWidgetForKind,
  });
  if(result.migrated)this._recordPersistenceResult(result.success);
}
_normalizePage(page={},index=0){
  return normalizeHubPage(page,index,{normalizeWidget:normalizeStoredWidgetContract});
}
_readPages(){
  const result=readHubPages({normalizeWidget:normalizeStoredWidgetContract});
  if(result.persistenceResult!==null)this._recordPersistenceResult(result.persistenceResult);
  return result.pages;
}
_readActivePageId(){
  const result=readHubActivePageId(this._pages);
  if(result.persistenceResult!==null)this._recordPersistenceResult(result.persistenceResult);
  return result.activePageId;
}
_getActivePage(){
  return getHubActivePage(this._pages,this._activePageId);
}
_recordPersistenceResult(success){
  this.dataset.persistenceState=success?"saved":"error";
  return success;
}
_savePages(){
  return this._recordPersistenceResult(saveHubPages(
    this._pages,
    this._activePageId,
    {normalizeWidget:normalizeStoredWidgetContract},
  ));
}
_readWidgets(){
  return readActivePageWidgets({
    pages:this._pages,
    activePageId:this._activePageId,
    normalizeWidget:normalizeStoredWidgetContract,
    normalizeWidgetForGrid:normalizeWidgetForKind,
  });
}
_syncActivePageWidgets(){
  const success=syncActivePageWidgets({
    pages:this._pages,
    activePageId:this._activePageId,
    widgets:this._widgets,
    normalizeWidget:normalizeStoredWidgetContract,
  });
  return success?this._recordPersistenceResult(success):false;
}
_setActivePage(id){
  return this._pageUiCoordinator.selectPage(id);
}

_addGridPage({icon="grid"}={}){
  return this._pageUiCoordinator.addGridPage({icon});
}
_openPageCreator(){
  return this._pageUiCoordinator.openPageCreator();
}
_closePageCreator(){
  return this._pageUiCoordinator.closePageCreator();
}
_setPageCreatorIcon(icon="grid"){
  return this._pageUiCoordinator.setPageCreatorIcon(icon);
}
_createPageFromCreator(){
  return this._pageUiCoordinator.createPageFromCreator();
}
_syncPageCreatorDom(){
  return this._pageUiCoordinator.syncPageCreator();
}

_updateDockActiveState(){
  return getResponsiveDockCoordinatorForHost(this).updateDockActiveState();
}
_getDockProps(){
  return this._pageUiCoordinator.buildDockProps();
}
_syncDocksDom(){
  return getResponsiveDockCoordinatorForHost(this).syncDocksDom();
}
_refreshActiveGridOnly(){
  return this._widgetSurfaceCoordinator.refreshActiveGridOnly();
}
_getWidgetShellProps(widget,{units,position,widgetId=widget?.id||""}={}){
  return this._widgetSurfaceCoordinator.buildWidgetShellProps(widget,{units,position,widgetId});
}

_saveWidgets(){
  /*
   * Persistence is independent from the legacy auto-pack validator.
   *
   * The current grid uses explicit ghost-slot positions. Placement is validated
   * before this method by the position-map validator, while resize/move paths
   * validate their own candidate state before calling save.
   *
   * mha-grid-pages is the single source of truth after schema migration.
   * Legacy order/size/custom-widget keys remain readable for one-time import,
   * but runtime saves must not mirror only the active page back into them.
   */
  this._widgets=this._normalizeWidgetsToGridBounds(this._widgets.map(normalizeStoredWidgetContract));

  return this._syncActivePageWidgets();
}
_removeWidget(id){
  if(!this._widgets.some(w=>w.id===id))return;
  if(this._activeMoveWidgetId===id)this._activeMoveWidgetId="";
  this._widgets=this._widgets.filter(w=>w.id!==id);
  Object.values(this._widgetPositions).forEach(layout=>{
    if(layout&&typeof layout==="object")delete layout[id];
  });
  const positionsSaved=writeJson(POSITIONS,this._widgetPositions);
  const widgetsSaved=this._saveWidgets();
  this._recordPersistenceResult(positionsSaved&&widgetsSaved);
  this._clearDropState();
  this._refreshActiveGridOnly();
}

_isResizeHandleEvent(event){
  return Boolean(event?.target?.closest?.(
    ".mha-widget-resize, .mha-widget-resize-handle, .mha-resize-handle, [data-resize-handle='true']"
  ));
}

_markResizeInteraction(event){
  if(!this._isEditing||!this._isResizeHandleEvent(event))return;
  this._isResizingWidget=true;
  const widget=event.target.closest?.(".mha-widget");
  if(widget)widget.dataset.resizing="true";
  /*
   * Stop bubbling toward widget drag/drop, but do NOT preventDefault here.
   * The resize logic itself still needs the original pointer/touch event.
   */
  event.stopPropagation?.();
}

_clearResizeInteraction(){
  this._isResizingWidget=false;
  this.shadowRoot?.querySelectorAll?.('.mha-widget[data-resizing="true"]').forEach(el=>{
    delete el.dataset.resizing;
  });
}

_moveWidget(sourceId,targetId,placement="before"){
  if(!sourceId||!targetId||sourceId===targetId)return;
  const si=this._widgets.findIndex(w=>w.id===sourceId),ti=this._widgets.findIndex(w=>w.id===targetId);
  if(si<0||ti<0)return;
  const next=[...this._widgets];
  const [moved]=next.splice(si,1);
  const ati=next.findIndex(w=>w.id===targetId);
  next.splice(placement==="after"?ati+1:ati,0,moved);
  const normalized=this._normalizeWidgetsToGridBounds(next);if(!this._doesWidgetLayoutFitGrid(normalized))return;this._widgets=normalized;
  this._clearCurrentWidgetPositions();
  this._saveWidgets();
  this._moveWidgetDom(sourceId,targetId,placement);
}
_moveWidgetDom(sourceId,targetId,placement="before"){
  const grid=this.shadowRoot.querySelector(".mha-grid");
  const source=this.shadowRoot.querySelector(`[data-widget-id="${sourceId}"]`);
  const target=this.shadowRoot.querySelector(`[data-widget-id="${targetId}"]`);
  if(!grid||!source||!target)return;
  if(placement==="after")target.after(source);
  else target.before(source);
  this._scheduleSquareUnitSync();
}
_getWidgetPositionKey(){
  return this._widgetLayoutStateCoordinator.getPositionKey();
}
_getStoredWidgetPositions(){
  return this._widgetLayoutStateCoordinator.readStoredPositions();
}
_saveCurrentWidgetPositions(positions){
  return this._widgetLayoutStateCoordinator.saveCurrentPositions(positions);
}
_applyWidgetPositionsToDom(positions){
  this._widgetLayoutStateCoordinator.applyPositionsToDom(positions);
}
_clearCurrentWidgetPositions(){
  this._widgetLayoutStateCoordinator.clearCurrentPositions();
}
_packWidgetsForCurrentGrid(){
  return this._widgetLayoutStateCoordinator.packWidgetsForCurrentGrid();
}
_getActiveWidgetPositions({create=false}={}){
  return this._widgetLayoutStateCoordinator.getActivePositions({create});
}
_toggleWidgetMoveMode(id){
  if(!this._isEditing||!this._widgets.some(widget=>widget.id===id))return;
  this._activeMoveWidgetId=this._activeMoveWidgetId===id?"":id;
  this._syncEditModeDom();this._syncWidgetDropSlots();
}
_isPositionMapValidForWidgets(nextPositions,widgets,units,rowUnits){
  return isPositionMapValidForWidgets(nextPositions,widgets,units,rowUnits,{
    allowUnboundedRows:this._isMobileLauncherLayout(),
  });
}
_tryTranslatedGroupSwap(id,direction,positions,units,rowUnits){
  return this._placementController.tryTranslatedGroupSwap(
    id,
    direction,
    positions,
    units,
    rowUnits,
  );
}
_tryDirectNeighborSwap(id,direction,positions,units,rowUnits){
  return this._placementController.tryDirectNeighborSwap(
    id,
    direction,
    positions,
    units,
    rowUnits,
  );
}
_getAvailableDropSlotsForCandidate(candidateWidget,positions=this._getActiveWidgetPositions({create:true}),currentPosition=null){
  const {units,rowUnits}=this._getGridBounds();
  return getAvailableDropSlotsForCandidate(
    this._widgets,
    candidateWidget,
    positions,
    currentPosition,
    units,
    rowUnits,
    {allowUnboundedRows:this._isMobileLauncherLayout()},
  );
}
_getAvailableDropSlotsForWidget(id,positions=this._getActiveWidgetPositions({create:true})){
  const widget=this._widgets.find(item=>item.id===id);
  const current=positions?.[id];
  if(!widget||!current)return [];
  return this._getAvailableDropSlotsForCandidate(widget,positions,current);
}
_renderWidgetDropSlots(grid){
  if(!grid)return;
  const positions=this._getActiveWidgetPositions({create:true});
  const placementWidget=this._pendingWidgetPlacement;
  const activeId=this._activeMoveWidgetId;
  const slots=placementWidget
    ? this._getAvailableDropSlotsForCandidate(placementWidget,positions,{x:0,y:0})
    : activeId
      ? this._getAvailableDropSlotsForWidget(activeId,positions)
      : [];
  syncDropSlotRenderer(grid,{
    editing:this._isEditing,
    mode:placementWidget?"add":activeId?"move":"none",
    slots,
    onSelectSlot:(slot)=>{
      if(this._pendingWidgetPlacement)this._placePendingWidgetAtSlot(slot.x,slot.y);
      else this._moveWidgetToDropSlot(this._activeMoveWidgetId,slot.x,slot.y);
    },
  });
}

_syncWidgetDropSlots(){
  cancelAnimationFrame(this._widgetDropSlotsFrame);
  this._widgetDropSlotsFrame=requestAnimationFrame(()=> {
    this._widgetDropSlotsFrame=0;
    const grid=this.shadowRoot?.querySelector?.(".mha-grid");
    if(grid)this._renderWidgetDropSlots(grid);
  });
}

_placePendingWidgetAtSlot(x,y){
  return this._widgetSurfaceCoordinator.placePendingWidgetAtSlot(x,y);
}
_moveWidgetToDropSlot(id,x,y){
  return this._placementController.moveToDropSlot(id,x,y);
}
_moveWidgetByDirection(id,direction){
  return this._placementController.moveByDirection(id,direction);
}
_replaceWidgetDom(id){
  return this._widgetSurfaceCoordinator.replaceWidgetDom(id);
}
cycleVariant(id){
  return this._widgetSurfaceCoordinator.cycleVariant(id);
}
_getResponsiveSignature(){
  return this._gridRuntime.getResponsiveSignature();
}
_syncRuntimeLayoutAttrs(){
  return this._gridRuntime.syncRuntimeLayoutAttrs();
}
_syncGridRuntimeMetrics(){
  return this._gridRuntime.syncGridRuntimeMetrics();
}
_handleViewportChange(){
  return getResponsiveDockCoordinatorForHost(this).handleViewportChange();
}

_clearGridScrollListener(){
  return getResponsiveDockCoordinatorForHost(this).clearGridScrollListener();
}
// Mobile floating controls move out of the way on downward portrait scroll.
_wireDockAutoHide(grid){
  return getResponsiveDockCoordinatorForHost(this).wireDockAutoHide(grid);
}
_scheduleSquareUnitSync(){
  return this._gridRuntime.scheduleSquareUnitSync();
}
_scheduleGridRuntimeSync(){
  return this._gridRuntime.scheduleGridRuntimeSync();
}
_disconnectLayoutResizeObserver(){
  return this._gridRuntime.disconnectLayoutResizeObserver();
}
_observeLayoutSize(){
  return this._gridRuntime.observeLayoutSize();
}
_getWidgetAreaMetrics(){
  return this._gridRuntime.getWidgetAreaMetrics();
}
_getDockBottomColumnBonus(layout,base,metrics={}){
  return this._gridRuntime.getDockBottomColumnBonus(layout,base,metrics);
}

_isMobileDefaultLayout(){
  return getEffectiveLayout(this)==="mobile";
}
_getRuntimeGridPreset(){
  return this._gridRuntime.getRuntimeGridPreset();
}
_getRuntimeGridUnits(){
  return this._gridRuntime.getGridBounds().units;
}
_getRuntimeGridRows(){
  return this._gridRuntime.getGridBounds().rowUnits;
}
_isMobileLauncherLayout(){
  return getResponsiveDockCoordinatorForHost(this).isMobileLauncherLayout();
}
_syncSquareUnit(){
  return this._gridRuntime.syncSquareUnit();
}
_getGridBounds(){
  return this._gridRuntime.getGridBounds();
}
/* LEGACY AUTO-PACK VALIDATOR SCOPE
 * Kept for resize/fallback checks that still need an auto-fit heuristic.
 * It must not be used as a global persistence gate because the modern grid
 * source of truth is the explicit ghost-slot position map.
 */
_doesWidgetLayoutFitGrid(widgets=this._widgets){
  const bounds=this._getGridBounds();
  return doesWidgetLayoutFitGrid(widgets,bounds.units,bounds.rowUnits);
}
_findFittingResize(current,requested){
  return this._widgetResizeCoordinator.findFittingResize(current,requested);
}
_getGridMetrics(){const grid=this.shadowRoot.querySelector(".mha-grid");if(!grid)return null;const st=getComputedStyle(grid);const col=parseFloat(st.gridTemplateColumns.split(" ")[0])||72;const gap=parseFloat(st.columnGap||st.gap||"0")||0;const row=parseFloat(st.gridAutoRows)||72;return{columnStep:col+gap,rowStep:row+gap}}
_clampWidgetSizeToGridBounds(widget,size){
  return this._widgetLayoutStateCoordinator.clampWidgetSizeToGridBounds(widget,size);
}
_clampWidgetPositionToGridBounds(widget,position){
  return this._widgetLayoutStateCoordinator.clampWidgetPositionToGridBounds(widget,position);
}
_normalizeWidgetToGridBounds(widget){
  return this._widgetLayoutStateCoordinator.normalizeWidgetToGridBounds(widget);
}
_normalizeWidgetsToGridBounds(widgets=this._widgets){
  return this._widgetLayoutStateCoordinator.normalizeWidgetsToGridBounds(widgets);
}


_startResize(){return this._widgetResizeCoordinator.startResize()}
_updateResize(e){return this._widgetResizeCoordinator.updateResize(e)}
_finishResize(){
  return this._widgetResizeCoordinator.finishResize();
}
_getDropPlacement(e,t){const r=t.getBoundingClientRect(),u=r.top+r.height*.35,l=r.top+r.height*.65;if(e.clientY<u)return"before";if(e.clientY>l)return"after";return e.clientX<r.left+r.width/2?"before":"after"}
_clearDropState(){this.shadowRoot.querySelectorAll(".is-drop-before,.is-drop-after").forEach(n=>{n.classList.remove("is-drop-before","is-drop-after");n.removeAttribute("data-drop-placement")})}
_wireDrag(el){
  if(!el)return;
  el.draggable=false;
  el.removeAttribute("draggable");
}
_createWidgetElement(widget,{units,position}){
  return this._widgetSurfaceCoordinator.createWidgetElement(widget,{units,position});
}
_createWidgetPlaceholder(widget,options){
  return getRenderPipelineForHost(this).createWidgetPlaceholder(widget,options);
}
_appendWidgetPlaceholders(grid,options){
  return getRenderPipelineForHost(this).appendWidgetPlaceholders(grid,options);
}
_startProgressiveWidgetRender(options){
  return getRenderPipelineForHost(this).startProgressiveWidgetRender(options);
}
_appendPrimaryControls(){
  return getRenderPipelineForHost(this).appendPrimaryControls();
}
_appendDeferredUi(options){
  return getRenderPipelineForHost(this).appendDeferredUi(options);
}
_buildRenderContext(themeState){
  return getRenderPipelineForHost(this).buildRenderContext(themeState);
}
_prepareRenderCycle(options){
  return getRenderPipelineForHost(this).prepareRenderCycle(options);
}
_applyRenderDatasetsAndRuntimeVars(options){
  return getRenderPipelineForHost(this).applyRenderDatasetsAndRuntimeVars(options);
}
_mountRenderShell(options){
  return getRenderPipelineForHost(this).mountRenderShell(options);
}
_mountImmediateUi(options){
  return getRenderPipelineForHost(this).mountImmediateUi(options);
}
_schedulePrimaryWidgetRender(options){
  return getRenderPipelineForHost(this).schedulePrimaryWidgetRender(options);
}
_handleStylesReady(options){
  return getRenderPipelineForHost(this).handleStylesReady(options);
}
_handleStylesError(options){
  return getRenderPipelineForHost(this).handleStylesError(options);
}
_awaitStylesAndFinalizeRender(options){
  return getRenderPipelineForHost(this).awaitStylesAndFinalizeRender(options);
}
render(){
  return getRenderPipelineForHost(this).render();
}
}

customElements.define("mha-widget-hub",MhaControlHub);
