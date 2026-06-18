import {
  readJson,
  writeJson,
  writeStorageValue,
} from "./src/core/storage.js?v=storage-v1";
import {
  STORAGE_KEYS,
} from "./src/core/storage-keys.js";
import {
  getActivePage,
  normalizePage,
} from "./src/pages/page-model.js";
import {
  migratePageStorage,
  readActivePageId,
  readPages,
  savePages,
} from "./src/pages/page-store.js";
import {
  addPage,
  changePageIcon,
  deletePage,
  movePage,
  removePageWidgetPositions,
  renamePage,
  selectPage,
} from "./src/pages/page-controller.js";
import {destroyDomSubtree} from "./src/core/dom-lifecycle.js";
import {ICONS} from "./src/components/icons.js";
import {createShell} from "./src/layout/shell.js";
import {createMobileDock} from "./src/layout/mobile-dock.js";
import {
  createDockProps,
  syncDockActiveState,
  syncDocks,
} from "./src/layout/dock-controller.js";
import {createSettingsPanel} from "./src/settings/settings-panel.js";
import {createWidgetManager, WIDGET_MANAGER_CATEGORIES} from "./src/widget-manager/widget-manager.js";
import {
  buildConfiguredWidget,
  createWidgetConfigPopup,
  createWidgetConfigSession,
  supportsWidgetConfiguration,
} from "./src/widget-config/widget-config-popup.js";
import {
  createThemeController,
} from "./src/settings/theme-controller.js";
import { extractAccentFromWallpaper } from "./src/settings/wallpaper-accent.js";
import { createWallpaperController } from "./src/settings/wallpaper-controller.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import {createWidgetShell} from "./src/widgets/widget-shell.js";
import { getNextWidgetVariantEntries, getVariantCandidate, sameVariantSize } from "./src/widgets/widget-variants.js";
import {
  normalizeWidgetContract,
} from "./src/widgets/widget-registry.js";
import { createWidgetFromCatalogItem } from "./src/widgets/widget-factory.js";
import {updateClockWidgets} from "./src/widgets/clock-widget.js";
import {DEFAULT_WIDGETS,getActiveGridRows,getActiveGridUnits,getEffectiveLayout,getInternalGridColumnCountFromLogical,getInternalGridRowCountFromLogical,getLayoutMode,getGridPreset,getWidgetDensity,normalizeWidgetForKind,normalizeWidgetSize,sizeToString} from "./src/layout/layout-engine.js";
import {
  doesWidgetGroupExactlyFillRect,
  getGroupBoundingRect,
  getWidgetRectFromPosition,
  getWidgetsInCandidateRect,
  isGroupInternallyValid,
  isPositionMapValidForWidgets,
  rectsOverlap,
  translateWidgetGroupPositions,
} from "./src/layout/placement-geometry.js";
import {
  doesWidgetLayoutFitGrid,
  findWidgetAtCandidatePosition,
  getAdjacentWidgetGroupInDirection,
  getAvailableDropSlotsForCandidate,
  getBandParticipantsForTranslatedSwap,
  getDirectNeighborInDirection,
  hasNoWidgetOverlaps,
  packTranslatedSwapBand,
  packWidgets,
} from "./src/layout/placement-calculations.js";
import { createPlacementController } from "./src/layout/placement-controller.js";
import { createGridRuntime } from "./src/layout/grid-runtime.js";
import {createScreensaver,normalizeClockVariant,updateScreensaverClock} from "./src/screensaver/screensaver.js";
import { createScreensaverController } from "./src/screensaver/screensaver-controller.js";
import { createIcon } from "./src/ui/icon.js";
import { createIconSymbol } from "./src/ui/icon-symbol.js";
import { createCloseButton } from "./src/system/system-buttons.js";
import { loadEntityVisibilityConfig } from "./src/admin/entity-visibility-store.js";
import { normalizeEntityVisibilityConfig } from "./src/admin/entity-permissions.js";
import { getStyleManifest } from "./src/styles/style-manifest.js";

const MHA_FRONTEND_ROOT_URL = new URL(".", import.meta.url);
const MHA_FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");

const MHA_STYLE_MANIFEST = getStyleManifest();

const PAGE_ICON_OPTIONS = Object.freeze([
  { name: "home", label: "Accueil", category: "home" },
  { name: "dashboard", label: "Dashboard", category: "navigation" },
  { name: "apps", label: "Applications", category: "system" },
  { name: "grid", label: "Grille", category: "navigation" },
  { name: "light", label: "Lumières", category: "lighting" },
  { name: "weather", label: "Météo", category: "weather" },
  { name: "media-player", label: "Média", category: "media_player" },
  { name: "calendar", label: "Calendrier", category: "utility" },
  { name: "star", label: "Favori", category: "utility" },
  { name: "gear", label: "Réglages", category: "system" },
]);

function resolveFrontendAssetUrl(path = "") {
  const url = new URL(String(path).replace(/^\/+/, ""), MHA_FRONTEND_ROOT_URL);
  if (MHA_FRONTEND_VERSION) url.searchParams.set("v", MHA_FRONTEND_VERSION);
  return url.href;
}

function createFrontendStyleLinks() {
  return MHA_STYLE_MANIFEST
    .map(([path, layer]) => (
      `<link rel="stylesheet" data-mha-style-layer="${layer}" href="${resolveFrontendAssetUrl(path)}">`
    ))
    .join("");
}

function createCriticalBootStyle() {
  /*
   * External theme styles can take several seconds through Home Assistant.
   * Keep a styled wallpaper visible and all application content hidden until
   * those styles and the first measured layout are ready.
   */
  return `<style data-mha-critical-boot>
    :host {
      display: block;
      position: relative;
      inline-size: 100%;
      block-size: 100dvh;
      overflow: hidden;
      color: rgba(255,255,255,.92);
      background:
        radial-gradient(circle at 20% 15%, rgba(113,128,255,.32), transparent 30%),
        radial-gradient(circle at 78% 28%, rgba(255,112,178,.28), transparent 32%),
        radial-gradient(circle at 52% 90%, rgba(56,209,255,.22), transparent 36%),
        linear-gradient(135deg, #171b30 0%, #242844 100%);
    }
    :host([data-boot-state="booting"]) > :not(style):not(link):not(.mha-background) {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    :host([data-boot-state="booting"]) .mha-background {
      position: absolute;
      inset: -20%;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 20% 15%, var(--mha-bg-radial-1, rgba(113,128,255,.32)), transparent 30%),
        radial-gradient(circle at 78% 28%, var(--mha-bg-radial-2, rgba(255,112,178,.28)), transparent 32%),
        radial-gradient(circle at 52% 90%, var(--mha-bg-radial-3, rgba(56,209,255,.22)), transparent 36%),
        linear-gradient(135deg, var(--mha-bg-base-1, #171b30), var(--mha-bg-base-2, #242844));
    }
    :host([data-boot-state="booting"][data-wallpaper-kind="image"][data-wallpaper-source="custom"]) .mha-background,
    :host([data-boot-state="booting"][data-wallpaper-kind="image"][data-wallpaper-source="theme"]) .mha-background {
      background-image: var(--mha-active-wallpaper-image) !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }
    :host([data-boot-state="booting"][data-wallpaper-kind="css"][data-wallpaper-source="theme"]) .mha-background {
      background: var(--mha-active-wallpaper-background) !important;
    }
  </style>`;
}
// Keeps existing local widget order/sizes after the public naming cleanup.




const {
  gridOrder:ORDER,
  widgetSizes:SIZES,
  hiddenWidgets:REMOVED,
  widgetPositions:POSITIONS,
  gridPages:PAGES,
  activePage:ACTIVE_PAGE,
  dockPosition:DOCK_POSITION,
}=STORAGE_KEYS;
const DOCK_POSITIONS=new Set(["left","right","bottom"]);
function normalizeDockPosition(value="left"){return DOCK_POSITIONS.has(value)?value:"left";}
function getStoredDockPosition(){return normalizeDockPosition(localStorage.getItem(DOCK_POSITION)||"left");}

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


