import { normalizeRegisteredWidgetSize } from "../widgets/widget-registry.js";
import { resolveGridDensityProfileConstraints } from "./grid-density-profiles.js";
import { resolveGridDensity } from "./grid-density-solver.js";
import { getLayoutForWidth, RESPONSIVE_BREAKPOINTS } from "./responsive.js";

export const WIDGET_UNIT=Object.freeze({unitsPerLogicalColumn:1});

/*
 * Public widget-size contract
 * ---------------------------
 * User-facing sizes follow the iOS/Android vocabulary:
 * - 2x2 = one standard square widget
 * - 4x2 = two standard squares wide
 * - 2x4 = two standard squares tall
 * - 4x4 = large square, 2 by 2 standard widget cells
 *
 * The grid now speaks the same unit contract as widgets:
 * - a 2x2 widget spans 2 grid columns × 2 grid rows
 * - a 4x2 widget spans 4 grid columns × 2 grid rows
 * - a 1x1 widget spans 1 grid column × 1 grid row
 *
 * Legacy helper names still exist during the migration, but they now resolve
 * to the same direct widget-grid units instead of translating through a
 * smaller internal matrix.
 */
export const USER_WIDGET_SIZE_UNIT=1;
export function widgetSpanToLogicalCellCount(span=USER_WIDGET_SIZE_UNIT){
  const value=Number(span);
  if(!Number.isFinite(value)||value<=0)return 1;
  return Math.max(1,Math.round(value));
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
    w:logicalW,
    h:logicalH,
  };
}
export function getInternalGridColumnCountFromLogical(logicalColumns=1){
  return Math.max(1,Math.round(Number(logicalColumns)||1));
}
export function getInternalGridRowCountFromLogical(logicalRows=1){
  return Math.max(1,Math.round(Number(logicalRows)||1));
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
export function normalizeWidgetSize({w=2,h=1}={}){w=Math.round(Number(w));h=Math.round(Number(h));if(!Number.isFinite(w))w=2;if(!Number.isFinite(h))h=1;w=Math.max(1,Math.min(6,w));h=Math.max(1,Math.min(6,h));if(w>4&&h>4){if(w>=h)h=4;else w=4}return{w,h}}
export function getWidgetDensity({w=2,h=1}={}){({w,h}=normalizeWidgetSize({w,h}));if(h<=1&&w<=2)return"micro";if(h<=1)return"compact";if(h===2)return"standard";if(h===3&&w>=6)return"panel";if(h===3)return"rich";if(h>=4&&w>=6)return"panel";if(h>=4)return"immersive";return"standard"}
export const sizeToString=({w,h})=>`${w}x${h}`;
export function getLayoutMode(host){
  const mode=host?.dataset?.layoutMode||document.documentElement.dataset.layoutMode||"auto";
  return mode==="wallpanel"?"tablet":(["auto","mobile","tablet","desktop"].includes(mode)?mode:"auto");
}
export function getEffectiveLayout(host){const mode=getLayoutMode(host);if(mode!=="auto")return mode;const width=host?.getBoundingClientRect?.().width||window.innerWidth||0;return getLayoutForWidth(width)}
function cssPx(host,name,fallback){const value=host?Number.parseFloat(getComputedStyle(host).getPropertyValue(name)):NaN;return Number.isFinite(value)&&value>0?value:fallback}

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
          // Mobile launcher landscape exposes direct widget-grid units.
          minCell: 44,
          targetCell: 54,
          maxCell: 999,
          presetColumns: 9,
          presetRows: 8,
          minColumns: 9,
          maxColumns: 9,
          minRows: 4,
          maxRows: 8,
          targetFillX: 1,
          targetFillY: 0.72,
          forceWidthFill: true,
        }
      : {
          // Mobile launcher portrait exposes direct widget-grid units.
          minCell: 64,
          targetCell: 82,
          maxCell: 999,
          presetColumns: 4,
          presetRows: 14,
          minColumns: 4,
          maxColumns: 4,
          minRows: 8,
          maxRows: 14,
          targetFillX: 1,
          targetFillY: 0.86,
          forceWidthFill: true,
        };
  }

  if (layout === "tablet") {
    return isLandscape
      ? {
          minCell: 52,
          targetCell: 60,
          maxCell: 88,
          presetColumns: 12,
          presetRows: 8,
          minColumns: 8,
          maxColumns: 16,
          minRows: 6,
          maxRows: 10,
          targetFillX: 0.88,
          targetFillY: 0.76,
          preferencePenaltyFactor: 0.06,
        }
      : {
          minCell: 52,
          targetCell: 60,
          maxCell: 88,
          presetColumns: 8,
          presetRows: 12,
          minColumns: 6,
          maxColumns: 12,
          minRows: 8,
          maxRows: 16,
          targetFillX: 0.82,
          targetFillY: 0.88,
          preferencePenaltyFactor: 0.06,
        };
  }

  return isLandscape
    ? {
        minCell: 52,
        targetCell: 62,
        maxCell: 90,
        presetColumns: 14,
        presetRows: 8,
        minColumns: 12,
        maxColumns: 20,
        minRows: 6,
        maxRows: 12,
        targetFillX: 0.9,
        targetFillY: 0.72,
        preferencePenaltyFactor: 0.06,
      }
    : {
        minCell: 52,
        targetCell: 62,
        maxCell: 92,
        presetColumns: 10,
        presetRows: 10,
        minColumns: 8,
        maxColumns: 16,
        minRows: 8,
        maxRows: 14,
        targetFillX: 0.84,
        targetFillY: 0.82,
        preferencePenaltyFactor: 0.06,
      };
}

