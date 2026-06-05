export const WIDGET_UNIT=Object.freeze({unitsPerLogicalColumn:2});
export const DEFAULT_WIDGETS=Object.freeze([{id:"slot-a",w:4,h:2},{id:"slot-b",w:4,h:2},{id:"slot-c",w:4,h:2},{id:"slot-d",w:2,h:2},{id:"slot-e",w:2,h:2},{id:"slot-f",kind:"slider",w:4,h:1},{id:"slot-g",w:3,h:2},{id:"slot-h",w:3,h:2},{id:"slot-i",kind:"slider",w:1,h:4},{id:"slot-j",w:4,h:3}]);
export function normalizeWidgetSize({w=2,h=1}={}){w=Math.round(Number(w));h=Math.round(Number(h));if(!Number.isFinite(w))w=2;if(!Number.isFinite(h))h=1;w=Math.max(1,Math.min(6,w));h=Math.max(1,Math.min(6,h));if(w===1&&h===1)w=2;if(w>4&&h>4){if(w>=h)h=4;else w=4}return{w,h}}
export function getWidgetDensity({w=2,h=1}={}){({w,h}=normalizeWidgetSize({w,h}));if(h<=1&&w<=2)return"micro";if(h<=1)return"compact";if(h===2)return"standard";if(h===3&&w>=6)return"panel";if(h===3)return"rich";if(h>=4&&w>=6)return"panel";if(h>=4)return"immersive";return"standard"}
export const sizeToString=({w,h})=>`${w}x${h}`;
export function getLayoutMode(host){const explicit=host?.dataset?.layout||document.documentElement.dataset.layout;const mode=host?.dataset?.layoutMode||document.documentElement.dataset.layoutMode||explicit||"auto";return mode==="wallpanel"?"tablet":(["auto","mobile","tablet","desktop"].includes(mode)?mode:"auto")}
export function getEffectiveLayout(host){const mode=getLayoutMode(host);if(mode!=="auto")return mode;const width=host?.getBoundingClientRect?.().width||window.innerWidth||0;if(width>=1180)return"desktop";if(width>=700)return"tablet";return"mobile"}
function cssPx(host,name,fallback){const value=host?Number.parseFloat(getComputedStyle(host).getPropertyValue(name)):NaN;return Number.isFinite(value)&&value>0?value:fallback}
export function getLogicalColumnCount(host,layout=getEffectiveLayout(host)){const r=host?.getBoundingClientRect?.()||{};const width=r.width||window.innerWidth||0;const height=r.height||window.innerHeight||0;const isLandscape=width>height;if(layout==="mobile")return isLandscape?3:2;if(layout==="tablet")return isLandscape?6:5;const pagePadding=cssPx(host,"--mha-page-padding",22),target=cssPx(host,"--mha-logical-column-min-width",184),available=Math.max(0,width-pagePadding*2);return Math.max(6,Math.min(12,Math.floor(available/target)||6))}
export function getActiveGridUnits(host,layout=getEffectiveLayout(host)){return getLogicalColumnCount(host,layout)*WIDGET_UNIT.unitsPerLogicalColumn}


export function isSliderWidgetSizeContract({w=2,h=1}={}) {
  return (w >= h && h === 1) || (h > w && w === 1);
}

export function normalizeSliderWidgetSize({w=2,h=1}={}) {
  ({w,h}=normalizeWidgetSize({w,h}));

  /*
   * SliderWidget size contract.
   *
   * The widget itself is axis-locked:
   * - landscape / square intent becomes horizontal: 2x1..4x1;
   * - portrait intent becomes vertical: 1x2..1x4.
   *
   * This contract applies to the widget shell, not to reusable slider controls.
   */
  if (h > w) {
    return {w:1,h:Math.max(2,Math.min(4,h))};
  }

  return {w:Math.max(2,Math.min(4,w)),h:1};
}

export function normalizeWidgetForKind(widget={}) {
  const size=normalizeWidgetSize(widget);
  const kind=widget.kind||widget.type||widget.component;
  const isSlider=kind==="slider"||kind==="slider-widget"||widget.id==="slot-f"||widget.id==="slot-i";
  if(!isSlider)return size;
  return normalizeSliderWidgetSize(size);
}