function normalizeStoredWidgetContract(widget = {}) {
  return normalizeWidgetContract(widget,normalizeWidgetSize);
}

class MhaControlHub extends HTMLElement{
constructor(){
  super();
  this._themeController=createThemeController(this);
  this._wallpaperController=createWallpaperController(this,{
    getTheme:()=>this._themeController.read().theme,
    getThemeState:()=>this._themeController.read(),
  });
  this._screensaverController=createScreensaverController({
    normalizeClockVariant,
    isBlocked:()=>this._isScreensaverBlocked(),
    onIdle:()=>this._setScreensaverActive(true),
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
  this._themeTransitionTimer=0;
  this._themeTransitionFrame=0;
  this._iconSymbolRefreshFrame=0;
  this._gridScrollCleanup=null;
  this._settingsOpen=false;
  this._settingsPage="main";
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
  this._customWallpapers={light:null,dark:null};
  this._autoAccentRequestId=0;
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
async _loadEntityVisibilityConfig(hass){
  const userId=String(hass?.user?.id||"");
  if(!userId||userId===this._entityVisibilityUserId)return;
  this._entityVisibilityUserId=userId;
  try{
    const config=await loadEntityVisibilityConfig(hass);
    if(this._entityVisibilityUserId!==userId)return;
    this._entityVisibilityConfig=config;
    if(this._widgetConfigSession)this._syncWidgetConfigDom();
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
    if(pending)this._appendDeferredUi(pending);
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
    updateStatusTime(this.shadowRoot);
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
  cancelAnimationFrame(this._themeTransitionFrame);
  this._themeTransitionFrame=0;
  clearTimeout(this._themeTransitionTimer);
  this._themeTransitionTimer=0;
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
  destroyDomSubtree(this.shadowRoot);
}
requestRender(){this.render()}
_syncEditModeDom(){
  if(!this._isEditing||this._isMobileLandscapeLayout()){
    const hadWidgetConfig=Boolean(this._widgetConfigSession);
    this._activeMoveWidgetId="";
    this._pendingWidgetPlacement=null;
    this._widgetManagerOpen=false;
    this._widgetManagerCategory="";
    this._widgetConfigSession=null;
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
  if(edit)edit.innerHTML=this._isEditing?ICONS.close:ICONS.edit;
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
_getPanelFocusIdentity(panel){
  const active=this.shadowRoot?.activeElement;
  if(!active||!panel?.contains(active))return null;
  return {
    tagName:active.tagName,
    settingsControl:active.dataset?.settingsControl||"",
    ariaLabel:active.getAttribute?.("aria-label")||"",
    name:active.getAttribute?.("name")||"",
    type:active.getAttribute?.("type")||"",
  };
}
_findPanelFocusTarget(panel,identity){
  if(!panel||!identity)return null;
  const candidates=[...panel.querySelectorAll(identity.tagName.toLowerCase())];
  return candidates.find(candidate=>{
    if(identity.settingsControl)return candidate.dataset?.settingsControl===identity.settingsControl;
    if(identity.ariaLabel)return candidate.getAttribute("aria-label")===identity.ariaLabel;
    if(identity.name)return candidate.getAttribute("name")===identity.name&&candidate.getAttribute("type")===identity.type;
    return false;
  })||null;
}
_replacePanelPreservingUiState(existing,next){
  const sameView=existing?.dataset.settingsScope===next?.dataset.settingsScope
    &&existing?.dataset.settingsPage===next?.dataset.settingsPage;
  const scrollTop=sameView?(existing?.querySelector(".mha-settings-body")?.scrollTop||0):0;
  const focusIdentity=sameView?this._getPanelFocusIdentity(existing):null;
  if(existing)existing.replaceWith(next);
  else this.shadowRoot.append(next);
  const body=next.querySelector(".mha-settings-body");
  if(body)body.scrollTop=scrollTop;
  if(!next.hidden)this._findPanelFocusTarget(next,focusIdentity)?.focus?.({preventScroll:true});
}
_syncSettingsDom(){
  const existing=this.shadowRoot.querySelector('.mha-settings-panel[data-settings-scope="all"]');
  this._syncSettingsModalState();
  this._replacePanelPreservingUiState(existing,this._createSettingsPanel());
}
_getSettingsPanelProps(scope="all"){
  const themeState=this._themeController.read();
  const screensaverState=this._screensaverController.read();
  const themeStyle=themeState.themeStyle;
  const iconShapeSetting=themeState.iconShapeSetting;
  const effectiveIconShape=this.dataset.iconShape
    || document.documentElement.dataset.iconShape
    || themeState.iconShape;

  return {
    open:scope==="screensaver"?this._screensaverSettingsOpen:this._settingsOpen,
    scope,
    theme:themeState.themeSetting,
    themeStyle,
    iosGlass:themeState.iosGlass,
    accent:themeState.accent,
    accentMode:themeState.accentMode,
    iconShape:iconShapeSetting,
    effectiveIconShape,
    screensaverEnabled:screensaverState.enabled,
    screensaverDelay:screensaverState.delay,
    screensaverPreview:screensaverState.preview,
    screensaverNowBar:screensaverState.nowBar,
    screensaverClockVariant:screensaverState.clockVariant,
    settingsPage:this._settingsPage,
    dockPages:this._pages,
    activeDockPageId:this._activePageId,
    selectedDockPageId:this._dockSettingsPageId,
    dockPosition:this._dockPosition,
    customWallpapers:this._customWallpapers,
    onClose:()=>scope==="screensaver"?this._closeScreensaverSettings():this._closeSettings(),
    onThemeChange:v=>this._applyThemeFromSettings(v),
    onThemeStyleChange:v=>this._applyThemeStyleFromSettings(v),
    onIosGlassChange:v=>this._applyIosGlassFromSettings(v),
    onAccentChange:v=>this._applyAccentFromSettings(v),
    onAccentModeChange:v=>this._applyAccentModeFromSettings(v),
    onIconShapeChange:v=>this._applyIconShapeFromSettings(v),
    onScreensaverEnabledChange:v=>this._applyScreensaverEnabledFromSettings(v),
    onScreensaverDelayChange:v=>this._applyScreensaverDelayFromSettings(v),
    onScreensaverPreviewChange:v=>this._applyScreensaverPreviewFromSettings(v),
    onScreensaverNowBarChange:v=>this._applyScreensaverNowBarFromSettings(v),
    onScreensaverClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
    onResetGrid:()=>this.resetGrid(),
    onOpenWallpaperSettings:()=>this._openWallpaperSettings(),
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
  };
}

_migrateLegacyCustomWallpaper(){
  this._wallpaperController.migrateLegacy();
}
_readCustomWallpapers(){
  return this._wallpaperController.read();
}
_applyCustomWallpaperState(themeState=this._themeController.read()){
  this._customWallpapers=this._wallpaperController.apply(themeState);
}
_saveCustomWallpaper(mode,payload){
  this._customWallpapers=this._wallpaperController.save(mode,payload);
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
  this._scheduleIconSymbolRefresh();
}
_resetCustomWallpaper(mode){
  this._customWallpapers=this._wallpaperController.reset(mode);
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
}
async _syncAutoAccentFromWallpaper(){
  const requestId=++this._autoAccentRequestId;
  const themeState=this._themeController.read();
  const activeWallpaper=this._wallpaperController.getActiveWallpaper(themeState,this._customWallpapers);
  const dataUrl=activeWallpaper?.image||"";

  if(!dataUrl){
    this.style.removeProperty("--mha-accent-auto");
    this.style.removeProperty("--mha-accent-auto-contrast");
    return;
  }

  try{
    const accent=await extractAccentFromWallpaper(dataUrl,themeState.themeStyle);
    if(requestId!==this._autoAccentRequestId)return;
    if(accent?.color){
      this.style.setProperty("--mha-accent-auto",accent.color);
      this.style.setProperty("--mha-accent-auto-contrast",accent.contrast||"#fff");
    }
  }catch(error){
    console.warn(`[MHA] Auto accent could not be extracted for ${themeState.themeStyle}.`,error);
  }

  if(requestId===this._autoAccentRequestId){
    this._themeController.sync();
    this._syncSettingsDom();
    this._scheduleAppearanceDomRefresh();
  }
}
_isMobileLandscapeLayout(){
  return this._isMobileLauncherLayout()&&window.matchMedia?.("(orientation: landscape)")?.matches;
}
_createWidgetManagerPanel(){
  return createWidgetManager({
    open:this._widgetManagerOpen,
    activeCategory:this._widgetManagerCategory,
    categories:WIDGET_MANAGER_CATEGORIES,
    onClose:()=>this._closeWidgetManager(),
    onBack:()=>this._showWidgetManagerCategories(),
    onSelectCategory:id=>this._selectWidgetManagerCategory(id),
    onSelectWidget:item=>this._beginWidgetPlacement(item),
  });
}
_syncWidgetManagerDom(){
  const existing=this.shadowRoot.querySelector(".mha-widget-manager-panel");
  if(existing)existing.remove();
  this.shadowRoot.append(this._createWidgetManagerPanel());
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
  if(supportsWidgetConfiguration(widget)){
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
_createWidgetConfigPanel(){
  return createWidgetConfigPopup({
    session:this._widgetConfigSession,
    hass:this._hass,
    visibilityConfig:this._entityVisibilityConfig,
    onCancel:()=>this._closeWidgetConfig(),
    onSave:()=>this._saveWidgetConfig(),
    onChange:change=>{
      if(change?.rerender)this._syncWidgetConfigDom();
    },
  });
}
_syncWidgetConfigDom(){
  const existing=this.shadowRoot?.querySelector?.(".mha-widget-config-popup");
  if(existing)existing.remove();
  this.shadowRoot?.append?.(this._createWidgetConfigPanel());
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
  this._activeMoveWidgetId="";
  this._widgetConfigSession=createWidgetConfigSession(widget,this._hass,{
    mode:"edit",
    visibilityConfig:this._entityVisibilityConfig,
  });
  this._widgetConfigHassReady=Boolean(this._hass);
  this._syncEditModeDom();
  this._syncWidgetConfigDom();
}
_createSettingsPanel(){
  return createSettingsPanel(this._getSettingsPanelProps("all"));
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
  const existing=this.shadowRoot.querySelector('.mha-settings-panel[data-settings-scope="screensaver"]');
  this.classList.toggle("is-screensaver-settings-open",this._screensaverSettingsOpen);
  this.dataset.screensaverSettingsOpen=String(this._screensaverSettingsOpen);
  this._replacePanelPreservingUiState(existing,createSettingsPanel(this._getSettingsPanelProps("screensaver")));
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
_openDockPageSettings(id=""){
  if(!this._pages.some(page=>page.id===id))return;
  this._settingsOpen=true;
  this._settingsPage="dock-detail";
  this._dockSettingsPageId=id;
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_moveDockPage(id="",direction=0){
  const result=movePage(this._pages,id,direction);
  if(!result)return;
  this._pages=result.pages;
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_renameDockPage(id="",name=""){
  const result=renamePage(this._pages,id,name);
  if(!result)return;
  this._pages=result.pages;
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_changeDockPageIcon(id="",icon="grid"){
  const result=changePageIcon(this._pages,id,icon);
  this._pages=result.pages;
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_deleteDockPage(id=""){
  const result=deletePage(this._pages,this._activePageId,id);
  if(!result)return;
  this._pages=result.pages;
  this._activePageId=result.activePageId;
  if(result.activePageChanged){
    this._widgets=this._readWidgets();
  }
  this._widgetPositions=removePageWidgetPositions(
    this._widgetPositions,
    id,
    result.removedWidgetIds,
  );
  const positionsSaved=writeJson(POSITIONS,this._widgetPositions);
  if(this._dockSettingsPageId===id){
    this._settingsPage="dock";
    this._dockSettingsPageId="";
  }
  const pagesSaved=this._savePages();
  this._recordPersistenceResult(positionsSaved&&pagesSaved);
  this._syncDocksDom();
  this._syncSettingsDom();
  this._refreshActiveGridOnly();
  this._syncWidgetDropSlots();
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

_refreshAppearanceDom(){
  if(!this.isConnected||!this.shadowRoot)return;

  this._syncDocksDom();
  this._refreshActiveGridOnly();
  this._scheduleIconSymbolRefresh();
}

_scheduleAppearanceDomRefresh(){
  cancelAnimationFrame(this._appearanceRefreshFrame);
  this._appearanceRefreshFrame=requestAnimationFrame(()=>{
    this._appearanceRefreshFrame=0;
    this._refreshAppearanceDom();
  });
}

_applyThemeFromSettings(value="auto"){
  const themeState=this._themeController.setTheme(value);
  this._applyCustomWallpaperState(themeState);
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
  this._scheduleAppearanceDomRefresh();
}

_transitionSystemThemeChange(){
  if(!this.isConnected)return;

  const reducedMotion=window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const cover=this.shadowRoot.querySelector(".mha-theme-transition-cover")||document.createElement("div");
  cover.className="mha-theme-transition-cover";
  cover.dataset.state="covering";
  cover.setAttribute("aria-hidden","true");
  if(!cover.parentNode)this.shadowRoot.append(cover);
  cover.style.background=getComputedStyle(cover).background;

  this.classList.add("is-theme-transitioning");
  clearTimeout(this._themeTransitionTimer);
  cancelAnimationFrame(this._themeTransitionFrame);

  const themeState=this._themeController.sync();
  this._applyCustomWallpaperState(themeState);
  this._syncAutoAccentFromWallpaper();
  this._scheduleAppearanceDomRefresh();

  const finish=()=>{
    cover.dataset.state="revealing";
    const duration=reducedMotion?0:260;
    this._themeTransitionTimer=setTimeout(()=>{
      cover.remove();
      this.classList.remove("is-theme-transitioning");
    },duration);
  };

  if(reducedMotion){
    finish();
    return;
  }

  // Wait for two paints so CSS variables and theme selectors settle under the cover.
  this._themeTransitionFrame=requestAnimationFrame(()=>{
    this._themeTransitionFrame=requestAnimationFrame(finish);
  });
}

_applyThemeStyleFromSettings(value="oneui"){
  const themeState=this._themeController.setThemeStyle(value);
  this._applyCustomWallpaperState(themeState);
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
  this._scheduleAppearanceDomRefresh();
}

_applyIosGlassFromSettings(value="liquid"){
  this._themeController.setIosGlass(value);
  this._syncSettingsDom();
  this._scheduleAppearanceDomRefresh();
}

_applyAccentFromSettings(value=""){
  this._themeController.setAccent(value);
  this._syncSettingsDom();
  this._scheduleAppearanceDomRefresh();
}

_applyAccentModeFromSettings(value="manual"){
  this._themeController.setAccentMode(value);
  if(value==="auto")this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
  this._scheduleAppearanceDomRefresh();
}

_applyIconShapeFromSettings(value="auto"){
  this._themeController.setIconShape(value);
  this._syncSettingsDom();
  this._scheduleAppearanceDomRefresh();
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
_syncScreensaverDom(){
  this._syncScreensaverVisibilityState();
  const existing=this.shadowRoot.querySelector(".mha-screensaver");
  if(!existing)return;
  const screensaverState=this._screensaverController.read();
  const next=createScreensaver({
    isVisible:this._getScreensaverVisible(),
    showNowBar:screensaverState.nowBar,
    clockVariant:screensaverState.clockVariant,
    onClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
    onOpenScreensaverSettings:()=>this._openScreensaverSettings(),
    onWake:()=>this._wakeScreensaver(),
  });
  existing.replaceWith(next);
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
}toggleScreensaverPreview(){const state=this._screensaverController.read();this._screensaverController.setPreviewState(!state.preview);this._syncScreensaverDom()}toggleNowBarPreview(){const state=this._screensaverController.read();this._screensaverController.setNowBarState(!state.nowBar);this._syncScreensaverDom()}setScreensaverClockVariant(v="digital"){this._screensaverController.setClockVariantState(v);this._syncScreensaverDom()}resetGrid(){localStorage.removeItem(ORDER);localStorage.removeItem(SIZES);localStorage.removeItem(REMOVED);localStorage.removeItem(POSITIONS);localStorage.removeItem(PAGES);localStorage.removeItem(ACTIVE_PAGE);this._widgetPositions={};this._activeMoveWidgetId="";this._pages=this._readPages();this._activePageId=this._readActivePageId();this._widgets=this._readWidgets();this.render()}
_migrateStorageSchema(){
  const result=migratePageStorage({
    defaultWidgets:DEFAULT_WIDGETS,
    normalizeWidget:normalizeStoredWidgetContract,
    normalizeWidgetForGrid:normalizeWidgetForKind,
  });
  if(result.migrated)this._recordPersistenceResult(result.success);
}
_normalizePage(page={},index=0){
  return normalizePage(page,index,{normalizeWidget:normalizeStoredWidgetContract});
}
_readPages(){
  const result=readPages({normalizeWidget:normalizeStoredWidgetContract});
  if(result.persistenceResult!==null)this._recordPersistenceResult(result.persistenceResult);
  return result.pages;
}
_readActivePageId(){
  const result=readActivePageId(this._pages);
  if(result.persistenceResult!==null)this._recordPersistenceResult(result.persistenceResult);
  return result.activePageId;
}
_getActivePage(){
  return getActivePage(this._pages,this._activePageId);
}
_recordPersistenceResult(success){
  this.dataset.persistenceState=success?"saved":"error";
  return success;
}
_savePages(){
  return this._recordPersistenceResult(savePages(
    this._pages,
    this._activePageId,
    {normalizeWidget:normalizeStoredWidgetContract},
  ));
}
_readWidgets(){
  const page=this._getActivePage();
  if(!page)return [];
  return (page.widgets||[]).map(widget=>{
    const normalized=normalizeStoredWidgetContract(widget);
    return {...normalized,...normalizeWidgetForKind(normalized)};
  });
}
_syncActivePageWidgets(){
  const page=this._getActivePage();
  if(!page)return false;
  page.widgets=this._widgets.map(widget=>normalizeStoredWidgetContract(widget));
  return this._savePages();
}
_setActivePage(id){
  const result=selectPage(this._pages,this._activePageId,id);
  if(!result)return;
  this._activeMoveWidgetId="";
  this._pendingWidgetPlacement=null;
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._activePageId=result.activePageId;
  this._recordPersistenceResult(writeStorageValue(ACTIVE_PAGE,result.activePageId));
  this._widgets=this._readWidgets();
  this._refreshActiveGridOnly();
  this._syncDocksDom();
}

_addGridPage({icon="grid"}={}){
  const result=addPage(this._pages,{
    icon,
    normalizeWidget:normalizeStoredWidgetContract,
  });
  this._pages=result.pages;
  this._activePageId=result.activePageId;
  this._widgets=[];
  this._pageCreatorOpen=false;
  this._newPageIcon="grid";
  this._savePages();
  this._syncDocksDom();
  this._syncPageCreatorDom();
  this._refreshActiveGridOnly();
  this._syncWidgetDropSlots();
}
_openPageCreator(){
  if(!this._isEditing||this._isMobileLandscapeLayout())return;
  this._pageCreatorOpen=true;
  this._newPageIcon=this._newPageIcon||"grid";
  this._syncPageCreatorDom();
}
_closePageCreator(){
  this._pageCreatorOpen=false;
  this._syncPageCreatorDom();
}
_setPageCreatorIcon(icon="grid"){
  this._newPageIcon=String(icon||"grid");
  this._updatePageCreatorIconDom();
}
_getPageCreatorPanels(){
  return Array.from(this.shadowRoot?.querySelectorAll?.('section.mha-page-creator:not(.mha-widget-config-popup)')||[]);
}
_updatePageCreatorIconDom(){
  this._getPageCreatorPanels().forEach(panel=>{
    panel.querySelectorAll?.(".mha-page-creator-icon")?.forEach(button=>{
      const optionName=button.dataset?.icon||"";
      const selected=optionName===this._newPageIcon;
      button.dataset.selected=String(selected);
      button.setAttribute("aria-pressed",String(selected));
    });
  });
}
_createPageFromCreator(){
  if(!this._isEditing||this._isMobileLandscapeLayout())return;
  this._addGridPage({icon:this._newPageIcon||"grid"});
}
_createPageCreatorPanel(){
  const panel=document.createElement("section");
  panel.className="mha-page-creator";
  panel.dataset.open=String(this._pageCreatorOpen);
  panel.setAttribute("aria-hidden",String(!this._pageCreatorOpen));

  const scrim=document.createElement("button");
  scrim.className="mha-page-creator-scrim";
  scrim.type="button";
  scrim.setAttribute("aria-label","Fermer le choix d’icône");
  scrim.onclick=()=>this._closePageCreator();

  const sheet=document.createElement("div");
  sheet.className="mha-page-creator-sheet";
  sheet.setAttribute("role","dialog");
  sheet.setAttribute("aria-modal","true");
  sheet.setAttribute("aria-label","Nouvelle page");

  const header=document.createElement("div");
  header.className="mha-page-creator-header";
  const title=document.createElement("h2");
  title.textContent="Nouvelle page";
  const close=createCloseButton({
    label:"Fermer",
    className:"mha-page-creator-close",
    onClick:()=>this._closePageCreator(),
  });
  header.append(title,close);

  const hint=document.createElement("p");
  hint.className="mha-page-creator-hint";
  hint.textContent="Choisis l’icône qui apparaîtra dans le dock.";

  const grid=document.createElement("div");
  grid.className="mha-page-creator-icons";
  PAGE_ICON_OPTIONS.forEach(option=>{
    const button=document.createElement("button");
    button.className="mha-page-creator-icon";
    button.type="button";
    button.dataset.icon=option.name;
    button.dataset.selected=String(option.name===this._newPageIcon);
    button.setAttribute("aria-pressed",String(option.name===this._newPageIcon));
    button.setAttribute("aria-label",option.label);
    button.onclick=()=>this._setPageCreatorIcon(option.name);
    button.append(createIcon({
      name:option.name,
      category:option.category,
      label:option.label,
      children:createIconSymbol({name:option.name,label:option.label}),
    }));
    const label=document.createElement("span");
    label.textContent=option.label;
    button.append(label);
    grid.append(button);
  });

  const actions=document.createElement("div");
  actions.className="mha-page-creator-actions";
  const cancel=document.createElement("button");
  cancel.className="mha-page-creator-secondary";
  cancel.type="button";
  cancel.textContent="Annuler";
  cancel.onclick=()=>this._closePageCreator();
  const create=document.createElement("button");
  create.className="mha-page-creator-primary";
  create.type="button";
  create.textContent="Créer la page";
  create.onclick=()=>this._createPageFromCreator();
  actions.append(cancel,create);

  sheet.append(header,hint,grid,actions);
  panel.append(scrim,sheet);
  return panel;
}
_syncPageCreatorDom(){
  this._getPageCreatorPanels().forEach(panel=>panel.remove());
  this.shadowRoot?.append?.(this._createPageCreatorPanel());
}

_updateDockActiveState(){
  syncDockActiveState(this.shadowRoot,this._activePageId);
}
_getDockProps(){
  return createDockProps({
    pages:this._pages,
    activePageId:this._activePageId,
    isEditing:this._isEditing,
    onPageSelect:id=>this._setActivePage(id),
    onAddPage:()=>this._openPageCreator(),
    onDockSettings:()=>this._openDockSettings(),
    onSettings:()=>this._openSettings(),
  });
}
_syncDocksDom(){
  syncDocks(this.shadowRoot,this._getDockProps());
}
_refreshActiveGridOnly(){
  cancelAnimationFrame(this._widgetRenderFrame);
  this._widgetRenderFrame=0;
  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  if(!grid){this.render();return;}
  grid.querySelectorAll(".mha-widget,.mha-widget-drop-slot").forEach(node=>{
    destroyDomSubtree(node);
    node.remove();
  });
  const {units}=this._getGridBounds();
  const positions=this._getActiveWidgetPositions({create:true});
  this._widgets.forEach(w=>{
    const el=createWidgetShell(w,{activeGridUnits:units,isEditing:this._isEditing,isMoveTarget:this._isEditing&&this._activeMoveWidgetId===w.id,position:positions?.[w.id],hass:this._hass,entityVisibilityConfig:this._entityVisibilityConfig,onToggleMove:id=>this._toggleWidgetMoveMode(id),onMove:(id,direction)=>this._moveWidgetByDirection(id,direction),onRemove:id=>this._removeWidget(id),onCycleVariant:id=>this.cycleVariant(id),onConfigure:id=>this._openWidgetConfig(id)});
    this._wireDrag(el,w);
    grid.append(el);
  });
  this._updateDockActiveState();
  this._syncWidgetDropSlots();
  this._scheduleSquareUnitSync();
  updateClockWidgets(this.shadowRoot);
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
  const bounds=this._getGridBounds();
  return `${this._activePageId||"home"}:${getEffectiveLayout(this)}:${bounds.units}x${bounds.rowUnits}`;
}
_getStoredWidgetPositions(){
  const key=this._getWidgetPositionKey();
  const positions=this._widgetPositions[key];
  if(!positions||typeof positions!=="object"||Array.isArray(positions))return null;
  const {units,rowUnits}=this._getGridBounds();
  const normalized={};
  for(const widget of this._widgets){
    const position=positions[widget.id];
    const x=Number(position?.x);
    const y=Number(position?.y);
    if(!Number.isInteger(x)||!Number.isInteger(y)){
      delete this._widgetPositions[key];
      this._recordPersistenceResult(writeJson(POSITIONS,this._widgetPositions));
      return null;
    }
    normalized[widget.id]={x,y};
  }
  if(!this._isPositionMapValidForWidgets(normalized,this._widgets,units,rowUnits)){
    delete this._widgetPositions[key];
    this._recordPersistenceResult(writeJson(POSITIONS,this._widgetPositions));
    return null;
  }
  if(Object.keys(positions).length!==Object.keys(normalized).length){
    this._widgetPositions[key]=normalized;
    this._recordPersistenceResult(writeJson(POSITIONS,this._widgetPositions));
  }
  return normalized;
}
_saveCurrentWidgetPositions(positions){
  this._widgetPositions[this._getWidgetPositionKey()]=positions;
  return this._recordPersistenceResult(writeJson(POSITIONS,this._widgetPositions));
}
_applyWidgetPositionsToDom(positions){
  if(!positions)return;
  const {units}=this._getGridBounds();
  this._widgets.forEach(widget=>{
    const position=positions[widget.id];
    const el=this.shadowRoot.querySelector(`[data-widget-id="${widget.id}"]`);
    if(!position||!el)return;
    const size=normalizeWidgetForKind(widget);
    el.style.gridColumn=`${position.x} / span ${Math.min(units,size.w)}`;
    el.style.gridRow=`${position.y} / span ${size.h}`;
  });
}
_clearCurrentWidgetPositions(){
  const key=this._getWidgetPositionKey();
  if(!this._widgetPositions[key])return;
  delete this._widgetPositions[key];
  this._recordPersistenceResult(writeJson(POSITIONS,this._widgetPositions));
  this.shadowRoot.querySelectorAll(".mha-widget").forEach(el=>{
    el.style.removeProperty("grid-column");
    el.style.removeProperty("grid-row");
  });
}
_packWidgetsForCurrentGrid(){
  const {units,rowUnits}=this._getGridBounds();
  return packWidgets(this._widgets,units,rowUnits,{
    allowUnboundedRows:this._isMobileLauncherLayout(),
  });
}
_getActiveWidgetPositions({create=false}={}){
  const stored=this._getStoredWidgetPositions();
  if(stored)return stored;
  if(!create)return null;
  const packed=this._packWidgetsForCurrentGrid();
  if(packed){
    this._saveCurrentWidgetPositions(packed);
    this._applyWidgetPositionsToDom(packed);
  }
  return packed;
}
_toggleWidgetMoveMode(id){
  if(!this._isEditing||!this._widgets.some(widget=>widget.id===id))return;
  this._activeMoveWidgetId=this._activeMoveWidgetId===id?"":id;
  this._syncEditModeDom();this._syncWidgetDropSlots();
}
_rectsOverlap(a,b){
  return rectsOverlap(a,b);
}
_getWidgetRectFromPosition(widget,position,units){
  return getWidgetRectFromPosition(widget,position,units);
}
_findWidgetAtCandidatePosition(id,candidateRect,positions,units){
  return findWidgetAtCandidatePosition(this._widgets,id,candidateRect,positions,units);
}
_canSwapWidgetPositions(id,occupantId,nextPositions,units){
  return hasNoWidgetOverlaps(this._widgets,nextPositions,units);
}
_getWidgetsInCandidateRect(id,candidateRect,positions,units){
  return getWidgetsInCandidateRect(this._widgets,id,candidateRect,positions,units);
}
_doesWidgetGroupExactlyFillRect(widgets,targetRect,positions,units){
  return doesWidgetGroupExactlyFillRect(widgets,targetRect,positions,units);
}
_translateWidgetGroupPositions(group,targetRect,destinationRect,positions){
  return translateWidgetGroupPositions(group,targetRect,destinationRect,positions);
}
_getGroupBoundingRect(group,positions,units){
  return getGroupBoundingRect(group,positions,units);
}
_isGroupInternallyValid(group,positions,units){
  return isGroupInternallyValid(group,positions,units);
}
_getAdjacentWidgetGroupInDirection(id,direction,positions,units){
  return getAdjacentWidgetGroupInDirection(this._widgets,id,direction,positions,units);
}
_isPositionMapValidForWidgets(nextPositions,widgets,units,rowUnits){
  return isPositionMapValidForWidgets(nextPositions,widgets,units,rowUnits,{
    allowUnboundedRows:this._isMobileLauncherLayout(),
  });
}
_isPositionMapValid(nextPositions,units,rowUnits){
  return this._isPositionMapValidForWidgets(
    nextPositions,
    this._widgets,
    units,
    rowUnits,
  );
}
_getBandParticipantsForTranslatedSwap(id,group,direction,positions,units){
  return getBandParticipantsForTranslatedSwap(this._widgets,id,group,positions,units);
}
_packTranslatedSwapBand(id,group,direction,positions,units,rowUnits){
  return packTranslatedSwapBand(
    this._widgets,
    id,
    group,
    direction,
    positions,
    units,
    rowUnits,
    {allowUnboundedRows:this._isMobileLauncherLayout()},
  );
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
_getDirectNeighborInDirection(id,direction,positions,units){
  return getDirectNeighborInDirection(this._widgets,id,direction,positions,units);
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
  grid.querySelectorAll(".mha-widget-drop-slot").forEach(slot=>slot.remove());
  grid.dataset.dropSlotsCount="0";
  grid.classList.remove("has-drop-slots");
  if(!this._isEditing)return;
  const positions=this._getActiveWidgetPositions({create:true});
  const placementWidget=this._pendingWidgetPlacement;
  const activeId=this._activeMoveWidgetId;
  const slots=placementWidget
    ? this._getAvailableDropSlotsForCandidate(placementWidget,positions,{x:0,y:0})
    : activeId
      ? this._getAvailableDropSlotsForWidget(activeId,positions)
      : [];
  grid.dataset.dropSlotsCount=String(slots.length);
  grid.dataset.dropSlotMode=placementWidget?"add":activeId?"move":"none";
  if(!slots.length)return;
  const fragment=document.createDocumentFragment();
  slots.forEach(slot=>{
    const button=document.createElement("button");
    button.className="mha-widget-drop-slot";
    button.type="button";
    button.setAttribute("aria-label",placementWidget?`Ajouter le widget ici, colonne ${slot.x}, rangée ${slot.y}`:`Déplacer le widget ici, colonne ${slot.x}, rangée ${slot.y}`);
    button.dataset.x=String(slot.x);
    button.dataset.y=String(slot.y);
    button.style.gridColumn=`${slot.x} / span ${slot.w}`;
    button.style.gridRow=`${slot.y} / span ${slot.h}`;
    button.addEventListener("click",event=>{
      event.preventDefault();
      event.stopPropagation();
      if(this._pendingWidgetPlacement)this._placePendingWidgetAtSlot(slot.x,slot.y);
      else this._moveWidgetToDropSlot(this._activeMoveWidgetId,slot.x,slot.y);
    });
    fragment.append(button);
  });
  grid.prepend(fragment);
  grid.classList.add("has-drop-slots");
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
  if(!this._isEditing||!this._pendingWidgetPlacement)return;
  const widget=normalizeStoredWidgetContract({...this._pendingWidgetPlacement});
  const positions=this._getActiveWidgetPositions({create:true});
  const {units,rowUnits}=this._getGridBounds();
  const nextPositions={...positions,[widget.id]:{x:Number(x)||1,y:Number(y)||1}};
  const nextWidgets=[...this._widgets,widget];
  if(!this._isPositionMapValidForWidgets(nextPositions,nextWidgets,units,rowUnits))return;

  this._widgets=this._normalizeWidgetsToGridBounds(nextWidgets);
  this._saveCurrentWidgetPositions(nextPositions);
  this._saveWidgets();

  this._pendingWidgetPlacement=null;
  this._activeMoveWidgetId="";

  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  if(grid){
    const el=createWidgetShell(widget,{
      activeGridUnits:units,
      isEditing:this._isEditing,
      isMoveTarget:false,
      position:nextPositions[widget.id],
      hass:this._hass,
      entityVisibilityConfig:this._entityVisibilityConfig,
      onToggleMove:id=>this._toggleWidgetMoveMode(id),
      onMove:(id,direction)=>this._moveWidgetByDirection(id,direction),
      onRemove:id=>this._removeWidget(id),
      onCycleVariant:id=>this.cycleVariant(id),
      onConfigure:id=>this._openWidgetConfig(id),
    });

    this._wireDrag(el,widget);
    grid.append(el);
    this._applyWidgetPositionsToDom(nextPositions);
    this._renderWidgetDropSlots(grid);
  }

  this._syncEditModeDom();
  updateClockWidgets(this.shadowRoot);
  this._syncWidgetDropSlots();
  this._scheduleSquareUnitSync();
}
_moveWidgetToDropSlot(id,x,y){
  return this._placementController.moveToDropSlot(id,x,y);
}
_moveWidgetByDirection(id,direction){
  return this._placementController.moveByDirection(id,direction);
}
_canApplyVariant(id,candidateWidget){
  if(!id||!candidateWidget)return false;

  const positions=this._getActiveWidgetPositions({create:true});
  const currentPosition=positions?.[id];
  if(!positions||!currentPosition)return false;

  const {units,rowUnits}=this._getGridBounds();
  const nextWidgets=this._widgets.map(widget=>(
    widget.id===id
      ? normalizeStoredWidgetContract({...widget,...candidateWidget})
      : widget
  ));

  return this._isPositionMapValidForWidgets(positions,nextWidgets,units,rowUnits);
}
_applyWidgetVariant(id,candidateWidget){
  const index=this._widgets.findIndex(widget=>widget.id===id);
  if(index<0||!candidateWidget)return false;

  const current=this._widgets[index];
  const currentSize=normalizeWidgetForKind(current);
  const next=normalizeStoredWidgetContract({
    ...current,
    ...candidateWidget,
  });
  const nextSize=normalizeWidgetForKind(next);

  if(!sameVariantSize(currentSize,nextSize)&&!this._canApplyVariant(id,next)){
    return false;
  }

  const nextWidgets=[...this._widgets];
  nextWidgets[index]={
    ...next,
    ...nextSize,
  };

  this._widgets=this._normalizeWidgetsToGridBounds(nextWidgets.map(normalizeStoredWidgetContract));
  this._saveWidgets();
  this._replaceWidgetDom(id);
  return true;
}
_replaceWidgetDom(id){
  const widget=this._widgets.find(item=>item.id===id);
  const existing=this.shadowRoot?.querySelector?.(`[data-widget-id="${id}"]`);
  const grid=this.shadowRoot?.querySelector?.(".mha-grid");

  if(!widget||!existing||!grid){
    this.render();
    return;
  }

  const {units}=this._getGridBounds();
  const positions=this._getActiveWidgetPositions({create:true});
  const next=createWidgetShell(widget,{
    activeGridUnits:units,
    isEditing:this._isEditing,
    isMoveTarget:this._isEditing&&this._activeMoveWidgetId===id,
    position:positions?.[id],
    hass:this._hass,
    entityVisibilityConfig:this._entityVisibilityConfig,
    onToggleMove:widgetId=>this._toggleWidgetMoveMode(widgetId),
    onMove:(widgetId,direction)=>this._moveWidgetByDirection(widgetId,direction),
    onRemove:widgetId=>this._removeWidget(widgetId),
    onCycleVariant:widgetId=>this.cycleVariant(widgetId),
    onConfigure:widgetId=>this._openWidgetConfig(widgetId),
  });

  this._wireDrag(next,widget);
  destroyDomSubtree(existing);
  existing.replaceWith(next);
  this._applyWidgetPositionsToDom(positions);
  updateClockWidgets(this.shadowRoot);
  this._syncEditModeDom();
  this._syncWidgetDropSlots();
  this._scheduleSquareUnitSync();
}
cycleVariant(id){
  if(!this._isEditing||!id)return false;

  const widget=this._widgets.find(item=>item.id===id);
  if(!widget)return false;

  const entries=getNextWidgetVariantEntries(widget);
  if(!entries.length)return false;

  for(const entry of entries){
    const candidate=getVariantCandidate(widget,entry);
    if(this._applyWidgetVariant(id,candidate))return true;
  }

  return false;
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
  let next=this._clampWidgetSizeToGridBounds(current,requested);
  const originalWidgets=this._widgets;

  while(next.h>=1){
    let test=originalWidgets.map(w=>w.id===current.id?{...w,...next}:w);
    test=this._normalizeWidgetsToGridBounds(test);

    if(this._doesWidgetLayoutFitGrid(test))return next;

    if(next.h>1){
      next={...next,h:next.h-1};
      continue;
    }

    if(next.w>1){
      next={...next,w:next.w-1,h:Math.max(1,requested.h)};
      continue;
    }

    break;
  }

  return normalizeWidgetForKind(current);
}
_getGridMetrics(){const grid=this.shadowRoot.querySelector(".mha-grid");if(!grid)return null;const st=getComputedStyle(grid);const col=parseFloat(st.gridTemplateColumns.split(" ")[0])||72;const gap=parseFloat(st.columnGap||st.gap||"0")||0;const row=parseFloat(st.gridAutoRows)||72;return{columnStep:col+gap,rowStep:row+gap}}
_getInternalGridBoundsFromPreset(preset){
  const logicalColumns=Number(preset?.columns)||Number(this.dataset.logicalColumns)||1;
  const logicalRows=Number(preset?.rows)||Number(this.dataset.logicalRows)||1;
  return {
    logicalColumns:Math.max(1,logicalColumns),
    logicalRows:Math.max(1,logicalRows),
    units:getInternalGridColumnCountFromLogical(logicalColumns),
    rowUnits:getInternalGridRowCountFromLogical(logicalRows),
  };
}
_clampWidgetSizeToGridBounds(widget,size){
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset?.()||getGridPreset(this,layout,this._getWidgetAreaMetrics?.()||{});
  const bounds=this._getInternalGridBoundsFromPreset(preset);

  const x=Number(widget?.x ?? widget?.col ?? widget?.column ?? 1)||1;
  const y=Number(widget?.y ?? widget?.row ?? 1)||1;

  const maxW=Math.max(1,bounds.units-x+1);
  const maxH=Math.max(1,bounds.rowUnits-y+1);
  /*
   * Resize boundary guard:
   * User-facing widget names stay iOS/Android-style. A 2x2 widget still spans
   * 2 internal grid units, which equals 1 logical column by 1 logical row.
   * Bounds are therefore checked against the internal 2x grid, not the visible
   * logical cell count.
   */
  return {
    ...size,
    w:Math.max(1,Math.min(Number(size?.w)||1,maxW)),
    h:Math.max(1,Math.min(Number(size?.h)||1,maxH)),
  };
}
_clampWidgetPositionToGridBounds(widget,position){
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset?.()||getGridPreset(this,layout,this._getWidgetAreaMetrics?.()||{});
  const bounds=this._getInternalGridBoundsFromPreset(preset);

  const w=Math.max(1,Number(widget?.w)||1);
  const h=Math.max(1,Number(widget?.h)||1);
  const maxX=Math.max(1,bounds.units-w+1);
  const maxY=Math.max(1,bounds.rowUnits-h+1);

  /*
   * Drag boundary guard:
   * Positions are stored on the internal square-unit grid. This keeps the public
   * vocabulary stable: 2x2 is one logical cell, while x/y still address the
   * precise internal CSS grid lines.
   */
  return {
    ...position,
    x:Math.max(1,Math.min(Number(position?.x)||1,maxX)),
    y:Math.max(1,Math.min(Number(position?.y)||1,maxY)),
  };
}
_normalizeWidgetToGridBounds(widget){
  const size=this._clampWidgetSizeToGridBounds(widget,widget);
  const position=this._clampWidgetPositionToGridBounds({...widget,...size},widget);
  return {...widget,...size,...position};
}
_normalizeWidgetsToGridBounds(widgets=this._widgets){
  return widgets.map(widget=>this._normalizeWidgetToGridBounds(widget));
}


_startResize(){return false}
_updateResize(e){const s=this._resizeState;if(!s||e.pointerId!==s.pointerId)return;e.preventDefault();const current=this._widgets.find(w=>w.id===s.widgetId)||{};let ns=normalizeWidgetForKind({...current,w:s.startW+Math.round((e.clientX-s.startX)/s.metrics.columnStep),h:s.startH+Math.round((e.clientY-s.startY)/s.metrics.rowStep)});ns=this._findFittingResize(current,ns);const nextWidgets=this._widgets.map(w=>w.id===s.widgetId?{...w,...ns}:w);if(!this._doesWidgetLayoutFitGrid(this._normalizeWidgetsToGridBounds(nextWidgets)))return;this._widgets=this._normalizeWidgetsToGridBounds(nextWidgets);const el=this.shadowRoot.querySelector(`[data-widget-id="${s.widgetId}"]`);if(!el)return;const density=getWidgetDensity(ns);el.dataset.widgetConfiguredW=String(ns.w);el.dataset.widgetW=String(Math.min(ns.w,getActiveGridUnits(this)));el.dataset.widgetH=String(ns.h);el.dataset.widgetSize=sizeToString(ns);el.dataset.widgetDensity=density;el.style.setProperty("--mha-widget-w",String(Math.min(ns.w,getActiveGridUnits(this))));el.style.setProperty("--mha-widget-configured-w",String(ns.w));el.style.setProperty("--mha-widget-h",String(ns.h));const badge=el.querySelector(".mha-size-badge");if(badge)badge.textContent=`${sizeToString(ns)} · ${density}`}
_finishResize(){
  const s=this._resizeState;
  if(!s)return;
  const el=this.shadowRoot.querySelector(`[data-widget-id="${s.widgetId}"]`);
  el?.classList.remove("is-resizing");
  this._resizeState=null;
  this._saveWidgets();
  this._scheduleSquareUnitSync();
}
_getDropPlacement(e,t){const r=t.getBoundingClientRect(),u=r.top+r.height*.35,l=r.top+r.height*.65;if(e.clientY<u)return"before";if(e.clientY>l)return"after";return e.clientX<r.left+r.width/2?"before":"after"}
_clearDropState(){this.shadowRoot.querySelectorAll(".is-drop-before,.is-drop-after").forEach(n=>{n.classList.remove("is-drop-before","is-drop-after");n.removeAttribute("data-drop-placement")})}
_wireDrag(el){
  if(!el)return;
  el.draggable=false;
  el.removeAttribute("draggable");
}
_createWidgetElement(widget,{units,position}){
  const el=createWidgetShell(widget,{
    activeGridUnits:units,
    isEditing:this._isEditing,
    isMoveTarget:this._isEditing&&this._activeMoveWidgetId===widget.id,
    position,
    hass:this._hass,
    entityVisibilityConfig:this._entityVisibilityConfig,
    onToggleMove:id=>this._toggleWidgetMoveMode(id),
    onMove:(id,direction)=>this._moveWidgetByDirection(id,direction),
    onRemove:id=>this._removeWidget(id),
    onCycleVariant:id=>this.cycleVariant(id),
    onConfigure:id=>this._openWidgetConfig(id),
  });
  this._wireDrag(el,widget);
  return el;
}
_createWidgetPlaceholder(widget,{units,position}){
  const size=normalizeWidgetSize(widget);
  const effectiveWidgetW=Math.min(size.w,units);
  const el=document.createElement("article");
  el.className="mha-widget mha-widget-placeholder";
  el.dataset.widgetPlaceholderId=widget.id;
  el.dataset.widgetConfiguredW=String(size.w);
  el.dataset.widgetW=String(effectiveWidgetW);
  el.dataset.widgetH=String(size.h);
  el.dataset.widgetSize=sizeToString(size);
  el.dataset.widgetDensity=getWidgetDensity(size);
  el.setAttribute("aria-hidden","true");
  el.style.setProperty("--mha-widget-w",String(effectiveWidgetW));
  el.style.setProperty("--mha-widget-configured-w",String(size.w));
  el.style.setProperty("--mha-widget-h",String(size.h));
  if(position){
    el.style.gridColumn=`${position.x} / span ${effectiveWidgetW}`;
    el.style.gridRow=`${position.y} / span ${size.h}`;
  }
  return el;
}
_appendWidgetPlaceholders(grid,{units,positions}){
  const fragment=document.createDocumentFragment();
  this._widgets.forEach(widget=>{
    fragment.append(this._createWidgetPlaceholder(widget,{
      units,
      position:positions?.[widget.id],
    }));
  });
  grid.append(fragment);
  this.dataset.widgetsState=this._widgets.length?"loading":"ready";
}
_startProgressiveWidgetRender({grid,units,positions,renderId}){
  cancelAnimationFrame(this._widgetRenderFrame);
  const queue=[...this._widgets];
  const batchSize=getEffectiveLayout(this)==="mobile"?1:2;
  const renderBatch=()=>{
    this._widgetRenderFrame=0;
    if(!this.isConnected||this._renderId!==renderId)return;
    const fragment=document.createDocumentFragment();
    const replacements=[];
    queue.splice(0,batchSize).forEach(widget=>{
      const placeholder=grid.querySelector(`[data-widget-placeholder-id="${widget.id}"]`);
      const el=this._createWidgetElement(widget,{
        units,
        position:positions?.[widget.id],
      });
      if(placeholder)replacements.push([placeholder,el]);
      else fragment.append(el);
    });
    replacements.forEach(([placeholder,el])=>placeholder.replaceWith(el));
    if(fragment.childNodes.length)grid.append(fragment);
    if(queue.length){
      this._widgetRenderFrame=requestAnimationFrame(renderBatch);
      return;
    }
    this.dataset.widgetsState="ready";
    this._scheduleSquareUnitSync();
    this._scheduleHassUpdate();
    this._syncWidgetDropSlots();
    this._scheduleIconSymbolRefresh();
  };
  this._widgetRenderFrame=requestAnimationFrame(renderBatch);
}
_appendPrimaryControls(){
  const edit=document.createElement("button");
  edit.className="mha-edit-button mha-main-edit-button mha-primary-edit-button";
  edit.type="button";
  edit.innerHTML=this._isEditing?ICONS.close:ICONS.edit;
  edit.onclick=()=>this.toggleEditMode();
  this.shadowRoot.append(edit);

  const addWidget=document.createElement("button");
  addWidget.className="mha-edit-button mha-main-edit-button mha-add-widget-button";
  addWidget.type="button";
  addWidget.innerHTML=`<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>`;
  addWidget.setAttribute("aria-label","Ajouter un widget");
  addWidget.hidden=!this._isEditing;
  addWidget.onclick=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    this._openWidgetManager();
  };
  this.shadowRoot.append(addWidget);
  this.classList.toggle("is-editing",this._isEditing);
  this.dataset.editing=String(this._isEditing);
}
_appendDeferredUi({layout,renderId}){
  cancelAnimationFrame(this._secondaryUiFrame);
  this._secondaryUiFrame=requestAnimationFrame(()=>{
    this._secondaryUiFrame=0;
    if(!this.isConnected||this._renderId!==renderId)return;
    if(layout!=="mobile"){
      this.shadowRoot.append(createMobileDock(this._getDockProps()));
    }
    const screensaverState=this._screensaverController.read();
    this.shadowRoot.append(createScreensaver({
      isVisible:this._getScreensaverVisible(),
      showNowBar:screensaverState.nowBar,
      clockVariant:screensaverState.clockVariant,
      onClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
      onOpenScreensaverSettings:()=>this._openScreensaverSettings(),
      onWake:()=>this._wakeScreensaver(),
    }));
    this.shadowRoot.append(this._createSettingsPanel());
    this.shadowRoot.append(this._createWidgetManagerPanel());
    this.shadowRoot.append(this._createPageCreatorPanel());
    this.shadowRoot.append(this._createWidgetConfigPanel());
    this.shadowRoot.append(createSettingsPanel(this._getSettingsPanelProps("screensaver")));
    this._syncEditModeDom();
    this._syncScreensaverVisibilityState();
    this._scheduleIconSymbolRefresh();
  });
}
render(){
  const themeState=this._themeController.sync();
  this._applyCustomWallpaperState();
  const renderId=++this._renderId;
  const layoutMode=getLayoutMode(this);
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset();
  const units=getInternalGridColumnCountFromLogical(preset.columns);
  const rows=getInternalGridRowCountFromLogical(preset.rows);
  const cols=preset.columns;
  const logicalRows=preset.rows;
  const {themeStyle,iconShapeSetting,iconShape,accent}=themeState;

  cancelAnimationFrame(this._widgetRenderFrame);
  cancelAnimationFrame(this._secondaryUiFrame);
  this._clearGridScrollListener();
  this._stylesReadyRenderId=0;
  this.dataset.widgetsState="pending";
  this.dataset.themeStyle=themeStyle;
  this.dataset.iconShapeSetting=iconShapeSetting;
  this.dataset.iconShape=iconShape;
  this.dataset.layoutMode=layoutMode;
  this.dataset.layout=layout;
  this.dataset.dockPosition=this._dockPosition;
  this.dataset.gridDensity=preset.density;
  this.dataset.gridUnits=String(units);
  this.dataset.logicalColumns=String(cols);
  this.dataset.gridRows=String(rows);
  this.dataset.logicalRows=String(logicalRows);
  this.classList.toggle("is-editing",this._isEditing);
  this.style.setProperty("--mha-runtime-grid-units",String(units));
  this.style.setProperty("--mha-runtime-grid-rows",String(rows));
  this.style.setProperty("--mha-runtime-logical-columns",String(cols));
  this.style.setProperty("--mha-runtime-logical-rows",String(logicalRows));

  this.dataset.accent=accent;
  document.documentElement.dataset.accent=accent;
  document.documentElement.dataset.iconShapeSetting=iconShapeSetting;
  document.documentElement.dataset.iconShape=iconShape;

  destroyDomSubtree(this.shadowRoot);
  this.shadowRoot.innerHTML=createCriticalBootStyle()+createFrontendStyleLinks();
  const links=[...this.shadowRoot.querySelectorAll('link[rel="stylesheet"]')];
  const {bg,shell,grid}=createShell({
    layoutMode,
    layout,
    logicalColumns:cols,
    gridUnits:units,
    pages:this._pages,
    activePageId:this._activePageId,
    isEditing:this._isEditing,
    onPageSelect:id=>this._setActivePage(id),
    onAddPage:()=>this._openPageCreator(),
    onDockSettings:()=>this._openDockSettings(),
    onSettings:()=>this._openSettings(),
  });
  this.shadowRoot.append(bg,shell);

  const positions=this._getActiveWidgetPositions({create:true});
  this._appendWidgetPlaceholders(grid,{units,positions});
  if(layout==="mobile"){
    this.shadowRoot.append(createMobileDock(this._getDockProps()));
  }
  this._appendPrimaryControls();
  this._wireDockAutoHide(grid);
  updateStatusTime(this.shadowRoot);

  this._widgetRenderFrame=requestAnimationFrame(()=>{
    this._widgetRenderFrame=0;
    if(this._renderId!==renderId)return;
    this._startProgressiveWidgetRender({grid,units,positions,renderId});
  });

  Promise.all(links.map(link=>link.sheet
    ?Promise.resolve()
    :new Promise(resolve=>{
      link.addEventListener("load",resolve,{once:true});
      link.addEventListener("error",resolve,{once:true});
    })))
    .then(()=>{
      if(this._renderId!==renderId)return;
      this._stylesReadyRenderId=renderId;
      this._observeLayoutSize();
      this._scheduleIconSymbolRefresh();
      if(this._bootComplete){
        this._appendDeferredUi({layout,renderId});
      }else{
        this._pendingDeferredUi={layout,renderId};
        this._tryCompleteBoot();
      }
    })
    .catch(error=>{
      console.warn("[MHA] Styles did not finish loading; revealing the shell.",error);
      if(this._bootComplete){
        this._appendDeferredUi({layout,renderId});
      }else{
        this._pendingDeferredUi={layout,renderId};
        this._finishBoot({fallback:true,reason:"stylesheet initialization failed"});
      }
    });

  this._scheduleScreensaverIdleTimer();
}
}

customElements.define("mha-widget-hub",MhaControlHub);
