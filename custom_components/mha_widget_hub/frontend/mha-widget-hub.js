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
  DOCK_POSITION,
  HIDE_HA_SIDEBAR,
  LANGUAGE,
  PAGES,
  POSITIONS,
  clearGridStorage,
  getStoredDockPosition,
  getStoredHideHaSidebar,
  getStoredLanguageSetting,
  normalizeDockPosition,
  normalizeLanguageSetting,
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
import {ICONS} from "./src/components/icons.js";
import {
  syncDockActiveState,
} from "./src/layout/dock-controller.js";
import { createRenderPipeline } from "./src/layout/render-pipeline.js";
import { createPageUiCoordinator } from "./src/pages/page-ui-coordinator.js?v=phase10";
import { buildSettingsCoordinatorProps, syncSettingsPanels } from "./src/settings/settings-panel-coordinator.js?v=phase8";
import { WIDGET_MANAGER_CATEGORIES } from "./src/widget-manager/widget-manager.js";
import {
  buildConfiguredWidget,
  createWidgetConfigSession,
  supportsWidgetConfiguration,
} from "./src/widget-config/widget-config-popup.js";
import { getScenesDefaultButtonIndex } from "./src/widget-config/widget-config-props.js?v=phase5";
import {
  buildWidgetConfigPanelProps,
  buildWidgetManagerPanelProps,
  syncWidgetConfigPanel,
  syncWidgetManagerPanel,
} from "./src/widgets/widget-placement-orchestrator.js?v=phase1";
import {
  createThemeController,
} from "./src/settings/theme-controller.js";
import { createAppearanceCoordinator } from "./src/settings/appearance-coordinator.js";
import { createWallpaperController } from "./src/settings/wallpaper-controller.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import { normalizeStoredWidgetContract } from "./src/widgets/widget-storage.js?v=phase1";
import { createWidgetFromCatalogItem } from "./src/widgets/widget-factory.js";
import {updateClockWidgets} from "./src/widgets/clock-widget.js";
import { getWidgetPlacementFlow } from "./src/widgets/widget-registry.js?v=phase5b1";
import { syncDropSlotRenderer } from "./src/widgets/drop-slot-renderer.js";
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
import { configureI18n, normalizeLanguage } from "./src/i18n/index.js";

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
  const language=this._language&&this._language!=="auto"
    ? normalizeLanguage(this._language)
    : "";
  configureI18n({
    config: language ? { language } : undefined,
    hass:this._hass,
  });
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
  return Boolean(
    this.shadowRoot?.querySelector?.(".mha-background")
    &&this.shadowRoot?.querySelector?.(".mha-shell")
    &&this.shadowRoot?.querySelector?.(".mha-grid"),
  );
}
_ensureMounted({force=false,reason="lifecycle recovery"}={}){
  if(!this.isConnected)return false;
  const interruptedWidgetRender=(
    this.dataset.widgetsState==="loading"
    &&this._widgets.length>0
    &&!this._widgetRenderFrame
  );
  if(!force&&this._hasMountedApp()&&!interruptedWidgetRender)return false;
  try{
    this.render();
    return true;
  }catch(error){
    console.error(`[MHA] Render recovery failed after ${reason}.`,error);
    this._finishBoot({fallback:true,reason:`render recovery failed after ${reason}`});
    return false;
  }
}
_addConnectionListeners(){
  if(this._connectionListenersAttached)return;
  this._connectionListenersAttached=true;
  this._lifecycleRecoveryListener=event=>{
    const panelPath=window.location.pathname.replace(/\/+$/,"");
    const isPanelReturn=(
      event?.type==="location-changed"
      &&this._bootComplete
      &&panelPath.endsWith("/mha-widget-hub")
    );
    const isPageRestore=event?.type==="pageshow"&&Boolean(event.persisted);
    this._ensureMounted({
      force:isPanelReturn||isPageRestore,
      reason:event?.type||"lifecycle recovery",
    });
  };
  this._visibilityRecoveryListener=()=>{
    if(document.visibilityState==="visible")this._ensureMounted({reason:"visibility change"});
  };
  window.addEventListener("pageshow",this._lifecycleRecoveryListener);
  window.addEventListener("location-changed",this._lifecycleRecoveryListener);
  document.addEventListener("visibilitychange",this._visibilityRecoveryListener);
}
_removeConnectionListeners(){
  if(!this._connectionListenersAttached)return;
  this._connectionListenersAttached=false;
  window.removeEventListener("pageshow",this._lifecycleRecoveryListener);
  window.removeEventListener("location-changed",this._lifecycleRecoveryListener);
  document.removeEventListener("visibilitychange",this._visibilityRecoveryListener);
  this._lifecycleRecoveryListener=null;
  this._visibilityRecoveryListener=null;
}
_scheduleHassUpdate(){
  if(!this.isConnected||this._hassUpdateFrame)return;
  this._hassUpdateFrame=requestAnimationFrame(()=>{
    this._hassUpdateFrame=0;
    this.updateFromHass();
  });
}
updateFromHass(){
  this.shadowRoot?.querySelectorAll?.("[data-widget-component]")?.forEach(component=>{
    component.__mhaUpdateFromHass?.(this._hass);
  });
  this._screensaverCoordinator.requestNowBarCalendarEvents();
  this._syncScreensaverDom();
}
_finishBoot({fallback=false,reason=""}={}){
  if(this._bootComplete)return;
  this._bootComplete=true;
  clearTimeout(this._bootWatchdog);
  this._bootWatchdog=0;
  cancelAnimationFrame(this._readyRaf);
  this._readyRaf=0;
  if(fallback){
    console.warn(`[MHA] Boot fallback: ${reason||"initialization exceeded the safety deadline"}. Showing the available interface.`);
    this.dataset.bootFallback="true";
  }
  this.dataset.bootState="ready";
  this.setAttribute("data-boot-state","ready");
  this.dataset.ready="true";
  this.setAttribute("data-ready","true");
  this.classList.add("is-boot-revealing");
  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  const finishReveal=()=>{
    this.classList.remove("is-boot-revealing");
    document.getElementById("mha-widget-hub-boot-style")?.remove();
    const pending=this._pendingDeferredUi;
    this._pendingDeferredUi=null;
    if(pending)this._renderPipeline.appendDeferredUi(pending);
    this._scheduleIconSymbolRefresh();
  };
  if(fallback||window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches||!grid){
    requestAnimationFrame(finishReveal);
    return;
  }
  requestAnimationFrame(()=>{
    const animations=grid.getAnimations?.().filter(animation=>animation.effect?.getTiming?.().iterations!==Infinity)||[];
    if(!animations.length){
      finishReveal();
      return;
    }
    Promise.allSettled(animations.map(animation=>animation.finished)).then(finishReveal);
  });
}
_startBootWatchdog(){
  clearTimeout(this._bootWatchdog);
  this._bootWatchdog=setTimeout(()=>{
    if(this._bootComplete)return;
    try{
      this._syncGridRuntimeMetrics();
    }catch(error){
      console.warn("[MHA] Boot fallback could not complete the layout sync.",error);
    }
    this._finishBoot({fallback:true,reason:"UI initialization did not complete within 1200ms"});
  },1200);
}
_markReadyAfterPaint(renderId=this._renderId){
  if(this._bootComplete)return;
  cancelAnimationFrame(this._readyRaf);
  this._readyRaf=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(this._renderId!==renderId||!this.isConnected)return;
    try{
      this._syncGridRuntimeMetrics();
    }catch(error){
      console.warn("[MHA] Initial layout sync failed; continuing with the rendered shell.",error);
      this._finishBoot({fallback:true,reason:"initial layout synchronization failed"});
      return;
    }
    this._readyRaf=requestAnimationFrame(()=>{
      if(this._renderId!==renderId||!this.isConnected)return;
      // UI ready is independent from Home Assistant data, which hydrates later.
      this._finishBoot();
    });
  }));
}
_tryCompleteBoot(){
  if(this._bootComplete)return;
  if(this._stylesReadyRenderId!==this._renderId)return;
  this._markReadyAfterPaint(this._renderId);
}
connectedCallback(){
  this._initialize();
  if(this._connectionActive){
    this._ensureMounted({reason:"duplicate connection callback"});
    this._scheduleHassUpdate();
    return;
  }
  this._connectionActive=true;
  const isReconnect=this._hasConnectedOnce;
  this._hasConnectedOnce=true;
  this._startBootWatchdog();
  this._addConnectionListeners();
  this._systemThemeListener=()=>{if(this._themeController.read().themeSetting==="auto")this._transitionSystemThemeChange()};
  window.matchMedia?.("(prefers-color-scheme: light)")?.addEventListener?.("change",this._systemThemeListener);
  this._ensureMounted({force:isReconnect,reason:isReconnect?"panel reconnect":"initial connection"});
  this._scheduleHassUpdate();
  this._clockTimer=setInterval(()=>{
    this._updateStatusDom();
    updateClockWidgets(this.shadowRoot);
    const screensaverState=this._screensaverController.read();
    if(this._getScreensaverVisible()){
      updateScreensaverClock(this.shadowRoot,screensaverState.clockVariant);
    }
  },1000);
  this._activityListener=()=>this._handleUserActivity();
  ["pointerdown","touchstart","keydown","wheel","scroll"].forEach(type=>window.addEventListener(type,this._activityListener,{passive:true}));
  this._scheduleScreensaverIdleTimer();
  this._resizeListener=()=>{this._handleUserActivity();this._handleViewportChange()};
  window.addEventListener("resize",this._resizeListener);
  window.visualViewport?.addEventListener("resize",this._resizeListener);
  window.addEventListener("orientationchange",this._resizeListener);
  this._settingsOpenListener=()=>this._openSettings();
  this.shadowRoot.addEventListener("mha-open-settings",this._settingsOpenListener);
  this._applyHaSidebarMode(this._hideHaSidebar);
}
disconnectedCallback(){
  this._connectionActive=false;
  this._removeConnectionListeners();
  window.matchMedia?.("(prefers-color-scheme: light)")?.removeEventListener?.("change",this._systemThemeListener);
  clearInterval(this._clockTimer);
  clearTimeout(this._bootWatchdog);
  this._bootWatchdog=0;
  cancelAnimationFrame(this._hassUpdateFrame);
  this._hassUpdateFrame=0;
  cancelAnimationFrame(this._readyRaf);
  this._readyRaf=0;
  cancelAnimationFrame(this._viewportRaf);
  this._viewportRaf=0;
  clearTimeout(this._relayoutTimer);
  this._relayoutTimer=0;
  cancelAnimationFrame(this._widgetRenderFrame);
  this._widgetRenderFrame=0;
  cancelAnimationFrame(this._secondaryUiFrame);
  this._secondaryUiFrame=0;
  cancelAnimationFrame(this._widgetDropSlotsFrame);
  this._widgetDropSlotsFrame=0;
  this._gridRuntime.destroy();
  this._appearanceCoordinator.destroy();
  cancelAnimationFrame(this._iconSymbolRefreshFrame);
  this._iconSymbolRefreshFrame=0;
  this._clearGridScrollListener();
  ["pointerdown","touchstart","keydown","wheel","scroll"].forEach(type=>window.removeEventListener(type,this._activityListener));
  this._screensaverController.destroy();
  window.removeEventListener("resize",this._resizeListener);
  window.visualViewport?.removeEventListener("resize",this._resizeListener);
  window.removeEventListener("orientationchange",this._resizeListener);
  clearTimeout(this._responsiveRelayoutTimer);
  this._responsiveRelayoutTimer=null;
  if(this._settingsOpenListener)this.shadowRoot.removeEventListener("mha-open-settings",this._settingsOpenListener);
  this._applyHaSidebarMode(false);
  destroyDomSubtree(this.shadowRoot);
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
  this._settingsOpen=true;
  this._settingsPage=page||"main";
  if(this._settingsPage!=="dock-detail")this._dockSettingsPageId="";
  this._setScreensaverActive(false);
  this._screensaverController.clearIdleTimer();
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_closeSettings(){
  this._settingsOpen=false;
  this._settingsPage="main";
  this._dockSettingsPageId="";
  this._syncSettingsModalState();
  this._syncSettingsDom();
  this._scheduleScreensaverIdleTimer();
}
_syncSettingsModalState(){
  this.classList.toggle("is-settings-open",this._settingsOpen);
  this.dataset.settingsOpen=String(this._settingsOpen);
}
_syncSettingsDom(){
  this._syncSettingsModalState();
  syncSettingsPanels({
    root:this.shadowRoot,
    props:this._getSettingsPanelsProps(),
  });
}
_getSettingsPanelsProps(){
  const themeState=this._themeController.read();
  const screensaverState=this._screensaverController.read();
  return buildSettingsCoordinatorProps({
    settingsOpen:this._settingsOpen,
    screensaverSettingsOpen:this._screensaverSettingsOpen,
    language:this._language,
    hideHaSidebar:this._hideHaSidebar,
    accentPaletteExpanded:this._accentPaletteExpanded,
    settingsPage:this._settingsPage,
    dockPages:this._pages,
    activeDockPageId:this._activePageId,
    selectedDockPageId:this._dockSettingsPageId,
    dockPosition:this._dockPosition,
    customWallpapers:this._customWallpapers,
    hass:this._hass,
    entityVisibilityConfig:this._entityVisibilityConfig,
    themeState,
    screensaverState,
    hostIconShape:this.dataset.iconShape,
    documentIconShape:document.documentElement.dataset.iconShape,
    callbacks:{
      onClose:()=>this._closeSettings(),
      onCloseScreensaver:()=>this._closeScreensaverSettings(),
      onLanguageChange:v=>this._applyLanguageFromSettings(v),
      onThemeChange:v=>this._applyThemeFromSettings(v),
      onThemeStyleChange:v=>this._applyThemeStyleFromSettings(v),
      onIosGlassChange:v=>this._applyIosGlassFromSettings(v),
      onAccentChange:v=>this._applyAccentFromSettings(v),
      onAccentModeChange:v=>this._applyAccentModeFromSettings(v),
      onAccentPaletteExpandedChange:v=>this._setAccentPaletteExpanded(v),
      onIconShapeChange:v=>this._applyIconShapeFromSettings(v),
      onHideHaSidebarChange:v=>this._applyHideHaSidebarFromSettings(v),
      onScreensaverEnabledChange:v=>this._applyScreensaverEnabledFromSettings(v),
      onScreensaverDelayChange:v=>this._applyScreensaverDelayFromSettings(v),
      onScreensaverPreviewChange:v=>this._applyScreensaverPreviewFromSettings(v),
      onScreensaverNowBarChange:v=>this._applyScreensaverNowBarFromSettings(v),
      onScreensaverNowBarItemChange:(item,enabled)=>this._applyScreensaverNowBarItemFromSettings(item,enabled),
      onScreensaverNowBarTileEnabledChange:(tile,enabled)=>this._applyScreensaverNowBarTileEnabledFromSettings(tile,enabled),
      onScreensaverNowBarEntitySelectionChange:(section,entityId,selected)=>this._applyScreensaverNowBarEntitySelectionFromSettings(section,entityId,selected),
      onScreensaverNowBarNowItemChange:(item,selected)=>this._applyScreensaverNowBarNowItemFromSettings(item,selected),
      onScreensaverClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
      onResetGrid:()=>this.resetGrid(),
      onOpenWallpaperSettings:()=>this._openWallpaperSettings(),
      onOpenNowBarSettings:()=>this._openNowBarSettings(),
      onWallpaperMainBack:()=>this._openSettings(),
      onOpenDockSettings:()=>this._openDockSettings(),
      onDockBack:()=>this._openDockSettings(),
      onDockPageSelect:id=>this._openDockPageSettings(id),
      onDockMovePage:(id,direction)=>this._moveDockPage(id,direction),
      onDockDeletePage:id=>this._deleteDockPage(id),
      onDockMainBack:()=>this._openSettings(),
      onDockRenamePage:(id,name)=>this._renameDockPage(id,name),
      onDockIconChange:(id,icon)=>this._changeDockPageIcon(id,icon),
      onDockPositionChange:v=>this._applyDockPositionFromSettings(v),
      onWallpaperImport:(mode,payload)=>this._saveCustomWallpaper(mode,payload),
      onWallpaperReset:mode=>this._resetCustomWallpaper(mode),
    },
  });
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
  return WIDGET_MANAGER_CATEGORIES;
}
_updateStatusDom(){
  updateStatusTime(this.shadowRoot);
}
_isMobileLandscapeLayout(){
  return this._isMobileLauncherLayout()&&window.matchMedia?.("(orientation: landscape)")?.matches;
}
_syncWidgetManagerDom(){
  syncWidgetManagerPanel(this.shadowRoot,buildWidgetManagerPanelProps({
    open:this._widgetManagerOpen,
    activeCategory:this._widgetManagerCategory,
    categories:this._getWidgetManagerCategories(),
    onClose:()=>this._closeWidgetManager(),
    onBack:()=>this._showWidgetManagerCategories(),
    onSelectCategory:id=>this._selectWidgetManagerCategory(id),
    onSelectWidget:item=>this._beginWidgetPlacement(item),
  }));
}
_openWidgetManager(){
  if(!this._isEditing||this._isMobileLandscapeLayout())return;
  this._pendingWidgetPlacement=null;
  this._activeMoveWidgetId="";
  this._widgetManagerOpen=true;
  this._widgetManagerCategory="";
  this._syncEditModeDom();
  this._syncWidgetDropSlots();
  this._syncWidgetManagerDom();
}
_closeWidgetManager(){
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._syncWidgetManagerDom();
}
_showWidgetManagerCategories(){
  this._widgetManagerCategory="";
  this._syncWidgetManagerDom();
}
_selectWidgetManagerCategory(id){
  this._widgetManagerCategory=id;
  this._syncWidgetManagerDom();
}
_createWidgetFromCatalogItem(item){
  return createWidgetFromCatalogItem(item);
}
_beginWidgetPlacement(item){
  if(!this._isEditing||this._isMobileLandscapeLayout())return;
  const widget=this._createWidgetFromCatalogItem(item);
  const placementFlow=getWidgetPlacementFlow(widget);
  if(placementFlow==="direct"){
    this._startWidgetPlacement(widget);
    return;
  }
  if(placementFlow==="slot-config-first"){
    this._widgetManagerOpen=false;
    this._widgetManagerCategory="";
    this._widgetConfigSession=createWidgetConfigSession(widget,this._hass,{
      mode:"create",
      visibilityConfig:this._entityVisibilityConfig,
    });
    this._widgetConfigHassReady=Boolean(this._hass);
    this._syncWidgetManagerDom();
    this._syncWidgetConfigDom();
    return;
  }
  if(placementFlow==="configure-first"&&supportsWidgetConfiguration(widget)){
    this._widgetManagerOpen=false;
    this._widgetManagerCategory="";
    this._widgetConfigSession=createWidgetConfigSession(widget,this._hass,{
      mode:"create",
      visibilityConfig:this._entityVisibilityConfig,
    });
    this._widgetConfigHassReady=Boolean(this._hass);
    this._syncWidgetManagerDom();
    this._syncWidgetConfigDom();
    return;
  }
  this._startWidgetPlacement(widget);
}
_startWidgetPlacement(widget){
  this._pendingWidgetPlacement=widget;
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._activeMoveWidgetId="";
  this._syncWidgetManagerDom();
  this._syncEditModeDom();
  this._syncWidgetDropSlots();
}
_syncWidgetConfigDom(){
  syncWidgetConfigPanel(this.shadowRoot,buildWidgetConfigPanelProps({
    session:this._widgetConfigSession,
    hass:this._hass,
    visibilityConfig:this._entityVisibilityConfig,
    onCancel:()=>this._closeWidgetConfig(),
    onSave:()=>this._saveWidgetConfig(),
    onRerender:()=>this._syncWidgetConfigDom(),
  }));
}
_closeWidgetConfig(){
  this._widgetConfigSession=null;
  this._widgetConfigHassReady=false;
  this._syncWidgetConfigDom();
}
_saveWidgetConfig(){
  const session=this._widgetConfigSession;
  const configured=buildConfiguredWidget(
    session,
    this._hass,
    this._entityVisibilityConfig,
  );
  if(!session||!configured)return;
  this._widgetConfigSession=null;
  this._widgetConfigHassReady=false;
  this._syncWidgetConfigDom();
  if(session.mode==="create"){
    this._startWidgetPlacement(configured);
    return;
  }
  const index=this._widgets.findIndex(widget=>widget.id===configured.id);
  if(index<0)return;
  this._widgets=[
    ...this._widgets.slice(0,index),
    normalizeStoredWidgetContract(configured),
    ...this._widgets.slice(index+1),
  ];
  this._saveWidgets();
  this._replaceWidgetDom(configured.id);
}
_openWidgetConfig(id){
  if(!this._isEditing||this._isMobileLandscapeLayout())return;
  const widget=this._widgets.find(item=>item.id===id);
  if(!supportsWidgetConfiguration(widget))return;
  if(widget?.kind==="scenes"){
    this._openScenesButtonConfig(id);
    return;
  }
  this._activeMoveWidgetId="";
  this._widgetConfigSession=createWidgetConfigSession(widget,this._hass,{
    mode:"edit",
    visibilityConfig:this._entityVisibilityConfig,
  });
  this._widgetConfigHassReady=Boolean(this._hass);
  this._syncEditModeDom();
  this._syncWidgetConfigDom();
}
_getScenesDefaultButtonIndex(widget){
  return getScenesDefaultButtonIndex(widget);
}
_openScenesButtonConfig(id,buttonIndex){
  if(this._isMobileLandscapeLayout())return;
  const widget=this._widgets.find(item=>item.id===id);
  if(!widget||widget.kind!=="scenes")return;
  const resolvedButtonIndex=Number.isInteger(buttonIndex)
    ? buttonIndex
    : this._getScenesDefaultButtonIndex(widget);
  this._activeMoveWidgetId="";
  this._widgetConfigSession=createWidgetConfigSession(widget,this._hass,{
    mode:"edit",
    visibilityConfig:this._entityVisibilityConfig,
    buttonIndex:resolvedButtonIndex,
  });
  this._widgetConfigHassReady=Boolean(this._hass);
  this._syncEditModeDom();
  this._syncWidgetConfigDom();
}
_openScreensaverSettings(){
  this._screensaverSettingsOpen=true;
  this._syncScreensaverSettingsDom();
}
_closeScreensaverSettings(){
  this._screensaverSettingsOpen=false;
  this._syncScreensaverSettingsDom();
}
_syncScreensaverSettingsDom(){
  this.classList.toggle("is-screensaver-settings-open",this._screensaverSettingsOpen);
  this.dataset.screensaverSettingsOpen=String(this._screensaverSettingsOpen);
  syncSettingsPanels({
    root:this.shadowRoot,
    props:this._getSettingsPanelsProps(),
  });
}

_applyDockPositionFromSettings(position="left"){
  const next=normalizeDockPosition(position);
  if(next===this._dockPosition)return;
  this._dockPosition=next;
  this._recordPersistenceResult(writeStorageValue(DOCK_POSITION,next));
  this.dataset.dockPosition=next;
  this.setAttribute("data-dock-position",next);
  this._syncSettingsDom();
  this._handleViewportChange();
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
  const language=normalizeLanguageSetting(value);
  this._language=language;
  if(language==="auto")localStorage.removeItem(LANGUAGE);
  else writeStorageValue(LANGUAGE,language);
  this._configureI18n();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
  this._syncDocksDom();
  this._syncWidgetManagerDom();
  if(this._widgetConfigSession)this._syncWidgetConfigDom();
  this._syncScreensaverDom({force:true});
  this._refreshActiveGridOnly();
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
  return this._settingsOpen||this._isEditing;
}
_getScreensaverVisible(){
  return this._screensaverController.isVisible();
}
_setScreensaverActive(active=false){
  this._screensaverController.setActive(active);
  this._syncScreensaverDom();
}
_scheduleScreensaverIdleTimer(){
  this._screensaverController.scheduleIdleTimer();
}
_handleUserActivity(){
  const deactivated=this._screensaverController.handleActivity({
    settingsOpen:this._screensaverSettingsOpen,
  });
  if(deactivated)this._syncScreensaverDom();
}
_applyScreensaverEnabledFromSettings(enabled=false){
  this._recordPersistenceResult(this._screensaverController.setEnabled(enabled));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverDelayFromSettings(delay=30000){
  this._recordPersistenceResult(this._screensaverController.setDelay(delay));
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverPreviewFromSettings(enabled=false){
  this._screensaverController.setPreview(enabled);
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverNowBarFromSettings(enabled=true){
  this._recordPersistenceResult(this._screensaverController.setNowBar(enabled));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverNowBarItemFromSettings(item="",enabled=true){
  this._recordPersistenceResult(this._screensaverController.setNowBarItem(item,enabled));
  this._screensaverCoordinator.requestNowBarCalendarEvents();
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverNowBarTileEnabledFromSettings(tile="",enabled=true){
  this._recordPersistenceResult(this._screensaverController.setNowBarTileEnabled(tile,enabled));
  this._screensaverCoordinator.requestNowBarCalendarEvents();
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverNowBarEntitySelectionFromSettings(section="",entityId="",selected=true){
  this._recordPersistenceResult(this._screensaverController.setNowBarEntitySelection(section,entityId,selected));
  this._screensaverCoordinator.requestNowBarCalendarEvents({force:section==="calendar"});
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverNowBarNowItemFromSettings(item="",selected=true){
  this._recordPersistenceResult(this._screensaverController.setNowBarNowItem(item,selected));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverClockVariantFromSettings(variant="digital"){
  this._recordPersistenceResult(this._screensaverController.setClockVariant(variant));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_syncScreensaverVisibilityState(){
  const visible=this._getScreensaverVisible();
  this.classList.toggle("is-screensaver-visible",visible);
  this.dataset.screensaverVisible=String(visible);
}
_syncScreensaverDom({force=false}={}){
  this._screensaverCoordinator.syncDom(this.shadowRoot,{force});
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
  syncDockActiveState(this.shadowRoot,this._activePageId);
}
_getDockProps(){
  return this._pageUiCoordinator.buildDockProps();
}
_syncDocksDom(){
  return this._pageUiCoordinator.syncDocks();
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
  this._isResponsiveRelayouting=true;
  this.classList.add("is-responsive-relayouting");
  clearTimeout(this._relayoutTimer);
  cancelAnimationFrame(this._viewportRaf);
  this._viewportRaf=requestAnimationFrame(()=>{
    this._syncGridRuntimeMetrics();
    this._observeLayoutSize();
    this._wireDockAutoHide(this.shadowRoot?.querySelector?.(".mha-grid"));
    this._syncEditModeDom();
    this._syncWidgetDropSlots();
    this._relayoutTimer=setTimeout(()=>{
      this._isResponsiveRelayouting=false;
      this.classList.remove("is-responsive-relayouting");
    },180);
  });
}

_clearGridScrollListener(){this._gridScrollCleanup?.();this._gridScrollCleanup=null}
// Mobile floating controls move out of the way on downward portrait scroll.
_wireDockAutoHide(grid){this._clearGridScrollListener();this.classList.remove("is-dock-hidden","is-mobile-floating-controls-hidden");
if(!grid)return;
const scrollContainer=grid.closest(".mha-widget-area");const isMobileLayout=()=>this.dataset.layout==="mobile";const isLandscape=()=>window.matchMedia("(orientation: landscape)").matches;
if(!scrollContainer||!isMobileLayout())return;
if(isLandscape()){this.classList.add("is-mobile-floating-controls-hidden");return}
let previousScrollTop=scrollContainer.scrollTop;const threshold=10;const onScroll=()=>{if(!isMobileLayout()||isLandscape()){this.classList.toggle("is-mobile-floating-controls-hidden",isMobileLayout()&&isLandscape());previousScrollTop=scrollContainer.scrollTop;return}const currentScrollTop=scrollContainer.scrollTop;if(currentScrollTop<=4){this.classList.remove("is-mobile-floating-controls-hidden");previousScrollTop=currentScrollTop;return}const delta=currentScrollTop-previousScrollTop;if(delta>threshold)this.classList.add("is-mobile-floating-controls-hidden");else if(delta<-threshold)this.classList.remove("is-mobile-floating-controls-hidden");if(Math.abs(delta)>threshold)previousScrollTop=currentScrollTop};scrollContainer.addEventListener("scroll",onScroll,{passive:true});this._gridScrollCleanup=()=>scrollContainer.removeEventListener("scroll",onScroll)}
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
_isMobileLauncherLayout(){return this._getRuntimeLayout?.()==="mobile"||this._layout==="mobile"||this.dataset.layout==="mobile"}
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