export function normalizeGridOrientation(orientation = "landscape") {
  return orientation === "portrait" ? "portrait" : "landscape";
}

import { resolveResponsiveStatusBarMode } from "../core/status-bar-mode.js";
import { detectDesktopEnvironment } from "../core/device-environment.js";

export function getLayoutVariant(layout = "desktop", orientation = "landscape") {
  return `${layout}-${normalizeGridOrientation(orientation)}`;
}

export function getGridOrientation(metrics = {}, fallbackMetrics = {}) {
  const width = Number(metrics?.width) || Number(fallbackMetrics?.width) || window.innerWidth || 0;
  const height = Number(metrics?.height) || Number(fallbackMetrics?.height) || window.innerHeight || 0;
  return normalizeGridOrientation(width > height ? "landscape" : "portrait");
}

export function computeResponsiveState({
  host = null,
  layoutMode,
  viewportMetrics = null,
  availableContentRect = null,
  dockPosition = "left",
  statusBarMode = "top-bar",
  hasPersistedStatusBarMode = false,
  isDesktopEnvironment = null,
  navigatorRef = globalThis.navigator,
  matchMediaFn = (query) => globalThis.matchMedia?.(query),
} = {}) {
  const rect = host?.getBoundingClientRect?.() || {};
  const metrics = viewportMetrics || rect;
  const resolvedLayoutMode = layoutMode == null || layoutMode === ""
    ? getLayoutMode(host)
    : (layoutMode === "wallpanel"
      ? "tablet"
      : (["auto", "mobile", "tablet", "desktop"].includes(layoutMode) ? layoutMode : "auto"));
  const orientation = getGridOrientation(metrics, rect);
  const width = Number(metrics?.width) || Number(rect?.width) || window.innerWidth || 0;
  const height = Number(metrics?.height) || Number(rect?.height) || window.innerHeight || 0;
  const widthBasedLayout = getLayoutForWidth(width, { layoutMode: resolvedLayoutMode });
  const layout = (
    resolvedLayoutMode === "auto"
    && widthBasedLayout === "tablet"
    && orientation === "landscape"
    && height > 0
    && height <= RESPONSIVE_BREAKPOINTS.compactDock
  )
    ? "mobile"
    : widthBasedLayout;
  const layoutVariant = getLayoutVariant(layout, orientation);
  const isMobileLayout = layout === "mobile";
  const isMobileLandscape = layoutVariant === "mobile-landscape";
  const effectiveDockPosition = isMobileLandscape ? "left" : dockPosition;
  const dockFamily = isMobileLandscape
    ? "side"
    : (isMobileLayout
      ? "bottom"
      : (effectiveDockPosition === "bottom" ? "bottom" : "side"));
  const desktopEnvironment = typeof isDesktopEnvironment === "boolean"
    ? isDesktopEnvironment
    : detectDesktopEnvironment({ navigatorRef, matchMediaFn });
  const effectiveStatusBarMode = resolveResponsiveStatusBarMode(statusBarMode, {
    hasPersistedStatusBarMode,
    layout,
    isDesktopEnvironment: desktopEnvironment,
  });
  const statusBarVisible = effectiveStatusBarMode !== "hidden" && !isMobileLayout;
  const scrollModel = isMobileLandscape ? "widget-area" : (isMobileLayout ? "viewport" : "widget-area");
  const presetRect = availableContentRect
    ? { ...availableContentRect, dockPosition: effectiveDockPosition }
    : null;

  return {
    layoutMode: resolvedLayoutMode,
    layoutFamily: layout,
    layout,
    layoutVariant,
    orientation,
    isMobileLayout,
    isMobileLandscape,
    dockFamily,
    dockPosition: effectiveDockPosition,
    requestedDockPosition: dockPosition,
    isDesktopEnvironment: desktopEnvironment,
    effectiveStatusBarMode,
    statusBarVisible,
    scrollModel,
    gridPreset: getGridPresetForLayout(layout, orientation, presetRect),
    settingsCapabilities: {
      supportsScreensaver: !isMobileLayout,
      supportsDockPosition: !isMobileLayout,
      supportsSidebarToggle: !isMobileLayout,
      supportsSideDock: !isMobileLayout || isMobileLandscape,
      showsStatusBarOptions: !isMobileLayout,
      isMobileLandscape,
    },
  };
}

