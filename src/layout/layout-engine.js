import { normalizeRegisteredWidgetSize } from "../widgets/widget-registry.js";
import { getLayoutForWidth } from "./responsive.js";

export const WIDGET_UNIT=Object.freeze({unitsPerLogicalColumn:2});

/*
 * Public widget-size contract
 * ---------------------------
 * User-facing sizes follow the iOS/Android vocabulary:
 * - 2x2 = one standard square widget
 * - 4x2 = two standard squares wide
 * - 2x4 = two standard squares tall
 * - 4x4 = large square, 2 by 2 standard widget cells
 *
 * Internally, the CSS grid keeps twice as many small square units so widgets can
 * still be placed and resized with the familiar 2x2 / 4x2 / 4x4 names.
 * In other words:
 *   1 logical grid cell = 2 internal grid units × 2 internal grid units.
 */
export const USER_WIDGET_SIZE_UNIT=2;
export function widgetSpanToLogicalCellCount(span=USER_WIDGET_SIZE_UNIT){
  const value=Number(span);
  if(!Number.isFinite(value)||value<=0)return 1;
  return Math.max(1,Math.ceil(value/USER_WIDGET_SIZE_UNIT));
}
export function widgetSizeToLogicalSize({w=USER_WIDGET_SIZE_UNIT,h=USER_WIDGET_SIZE_UNIT}={}){
  return {
    w:widgetSpanToLogicalCellCount(w),
    h:widgetSpanToLogicalCellCount(h),
  };
}
export function logicalSizeToWidgetSize({w=1,h=1}={}){
  const logicalW=Math.max(1,Math.round(Number(w)||1));
  const logicalH=Math.max(1,Math.round(Number(h)||1));
  return {
    w:logicalW*USER_WIDGET_SIZE_UNIT,
    h:logicalH*USER_WIDGET_SIZE_UNIT,
  };
}
export function getInternalGridColumnCountFromLogical(logicalColumns=1){
  return Math.max(1,Math.round(Number(logicalColumns)||1))*USER_WIDGET_SIZE_UNIT;
}
export function getInternalGridRowCountFromLogical(logicalRows=1){
  return Math.max(1,Math.round(Number(logicalRows)||1))*USER_WIDGET_SIZE_UNIT;
}
/*
 * Home defaults
 * -------------
 * The home grid should start empty on first launch.
 *
 * Users add their own widgets from the widget manager, so the code should not
 * seed demo/default widgets that can leave stale position maps behind.
 */
