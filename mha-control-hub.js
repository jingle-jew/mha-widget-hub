import {readJson,writeJson} from "./src/core/storage.js";
import {ICONS} from "./src/components/icons.js";
import {createShell} from "./src/layout/shell.js";
import {createMobileDock} from "./src/layout/mobile-dock.js";
import {createSettingsPanel} from "./src/settings/settings-panel.js";
import {createWidgetManager, WIDGET_MANAGER_CATEGORIES} from "./src/widget-manager/widget-manager.js";
import { normalizeAccent } from "./src/settings/accent-palettes.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import {createEmptyWidget} from "./src/widgets/empty-widget.js";
import {updateClockWidgets} from "./src/widgets/clock-widget.js";
import {isWeatherWidget} from "./src/widgets/weather-widget.js";
import {DEFAULT_WIDGETS,WIDGET_UNIT,getActiveGridRows,getActiveGridUnits,getEffectiveLayout,getLayoutMode,getGridPreset,getWidgetDensity,normalizeWidgetForKind,normalizeWidgetSize,sizeToString} from "./src/layout/layout-engine.js";
import {createScreensaver,normalizeClockVariant,updateScreensaverClock} from "./src/screensaver/screensaver.js";
// Keeps existing local widget order/sizes after the public naming cleanup.




function readBool(key, fallback = false) {
  const value = localStorage.getItem(key);
  if (value === null) return fallback;
  return value === "true";
}

function readNumberOption(key, fallback, allowed = []) {
  const value = Number(localStorage.getItem(key));
  return allowed.includes(value) ? value : fallback;
}

function getSystemThemePreference() {
  return window.matchMedia?.("(prefers-color-scheme: light)")?.matches ? "light" : "dark";
}

function normalizeThemeSetting(theme = "auto") {
  return ["auto", "dark", "light"].includes(theme) ? theme : "auto";
}

function resolveTheme(themeSetting = "auto") {
  const normalized = normalizeThemeSetting(themeSetting);
  return normalized === "auto" ? getSystemThemePreference() : normalized;
}

function getStoredThemeSetting(host) {
  /*
   * data-theme is the effective light/dark theme.
   * data-theme-setting is the user preference: auto / dark / light.
   *
   * First-launch rule:
   * - localStorage is the source of persisted user choice;
   * - host data-theme-setting may provide an explicit embedding override;
   * - documentElement data-theme-setting is ignored as a default source because
   *   some bootstrap/theme code can leave it as the effective "dark/light",
   *   making a fresh install appear as "Sombre" instead of "Auto".
   */
  const stored = localStorage.getItem("mha-theme")
    || localStorage.getItem("mha-dev-theme")
    || host?.dataset?.themeSetting
    || "auto";

  return normalizeThemeSetting(stored);
}

function normalizeThemeStyle(themeStyle = "oneui") {
  return THEME_STYLES.has(themeStyle) ? themeStyle : "oneui";
}

function getStoredThemeStyle(host) {
  const stored = localStorage.getItem("mha-theme-style")
    || localStorage.getItem("mha-dev-theme-style")
    || document.documentElement.dataset.themeStyle
    || host?.dataset?.themeStyle
    || "oneui";

  return normalizeThemeStyle(stored);
}

function getStoredAccent(host, themeStyle = "oneui") {
  const normalizedStyle = normalizeThemeStyle(themeStyle);
  const stored = localStorage.getItem(`mha-accent-${normalizedStyle}`)
    || localStorage.getItem("mha-accent")
    || document.documentElement.dataset.accent
    || host?.dataset?.accent
    || "";

  return normalizeAccent(normalizedStyle, stored);
}

function getDefaultIconShapeForThemeStyle(themeStyle = "oneui") {
  if (themeStyle === "ios") return "rounded-square";
  if (themeStyle === "material") return "circle";
  return "squircle";
}

function normalizeIconShapeSetting(iconShapeSetting = "auto") {
  return ["auto", "rounded-square", "squircle", "circle"].includes(iconShapeSetting)
    ? iconShapeSetting
    : "auto";
}

function resolveIconShape(themeStyle = "oneui", iconShapeSetting = "auto") {
  const normalized = normalizeIconShapeSetting(iconShapeSetting);

  if (normalized !== "auto") {
    return normalized;
  }

  return getDefaultIconShapeForThemeStyle(themeStyle);
}

function getStoredIconShapeSetting(host) {
  /*
   * Important:
   * - data-icon-shape is the effective CSS shape.
   * - data-icon-shape-setting is the user preference.
   *
   * Never use data-icon-shape as the first source for the setting, otherwise
   * Auto gets replaced by the previously resolved effective shape.
   */
  const stored = localStorage.getItem("mha-icon-shape")
    || document.documentElement.dataset.iconShapeSetting
    || host.dataset.iconShapeSetting
    || "auto";

  return normalizeIconShapeSetting(stored);
}

function syncThemeAttributes(host) {
  const themeSetting = getStoredThemeSetting(host);
  const theme = resolveTheme(themeSetting);
  const themeStyle = getStoredThemeStyle(host);
  const accent = getStoredAccent(host, themeStyle);
  const iconShapeSetting = getStoredIconShapeSetting(host);
  const iconShape = resolveIconShape(themeStyle, iconShapeSetting);

  host.dataset.themeSetting = themeSetting;
  host.setAttribute("data-theme-setting", themeSetting);
  host.dataset.theme = theme;
  host.setAttribute("data-theme", theme);
  document.documentElement.dataset.themeSetting = themeSetting;
  document.documentElement.setAttribute("data-theme-setting", themeSetting);
  document.documentElement.dataset.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);

  host.dataset.themeStyle = themeStyle;
  host.setAttribute("data-theme-style", themeStyle);
  document.documentElement.dataset.themeStyle = themeStyle;
  document.documentElement.setAttribute("data-theme-style", themeStyle);

  host.dataset.accent = accent;
  host.setAttribute("data-accent", accent);
  document.documentElement.dataset.accent = accent;
  document.documentElement.setAttribute("data-accent", accent);

  host.dataset.iconShapeSetting = iconShapeSetting;
  host.setAttribute("data-icon-shape-setting", iconShapeSetting);

  host.dataset.iconShape = iconShape;
  host.setAttribute("data-icon-shape", iconShape);

  document.documentElement.dataset.iconShapeSetting = iconShapeSetting;
  document.documentElement.setAttribute("data-icon-shape-setting", iconShapeSetting);
  document.documentElement.dataset.iconShape = iconShape;
  document.documentElement.setAttribute("data-icon-shape", iconShape);
}

