import {readJson,writeJson} from "./src/core/storage.js";
import {ICONS} from "./src/components/icons.js";
import {createShell} from "./src/layout/shell.js";
import {createMobileDock} from "./src/layout/mobile-dock.js";
import {createSettingsPanel} from "./src/settings/settings-panel.js";
import {updateStatusTime} from "./src/layout/status-bar.js";
import {createEmptyWidget} from "./src/widgets/empty-widget.js";
import {DEFAULT_WIDGETS,WIDGET_UNIT,getActiveGridUnits,getEffectiveLayout,getLayoutMode,getWidgetDensity,normalizeWidgetSize,sizeToString} from "./src/layout/layout-engine.js";
import {createScreensaver,normalizeClockVariant,updateScreensaverClock} from "./src/screensaver/screensaver.js";
// Keeps existing local widget order/sizes after the public naming cleanup.

function syncThemeAttributes(host) {
  const theme = document.documentElement.dataset.theme || "dark";
  const themeStyle = document.documentElement.dataset.themeStyle || "oneui";
  const iconShape = document.documentElement.dataset.iconShape || host.dataset.iconShape || "squircle";

  host.dataset.theme = theme;
  host.setAttribute("data-theme", theme);

  host.dataset.themeStyle = themeStyle;
  host.setAttribute("data-theme-style", themeStyle);

  host.dataset.iconShape = iconShape;
  host.setAttribute("data-icon-shape", iconShape);
}