export function getGridPresetBounds(layout, orientation = "landscape") {
  return getAdaptiveBounds(layout, normalizeGridOrientation(orientation) === "landscape");
}

export function getGridPresetForLayout(
  layout,
  orientation = "landscape",
  availableContentRect = null,
) {
  const normalizedOrientation = normalizeGridOrientation(orientation);
  const bounds = getGridPresetBounds(layout, normalizedOrientation);
  const profiledConstraints = resolveGridDensityProfileConstraints(
    layout,
    normalizedOrientation,
    availableContentRect,
  );
  const activeConstraints = profiledConstraints || bounds;
  return resolveGridDensity({
    layout,
    orientation: normalizedOrientation,
    availableContentRect,
    constraints: {
      minCell: activeConstraints.minCell,
      targetCell: activeConstraints.targetCell,
      maxCell: activeConstraints.maxCell,
      minColumns: activeConstraints.minColumns,
      maxColumns: activeConstraints.maxColumns,
      minRows: activeConstraints.minRows,
      maxRows: activeConstraints.maxRows,
      preferredColumns: activeConstraints.preferredColumns ?? activeConstraints.presetColumns,
      preferredRows: activeConstraints.preferredRows ?? activeConstraints.presetRows,
      fillX: activeConstraints.fillX ?? activeConstraints.targetFillX,
      fillY: activeConstraints.fillY ?? activeConstraints.targetFillY,
      forceWidthFill: activeConstraints.forceWidthFill,
      preferencePenaltyFactor: activeConstraints.preferencePenaltyFactor,
      unusedSpacePenaltyFactor: activeConstraints.unusedSpacePenaltyFactor,
      minCellWidthAbsolute: activeConstraints.minCellWidthAbsolute,
      minCellHeightAbsolute: activeConstraints.minCellHeightAbsolute,
      minCellWidthComfort: activeConstraints.minCellWidthComfort,
      minCellHeightComfort: activeConstraints.minCellHeightComfort,
      idealCellWidth: activeConstraints.idealCellWidth,
      idealCellHeight: activeConstraints.idealCellHeight,
      idealCellRatio: activeConstraints.idealCellRatio,
      minCellRatioComfort: activeConstraints.minCellRatioComfort,
      maxCellRatioComfort: activeConstraints.maxCellRatioComfort,
      minCellRatioAbsolute: activeConstraints.minCellRatioAbsolute,
      maxCellRatioAbsolute: activeConstraints.maxCellRatioAbsolute,
      idealPenaltyFactor: activeConstraints.idealPenaltyFactor,
      comfortPenaltyFactor: activeConstraints.comfortPenaltyFactor,
      ratioPenaltyFactor: activeConstraints.ratioPenaltyFactor,
      densityPenaltyFactor: activeConstraints.densityPenaltyFactor,
      enforceUsableCellAbsoluteMinimum: activeConstraints.enforceUsableCellAbsoluteMinimum,
      estimatedColumnGap: activeConstraints.estimatedColumnGap,
      estimatedRowGap: activeConstraints.estimatedRowGap,
      estimatedPaddingX: activeConstraints.estimatedPaddingX,
      estimatedPaddingY: activeConstraints.estimatedPaddingY,
    },
  });
}

export function getGridPreset(host, layout = getEffectiveLayout(host), metrics = {}) {
  const r = host?.getBoundingClientRect?.() || {};
  const orientation = getGridOrientation(metrics, r);
  return getGridPresetForLayout(layout, orientation, metrics);
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

export function normalizeWidgetForKind(widget={}, context={}) {
  return normalizeRegisteredWidgetSize(widget,normalizeWidgetSize,context);
}