const ORDER="mha-grid-order",SIZES="mha-widget-sizes",REMOVED="mha-hidden-widgets",POSITIONS="mha-widget-positions",CUSTOM_WIDGETS="mha-custom-widgets",LEGACY_STORAGE_PREFIX=["mha","v2"].join("-"),THEME_STYLES=new Set(["ios","oneui","material"]);
const SCREENSAVER_ENABLED="mha-screensaver-enabled";
const SCREENSAVER_DELAY="mha-screensaver-delay";
const SCREENSAVER_NOWBAR="mha-screensaver-nowbar";
const SCREENSAVER_CLOCK_VARIANT="mha-screensaver-clock-variant";

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


function isClockCatalogVariant(variant = "") {
  return ["digital","analog","ios-analog","scientific"].includes(variant);
}

function normalizeStoredWidgetContract(widget = {}) {
  const variant = widget?.variant || "";
  const isClock = widget?.kind === "clock"
    || widget?.type === "clock"
    || widget?.component === "clock-widget"
    || isClockCatalogVariant(variant);

  if (isClock) {
    return {
      ...widget,
      kind: "clock",
      type: "clock",
      component: "clock-widget",
      category: widget.category || "utilities",
      variant: isClockCatalogVariant(variant) ? variant : "digital",
      w: 2,
      h: 2,
    };
  }


  if (isWeatherWidget(widget)) {
    return {
      ...widget,
      kind: "weather",
      type: "weather",
      component: "weather-widget",
      category: "weather",
      variant: widget.variant || "current",
      w: 2,
      h: 2,
    };
  }

  const isSlider = widget?.kind === "slider"
    || widget?.type === "slider"
    || widget?.component === "slider-widget";

  if (isSlider) {
    return {
      ...widget,
      kind: "slider",
      type: "slider",
      component: widget.component || "slider-widget",
    };
  }

  return {
    ...widget,
    kind: widget.kind || widget.type || "empty",
    type: widget.type || widget.kind || "empty",
  };
}