const ORDER="mha-grid-order",SIZES="mha-widget-sizes",LEGACY_STORAGE_PREFIX=["mha","v2"].join("-"),THEME_STYLES=new Set(["ios","oneui","material"]);
function readMigratedJson(key,legacyKey,fallback){const current=readJson(key,null);if(current!==null)return current;const legacy=readJson(legacyKey,null);if(legacy!==null){writeJson(key,legacy);return legacy}return fallback}
class MhaControlHub extends HTMLElement{constructor(){super();this.attachShadow({mode:"open"});this._hass=null;this._isEditing=false;this._draggedId="";this._resizeState=null;this._squareUnitFrame=0;this._renderId=0;this._gridScrollCleanup=null;this._screensaverPreview=false;this._screensaverNowBar=true;this._screensaverClockVariant="digital";this._settingsOpen=false;this._widgets=this._readWidgets()}
set hass(h){this._hass=h;this.render()}get hass(){return this._hass}
connectedCallback(){this.render();this._clockTimer=setInterval(()=>{updateStatusTime(this.shadowRoot);if(this._screensaverPreview)updateScreensaverClock(this.shadowRoot,this._screensaverClockVariant)},1000);this._resizeListener=()=>{this._syncRuntimeLayoutAttrs();this._scheduleSquareUnitSync()};window.addEventListener("resize",this._resizeListener);this._settingsOpenListener=()=>this._openSettings();this.shadowRoot.addEventListener("mha-open-settings",this._settingsOpenListener)}
disconnectedCallback(){clearInterval(this._clockTimer);cancelAnimationFrame(this._squareUnitFrame);this._clearGridScrollListener();window.removeEventListener("resize",this._resizeListener);if(this._settingsOpenListener)this.shadowRoot.removeEventListener("mha-open-settings",this._settingsOpenListener)}
requestRender(){this.render()}
_syncEditModeDom(){
  this.classList.toggle("is-editing",this._isEditing);
  const edit=this.shadowRoot.querySelector(".mha-edit-button");
  if(edit)edit.innerHTML=this._isEditing?ICONS.close:ICONS.edit;
  this.shadowRoot.querySelectorAll(".mha-widget").forEach(el=>{
    el.draggable=this._isEditing;
  });
}_openSettings(){this._settingsOpen=true;this._syncSettingsModalState();this._syncSettingsDom()}
_closeSettings(){this._settingsOpen=false;this._syncSettingsModalState();this._syncSettingsDom()}
_syncSettingsModalState(){this.classList.toggle("is-settings-open",this._settingsOpen);this.dataset.settingsOpen=String(this._settingsOpen)}
_syncSettingsDom(){
  const existing=this.shadowRoot.querySelector(".mha-settings-panel");
  if(existing)existing.remove();
  this._syncSettingsModalState();this.shadowRoot.append(this._createSettingsPanel());
}
_createSettingsPanel(){
  return createSettingsPanel({
    open:this._settingsOpen,
    theme:document.documentElement.dataset.theme||this.dataset.theme||"dark",
    themeStyle:document.documentElement.dataset.themeStyle||this.dataset.themeStyle||"oneui",
    iconShape:document.documentElement.dataset.iconShape||this.dataset.iconShape||"squircle",
    screensaverPreview:this._screensaverPreview,
    screensaverNowBar:this._screensaverNowBar,
    screensaverClockVariant:this._screensaverClockVariant,
    onClose:()=>this._closeSettings(),
    onThemeChange:v=>this._applyThemeFromSettings(v),
    onThemeStyleChange:v=>this._applyThemeStyleFromSettings(v),
    onIconShapeChange:v=>this._applyIconShapeFromSettings(v),
    onScreensaverPreviewChange:v=>{this._screensaverPreview=v;this._syncScreensaverDom();this._syncSettingsDom()},
    onScreensaverNowBarChange:v=>{this._screensaverNowBar=v;this._syncScreensaverDom();this._syncSettingsDom()},
    onScreensaverClockVariantChange:v=>{this._screensaverClockVariant=normalizeClockVariant(v);this._syncScreensaverDom();this._syncSettingsDom()},
    onResetGrid:()=>this.resetGrid(),
  });
}
_readThemeBackdropSnapshot(){
  const style=getComputedStyle(this);
  return style.getPropertyValue("--mha-page-bg").trim()||style.getPropertyValue("--mha-background").trim()||style.getPropertyValue("--mha-shell-bg").trim()||"transparent";
}
_prepareThemeBackdropCrossfade(){
  this.style.setProperty("--mha-theme-crossfade-from",this._readThemeBackdropSnapshot());
  this.classList.remove("is-theme-backdrop-crossfading");
  void this.offsetWidth;
}
_runThemeBackdropCrossfade(){
  this.classList.add("is-theme-backdrop-crossfading");
  clearTimeout(this._themeBackdropCrossfadeTimer);
  this._themeBackdropCrossfadeTimer=setTimeout(()=>{
    this.classList.remove("is-theme-backdrop-crossfading");
    this.style.removeProperty("--mha-theme-crossfade-from");
  },2000);
}
_applyThemeFromSettings(theme="dark"){
  const resolved=theme==="light"?"light":"dark";
  this._prepareThemeBackdropCrossfade();
  document.documentElement.dataset.theme=resolved;
  document.documentElement.setAttribute("data-theme",resolved);
  this.dataset.theme=resolved;
  this.setAttribute("data-theme",resolved);
  localStorage.setItem("mha-dev-theme",resolved);
  this._runThemeBackdropCrossfade();
  this._syncSettingsDom();
}
_applyThemeStyleFromSettings(style="oneui"){
  const allowed=["ios","oneui","material"];
  const resolved=allowed.includes(style)?style:"oneui";
  this._prepareThemeBackdropCrossfade();
  document.documentElement.dataset.themeStyle=resolved;
  document.documentElement.setAttribute("data-theme-style",resolved);
  this.dataset.themeStyle=resolved;
  this.setAttribute("data-theme-style",resolved);
  localStorage.setItem("mha-dev-theme-style",resolved);
  this._runThemeBackdropCrossfade();
  this._syncSettingsDom();
}
_applyIconShapeFromSettings(shape="squircle"){
  const allowed=["rounded-square","squircle","circle"];
  const resolved=allowed.includes(shape)?shape:"squircle";
  document.documentElement.dataset.iconShape=resolved;
  document.documentElement.setAttribute("data-icon-shape",resolved);
  this.dataset.iconShape=resolved;
  this.setAttribute("data-icon-shape",resolved);
  localStorage.setItem("mha-dev-icon-shape",resolved);
  this._syncSettingsDom();
}

toggleEditMode(){this._isEditing=!this._isEditing;this._syncEditModeDom()}toggleScreensaverPreview(){this._screensaverPreview=!this._screensaverPreview;this._syncScreensaverDom()}toggleNowBarPreview(){this._screensaverNowBar=!this._screensaverNowBar;this._syncScreensaverDom()}setScreensaverClockVariant(v="digital"){this._screensaverClockVariant=normalizeClockVariant(v);this._syncScreensaverDom()}resetGrid(){localStorage.removeItem(ORDER);localStorage.removeItem(SIZES);this._widgets=this._readWidgets();this.render()}
_readWidgets(){const byId=new Map(DEFAULT_WIDGETS.map(w=>[w.id,w]));const order=readMigratedJson(ORDER,`${LEGACY_STORAGE_PREFIX}-grid-order`,DEFAULT_WIDGETS.map(w=>w.id)).filter?.(id=>byId.has(id))||[];DEFAULT_WIDGETS.forEach(w=>{if(!order.includes(w.id))order.push(w.id)});const sizes=readMigratedJson(SIZES,`${LEGACY_STORAGE_PREFIX}-widget-sizes`,{});return order.map(id=>({...byId.get(id),...normalizeWidgetSize(sizes[id]||byId.get(id))}))}
_saveWidgets(){writeJson(ORDER,this._widgets.map(w=>w.id));const sizes={};this._widgets.forEach(w=>sizes[w.id]=normalizeWidgetSize(w));writeJson(SIZES,sizes)}
_removeWidget(id){this._widgets=this._widgets.filter(w=>w.id!==id);this._saveWidgets();this._scheduleSquareUnitSync()}
_moveWidget(sourceId,targetId,placement="before"){
  if(!sourceId||!targetId||sourceId===targetId)return;
  const si=this._widgets.findIndex(w=>w.id===sourceId),ti=this._widgets.findIndex(w=>w.id===targetId);
  if(si<0||ti<0)return;
  const next=[...this._widgets];
  const [moved]=next.splice(si,1);
  const ati=next.findIndex(w=>w.id===targetId);
  next.splice(placement==="after"?ati+1:ati,0,moved);
  this._widgets=next;
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
_clearGridScrollListener(){this._gridScrollCleanup?.();this._gridScrollCleanup=null}
// The dock behaves like macOS: downward grid scroll gets it out of the way, upward scroll recalls it.
_wireDockAutoHide(grid){this._clearGridScrollListener();this.classList.remove("is-dock-hidden");
const shouldAutoHideDock=()=>window.matchMedia("(max-width: 767px)").matches;
if(!shouldAutoHideDock())return;
let previousScrollTop=grid.scrollTop;const threshold=10;const onScroll=()=>{if(!shouldAutoHideDock()){this.classList.remove("is-dock-hidden");previousScrollTop=grid.scrollTop;return}const currentScrollTop=grid.scrollTop;if(currentScrollTop<=4){this.classList.remove("is-dock-hidden");previousScrollTop=currentScrollTop;return}const delta=currentScrollTop-previousScrollTop;if(delta>threshold)this.classList.add("is-dock-hidden");else if(delta<-threshold)this.classList.remove("is-dock-hidden");if(Math.abs(delta)>threshold)previousScrollTop=currentScrollTop};grid.addEventListener("scroll",onScroll,{passive:true});this._gridScrollCleanup=()=>grid.removeEventListener("scroll",onScroll)}
_scheduleSquareUnitSync(){cancelAnimationFrame(this._squareUnitFrame);this._squareUnitFrame=requestAnimationFrame(()=>{this._squareUnitFrame=requestAnimationFrame(()=>this._syncSquareUnit())})}
_syncSquareUnit(){const grid=this.shadowRoot.querySelector(".mha-grid");if(!grid)return;const st=getComputedStyle(grid);const units=getActiveGridUnits(this);const gap=Number.parseFloat(st.columnGap||st.gap||"0")||0;const padding=(Number.parseFloat(st.paddingLeft)||0)+(Number.parseFloat(st.paddingRight)||0);const width=grid.clientWidth-padding;const unit=(width-gap*(units-1))/units;if(Number.isFinite(unit)&&unit>0)grid.style.setProperty("--mha-square-unit",`${unit}px`)}
_getGridMetrics(){const grid=this.shadowRoot.querySelector(".mha-grid");if(!grid)return null;const st=getComputedStyle(grid);const col=parseFloat(st.gridTemplateColumns.split(" ")[0])||72;const gap=parseFloat(st.columnGap||st.gap||"0")||0;const row=parseFloat(st.gridAutoRows)||72;return{columnStep:col+gap,rowStep:row+gap}}
_startResize(e,id){if(!this._isEditing||e.button!==0)return;e.preventDefault();e.stopPropagation();const w=this._widgets.find(x=>x.id===id),m=this._getGridMetrics();if(!w||!m)return;this._resizeState={widgetId:id,pointerId:e.pointerId,startX:e.clientX,startY:e.clientY,startW:w.w,startH:w.h,metrics:m};e.currentTarget.closest(".mha-widget")?.classList.add("is-resizing");e.currentTarget.setPointerCapture?.(e.pointerId);const move=ev=>this._updateResize(ev),end=ev=>{window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",end);window.removeEventListener("pointercancel",end);this._finishResize(ev)};window.addEventListener("pointermove",move,{passive:false});window.addEventListener("pointerup",end,{passive:false});window.addEventListener("pointercancel",end,{passive:false})}
_updateResize(e){const s=this._resizeState;if(!s||e.pointerId!==s.pointerId)return;e.preventDefault();const ns=normalizeWidgetSize({w:s.startW+Math.round((e.clientX-s.startX)/s.metrics.columnStep),h:s.startH+Math.round((e.clientY-s.startY)/s.metrics.rowStep)});this._widgets=this._widgets.map(w=>w.id===s.widgetId?{...w,...ns}:w);const el=this.shadowRoot.querySelector(`[data-widget-id="${s.widgetId}"]`);if(!el)return;const density=getWidgetDensity(ns);el.dataset.widgetConfiguredW=String(ns.w);el.dataset.widgetW=String(Math.min(ns.w,getActiveGridUnits(this)));el.dataset.widgetH=String(ns.h);el.dataset.widgetSize=sizeToString(ns);el.dataset.widgetDensity=density;el.style.setProperty("--mha-widget-w",String(Math.min(ns.w,getActiveGridUnits(this))));el.style.setProperty("--mha-widget-configured-w",String(ns.w));el.style.setProperty("--mha-widget-h",String(ns.h));const badge=el.querySelector(".mha-size-badge");if(badge)badge.textContent=`${sizeToString(ns)} · ${density}`}
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
_wireDrag(el,w){el.draggable=this._isEditing;el.addEventListener("dragstart",e=>{if(!this._isEditing){e.preventDefault();return}if(e.target.closest(".mha-widget-tools,.mha-resize-handle")){e.preventDefault();return}this._draggedId=w.id;el.classList.add("is-dragging");e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",w.id)});el.addEventListener("dragover",e=>{if(!this._isEditing)return;const id=this._draggedId||e.dataTransfer.getData("text/plain");if(!id||id===w.id)return;e.preventDefault();const p=this._getDropPlacement(e,el);this._clearDropState();el.classList.toggle("is-drop-before",p==="before");el.classList.toggle("is-drop-after",p==="after");el.dataset.dropPlacement=p});el.addEventListener("drop",e=>{if(!this._isEditing)return;const id=this._draggedId||e.dataTransfer.getData("text/plain");if(!id||id===w.id)return;e.preventDefault();const p=el.dataset.dropPlacement||"before";this._clearDropState();this._draggedId="";this._moveWidget(id,w.id,p)});el.addEventListener("dragend",()=>{this._draggedId="";el.classList.remove("is-dragging");this._clearDropState()})}
render(){syncThemeAttributes(this);const renderId=++this._renderId,layoutMode=getLayoutMode(this),layout=getEffectiveLayout(this),units=getActiveGridUnits(this),cols=units/WIDGET_UNIT.unitsPerLogicalColumn,themeStyle=THEME_STYLES.has(document.documentElement.dataset.themeStyle)?document.documentElement.dataset.themeStyle:"oneui";this._clearGridScrollListener();this.dataset.themeStyle=themeStyle;this.dataset.layoutMode=layoutMode;this.dataset.layout=layout;this.dataset.gridUnits=String(units);this.dataset.logicalColumns=String(cols);this.classList.toggle("is-editing",this._isEditing);this.style.setProperty("--mha-runtime-grid-units",String(units));this.shadowRoot.innerHTML=`<link rel="stylesheet" href="./styles/core/tokens.css"><link rel="stylesheet" href="./styles/components/icon.css"><link rel="stylesheet" href="./styles/components/icon-symbol.css"><link rel="stylesheet" href="./styles/components/slider.css"><link rel="stylesheet" href="./styles/components/toggle.css"><link rel="stylesheet" href="./styles/components/pill.css"><link rel="stylesheet" href="./styles/components/button.css"><link rel="stylesheet" href="./styles/themes/ios.css"><link rel="stylesheet" href="./styles/themes/oneui.css"><link rel="stylesheet" href="./styles/themes/material.css"><link rel="stylesheet" href="./styles/core/background.css"><link rel="stylesheet" href="./styles/layout/shell.css"><link rel="stylesheet" href="./styles/layout/status-bar.css"><link rel="stylesheet" href="./styles/layout/dock.css"><link rel="stylesheet" href="./styles/layout/mobile-dock.css"><link rel="stylesheet" href="./styles/settings/settings-panel.css"><link rel="stylesheet" href="./styles/themes/light-text-contract.css"><link rel="stylesheet" href="./styles/widgets/widget-layout.css"><link rel="stylesheet" href="./styles/widgets/empty-widget.css"><link rel="stylesheet" href="./styles/screensaver/screensaver.css">`;const links=[...this.shadowRoot.querySelectorAll('link[rel="stylesheet"]')],{bg,shell,grid}=createShell({layoutMode,layout,logicalColumns:cols,gridUnits:units,onSettings:()=>this._openSettings()});this.shadowRoot.append(bg,shell);this._widgets.forEach(w=>{const el=createEmptyWidget(w,{activeGridUnits:units,isEditing:this._isEditing,onRemove:id=>this._removeWidget(id),onResizeStart:(e,id)=>this._startResize(e,id)});this._wireDrag(el,w);grid.append(el)});this.shadowRoot.append(createScreensaver({isVisible:this._screensaverPreview,showNowBar:this._screensaverNowBar,clockVariant:this._screensaverClockVariant}));this.shadowRoot.append(createMobileDock({onSettings:()=>this._openSettings()}));this.shadowRoot.append(this._createSettingsPanel());const edit=document.createElement("button");edit.className="mha-edit-button";edit.type="button";edit.innerHTML=this._isEditing?ICONS.close:ICONS.edit;edit.onclick=()=>this.toggleEditMode();this.shadowRoot.append(edit);this._syncEditModeDom();this._wireDockAutoHide(grid);this._scheduleSquareUnitSync();Promise.all(links.map(link=>link.sheet?Promise.resolve():new Promise(resolve=>{link.addEventListener("load",resolve,{once:true});link.addEventListener("error",resolve,{once:true})}))).then(()=>{if(this._renderId!==renderId)return;const styledUnits=getActiveGridUnits(this);if(styledUnits!==units){this.render();return}this._scheduleSquareUnitSync()});updateStatusTime(this.shadowRoot)}}
customElements.define("mha-control-hub",MhaControlHub);
