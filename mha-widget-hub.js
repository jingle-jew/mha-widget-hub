import {
  readBoolean,
  readJson,
  readNumberOption,
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
import {destroyDomSubtree} from "./src/core/dom-lifecycle.js";
import {ICONS} from "./src/components/icons.js";
import {createShell} from "./src/layout/shell.js";
import {createDock} from "./src/layout/dock.js";
import {createMobileDock} from "./src/layout/mobile-dock.js";
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
import {
  migrateLegacyWallpaper,
  readLegacyWallpaper,
  readWallpapers,
  resetWallpaper,
  saveWallpaper,
} from "./src/settings/wallpaper-storage.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import {createWidgetShell} from "./src/widgets/widget-shell.js";
import { getNextWidgetVariantEntries, getVariantCandidate, sameVariantSize } from "./src/widgets/widget-variants.js";
import {
  getWidgetDefinition,
  normalizeWidgetContract,
  resolveWidgetKind,
} from "./src/widgets/widget-registry.js";
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
import { RESPONSIVE_BREAKPOINTS } from "./src/layout/responsive.js";
import {createScreensaver,normalizeClockVariant,updateScreensaverClock} from "./src/screensaver/screensaver.js";
import { createIcon } from "./src/ui/icon.js";
import { createIconSymbol } from "./src/ui/icon-symbol.js";
import { createCloseButton } from "./src/system/system-buttons.js";
import { loadEntityVisibilityConfig } from "./src/admin/entity-visibility-store.js";
import { normalizeEntityVisibilityConfig } from "./src/admin/entity-permissions.js";

const MHA_FRONTEND_ROOT_URL = new URL(".", import.meta.url);
const MHA_FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");

const MHA_STYLE_MANIFEST = [
  ["styles/core/tokens.css", "tokens"],
  ["styles/components/icon.css", "component"],
  ["styles/components/icon-symbol.css", "component"],
  ["styles/components/slider.css", "component"],
  ["styles/components/toggle.css", "component"],
  ["styles/components/pill.css", "component"],
  ["styles/components/button.css", "component"],
  ["styles/system/system-buttons.css", "component"],
  ["styles/themes/ios.css", "theme"],
  ["styles/themes/oneui.css", "theme"],
  ["styles/themes/material.css", "theme"],
  ["styles/themes/accent-palettes.css", "theme"],
  ["styles/themes/semantic-tokens.css", "theme"],
  ["styles/core/background.css", "structure"],
  ["styles/layout/shell.css", "structure"],
  ["styles/layout/widget-grid.css", "structure"],
  ["styles/layout/status-bar.css", "structure"],
  ["styles/layout/dock.css", "structure"],
  ["styles/layout/mobile-dock.css", "structure"],
  ["styles/layout/floating-controls.css", "structure"],
  ["styles/settings/settings-panel.css", "component"],
  ["styles/widget-manager/widget-manager.css", "component"],
  ["styles/widget-manager/widget-config-popup.css", "component"],
  ["styles/themes/light-text-contract.css", "theme"],
  ["styles/widgets/widget-layout.css", "structure"],
  ["styles/widgets/widget-shell.css", "structure"],
  ["styles/widgets/slider-widget.css", "component"],
  ["styles/widgets/clock-widget.css", "component"],
  ["styles/widgets/simple-button-widget.css", "component"],
  ["styles/widgets/toggle-widget.css", "component"],
  ["styles/widgets/toggle-slider-widget.css", "component"],
  ["styles/widgets/toggle-buttons-widget.css", "component"],
  ["styles/widgets/weather-widget.css", "component"],
  ["styles/screensaver/screensaver.css", "component"],
];

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
    :host([data-boot-state="booting"][data-custom-wallpaper="true"]) .mha-background {
      background-image: var(--mha-custom-wallpaper-image) !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
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
  screensaverEnabled:SCREENSAVER_ENABLED,
  screensaverDelay:SCREENSAVER_DELAY,
  screensaverNowBar:SCREENSAVER_NOWBAR,
  screensaverClockVariant:SCREENSAVER_CLOCK_VARIANT,
  legacyScreensaverClockVariant:LEGACY_SCREENSAVER_CLOCK_VARIANT,
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
 * Screensaver: enabled
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
  this._squareUnitFrame=0;
  this._gridRuntimeFrame=0;
  this._widgetDropSlotsFrame=0;
  this._layoutResizeObserver=null;
  this._observedLayoutSize="";
  this._renderId=0;
  this._readyRaf=0;
  this._viewportRaf=0;
  this._relayoutTimer=0;
  this._systemThemeListener=null;
  this._themeTransitionTimer=0;
  this._themeTransitionFrame=0;
  this._gridScrollCleanup=null;
  this._screensaverPreview=false;
  this._screensaverActive=false;
  this._screensaverNowBar=true;
  this._screensaverClockVariant="digital";
  this._screensaverIdleTimer=0;
  this._screensaverEnabled=true;
  this._screensaverDelay=30000;
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
  this._screensaverNowBar=readBoolean(SCREENSAVER_NOWBAR,true);
  this._screensaverClockVariant=localStorage.getItem(SCREENSAVER_CLOCK_VARIANT)
    ||localStorage.getItem(LEGACY_SCREENSAVER_CLOCK_VARIANT)
    ||"digital";
  this._screensaverEnabled=readBoolean(SCREENSAVER_ENABLED,true);
  this._screensaverDelay=readNumberOption(
    SCREENSAVER_DELAY,
    30000,
    [15000,30000,120000,300000],
  );
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
  this._clockTimer=setInterval(()=>{updateStatusTime(this.shadowRoot);updateClockWidgets(this.shadowRoot);if(this._getScreensaverVisible())updateScreensaverClock(this.shadowRoot,this._screensaverClockVariant)},1000);
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
  cancelAnimationFrame(this._squareUnitFrame);
  this._squareUnitFrame=0;
  cancelAnimationFrame(this._gridRuntimeFrame);
  this._gridRuntimeFrame=0;
  cancelAnimationFrame(this._widgetDropSlotsFrame);
  this._widgetDropSlotsFrame=0;
  this._disconnectLayoutResizeObserver();
  cancelAnimationFrame(this._themeTransitionFrame);
  this._themeTransitionFrame=0;
  clearTimeout(this._themeTransitionTimer);
  this._themeTransitionTimer=0;
  this._clearGridScrollListener();
  ["pointerdown","touchstart","keydown","wheel","scroll"].forEach(type=>window.removeEventListener(type,this._activityListener));
  clearTimeout(this._screensaverIdleTimer);
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
  clearTimeout(this._screensaverIdleTimer);
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
    screensaverEnabled:this._screensaverEnabled,
    screensaverDelay:this._screensaverDelay,
    screensaverPreview:this._screensaverPreview,
    screensaverNowBar:this._screensaverNowBar,
    screensaverClockVariant:this._screensaverClockVariant,
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
  const effectiveTheme=this._themeController.read().theme;
  migrateLegacyWallpaper(localStorage,effectiveTheme);
}
_readCustomWallpapers(){
  const wallpapers=readWallpapers(localStorage);
  const effectiveTheme=this._themeController.read().theme;
  if(!wallpapers[effectiveTheme]){
    wallpapers[effectiveTheme]=readLegacyWallpaper(localStorage);
  }
  return wallpapers;
}
_applyCustomWallpaperState(theme=this._themeController.read().theme){
  this._customWallpapers=this._readCustomWallpapers();
  const wallpaper=this._customWallpapers[theme];
  const hasWallpaper=Boolean(wallpaper?.dataUrl);
  this.dataset.customWallpaper=String(hasWallpaper);
  if(hasWallpaper){
    this.style.setProperty("--mha-custom-wallpaper-image",`url("${wallpaper.dataUrl}")`);
  }else{
    this.style.removeProperty("--mha-custom-wallpaper-image");
  }
}
_saveCustomWallpaper(mode,payload){
  if(!saveWallpaper(localStorage,mode,payload))throw new Error("Invalid wallpaper payload");
  this._customWallpapers=this._readCustomWallpapers();
  this._applyCustomWallpaperState();
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
}
_resetCustomWallpaper(mode){
  resetWallpaper(localStorage,mode);
  this._customWallpapers=this._readCustomWallpapers();
  this._applyCustomWallpaperState();
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
}
async _syncAutoAccentFromWallpaper(){
  const requestId=++this._autoAccentRequestId;
  const themeState=this._themeController.read();
  const wallpaper=this._customWallpapers?.[themeState.theme];
  const dataUrl=wallpaper?.dataUrl||"";
  if(!dataUrl)return;

  for(const themeStyle of ["oneui","material"]){
    try{
      const accent=await extractAccentFromWallpaper(dataUrl,themeStyle);
      if(requestId!==this._autoAccentRequestId)return;
      if(accent)this._themeController.setAutoAccent(themeStyle,accent);
    }catch(error){
      console.warn(`[MHA] Auto accent could not be extracted for ${themeStyle}.`,error);
    }
  }

  if(requestId===this._autoAccentRequestId){
    this._themeController.sync();
    this._syncSettingsDom();
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
  const timestamp=Date.now().toString(36);
  const random=Math.random().toString(36).slice(2,7);
  const kind=resolveWidgetKind(item);
  const definition=getWidgetDefinition(kind);
  const rawVariant=item?.variant||definition?.defaultVariant||kind;
  const category=item?.category||definition?.category||"custom";
  const baseSize=item?.size||definition?.defaultSize||{w:2,h:2};
  const size=normalizeWidgetForKind({
    kind,
    type:kind,
    category,
    variant:rawVariant,
    ...baseSize,
  });

  return normalizeStoredWidgetContract({
    id:`widget-${category}-${rawVariant||kind}-${timestamp}-${random}`,
    kind,
    type:kind,
    component:definition?.component||"empty-widget",
    category,
    variant:rawVariant,
    title:item?.label||"Widget",
    w:size.w,
    h:size.h,
  });
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
  const from=this._pages.findIndex(page=>page.id===id);
  if(from<0)return;
  const to=from+(Number(direction)<0?-1:1);
  if(to<0||to>=this._pages.length)return;
  const pages=[...this._pages];
  const [page]=pages.splice(from,1);
  pages.splice(to,0,page);
  this._pages=pages;
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_renameDockPage(id="",name=""){
  const clean=String(name||"").trim();
  if(!clean)return;
  this._pages=this._pages.map(page=>page.id===id?{...page,name:clean}:page);
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_changeDockPageIcon(id="",icon="grid"){
  const next=String(icon||"grid");
  this._pages=this._pages.map(page=>page.id===id?{...page,icon:next}:page);
  this._savePages();
  this._syncDocksDom();
  this._syncSettingsDom();
}
_deleteDockPage(id=""){
  if(!id||this._pages.length<=1)return;
  const page=this._pages.find(page=>page.id===id);
  if(!page)return;
  const removedWidgetIds=new Set((page.widgets||[]).map(widget=>widget?.id).filter(Boolean));
  this._pages=this._pages.filter(page=>page.id!==id);
  if(this._activePageId===id){
    this._activePageId=this._pages[0]?.id||"home";
    this._widgets=this._readWidgets();
  }
  Object.keys(this._widgetPositions||{}).forEach(key=>{
    if(key.startsWith(`${id}:`)){
      delete this._widgetPositions[key];
      return;
    }
    const layout=this._widgetPositions[key];
    if(layout&&typeof layout==="object"){
      removedWidgetIds.forEach(widgetId=>delete layout[widgetId]);
    }
  });
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
_applyThemeFromSettings(value="auto"){
  const themeState=this._themeController.setTheme(value);
  this._applyCustomWallpaperState(themeState.theme);
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
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
  this._applyCustomWallpaperState(themeState.theme);

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
  this._themeController.setThemeStyle(value);
  this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
}

_applyIosGlassFromSettings(value="liquid"){
  this._themeController.setIosGlass(value);
  this._syncSettingsDom();
}

_applyAccentFromSettings(value=""){
  this._themeController.setAccent(value);
  this._syncSettingsDom();
}

_applyAccentModeFromSettings(value="manual"){
  this._themeController.setAccentMode(value);
  if(value==="auto")this._syncAutoAccentFromWallpaper();
  this._syncSettingsDom();
}

_applyIconShapeFromSettings(value="auto"){
  this._themeController.setIconShape(value);
  this._syncSettingsDom();
}

_isScreensaverBlocked(){
  return this._settingsOpen||this._isEditing;
}
_getScreensaverVisible(){
  return Boolean(this._screensaverPreview||this._screensaverActive);
}
_setScreensaverActive(active=false){
  const next=Boolean(active)&&this._screensaverEnabled&&!this._isScreensaverBlocked();
  if(this._screensaverActive===next){
    this._syncScreensaverVisibilityState();
    this._syncScreensaverDom();
    return;
  }
  this._screensaverActive=next;
  this._syncScreensaverDom();
}
_scheduleScreensaverIdleTimer(){
  clearTimeout(this._screensaverIdleTimer);
  if(!this._screensaverEnabled||this._isScreensaverBlocked())return;
  this._screensaverIdleTimer=setTimeout(()=>{
    this._setScreensaverActive(true);
  },this._screensaverDelay);
}
_handleUserActivity(){
  if(this._screensaverSettingsOpen)return;
  if(this._screensaverActive){
    this._setScreensaverActive(false);
  }
  this._scheduleScreensaverIdleTimer();
}
_applyScreensaverEnabledFromSettings(enabled=false){
  this._screensaverEnabled=Boolean(enabled);
  this._recordPersistenceResult(writeStorageValue(SCREENSAVER_ENABLED,this._screensaverEnabled));
  if(!this._screensaverEnabled){
    this._setScreensaverActive(false);
  }
  this._scheduleScreensaverIdleTimer();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverDelayFromSettings(delay=30000){
  const numeric=Number(delay);
  this._screensaverDelay=[15000,30000,120000,300000].includes(numeric)?numeric:30000;
  this._recordPersistenceResult(writeStorageValue(SCREENSAVER_DELAY,this._screensaverDelay));
  this._scheduleScreensaverIdleTimer();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverPreviewFromSettings(enabled=false){
  this._screensaverPreview=Boolean(enabled);
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
  this._scheduleScreensaverIdleTimer();
}
_applyScreensaverNowBarFromSettings(enabled=true){
  this._screensaverNowBar=Boolean(enabled);
  this._recordPersistenceResult(writeStorageValue(SCREENSAVER_NOWBAR,this._screensaverNowBar));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverClockVariantFromSettings(variant="digital"){
  this._screensaverClockVariant=normalizeClockVariant(variant);
  const saved=writeStorageValue(SCREENSAVER_CLOCK_VARIANT,this._screensaverClockVariant)
    &&writeStorageValue(LEGACY_SCREENSAVER_CLOCK_VARIANT,this._screensaverClockVariant);
  this._recordPersistenceResult(saved);
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
  const next=createScreensaver({
    isVisible:this._getScreensaverVisible(),
    showNowBar:this._screensaverNowBar,
    clockVariant:this._screensaverClockVariant,
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
}toggleScreensaverPreview(){this._screensaverPreview=!this._screensaverPreview;this._syncScreensaverDom()}toggleNowBarPreview(){this._screensaverNowBar=!this._screensaverNowBar;this._syncScreensaverDom()}setScreensaverClockVariant(v="digital"){this._screensaverClockVariant=normalizeClockVariant(v);this._syncScreensaverDom()}resetGrid(){localStorage.removeItem(ORDER);localStorage.removeItem(SIZES);localStorage.removeItem(REMOVED);localStorage.removeItem(POSITIONS);localStorage.removeItem(PAGES);localStorage.removeItem(ACTIVE_PAGE);this._widgetPositions={};this._activeMoveWidgetId="";this._pages=this._readPages();this._activePageId=this._readActivePageId();this._widgets=this._readWidgets();this.render()}
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
  if(!id||id===this._activePageId||!this._pages.some(page=>page.id===id))return;
  this._activeMoveWidgetId="";
  this._pendingWidgetPlacement=null;
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._activePageId=id;
  this._recordPersistenceResult(writeStorageValue(ACTIVE_PAGE,id));
  this._widgets=this._readWidgets();
  this._refreshActiveGridOnly();
  this._syncDocksDom();
}

_addGridPage({icon="grid"}={}){
  const index=this._pages.length+1;
  const id=`page-${Date.now().toString(36)}-${index}`;
  this._pages=[...this._pages,this._normalizePage({id,name:`Page ${index}`,icon,widgets:[]},index-1)];
  this._activePageId=id;
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
  this._syncPageCreatorDom();
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
  const existing=this.shadowRoot?.querySelector?.(".mha-page-creator");
  if(existing)existing.remove();
  this.shadowRoot?.append?.(this._createPageCreatorPanel());
}

_updateDockActiveState(){
  this.shadowRoot?.querySelectorAll?.("[data-page-id]").forEach(button=>{
    const active=button.dataset.pageId===this._activePageId;
    button.dataset.active=String(active);
    button.setAttribute("aria-current",active?"page":"false");
  });
}
_getDockProps(){
  return {
    pages:this._pages,
    activePageId:this._activePageId,
    isEditing:this._isEditing,
    onPageSelect:id=>this._setActivePage(id),
    onAddPage:()=>this._openPageCreator(),
    onDockSettings:()=>this._openDockSettings(),
    onSettings:()=>this._openSettings(),
  };
}
_syncDocksDom(){
  const root=this.shadowRoot;
  if(!root)return;
  const props=this._getDockProps();
  const dock=root.querySelector(".mha-dock");
  if(dock)dock.replaceWith(createDock(props));
  const mobileDock=root.querySelector(".mha-mobile-dock");
  if(mobileDock)mobileDock.replaceWith(createMobileDock(props));
  this._updateDockActiveState();
}
_refreshActiveGridOnly(){
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
_removeWidget(id){if(!this._widgets.some(w=>w.id===id))return;if(this._activeMoveWidgetId===id)this._activeMoveWidgetId="";this._widgets=this._widgets.filter(w=>w.id!==id);Object.values(this._widgetPositions).forEach(layout=>{if(layout&&typeof layout==="object")delete layout[id]});const positionsSaved=writeJson(POSITIONS,this._widgetPositions);const widgetsSaved=this._saveWidgets();this._recordPersistenceResult(positionsSaved&&widgetsSaved);const element=this.shadowRoot.querySelector(`[data-widget-id="${id}"]`);if(element){destroyDomSubtree(element);element.remove()}this._clearDropState();this._scheduleSquareUnitSync()}

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
  const maxRows=this._isMobileLauncherLayout()?Number.POSITIVE_INFINITY:rowUnits;
  const occupied=[];
  const positions={};
  const isFree=(x,y,w,h)=>{
    if(x<1||x+w-1>units||y<1||y+h-1>maxRows)return false;
    for(let yy=y;yy<y+h;yy+=1){
      for(let xx=x;xx<x+w;xx+=1){
        if(occupied[yy]?.[xx])return false;
      }
    }
    return true;
  };
  const occupy=(x,y,w,h)=>{
    for(let yy=y;yy<y+h;yy+=1){
      occupied[yy]??=[];
      for(let xx=x;xx<x+w;xx+=1)occupied[yy][xx]=true;
    }
  };

  for(const widget of this._widgets){
    const size=normalizeWidgetForKind(widget);
    const w=Math.min(units,size.w);
    const h=size.h;
    let placed=null;
    for(let y=1;!placed&&y<=maxRows-h+1;y+=1){
      for(let x=1;x<=units-w+1;x+=1){
        if(isFree(x,y,w,h)){
          placed={x,y};
          break;
        }
      }
    }
    if(!placed)return null;
    positions[widget.id]=placed;
    occupy(placed.x,placed.y,w,h);
  }

  return positions;
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
  return this._widgets.find(other=>{
    if(other.id===id)return false;
    const otherPosition=positions?.[other.id];
    if(!otherPosition)return false;
    const otherRect=this._getWidgetRectFromPosition(other,otherPosition,units);
    return this._rectsOverlap(candidateRect,otherRect);
  })||null;
}
_canSwapWidgetPositions(id,occupantId,nextPositions,units){
  return this._widgets.every(widget=>{
    const position=nextPositions?.[widget.id];
    if(!position)return true;
    const rect=this._getWidgetRectFromPosition(widget,position,units);
    return this._widgets.every(other=>{
      if(other.id===widget.id)return true;
      const otherPosition=nextPositions?.[other.id];
      if(!otherPosition)return true;
      const otherRect=this._getWidgetRectFromPosition(other,otherPosition,units);
      return !this._rectsOverlap(rect,otherRect);
    });
  });
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
  const widget=this._widgets.find(item=>item.id===id);
  const position=positions?.[id];
  if(!widget||!position)return [];

  const activeRect=this._getWidgetRectFromPosition(widget,position,units);

  const isInForwardHalfPlane=rect=>{
    if(direction==="right")return rect.x>=activeRect.x+activeRect.w;
    if(direction==="left")return rect.x+rect.w<=activeRect.x;
    if(direction==="down")return rect.y>=activeRect.y+activeRect.h;
    if(direction==="up")return rect.y+rect.h<=activeRect.y;
    return false;
  };

  const overlapsBand=rect=>{
    if(direction==="right"||direction==="left"){
      return rect.y<activeRect.y+activeRect.h&&rect.y+rect.h>activeRect.y;
    }
    if(direction==="down"||direction==="up"){
      return rect.x<activeRect.x+activeRect.w&&rect.x+rect.w>activeRect.x;
    }
    return false;
  };

  const candidates=this._widgets
    .filter(other=>other.id!==id&&positions?.[other.id])
    .map(other=>({
      widget:other,
      rect:this._getWidgetRectFromPosition(other,positions[other.id],units),
    }))
    .filter(item=>isInForwardHalfPlane(item.rect)&&overlapsBand(item.rect));

  if(!candidates.length)return [];

  const edgeValue=item=>{
    if(direction==="right")return item.rect.x;
    if(direction==="left")return -(item.rect.x+item.rect.w);
    if(direction==="down")return item.rect.y;
    if(direction==="up")return -(item.rect.y+item.rect.h);
    return 0;
  };

  const nearestEdge=Math.min(...candidates.map(edgeValue));
  const seed=candidates.filter(item=>edgeValue(item)===nearestEdge);
  const group=new Map(seed.map(item=>[item.widget.id,item.widget]));
  let bounds=this._getGroupBoundingRect([...group.values()],positions,units);

  let changed=true;
  while(changed){
    changed=false;
    for(const item of candidates){
      if(group.has(item.widget.id))continue;
      const expanded={
        x:Math.min(bounds.x,item.rect.x),
        y:Math.min(bounds.y,item.rect.y),
        w:Math.max(bounds.x+bounds.w,item.rect.x+item.rect.w)-Math.min(bounds.x,item.rect.x),
        h:Math.max(bounds.y+bounds.h,item.rect.y+item.rect.h)-Math.min(bounds.y,item.rect.y),
      };

      const touchesOrOverlaps=
        item.rect.x<=bounds.x+bounds.w&&item.rect.x+item.rect.w>=bounds.x&&
        item.rect.y<=bounds.y+bounds.h&&item.rect.y+item.rect.h>=bounds.y;

      if(touchesOrOverlaps){
        group.set(item.widget.id,item.widget);
        bounds=expanded;
        changed=true;
      }
    }
  }

  return [...group.values()];
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
  const ids=new Set([id,...group.map(widget=>widget.id)]);
  const active=this._widgets.find(widget=>widget.id===id);
  const activePosition=positions?.[id];
  if(!active||!activePosition)return [];

  const activeRect=this._getWidgetRectFromPosition(active,activePosition,units);
  const groupRect=this._getGroupBoundingRect(group,positions,units);
  if(!groupRect)return [];

  const band={
    x:Math.min(activeRect.x,groupRect.x),
    y:Math.min(activeRect.y,groupRect.y),
    w:Math.max(activeRect.x+activeRect.w,groupRect.x+groupRect.w)-Math.min(activeRect.x,groupRect.x),
    h:Math.max(activeRect.y+activeRect.h,groupRect.y+groupRect.h)-Math.min(activeRect.y,groupRect.y),
  };

  return this._widgets
    .filter(widget=>ids.has(widget.id))
    .map(widget=>({
      widget,
      rect:this._getWidgetRectFromPosition(widget,positions[widget.id],units),
    }))
    .filter(item=>this._rectsOverlap(item.rect,band));
}
_packTranslatedSwapBand(id,group,direction,positions,units,rowUnits){
  const participants=this._getBandParticipantsForTranslatedSwap(id,group,direction,positions,units);
  if(!participants.length)return null;

  const activeItem=participants.find(item=>item.widget.id===id);
  if(!activeItem)return null;

  const activeRect=activeItem.rect;
  const groupRect=this._getGroupBoundingRect(group,positions,units);
  if(!groupRect)return null;

  const groupItems=participants.filter(item=>item.widget.id!==id);
  if(!groupItems.length)return null;

  const next={...positions};

  if(direction==="right"||direction==="left"){
    const fromX=Math.min(activeRect.x,groupRect.x);
    const toX=Math.max(activeRect.x+activeRect.w,groupRect.x+groupRect.w);
    const leftToRight=direction==="right";

    const ordered=leftToRight
      ? [activeItem,...groupItems.sort((a,b)=>a.rect.x-b.rect.x||a.rect.y-b.rect.y)]
      : [...groupItems.sort((a,b)=>a.rect.x-b.rect.x||a.rect.y-b.rect.y),activeItem];

    let cursor=fromX;
    ordered.forEach(item=>{
      next[item.widget.id]={x:cursor,y:item.rect.y};
      cursor+=item.rect.w;
    });

    if(cursor!==toX)return null;
    return this._isPositionMapValid(next,units,rowUnits)?next:null;
  }

  if(direction==="down"||direction==="up"){
    const fromY=Math.min(activeRect.y,groupRect.y);
    const toY=Math.max(activeRect.y+activeRect.h,groupRect.y+groupRect.h);
    const topToBottom=direction==="down";

    const ordered=topToBottom
      ? [activeItem,...groupItems.sort((a,b)=>a.rect.y-b.rect.y||a.rect.x-b.rect.x)]
      : [...groupItems.sort((a,b)=>a.rect.y-b.rect.y||a.rect.x-b.rect.x),activeItem];

    let cursor=fromY;
    ordered.forEach(item=>{
      next[item.widget.id]={x:item.rect.x,y:cursor};
      cursor+=item.rect.h;
    });

    if(cursor!==toY)return null;
    return this._isPositionMapValid(next,units,rowUnits)?next:null;
  }

  return null;
}
_tryTranslatedGroupSwap(id,direction,positions,units,rowUnits){
  const widget=this._widgets.find(item=>item.id===id);
  const current=positions?.[id];
  if(!widget||!current)return false;

  const activeRect=this._getWidgetRectFromPosition(widget,current,units);
  const group=this._getAdjacentWidgetGroupInDirection(id,direction,positions,units);
  if(!group.length)return false;
  if(!this._isGroupInternallyValid(group,positions,units))return false;

  const groupRect=this._getGroupBoundingRect(group,positions,units);
  if(!groupRect)return false;

  const isAxisAdjacent=
    direction==="right"?groupRect.x>=activeRect.x+activeRect.w:
    direction==="left"?groupRect.x+groupRect.w<=activeRect.x:
    direction==="down"?groupRect.y>=activeRect.y+activeRect.h:
    direction==="up"?groupRect.y+groupRect.h<=activeRect.y:
    false;

  if(!isAxisAdjacent)return false;

  const bandCompatible=
    direction==="right"||direction==="left"
      ? groupRect.y<=activeRect.y&&groupRect.y+groupRect.h>=activeRect.y+activeRect.h
      : groupRect.x<=activeRect.x&&groupRect.x+groupRect.w>=activeRect.x+activeRect.w;

  if(!bandCompatible)return false;

  const packedPositions=this._packTranslatedSwapBand(id,group,direction,positions,units,rowUnits);
  if(!packedPositions)return false;

  this._saveCurrentWidgetPositions(packedPositions);
  this._applyWidgetPositionsToDom(packedPositions);
  this._scheduleSquareUnitSync();
  return true;
}
_getDirectNeighborInDirection(id,direction,positions,units){
  const widget=this._widgets.find(item=>item.id===id);
  const position=positions?.[id];
  if(!widget||!position)return null;

  const activeRect=this._getWidgetRectFromPosition(widget,position,units);

  const candidates=this._widgets
    .filter(other=>other.id!==id&&positions?.[other.id])
    .map(other=>({
      widget:other,
      rect:this._getWidgetRectFromPosition(other,positions[other.id],units),
    }))
    .filter(item=>{
      if(direction==="right"){
        return item.rect.x>=activeRect.x+activeRect.w&&item.rect.y<activeRect.y+activeRect.h&&item.rect.y+item.rect.h>activeRect.y;
      }
      if(direction==="left"){
        return item.rect.x+item.rect.w<=activeRect.x&&item.rect.y<activeRect.y+activeRect.h&&item.rect.y+item.rect.h>activeRect.y;
      }
      if(direction==="down"){
        return item.rect.y>=activeRect.y+activeRect.h&&item.rect.x<activeRect.x+activeRect.w&&item.rect.x+item.rect.w>activeRect.x;
      }
      if(direction==="up"){
        return item.rect.y+item.rect.h<=activeRect.y&&item.rect.x<activeRect.x+activeRect.w&&item.rect.x+item.rect.w>activeRect.x;
      }
      return false;
    });

  if(!candidates.length)return null;

  const distance=item=>{
    if(direction==="right")return item.rect.x-(activeRect.x+activeRect.w);
    if(direction==="left")return activeRect.x-(item.rect.x+item.rect.w);
    if(direction==="down")return item.rect.y-(activeRect.y+activeRect.h);
    if(direction==="up")return activeRect.y-(item.rect.y+item.rect.h);
    return Number.POSITIVE_INFINITY;
  };

  candidates.sort((a,b)=>distance(a)-distance(b)||a.rect.y-b.rect.y||a.rect.x-b.rect.x);
  return candidates[0];
}
_tryDirectNeighborSwap(id,direction,positions,units,rowUnits){
  const active=this._widgets.find(widget=>widget.id===id);
  const activePosition=positions?.[id];
  if(!active||!activePosition)return false;

  const activeRect=this._getWidgetRectFromPosition(active,activePosition,units);
  const neighbor=this._getDirectNeighborInDirection(id,direction,positions,units);
  if(!neighbor)return false;

  const next={...positions};
  const neighborRect=neighbor.rect;

  if(direction==="right"||direction==="left"){
    const fromX=Math.min(activeRect.x,neighborRect.x);
    const leftFirst=direction==="right"?neighbor: {widget:active,rect:activeRect};
    const rightSecond=direction==="right"?{widget:active,rect:activeRect}:neighbor;

    next[leftFirst.widget.id]={x:fromX,y:leftFirst.rect.y};
    next[rightSecond.widget.id]={x:fromX+leftFirst.rect.w,y:rightSecond.rect.y};
  }else if(direction==="down"||direction==="up"){
    const fromY=Math.min(activeRect.y,neighborRect.y);
    const topFirst=direction==="down"?neighbor:{widget:active,rect:activeRect};
    const bottomSecond=direction==="down"?{widget:active,rect:activeRect}:neighbor;

    next[topFirst.widget.id]={x:topFirst.rect.x,y:fromY};
    next[bottomSecond.widget.id]={x:bottomSecond.rect.x,y:fromY+topFirst.rect.h};
  }else{
    return false;
  }

  if(!this._isPositionMapValid(next,units,rowUnits))return false;

  this._saveCurrentWidgetPositions(next);
  this._applyWidgetPositionsToDom(next);
  this._scheduleSquareUnitSync();
  return true;
}
_getAvailableDropSlotsForCandidate(candidateWidget,positions=this._getActiveWidgetPositions({create:true}),currentPosition=null){
  const widget=candidateWidget;
  if(!widget)return [];
  const {units,rowUnits}=this._getGridBounds();
  const size=normalizeWidgetForKind(widget);
  const w=Math.min(units,Number(size.w)||1);
  const h=Math.max(1,Number(size.h)||1);
  const ignoreId=widget.id;
  const current=currentPosition||positions?.[ignoreId]||null;
  const maxOccupiedRow=this._widgets.reduce((max,other)=>{
    if(other.id===ignoreId)return max;
    const position=positions?.[other.id];
    if(!position)return max;
    const rect=this._getWidgetRectFromPosition(other,position,units);
    return Math.max(max,rect.y+rect.h-1);
  },0);
  const maxRow=this._isMobileLauncherLayout()
    ? Math.max(maxOccupiedRow+h+2,(current?.y||1)+h+2,h+2)
    : rowUnits;
  const slots=[];
  for(let y=1;y<=maxRow-h+1;y+=1){
    for(let x=1;x<=units-w+1;x+=1){
      if(current&&current.x>0&&x===current.x&&y===current.y)continue;
      const candidatePositions={...positions,[ignoreId]:{x,y}};
      if(this._isPositionMapValidForWidgets(candidatePositions,[...this._widgets.filter(item=>item.id!==ignoreId),widget],units,rowUnits)){
        slots.push({x,y,w,h});
      }
    }
  }
  return slots;
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
  if(!this._isEditing||this._activeMoveWidgetId!==id)return;
  const positions=this._getActiveWidgetPositions({create:true});
  const {units,rowUnits}=this._getGridBounds();
  const next={...positions,[id]:{x:Number(x)||1,y:Number(y)||1}};
  if(!this._isPositionMapValid(next,units,rowUnits))return;

  this._saveCurrentWidgetPositions(next);
  this._activeMoveWidgetId="";

  this._applyWidgetPositionsToDom(next);

  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  if(grid)this._renderWidgetDropSlots(grid);

  this._syncEditModeDom();
  this._scheduleSquareUnitSync();
}
_moveWidgetByDirection(id,direction){
  if(!this._isEditing||this._activeMoveWidgetId!==id)return;
  const positions=this._getActiveWidgetPositions({create:true});
  const current=positions?.[id];
  const widget=this._widgets.find(item=>item.id===id);
  if(!positions||!current||!widget)return;

  const delta={
    up:{x:0,y:-1},
    right:{x:1,y:0},
    down:{x:0,y:1},
    left:{x:-1,y:0},
  }[direction];
  if(!delta)return;

  const {units,rowUnits}=this._getGridBounds();
  const size=normalizeWidgetForKind(widget);
  const w=Math.min(units,size.w);
  const h=size.h;
  const currentRect={x:current.x,y:current.y,w,h};
  const maxY=this._isMobileLauncherLayout()?Number.POSITIVE_INFINITY:rowUnits-h+1;

  const isCandidateInBounds=candidate=>!(
    candidate.x<1||
    candidate.x+w-1>units||
    candidate.y<1||
    candidate.y>maxY
  );

  const applyEmptyMove=candidate=>{
    positions[id]=candidate;
    this._saveCurrentWidgetPositions(positions);
    const el=this.shadowRoot.querySelector(`[data-widget-id="${id}"]`);
    if(el){
      el.style.gridColumn=`${candidate.x} / span ${w}`;
      el.style.gridRow=`${candidate.y} / span ${h}`;
    }
    this._scheduleSquareUnitSync();this._syncWidgetDropSlots();
  };

  const tryGroupSwap=candidate=>{
    if(!isCandidateInBounds(candidate))return false;

    const candidateRect={...candidate,w,h};
    const occupants=this._getWidgetsInCandidateRect(id,candidateRect,positions,units);
    if(!occupants.length)return false;
    if(!this._doesWidgetGroupExactlyFillRect(occupants,candidateRect,positions,units))return false;

    let nextPositions={
      ...positions,
      [id]:{x:candidateRect.x,y:candidateRect.y},
    };
    nextPositions=this._translateWidgetGroupPositions(occupants,candidateRect,currentRect,nextPositions);

    if(!this._canSwapWidgetPositions(id,occupants.map(widget=>widget.id).join(","),nextPositions,units))return false;

    this._saveCurrentWidgetPositions(nextPositions);
    this._applyWidgetPositionsToDom(nextPositions);
    this._scheduleSquareUnitSync();this._syncWidgetDropSlots();
    return true;
  };

  const unitCandidate={x:current.x+delta.x,y:current.y+delta.y};
  if(!isCandidateInBounds(unitCandidate))return;

  const unitRect={...unitCandidate,w,h};
  const unitOccupants=this._getWidgetsInCandidateRect(id,unitRect,positions,units);

  if(!unitOccupants.length){
    applyEmptyMove(unitCandidate);
    return;
  }

  if(this._doesWidgetGroupExactlyFillRect(unitOccupants,unitRect,positions,units)&&tryGroupSwap(unitCandidate))return;

  if(this._tryDirectNeighborSwap(id,direction,positions,units,rowUnits))return;

  const adjacentCandidate={
    x:current.x+(delta.x*w),
    y:current.y+(delta.y*h),
  };

  if(!(adjacentCandidate.x===unitCandidate.x&&adjacentCandidate.y===unitCandidate.y)){
    if(tryGroupSwap(adjacentCandidate))return;
  }

  this._tryTranslatedGroupSwap(id,direction,positions,units,rowUnits);
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
  const rect=this.getBoundingClientRect();
  const w=Math.round(rect.width||window.innerWidth||0);
  const h=Math.round(rect.height||window.innerHeight||0);
  const orientation=w>h?"landscape":"portrait";
  const layoutMode=getLayoutMode(this);
  const layout=getEffectiveLayout(this);
  const metrics=this._getWidgetAreaMetrics();
  const preset=this._getRuntimeGridPreset();
  return `${w}x${h}|${orientation}|${layoutMode}|${layout}|${this._dockPosition}|${preset.columns}|${preset.rows}|${preset.density}|${metrics?.width||0}x${metrics?.height||0}`;
}
_syncRuntimeLayoutAttrs(){
  const layoutMode=getLayoutMode(this);
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset();
  const units=getInternalGridColumnCountFromLogical(preset.columns);
  const rows=getInternalGridRowCountFromLogical(preset.rows);

  this.dataset.layoutMode=layoutMode;
  this.dataset.layout=layout;
  this.dataset.gridDensity=preset.density;
  this.dataset.gridUnits=String(units);
  this.dataset.logicalColumns=String(preset.columns);
  this.dataset.gridRows=String(rows);
  this.dataset.logicalRows=String(preset.rows);

  this.style.setProperty("--mha-runtime-grid-units",String(units));
  this.style.setProperty("--mha-runtime-grid-rows",String(rows));
  this.style.setProperty("--mha-runtime-grid-columns",String(preset.columns));
  this.style.setProperty("--mha-runtime-logical-rows",String(preset.rows));
  this.style.setProperty("--mha-runtime-logical-columns",String(preset.columns));
  this._lastResponsiveSignature=this._getResponsiveSignature();
}
_syncGridRuntimeMetrics(){
  this._syncRuntimeLayoutAttrs();
  const units=Number(this.dataset.gridUnits)||this._getRuntimeGridUnits();
  const positions=this._getActiveWidgetPositions({create:true});
  this._widgets.forEach(widget=>{
    const el=this.shadowRoot?.querySelector?.(`[data-widget-id="${widget.id}"]`);
    if(!el)return;
    const size=normalizeWidgetSize(widget);
    const effectiveWidgetW=Math.min(size.w,units);
    el.dataset.widgetW=String(effectiveWidgetW);
    el.style.setProperty("--mha-widget-w",String(effectiveWidgetW));
  });
  this._applyWidgetPositionsToDom(positions);
  this._syncSquareUnit();
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
  cancelAnimationFrame(this._squareUnitFrame);
  if(getEffectiveLayout(this)==="mobile"){
    this._squareUnitFrame=requestAnimationFrame(()=>{
      this._squareUnitFrame=requestAnimationFrame(()=>{
        this._squareUnitFrame=0;
        this._syncSquareUnit();
      });
    });
    return;
  }
  this._squareUnitFrame=0;
  this._observeLayoutSize();
  this._scheduleGridRuntimeSync();
}
_scheduleGridRuntimeSync(){
  cancelAnimationFrame(this._gridRuntimeFrame);
  this._gridRuntimeFrame=requestAnimationFrame(()=>{
    this._gridRuntimeFrame=requestAnimationFrame(()=>{
      this._gridRuntimeFrame=0;
      if(!this.isConnected)return;
      this._syncGridRuntimeMetrics();
    });
  });
}
_disconnectLayoutResizeObserver(){
  this._layoutResizeObserver?.disconnect();
  this._layoutResizeObserver=null;
  this._observedLayoutSize="";
}
_observeLayoutSize(){
  this._disconnectLayoutResizeObserver();
  if(typeof ResizeObserver!=="function"||getEffectiveLayout(this)==="mobile")return;
  const area=this.shadowRoot?.querySelector?.(".mha-widget-area");
  if(!area)return;
  this._layoutResizeObserver=new ResizeObserver(entries=>{
    const rect=entries[0]?.contentRect;
    if(!rect)return;
    const signature=`${Math.round(rect.width)}x${Math.round(rect.height)}`;
    if(signature===this._observedLayoutSize)return;
    this._observedLayoutSize=signature;
    this._scheduleGridRuntimeSync();
  });
  this._layoutResizeObserver.observe(area);
}
_getWidgetAreaMetrics(){
  const area=this.shadowRoot?.querySelector?.(".mha-widget-area");
  if(!area)return null;

  const areaStyle=getComputedStyle(area);
  const width=Math.max(0,area.clientWidth-(Number.parseFloat(areaStyle.paddingLeft)||0)-(Number.parseFloat(areaStyle.paddingRight)||0));
  const height=Math.max(0,area.clientHeight-(Number.parseFloat(areaStyle.paddingTop)||0)-(Number.parseFloat(areaStyle.paddingBottom)||0));

  return width>0&&height>0?{width,height}:null;
}
_getDockBottomColumnBonus(layout,base,metrics={}){
  if(this._dockPosition!=="bottom")return 0;
  if(layout==="mobile")return 0;
  const hostWidth=this.getBoundingClientRect?.().width||window.innerWidth||0;
  if(hostWidth<RESPONSIVE_BREAKPOINTS.tablet)return 0;

  const requestedBonus=layout==="desktop"?2:1;
  const baseColumns=Math.max(1,Number(base?.columns)||1);
  const availableWidth=Number(metrics?.width)||hostWidth;
  const minComfortWidth=Math.max(
    Number(base?.minCell)||0,
    (Number(base?.targetCell)||0)*0.9,
    1,
  );
  const maxComfortColumns=Math.max(baseColumns,Math.floor(availableWidth/minComfortWidth));
  return Math.max(0,Math.min(requestedBonus,maxComfortColumns-baseColumns));
}
_getRuntimeGridPreset(){
  const layout=getEffectiveLayout(this);
  const metrics=this._getWidgetAreaMetrics()||{};
  const base=getGridPreset(this,layout,metrics);
  const bonus=this._getDockBottomColumnBonus(layout,base,metrics);
  if(!bonus)return base;
  return {
    ...base,
    columns:Math.max(1,(Number(base.columns)||1)+bonus),
    density:`${base.density}-dock-bottom-${bonus}col`,
  };
}
_getRuntimeGridUnits(){
  const preset=this._getRuntimeGridPreset();
  return getInternalGridColumnCountFromLogical(preset.columns);
}
_getRuntimeGridRows(){
  const preset=this._getRuntimeGridPreset();
  return getInternalGridRowCountFromLogical(preset.rows);
}
_isMobileLauncherLayout(){return this._getRuntimeLayout?.()==="mobile"||this._layout==="mobile"||this.dataset.layout==="mobile"}
_syncSquareUnit(){
  const grid=this.shadowRoot.querySelector(".mha-grid");
  const area=this.shadowRoot.querySelector(".mha-widget-area");
  if(!grid||!area)return;

  const st=getComputedStyle(grid);
  const metrics=this._getWidgetAreaMetrics();
  if(!metrics)return;

  const preset=this._getRuntimeGridPreset();
  const units=getInternalGridColumnCountFromLogical(preset.columns);
  const rows=getInternalGridRowCountFromLogical(preset.rows);

  const columnGap=Number.parseFloat(st.columnGap||st.gap||"0")||0;
  const rowGap=Number.parseFloat(st.rowGap||st.gap||"0")||0;
  const gridPaddingX=(Number.parseFloat(st.paddingLeft)||0)+(Number.parseFloat(st.paddingRight)||0);
  const gridPaddingY=(Number.parseFloat(st.paddingTop)||0)+(Number.parseFloat(st.paddingBottom)||0);

  /*
   * Adaptive OS/window-responsive matrix.
   *
   * .mha-widget-area is the source of truth. Columns/rows are chosen from the
   * available area so each grid unit stays within a comfortable pixel range.
   * The exact cell size is still one shared square value.
   */
  const unitX=(metrics.width-gridPaddingX-columnGap*(units-1))/units;
  const unitY=(metrics.height-gridPaddingY-rowGap*(rows-1))/rows;
  const hardMin=Number.parseFloat(st.getPropertyValue("--mha-square-unit-hard-min"))||24;
  const maxUnit=Number.parseFloat(st.getPropertyValue("--mha-square-unit-max"))||preset.maxCell||160;
  const preferredUnit=this._isMobileLauncherLayout()?unitX:Math.min(unitX,unitY);const unit=Math.max(hardMin,Math.min(maxUnit,preferredUnit));

  if(Number.isFinite(unit)&&unit>0){
    this.dataset.gridDensity=preset.density;
    this.dataset.gridUnits=String(units);
    this.dataset.logicalColumns=String(preset.columns);
    this.dataset.gridRows=String(rows);
    this.dataset.logicalRows=String(preset.rows);

    this.style.setProperty("--mha-runtime-grid-units",String(units));
    this.style.setProperty("--mha-runtime-grid-rows",String(rows));
    this.style.setProperty("--mha-runtime-grid-columns",String(preset.columns));
    this.style.setProperty("--mha-runtime-logical-columns",String(preset.columns));
    this.style.setProperty("--mha-runtime-logical-rows",String(preset.rows));
    this.style.setProperty("--mha-square-unit",`${unit}px`);

    grid.style.setProperty("--mha-square-unit",`${unit}px`);
    grid.style.setProperty("--mha-grid-matrix-width",`${unit*units+columnGap*(units-1)+gridPaddingX}px`);
    grid.style.setProperty("--mha-grid-matrix-height",`${unit*rows+rowGap*(rows-1)+gridPaddingY}px`);
  }

  this._syncWidgetDropSlots();
}
_getGridBounds(){
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset?.()||getGridPreset(this,layout,this._getWidgetAreaMetrics?.()||{});
  const logicalColumns=Number(preset?.columns)||Number(this.dataset.logicalColumns)||1;
  const logicalRows=Number(preset?.rows)||Number(this.dataset.logicalRows)||1;
  return {
    columns:Math.max(1,logicalColumns),
    rows:Math.max(1,logicalRows),
    units:getInternalGridColumnCountFromLogical(logicalColumns),
    rowUnits:getInternalGridRowCountFromLogical(logicalRows),
  };
}
/* LEGACY AUTO-PACK VALIDATOR SCOPE
 * Kept for resize/fallback checks that still need an auto-fit heuristic.
 * It must not be used as a global persistence gate because the modern grid
 * source of truth is the explicit ghost-slot position map.
 */
_doesWidgetLayoutFitGrid(widgets=this._widgets){
  const bounds=this._getGridBounds();
  const columns=bounds.units;
  const rows=bounds.rowUnits;
  const occupied=Array.from({length:rows},()=>Array(columns).fill(false));

  for(const raw of widgets){
    const widget=normalizeWidgetForKind(raw);
    const w=Math.max(1,Math.min(columns,Number(widget.w)||1));
    const h=Math.max(1,Math.min(rows,Number(widget.h)||1));
    let placed=false;

    for(let y=0;y<=rows-h&&!placed;y+=1){
      for(let x=0;x<=columns-w&&!placed;x+=1){
        let fits=true;

        for(let yy=y;yy<y+h&&fits;yy+=1){
          for(let xx=x;xx<x+w;xx+=1){
            if(occupied[yy]&&occupied[yy][xx]){
              fits=false;
              break;
            }
          }
        }

        if(!fits)continue;

        for(let yy=y;yy<y+h;yy+=1){
          for(let xx=x;xx<x+w;xx+=1){
            occupied[yy][xx]=true;
          }
        }

        placed=true;
      }
    }

    if(!placed)return false;
  }

  return true;
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
    this.shadowRoot.append(createScreensaver({
      isVisible:this._getScreensaverVisible(),
      showNowBar:this._screensaverNowBar,
      clockVariant:this._screensaverClockVariant,
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