function readMigratedJson(key,legacyKey,fallback){const current=readJson(key,null);if(current!==null)return current;const legacy=readJson(legacyKey,null);if(legacy!==null){writeJson(key,legacy);return legacy}return fallback}
class MhaControlHub extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"});this._hass=null;this._isEditing=false;this._activeMoveWidgetId="";this._widgetPositions=readJson(POSITIONS,{})||{};this._draggedId="";this._isResizingWidget=false;this._resizeState=null;this._squareUnitFrame=0;this._renderId=0;this._readyRaf=0;this._viewportRaf=0;this._relayoutTimer=0;this._systemThemeListener=null;this._themeTransitionTimer=0;this._themeTransitionFrame=0;this._gridScrollCleanup=null;this._screensaverPreview=false;this._screensaverActive=false;this._screensaverNowBar=readBool(SCREENSAVER_NOWBAR,true);this._screensaverClockVariant=localStorage.getItem(SCREENSAVER_CLOCK_VARIANT)||localStorage.getItem("mha-screensaver-clock")||"digital";this._screensaverIdleTimer=0;this._screensaverEnabled=readBool(SCREENSAVER_ENABLED,true);this._screensaverDelay=readNumberOption(SCREENSAVER_DELAY,30000,[15000,30000,120000,300000]);this._settingsOpen=false;this._screensaverSettingsOpen=false;this._lastResponsiveSignature="";this._responsiveRelayoutTimer=null;this._widgetManagerOpen=false;this._widgetManagerCategory="";this._pendingWidgetPlacement=null;this._widgets=this._readWidgets()}
set hass(h){this._hass=h;this.render()}get hass(){return this._hass}
_markReadyAfterPaint(){
  cancelAnimationFrame(this._readyRaf);
  this.dataset.ready="false";
  this.setAttribute("data-ready","false");
  this._readyRaf=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    this.dataset.ready="true";
    this.setAttribute("data-ready","true");
  }));
}
connectedCallback(){this._systemThemeListener=()=>{if(getStoredThemeSetting(this)==="auto")this._transitionSystemThemeChange()};window.matchMedia?.("(prefers-color-scheme: light)")?.addEventListener?.("change",this._systemThemeListener);this.render();this._clockTimer=setInterval(()=>{updateStatusTime(this.shadowRoot);updateClockWidgets(this.shadowRoot);if(this._getScreensaverVisible())updateScreensaverClock(this.shadowRoot,this._screensaverClockVariant)},1000);this._activityListener=()=>this._handleUserActivity();["pointerdown","touchstart","keydown","wheel","scroll"].forEach(type=>window.addEventListener(type,this._activityListener,{passive:true}));this._scheduleScreensaverIdleTimer();this._resizeListener=()=>{this._handleUserActivity();this._handleViewportChange()};window.addEventListener("resize",this._resizeListener);window.visualViewport?.addEventListener("resize",this._resizeListener);window.addEventListener("orientationchange",this._resizeListener);this._resizeHandlePointerDownListener=(event)=>this._markResizeInteraction(event);this.shadowRoot.addEventListener("pointerdown",this._resizeHandlePointerDownListener);this.shadowRoot.addEventListener("mousedown",this._resizeHandlePointerDownListener);this.shadowRoot.addEventListener("touchstart",this._resizeHandlePointerDownListener);this._resizeInteractionCleanup=()=>this._clearResizeInteraction();["pointerup","pointercancel","mouseup","touchend","touchcancel"].forEach(type=>window.addEventListener(type,this._resizeInteractionCleanup,{passive:true}));this._settingsOpenListener=()=>this._openSettings();this.shadowRoot.addEventListener("mha-open-settings",this._settingsOpenListener)}
disconnectedCallback(){window.matchMedia?.("(prefers-color-scheme: light)")?.removeEventListener?.("change",this._systemThemeListener);clearInterval(this._clockTimer);cancelAnimationFrame(this._squareUnitFrame);cancelAnimationFrame(this._themeTransitionFrame);clearTimeout(this._themeTransitionTimer);this._clearGridScrollListener();["pointerdown","touchstart","keydown","wheel","scroll"].forEach(type=>window.removeEventListener(type,this._activityListener));clearTimeout(this._screensaverIdleTimer);window.removeEventListener("resize",this._resizeListener);window.visualViewport?.removeEventListener("resize",this._resizeListener);window.removeEventListener("orientationchange",this._resizeListener);clearTimeout(this._responsiveRelayoutTimer);if(this._resizeHandlePointerDownListener){this.shadowRoot.removeEventListener("pointerdown",this._resizeHandlePointerDownListener);this.shadowRoot.removeEventListener("mousedown",this._resizeHandlePointerDownListener);this.shadowRoot.removeEventListener("touchstart",this._resizeHandlePointerDownListener)}if(this._resizeInteractionCleanup)["pointerup","pointercancel","mouseup","touchend","touchcancel"].forEach(type=>window.removeEventListener(type,this._resizeInteractionCleanup));if(this._settingsOpenListener)this.shadowRoot.removeEventListener("mha-open-settings",this._settingsOpenListener)}
requestRender(){this.render()}
_syncEditModeDom(){
  if(!this._isEditing||this._isMobileLandscapeLayout()){this._activeMoveWidgetId="";this._pendingWidgetPlacement=null;this._widgetManagerOpen=false;this._widgetManagerCategory="";const grid=this.shadowRoot?.querySelector?.(".mha-grid");if(grid)this._renderWidgetDropSlots(grid);}
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
_openSettings(){
  this._settingsOpen=true;
  this._setScreensaverActive(false);
  clearTimeout(this._screensaverIdleTimer);
  this._syncSettingsModalState();
  this._syncSettingsDom();
}
_closeSettings(){
  this._settingsOpen=false;
  this._syncSettingsModalState();
  this._syncSettingsDom();
  this._scheduleScreensaverIdleTimer();
}
_syncSettingsModalState(){
  this.classList.toggle("is-settings-open",this._settingsOpen);
  this.dataset.settingsOpen=String(this._settingsOpen);
}
_syncSettingsDom(){
  const existing=this.shadowRoot.querySelector('.mha-settings-panel[data-settings-scope="all"]');
  if(existing)existing.remove();
  this._syncSettingsModalState();
  this.shadowRoot.append(this._createSettingsPanel());
}
_getSettingsPanelProps(scope="all"){
  const themeStyle=getStoredThemeStyle(this);
  const iconShapeSetting=getStoredIconShapeSetting(this);
  const effectiveIconShape=this.dataset.iconShape
    || document.documentElement.dataset.iconShape
    || resolveIconShape(themeStyle,iconShapeSetting);

  return {
    open:scope==="screensaver"?this._screensaverSettingsOpen:this._settingsOpen,
    scope,
    theme:getStoredThemeSetting(this),
    themeStyle,
    accent:getStoredAccent(this,themeStyle),
    iconShape:iconShapeSetting,
    effectiveIconShape,
    screensaverEnabled:this._screensaverEnabled,
    screensaverDelay:this._screensaverDelay,
    screensaverPreview:this._screensaverPreview,
    screensaverNowBar:this._screensaverNowBar,
    screensaverClockVariant:this._screensaverClockVariant,
    onClose:()=>scope==="screensaver"?this._closeScreensaverSettings():this._closeSettings(),
    onThemeChange:v=>this._applyThemeFromSettings(v),
    onThemeStyleChange:v=>this._applyThemeStyleFromSettings(v),
    onAccentChange:v=>this._applyAccentFromSettings(v),
    onIconShapeChange:v=>this._applyIconShapeFromSettings(v),
    onScreensaverEnabledChange:v=>this._applyScreensaverEnabledFromSettings(v),
    onScreensaverDelayChange:v=>this._applyScreensaverDelayFromSettings(v),
    onScreensaverPreviewChange:v=>this._applyScreensaverPreviewFromSettings(v),
    onScreensaverNowBarChange:v=>this._applyScreensaverNowBarFromSettings(v),
    onScreensaverClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),
    onResetGrid:()=>this.resetGrid(),
  };
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
  const rawKind=item?.kind||"empty";
  const rawVariant=item?.variant||rawKind;
  const kind=rawKind==="slider"?"slider":rawKind==="clock"||isClockCatalogVariant(rawVariant)?"clock":rawKind==="weather"?"weather":"empty";
  const category=item?.category||(kind==="clock"?"utilities":kind==="weather"?"weather":"custom");
  const baseSize=kind==="clock"||kind==="weather"?{w:2,h:2}:normalizeWidgetSize(item?.size||{w:2,h:2});
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
    component:kind==="clock"?"clock-widget":kind==="slider"?"slider-widget":kind==="weather"?"weather-widget":"empty-widget",
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
  this._pendingWidgetPlacement=widget;
  this._widgetManagerOpen=false;
  this._widgetManagerCategory="";
  this._activeMoveWidgetId="";
  this._syncWidgetManagerDom();
  this._syncEditModeDom();
  this._syncWidgetDropSlots();
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
  if(existing)existing.remove();
  this.classList.toggle("is-screensaver-settings-open",this._screensaverSettingsOpen);
  this.dataset.screensaverSettingsOpen=String(this._screensaverSettingsOpen);
  this.shadowRoot.append(createSettingsPanel(this._getSettingsPanelProps("screensaver")));
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
  const themeSetting=normalizeThemeSetting(value);
  localStorage.setItem("mha-theme",themeSetting);
  localStorage.setItem("mha-dev-theme",themeSetting);
  syncThemeAttributes(this);
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

  syncThemeAttributes(this);

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
  const nextStyle=normalizeThemeStyle(value);
  localStorage.setItem("mha-theme-style",nextStyle);
  localStorage.setItem("mha-dev-theme-style",nextStyle);

  /*
   * Accent and icon shape both depend on the active visual style.
   * Re-normalize the current accent so a value from another style does not
   * leave the UI stuck on the first/default swatch.
   */
  const nextAccent=getStoredAccent(this,nextStyle);
  localStorage.setItem("mha-accent",nextAccent);
  localStorage.setItem(`mha-accent-${nextStyle}`,nextAccent);

  syncThemeAttributes(this);
  this._syncSettingsDom();
}