export const DEFAULT_WIDGETS=Object.freeze([]);
export function normalizeWidgetSize({w=2,h=1}={}){w=Math.round(Number(w));h=Math.round(Number(h));if(!Number.isFinite(w))w=2;if(!Number.isFinite(h))h=1;w=Math.max(1,Math.min(6,w));h=Math.max(1,Math.min(6,h));if(w===1&&h===1)w=2;if(w>4&&h>4){if(w>=h)h=4;else w=4}return{w,h}}
export function getWidgetDensity({w=2,h=1}={}){({w,h}=normalizeWidgetSize({w,h}));if(h<=1&&w<=2)return"micro";if(h<=1)return"compact";if(h===2)return"standard";if(h===3&&w>=6)return"panel";if(h===3)return"rich";if(h>=4&&w>=6)return"panel";if(h>=4)return"immersive";return"standard"}
export const sizeToString=({w,h})=>`${w}x${h}`;
export function getLayoutMode(host){const explicit=host?.dataset?.layout||document.documentElement.dataset.layout;const mode=host?.dataset?.layoutMode||document.documentElement.dataset.layoutMode||explicit||"auto";return mode==="wallpanel"?"tablet":(["auto","mobile","tablet","desktop"].includes(mode)?mode:"auto")}
export function getEffectiveLayout(host){const mode=getLayoutMode(host);if(mode!=="auto")return mode;const width=host?.getBoundingClientRect?.().width||window.innerWidth||0;return getLayoutForWidth(width)}
function cssPx(host,name,fallback){const value=host?Number.parseFloat(getComputedStyle(host).getPropertyValue(name)):NaN;return Number.isFinite(value)&&value>0?value:fallback}

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getAdaptiveBounds(layout, isLandscape) {
  /*
   * Bounds are for the small internal grid unit.
   *
   * A visible 2x2 widget spans 2 units by 2 units. To make the visible 2x2 feel
   * closer to the previous oversized 3x3, we keep the unit larger and cap max
   * columns/rows by layout AND orientation.
   */
  if (layout === "mobile") {
    return isLandscape
      ? {
          // Mobile launcher landscape: 4 logical columns × 2 = 8 widget units.
          minCell: 44,
          targetCell: 54,
          maxCell: 999,
          minColumns: 4,
          maxColumns: 4,
          minRows: 2,
          maxRows: 4,
          targetFillX: 1,
          targetFillY: 0.72,
          forceWidthFill: true,
        }
      : {
          // Mobile launcher portrait: 2 logical columns × 2 = 4 widget units.
          minCell: 64,
          targetCell: 82,
          maxCell: 999,
          minColumns: 2,
          maxColumns: 2,
          minRows: 4,
          maxRows: 7,
          targetFillX: 1,
          targetFillY: 0.86,
          forceWidthFill: true,
        };
  }

  if (layout === "tablet") {
    return isLandscape
      ? {
          minCell: 88,
          targetCell: 104,
          maxCell: 150,
          minColumns: 4,
          maxColumns: 6,
          minRows: 3,
          maxRows: 4,
          targetFillX: 0.88,
          targetFillY: 0.76,
        }
      : {
          minCell: 84,
          targetCell: 102,
          maxCell: 148,
          minColumns: 3,
          maxColumns: 4,
          minRows: 4,
          maxRows: 6,
          targetFillX: 0.82,
          targetFillY: 0.88,
        };
  }

  return isLandscape
    ? {
        minCell: 88,
        targetCell: 106,
        maxCell: 152,
        minColumns: 6,
        maxColumns: 7,
        minRows: 3,
        maxRows: 4,
        targetFillX: 0.9,
        targetFillY: 0.72,
      }
    : {
        minCell: 88,
        targetCell: 108,
        maxCell: 156,
        minColumns: 4,
        maxColumns: 5,
        minRows: 4,
        maxRows: 5,
        targetFillX: 0.84,
        targetFillY: 0.82,
      };
}

export function getGridPreset(host, layout = getEffectiveLayout(host), metrics = {}) {
  const r = host?.getBoundingClientRect?.() || {};
  const width = metrics.width || r.width || window.innerWidth || 0;
  const height = metrics.height || r.height || window.innerHeight || 0;
  const isLandscape = width > height;
  const bounds = getAdaptiveBounds(layout, isLandscape);

  /*
   * Orientation-aware comfort matrix.
   *
   * The shell/widget-area rectangle is already correct. This only chooses a
   * columns/rows pair. We prioritize:
   * 1) comfortable widget size;
   * 2) square cells;
   * 3) good fill of the available widget-area.
   *
   * We do not fill width at any cost, because that makes 2x2 widgets feel tiny.
   */
  let best = null;
  let bestFallback = null;

  for (let rows = bounds.minRows; rows <= bounds.maxRows; rows += 1) {
    for (let columns = bounds.minColumns; columns <= bounds.maxColumns; columns += 1) {
      const widthCell = Math.min(width / columns, bounds.maxCell);
      const balancedCell = Math.min(widthCell, height / rows);
      const cell = bounds.forceWidthFill ? widthCell : balancedCell;
      if (!Number.isFinite(cell) || cell <= 0) continue;

      const gridWidth = bounds.forceWidthFill ? width : cell * columns;
      const gridHeight = cell * rows;
      const fillX = width > 0 ? gridWidth / width : 1;
      const fillY = height > 0 ? gridHeight / height : 1;

      const underMinPenalty = cell < bounds.minCell
        ? ((bounds.minCell - cell) / bounds.minCell)
        : 0;
      const targetCellPenalty = Math.abs(cell - bounds.targetCell) / bounds.targetCell;
      const widthPenalty = Math.max(0, bounds.targetFillX - fillX);
      const heightPenalty = Math.max(0, bounds.targetFillY - fillY);

      /*
       * Comfort beats density. Fill is important, but not enough to shrink the
       * unit below the visual target.
       */
      const score =
        Math.min(cell, bounds.maxCell) / bounds.maxCell * 5.5 +
        fillX * 3.5 +
        fillY * 2.0 -
        underMinPenalty * 10 -
        targetCellPenalty * 3.2 -
        widthPenalty * 3.8 -
        heightPenalty * 1.6 -
        (columns / bounds.maxColumns) * 0.45;

      const candidate = {
        columns,
        rows,
        cell,
        fillX,
        fillY,
        score,
        validComfort: cell >= bounds.minCell,
      };

      if (!bestFallback || candidate.score > bestFallback.score) {
        bestFallback = candidate;
      }

      if (!candidate.validComfort) continue;

      if (!best || candidate.score > best.score) {
        best = candidate;
      }
    }
  }

  const selected = best || bestFallback || {
    columns: bounds.minColumns,
    rows: bounds.minRows,
    cell: bounds.minCell,
    fillX: 1,
    fillY: 1,
  };

  let density = "adaptive";
  if (selected.cell < bounds.minCell * 1.08) density = "adaptive-dense";
  else if (selected.cell > bounds.maxCell * 0.86) density = "adaptive-comfort";

  return {
    columns: selected.columns,
    rows: selected.rows,
    density: `${layout}-${isLandscape ? "landscape" : "portrait"}-${density}`,
    minCell: bounds.minCell,
    maxCell: bounds.maxCell,
    targetCell: bounds.targetCell,
    fillX: selected.fillX,
    fillY: selected.fillY,
  };
}

export function getLogicalColumnCount(host, layout = getEffectiveLayout(host), metrics = {}) {
  return getGridPreset(host, layout, metrics).columns;
}

export function getLogicalRowCount(host, layout = getEffectiveLayout(host), metrics = {}) {
  return getGridPreset(host, layout, metrics).rows;
}

export function getActiveGridUnits(host, layout = getEffectiveLayout(host), metrics = {}) {
  return getInternalGridColumnCountFromLogical(getLogicalColumnCount(host, layout, metrics));
}

export function getActiveGridRows(host, layout = getEffectiveLayout(host), metrics = {}) {
  return getInternalGridRowCountFromLogical(getLogicalRowCount(host, layout, metrics));
}


export function isSliderWidgetSizeContract({w=2,h=1}={}) {
  return (w >= h && h === 1) || (h > w && w === 1);
}

export function normalizeSliderWidgetSize({w=2,h=1}={}) {
  return normalizeRegisteredWidgetSize(
    {kind:"slider",w,h},
    normalizeWidgetSize,
  );
}

export function normalizeClockWidgetSize() {
  return normalizeRegisteredWidgetSize(
    {kind:"clock"},
    normalizeWidgetSize,
  );
}

export function normalizeWeatherWidgetSize(size = {}) {
  return normalizeRegisteredWidgetSize(
    {kind:"weather",...size},
    normalizeWidgetSize,
  );
}

export function normalizeSimpleButtonWidgetSize(size = {}) {
  return normalizeRegisteredWidgetSize(
    {kind:"button",...size},
    normalizeWidgetSize,
  );
}



export function normalizeToggleWidgetSize(size = {}) {
  return normalizeRegisteredWidgetSize(
    {kind:"toggle",...size},
    normalizeWidgetSize,
  );
}

export function normalizeToggleSliderWidgetSize(size = {}) {
  return normalizeRegisteredWidgetSize(
    {kind:"toggle-slider",...size},
    normalizeWidgetSize,
  );
}

export function normalizeToggleButtonsWidgetSize(size = {}) {
  return normalizeRegisteredWidgetSize(
    {kind:"toggle-buttons",...size},
    normalizeWidgetSize,
  );
}

export function normalizeWidgetForKind(widget={}) {
  return normalizeRegisteredWidgetSize(widget,normalizeWidgetSize);
}