_applyAccentFromSettings(value=""){
  const style=getStoredThemeStyle(this);
  const nextAccent=normalizeAccent(style,value);
  localStorage.setItem("mha-accent",nextAccent);
  localStorage.setItem(`mha-accent-${style}`,nextAccent);
  syncThemeAttributes(this);
  this._syncSettingsDom();
}

_applyIconShapeFromSettings(value="auto"){
  const nextShape=normalizeIconShapeSetting(value);
  localStorage.setItem("mha-icon-shape",nextShape);
  localStorage.setItem("mha-dev-icon-shape",nextShape);
  syncThemeAttributes(this);
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
  localStorage.setItem(SCREENSAVER_ENABLED,String(this._screensaverEnabled));
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
  localStorage.setItem(SCREENSAVER_DELAY,String(this._screensaverDelay));
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
  localStorage.setItem(SCREENSAVER_NOWBAR,String(this._screensaverNowBar));
  this._syncScreensaverDom();
  this._syncSettingsDom();
  this._syncScreensaverSettingsDom();
}
_applyScreensaverClockVariantFromSettings(variant="digital"){
  this._screensaverClockVariant=normalizeClockVariant(variant);
  localStorage.setItem(SCREENSAVER_CLOCK_VARIANT,this._screensaverClockVariant);
  localStorage.setItem("mha-screensaver-clock",this._screensaverClockVariant);
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
  this._syncWidgetDropSlots();

  if(wasEditing!==this._isEditing)this._scheduleSquareUnitSync();
}toggleScreensaverPreview(){this._screensaverPreview=!this._screensaverPreview;this._syncScreensaverDom()}toggleNowBarPreview(){this._screensaverNowBar=!this._screensaverNowBar;this._syncScreensaverDom()}setScreensaverClockVariant(v="digital"){this._screensaverClockVariant=normalizeClockVariant(v);this._syncScreensaverDom()}resetGrid(){localStorage.removeItem(ORDER);localStorage.removeItem(SIZES);localStorage.removeItem(REMOVED);localStorage.removeItem(POSITIONS);this._widgetPositions={};this._activeMoveWidgetId="";this._widgets=this._readWidgets();this.render()}
_readWidgets(){
  const custom=(readJson(CUSTOM_WIDGETS,[])||[]).filter(widget=>widget?.id).map(normalizeStoredWidgetContract);
  const baseWidgets=[...DEFAULT_WIDGETS,...custom];
  const byId=new Map(baseWidgets.map(w=>[w.id,w]));
  const removed=new Set(readJson(REMOVED,[]).filter?.(id=>byId.has(id))||[]);
  const order=readMigratedJson(ORDER,`${LEGACY_STORAGE_PREFIX}-grid-order`,DEFAULT_WIDGETS.map(w=>w.id)).filter?.(id=>byId.has(id)&&!removed.has(id))||[];
  DEFAULT_WIDGETS.forEach(w=>{if(!removed.has(w.id)&&!order.includes(w.id))order.push(w.id)});
  custom.forEach(w=>{if(!removed.has(w.id)&&!order.includes(w.id))order.push(w.id)});
  const sizes=readMigratedJson(SIZES,`${LEGACY_STORAGE_PREFIX}-widget-sizes`,{});
  return order.map(id=>{
    const base=byId.get(id);
    const merged=normalizeStoredWidgetContract({...base,...(sizes[id]||{})});
    return {...merged,...normalizeWidgetForKind(merged)};
  });
}
_saveWidgets(){
  /*
   * Persistence is independent from the legacy auto-pack validator.
   *
   * The current grid uses explicit ghost-slot positions. Placement is validated
   * before this method by the position-map validator, while resize/move paths
   * validate their own candidate state before calling save.
   *
   * Saving should write the current widget contract/order/sizes and must not
   * fail silently because an older auto-layout heuristic disagrees with the
   * explicit placement map.
   */
  this._widgets=this._normalizeWidgetsToGridBounds(this._widgets.map(normalizeStoredWidgetContract));

  const order=this._widgets.map(w=>w.id).filter(Boolean);
  writeJson(ORDER,order);

  const defaultIds=new Set(DEFAULT_WIDGETS.map(w=>w.id));
  const custom=this._widgets
    .filter(w=>w?.id&&!defaultIds.has(w.id))
    .map(w=>{
      const normalized=normalizeStoredWidgetContract(w);
      return {
        id:normalized.id,
        kind:normalized.kind,
        type:normalized.type,
        component:normalized.component,
        category:normalized.category||"custom",
        variant:normalized.variant||"custom",
        title:normalized.title||"Widget",
        ...normalizeWidgetForKind(normalized),
      };
    });

  writeJson(CUSTOM_WIDGETS,custom);

  const sizes={};
  this._widgets.forEach(w=>{
    const normalized=normalizeStoredWidgetContract(w);
    sizes[normalized.id]={
      ...normalizeWidgetForKind(normalized),
      kind:normalized.kind,
      type:normalized.type,
      component:normalized.component,
      category:normalized.category,
      variant:normalized.variant,
      title:normalized.title,
    };
  });
  writeJson(SIZES,sizes);
}
_removeWidget(id){if(!this._widgets.some(w=>w.id===id))return;if(this._activeMoveWidgetId===id)this._activeMoveWidgetId="";this._widgets=this._widgets.filter(w=>w.id!==id);Object.values(this._widgetPositions).forEach(layout=>{if(layout&&typeof layout==="object")delete layout[id]});writeJson(POSITIONS,this._widgetPositions);const removed=new Set(readJson(REMOVED,[]));removed.add(id);writeJson(REMOVED,[...removed]);this._saveWidgets();this.shadowRoot.querySelector(`[data-widget-id="${id}"]`)?.remove();this._clearDropState();this._scheduleSquareUnitSync()}

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
  return `${getEffectiveLayout(this)}:${bounds.units}x${bounds.rowUnits}`;
}
_getStoredWidgetPositions(){
  const positions=this._widgetPositions[this._getWidgetPositionKey()];
  return positions&&typeof positions==="object"?positions:null;
}
_saveCurrentWidgetPositions(positions){
  this._widgetPositions[this._getWidgetPositionKey()]=positions;
  writeJson(POSITIONS,this._widgetPositions);
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
  writeJson(POSITIONS,this._widgetPositions);
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
  return a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y;
}
_getWidgetRectFromPosition(widget,position,units){
  const size=normalizeWidgetForKind(widget);
  return {
    x:Number(position?.x)||1,
    y:Number(position?.y)||1,
    w:Math.min(units,Number(size.w)||1),
    h:Number(size.h)||1,
  };
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
  return this._widgets.filter(other=>{
    if(other.id===id)return false;
    const otherPosition=positions?.[other.id];
    if(!otherPosition)return false;
    const otherRect=this._getWidgetRectFromPosition(other,otherPosition,units);
    return this._rectsOverlap(candidateRect,otherRect);
  });
}
_doesWidgetGroupExactlyFillRect(widgets,targetRect,positions,units){
  if(!widgets?.length)return false;

  const width=Math.max(1,Number(targetRect.w)||1);
  const height=Math.max(1,Number(targetRect.h)||1);
  const cells=Array.from({length:height},()=>Array(width).fill(false));

  for(const widget of widgets){
    const position=positions?.[widget.id];
    if(!position)return false;

    const rect=this._getWidgetRectFromPosition(widget,position,units);

    if(
      rect.x<targetRect.x||
      rect.y<targetRect.y||
      rect.x+rect.w>targetRect.x+targetRect.w||
      rect.y+rect.h>targetRect.y+targetRect.h
    )return false;

    for(let y=rect.y;y<rect.y+rect.h;y+=1){
      for(let x=rect.x;x<rect.x+rect.w;x+=1){
        const localX=x-targetRect.x;
        const localY=y-targetRect.y;
        if(cells[localY]?.[localX])return false;
        cells[localY][localX]=true;
      }
    }
  }

  return cells.every(row=>row.every(Boolean));
}
_translateWidgetGroupPositions(group,targetRect,destinationRect,positions){
  const dx=destinationRect.x-targetRect.x;
  const dy=destinationRect.y-targetRect.y;
  const next={...positions};

  group.forEach(widget=>{
    const position=positions?.[widget.id];
    if(position)next[widget.id]={x:position.x+dx,y:position.y+dy};
  });

  return next;
}
_getGroupBoundingRect(group,positions,units){
  if(!group?.length)return null;

  const rects=group.map(widget=>this._getWidgetRectFromPosition(widget,positions?.[widget.id],units));
  const minX=Math.min(...rects.map(rect=>rect.x));
  const minY=Math.min(...rects.map(rect=>rect.y));
  const maxX=Math.max(...rects.map(rect=>rect.x+rect.w));
  const maxY=Math.max(...rects.map(rect=>rect.y+rect.h));

  return {
    x:minX,
    y:minY,
    w:maxX-minX,
    h:maxY-minY,
  };
}
_isGroupInternallyValid(group,positions,units){
  for(let i=0;i<group.length;i+=1){
    const a=this._getWidgetRectFromPosition(group[i],positions?.[group[i].id],units);
    for(let j=i+1;j<group.length;j+=1){
      const b=this._getWidgetRectFromPosition(group[j],positions?.[group[j].id],units);
      if(this._rectsOverlap(a,b))return false;
    }
  }
  return true;
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
  const maxRows=this._isMobileLauncherLayout()?Number.POSITIVE_INFINITY:rowUnits;
  for(const widget of widgets){
    const position=nextPositions?.[widget.id];
    if(!position)return false;
    const rect=this._getWidgetRectFromPosition(widget,position,units);
    if(rect.x<1||rect.y<1||rect.x+rect.w-1>units||rect.y+rect.h-1>maxRows)return false;
  }
  for(let i=0;i<widgets.length;i+=1){
    const a=this._getWidgetRectFromPosition(widgets[i],nextPositions[widgets[i].id],units);
    for(let j=i+1;j<widgets.length;j+=1){
      const b=this._getWidgetRectFromPosition(widgets[j],nextPositions[widgets[j].id],units);
      if(this._rectsOverlap(a,b))return false;
    }
  }
  return true;
}
_isPositionMapValid(nextPositions,units,rowUnits){
  const maxRows=this._isMobileLauncherLayout()?Number.POSITIVE_INFINITY:rowUnits;

  for(const widget of this._widgets){
    const position=nextPositions?.[widget.id];
    if(!position)return false;
    const rect=this._getWidgetRectFromPosition(widget,position,units);
    if(rect.x<1||rect.y<1||rect.x+rect.w-1>units||rect.y+rect.h-1>maxRows)return false;
  }

  for(let i=0;i<this._widgets.length;i+=1){
    const a=this._getWidgetRectFromPosition(this._widgets[i],nextPositions[this._widgets[i].id],units);
    for(let j=i+1;j<this._widgets.length;j+=1){
      const b=this._getWidgetRectFromPosition(this._widgets[j],nextPositions[this._widgets[j].id],units);
      if(this._rectsOverlap(a,b))return false;
    }
  }

  return true;
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
  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  if(!grid)return;
  this._renderWidgetDropSlots(grid);
  requestAnimationFrame(()=> {
    const refreshedGrid=this.shadowRoot?.querySelector?.(".mha-grid");
    if(refreshedGrid)this._renderWidgetDropSlots(refreshedGrid);
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
  this._saveWidgets();
  this._saveCurrentWidgetPositions(nextPositions);
  this._saveWidgets();

  const persistedOrder=readJson(ORDER,[])||[];
  const persistedCustom=readJson(CUSTOM_WIDGETS,[])||[];
  if(!persistedOrder.includes(widget.id)||(!DEFAULT_WIDGETS.some(w=>w.id===widget.id)&&!persistedCustom.some(w=>w.id===widget.id))){
    this._widgets=this._normalizeWidgetsToGridBounds(nextWidgets.map(normalizeStoredWidgetContract));
    writeJson(ORDER,this._widgets.map(w=>w.id));
    const defaultIds=new Set(DEFAULT_WIDGETS.map(w=>w.id));
    writeJson(CUSTOM_WIDGETS,this._widgets.filter(w=>!defaultIds.has(w.id)).map(w=>{
      const normalized=normalizeStoredWidgetContract(w);
      return {
        id:normalized.id,
        kind:normalized.kind,
        type:normalized.type,
        component:normalized.component,
        category:normalized.category||"custom",
        variant:normalized.variant||"custom",
        title:normalized.title||"Widget",
        ...normalizeWidgetForKind(normalized),
      };
    }));
  }

  this._pendingWidgetPlacement=null;
  this._activeMoveWidgetId="";

  const grid=this.shadowRoot?.querySelector?.(".mha-grid");
  if(grid){
    const el=createEmptyWidget(widget,{
      activeGridUnits:units,
      isEditing:this._isEditing,
      isMoveTarget:false,
      position:nextPositions[widget.id],
      onToggleMove:id=>this._toggleWidgetMoveMode(id),
      onMove:(id,direction)=>this._moveWidgetByDirection(id,direction),
      onRemove:id=>this._removeWidget(id),
      onResizeStart:(event,id)=>this._startResize(event,id),
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
_getResponsiveSignature(){
  const rect=this.getBoundingClientRect();
  const w=Math.round(rect.width||window.innerWidth||0);
  const h=Math.round(rect.height||window.innerHeight||0);
  const orientation=w>h?"landscape":"portrait";
  const layoutMode=getLayoutMode(this);
  const layout=getEffectiveLayout(this);
  const metrics=this._getWidgetAreaMetrics();
  const preset=getGridPreset(this,layout,metrics||{});
  return `${w}x${h}|${orientation}|${layoutMode}|${layout}|${preset.columns}|${preset.rows}|${preset.density}|${metrics?.width||0}x${metrics?.height||0}`;
}
_syncRuntimeLayoutAttrs(){
  const layoutMode=getLayoutMode(this);
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset();
  const units=preset.columns*WIDGET_UNIT.unitsPerLogicalColumn;
  const rows=preset.rows*WIDGET_UNIT.unitsPerLogicalColumn;

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
  this._lastResponsiveSignature=this._getResponsiveSignature();
}
_syncGridRuntimeMetrics(){
  this._syncRuntimeLayoutAttrs();
  this._syncSquareUnit();
}
_handleViewportChange(){
  if(this._isResponsiveRelayouting)return;
  this._isResponsiveRelayouting=true;
  this.classList.add("is-responsive-relayouting");
  clearTimeout(this._relayoutTimer);
  cancelAnimationFrame(this._viewportRaf);
  this._viewportRaf=requestAnimationFrame(()=>{
    this._syncGridRuntimeMetrics();
    this.render();
    this._relayoutTimer=setTimeout(()=>{
      this._isResponsiveRelayouting=false;
      this.classList.remove("is-responsive-relayouting");
    },180);
  });
}

_clearGridScrollListener(){this._gridScrollCleanup?.();this._gridScrollCleanup=null}
// Mobile floating controls move out of the way on downward portrait scroll.
_wireDockAutoHide(grid){this._clearGridScrollListener();this.classList.remove("is-dock-hidden","is-mobile-floating-controls-hidden");
const scrollContainer=grid.closest(".mha-widget-area");const isMobileLayout=()=>this.dataset.layout==="mobile";const isLandscape=()=>window.matchMedia("(orientation: landscape)").matches;
if(!scrollContainer||!isMobileLayout())return;
if(isLandscape()){this.classList.add("is-mobile-floating-controls-hidden");return}
let previousScrollTop=scrollContainer.scrollTop;const threshold=10;const onScroll=()=>{if(!isMobileLayout()||isLandscape()){this.classList.toggle("is-mobile-floating-controls-hidden",isMobileLayout()&&isLandscape());previousScrollTop=scrollContainer.scrollTop;return}const currentScrollTop=scrollContainer.scrollTop;if(currentScrollTop<=4){this.classList.remove("is-mobile-floating-controls-hidden");previousScrollTop=currentScrollTop;return}const delta=currentScrollTop-previousScrollTop;if(delta>threshold)this.classList.add("is-mobile-floating-controls-hidden");else if(delta<-threshold)this.classList.remove("is-mobile-floating-controls-hidden");if(Math.abs(delta)>threshold)previousScrollTop=currentScrollTop};scrollContainer.addEventListener("scroll",onScroll,{passive:true});this._gridScrollCleanup=()=>scrollContainer.removeEventListener("scroll",onScroll)}
_scheduleSquareUnitSync(){cancelAnimationFrame(this._squareUnitFrame);this._squareUnitFrame=requestAnimationFrame(()=>{this._squareUnitFrame=requestAnimationFrame(()=>this._syncSquareUnit())})}
_getWidgetAreaMetrics(){
  const area=this.shadowRoot?.querySelector?.(".mha-widget-area");
  if(!area)return null;

  const areaStyle=getComputedStyle(area);
  const width=Math.max(0,area.clientWidth-(Number.parseFloat(areaStyle.paddingLeft)||0)-(Number.parseFloat(areaStyle.paddingRight)||0));
  const height=Math.max(0,area.clientHeight-(Number.parseFloat(areaStyle.paddingTop)||0)-(Number.parseFloat(areaStyle.paddingBottom)||0));

  return width>0&&height>0?{width,height}:null;
}
_getRuntimeGridPreset(){
  const layout=getEffectiveLayout(this);
  return getGridPreset(this,layout,this._getWidgetAreaMetrics()||{});
}
_getRuntimeGridUnits(){
  const preset=this._getRuntimeGridPreset();
  return preset.columns*WIDGET_UNIT.unitsPerLogicalColumn;
}
_getRuntimeGridRows(){
  const preset=this._getRuntimeGridPreset();
  return preset.rows*WIDGET_UNIT.unitsPerLogicalColumn;
}
_isMobileLauncherLayout(){return this._getRuntimeLayout?.()==="mobile"||this._layout==="mobile"||this.dataset.layout==="mobile"}
_syncSquareUnit(){
  const grid=this.shadowRoot.querySelector(".mha-grid");
  const area=this.shadowRoot.querySelector(".mha-widget-area");
  if(!grid||!area)return;

  const st=getComputedStyle(grid);
  const metrics=this._getWidgetAreaMetrics();
  if(!metrics)return;

  const layout=getEffectiveLayout(this);
  const preset=getGridPreset(this,layout,metrics);
  const units=preset.columns*WIDGET_UNIT.unitsPerLogicalColumn;
  const rows=preset.rows*WIDGET_UNIT.unitsPerLogicalColumn;

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
    this.style.setProperty("--mha-runtime-logical-rows",String(preset.rows));

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
    units:Math.max(1,logicalColumns*WIDGET_UNIT.unitsPerLogicalColumn),
    rowUnits:Math.max(1,logicalRows*WIDGET_UNIT.unitsPerLogicalColumn),
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
_clampWidgetSizeToGridBounds(widget,size){
  const layout=getEffectiveLayout(this);
  const preset=this._getRuntimeGridPreset?.()||getGridPreset(this,layout,this._getWidgetAreaMetrics?.()||{});
  const logicalColumns=Number(preset?.columns)||Number(this.dataset.logicalColumns)||1;
  const logicalRows=Number(preset?.rows)||Number(this.dataset.logicalRows)||1;

  const x=Number(widget?.x ?? widget?.col ?? widget?.column ?? 1)||1;
  const y=Number(widget?.y ?? widget?.row ?? 1)||1;

  const maxW=Math.max(1,logicalColumns-x+1);
  const maxH=Math.max(1,logicalRows-y+1);

  /*
   * Resize boundary guard:
   * A widget can grow only inside the logical grid rectangle. This prevents
   * resize handles from creating widgets that visually escape .mha-widget-area,
   * especially at the bottom edge.
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
  const logicalColumns=Number(preset?.columns)||Number(this.dataset.logicalColumns)||1;
  const logicalRows=Number(preset?.rows)||Number(this.dataset.logicalRows)||1;

  const w=Math.max(1,Number(widget?.w)||1);
  const h=Math.max(1,Number(widget?.h)||1);
  const maxX=Math.max(1,logicalColumns-w+1);
  const maxY=Math.max(1,logicalRows-h+1);

  /*
   * Drag boundary guard:
   * A widget can move only inside the logical grid rectangle. This prevents
   * drag/drop from placing widgets outside .mha-widget-area, especially below
   * the bottom edge.
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

_startResize(e,id){if(this._isMobileLauncherLayout())return;if(!this._isEditing||e.button!==0)return;e.preventDefault();e.stopPropagation();this._clearCurrentWidgetPositions();const w=this._widgets.find(x=>x.id===id),m=this._getGridMetrics();if(!w||!m)return;this._resizeState={widgetId:id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startW:w.w,startH:w.h,metrics:m};e.currentTarget.closest(".mha-widget")?.classList.add("is-resizing");e.currentTarget.setPointerCapture?.(e.pointerId);const move=ev=>this._updateResize(ev),end=ev=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);this._finishResize(ev)};window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end,{passive:false});window.addEventListener("pointercancel",end,{passive:false})}
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
render(){syncThemeAttributes(this);const renderId=++this._renderId,layoutMode=getLayoutMode(this),layout=getEffectiveLayout(this),preset=this._getRuntimeGridPreset(),units=preset.columns*WIDGET_UNIT.unitsPerLogicalColumn,rows=preset.rows*WIDGET_UNIT.unitsPerLogicalColumn,cols=preset.columns,logicalRows=preset.rows,themeStyle=THEME_STYLES.has(document.documentElement.dataset.themeStyle)?document.documentElement.dataset.themeStyle:"oneui";const iconShapeSetting=getStoredIconShapeSetting(this);const iconShape=resolveIconShape(themeStyle,iconShapeSetting);this._clearGridScrollListener();this.dataset.themeStyle=themeStyle;this.dataset.iconShapeSetting=iconShapeSetting;this.setAttribute("data-icon-shape-setting",iconShapeSetting);this.dataset.iconShape=iconShape;this.setAttribute("data-icon-shape",iconShape);document.documentElement.dataset.iconShapeSetting=iconShapeSetting;document.documentElement.setAttribute("data-icon-shape-setting",iconShapeSetting);document.documentElement.dataset.iconShape=iconShape;document.documentElement.setAttribute("data-icon-shape",iconShape);const accent=normalizeAccent(themeStyle,localStorage.getItem(`mha-accent-${themeStyle}`)||localStorage.getItem("mha-accent")||"sky");this.dataset.accent=accent;this.setAttribute("data-accent",accent);document.documentElement.dataset.accent=accent;document.documentElement.setAttribute("data-accent",accent);this.dataset.layoutMode=layoutMode;this.dataset.layout=layout;this.dataset.gridDensity=preset.density;this.dataset.gridUnits=String(units);this.dataset.logicalColumns=String(cols);this.dataset.gridRows=String(rows);this.dataset.logicalRows=String(logicalRows);this.classList.toggle("is-editing",this._isEditing);this.style.setProperty("--mha-runtime-grid-units",String(units));this.style.setProperty("--mha-runtime-grid-rows",String(rows));this.shadowRoot.innerHTML=`<link rel="stylesheet" href="./styles/core/tokens.css"><link rel="stylesheet" href="./styles/components/icon.css"><link rel="stylesheet" href="./styles/components/icon-symbol.css"><link rel="stylesheet" href="./styles/components/slider.css"><link rel="stylesheet" href="./styles/components/toggle.css"><link rel="stylesheet" href="./styles/components/pill.css"><link rel="stylesheet" href="./styles/components/button.css"><link rel="stylesheet" href="./styles/themes/ios.css"><link rel="stylesheet" href="./styles/themes/oneui.css"><link rel="stylesheet" href="./styles/themes/material.css"><link rel="stylesheet" href="./styles/themes/accent-palettes.css"><link rel="stylesheet" href="./styles/themes/semantic-tokens.css"><link rel="stylesheet" href="./styles/core/background.css"><link rel="stylesheet" href="./styles/layout/shell.css"><link rel="stylesheet" href="./styles/layout/widget-grid.css"><link rel="stylesheet" href="./styles/layout/status-bar.css"><link rel="stylesheet" href="./styles/layout/dock.css"><link rel="stylesheet" href="./styles/layout/mobile-dock.css"><link rel="stylesheet" href="./styles/layout/floating-controls.css"><link rel="stylesheet" href="./styles/settings/settings-panel.css"><link rel="stylesheet" href="./styles/widget-manager/widget-manager.css"><link rel="stylesheet" href="./styles/themes/light-text-contract.css"><link rel="stylesheet" href="./styles/widgets/widget-layout.css"><link rel="stylesheet" href="./styles/widgets/empty-widget.css"><link rel="stylesheet" href="./styles/widgets/slider-widget.css"><link rel="stylesheet" href="./styles/widgets/clock-widget.css"><link rel="stylesheet" href="./styles/widgets/weather-widget.css"><link rel="stylesheet" href="./styles/screensaver/screensaver.css">`;const links=[...this.shadowRoot.querySelectorAll('link[rel="stylesheet"]')],{bg,shell,grid}=createShell({layoutMode,layout,logicalColumns:cols,gridUnits:units,onSettings:()=>this._openSettings()});this.shadowRoot.append(bg,shell);const positions=this._getActiveWidgetPositions();this._widgets.forEach(w=>{const el=createEmptyWidget(w,{activeGridUnits:units,isEditing:this._isEditing,isMoveTarget:this._isEditing&&this._activeMoveWidgetId===w.id,position:positions?.[w.id],onToggleMove:id=>this._toggleWidgetMoveMode(id),onMove:(id,direction)=>this._moveWidgetByDirection(id,direction),onRemove:id=>this._removeWidget(id),onResizeStart:(e,id)=>this._startResize(e,id)});this._wireDrag(el,w);grid.append(el)});this.shadowRoot.append(createScreensaver({isVisible:this._getScreensaverVisible(),showNowBar:this._screensaverNowBar,clockVariant:this._screensaverClockVariant,onClockVariantChange:v=>this._applyScreensaverClockVariantFromSettings(v),onOpenScreensaverSettings:()=>this._openScreensaverSettings(),onWake:()=>this._wakeScreensaver()}));this.shadowRoot.append(createMobileDock({onSettings:()=>this._openSettings()}));this.shadowRoot.append(this._createSettingsPanel());this.shadowRoot.append(this._createWidgetManagerPanel());this.shadowRoot.append(createSettingsPanel(this._getSettingsPanelProps("screensaver")));const edit=document.createElement("button");edit.className="mha-edit-button mha-main-edit-button mha-primary-edit-button";edit.type="button";edit.innerHTML=this._isEditing?ICONS.close:ICONS.edit;edit.onclick=()=>this.toggleEditMode();this.shadowRoot.append(edit);const addWidget=document.createElement("button");addWidget.className="mha-edit-button mha-main-edit-button mha-add-widget-button";addWidget.type="button";addWidget.innerHTML=`<svg viewBox="0 0 24 24"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>`;addWidget.setAttribute("aria-label","Ajouter un widget");addWidget.hidden=!this._isEditing;addWidget.onclick=(event)=>{event.preventDefault();event.stopPropagation();this._openWidgetManager()};this.shadowRoot.append(addWidget);this._syncEditModeDom();this._wireDockAutoHide(grid);this._scheduleSquareUnitSync();Promise.all(links.map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{link.addEventListener("load",resolve,{once:true});link.addEventListener("error",resolve,{once:true})}))).then(()=>{if(this._renderId!==renderId)return;const styledUnits=getActiveGridUnits(this);if(styledUnits!==units){this.render();return}this._scheduleSquareUnitSync();this._syncScreensaverVisibilityState();this._markReadyAfterPaint()});updateStatusTime(this.shadowRoot);updateClockWidgets(this.shadowRoot);this._syncWidgetDropSlots();this._markReadyAfterPaint();this._scheduleScreensaverIdleTimer()}}
customElements.define("mha-control-hub",MhaControlHub);
