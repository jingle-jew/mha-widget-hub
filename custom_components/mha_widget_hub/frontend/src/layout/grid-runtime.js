import {
  getGridPresetForLayout,
  getGridOrientation,
  getInternalGridColumnCountFromLogical,
  getInternalGridRowCountFromLogical,
  getWidgetDensity,
  normalizeGridOrientation,
  normalizeWidgetForKind,
  sizeToString,
} from "./layout-engine.js";

export function measureContentRect(element, getStyle = getComputedStyle) {
  if (!element) return null;

  const style = getStyle(element);
  const rect = element.getBoundingClientRect?.() || {};
  const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
  const paddingRight = Number.parseFloat(style.paddingRight) || 0;
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const paddingBottom = Number.parseFloat(style.paddingBottom) || 0;
  const width = Math.max(
    0,
    (element.clientWidth || rect.width || 0) - paddingLeft - paddingRight,
  );
  const height = Math.max(
    0,
    (element.clientHeight || rect.height || 0) - paddingTop - paddingBottom,
  );
  if (width <= 0 || height <= 0) return null;

  const x = (Number(rect.left) || 0) + paddingLeft;
  const y = (Number(rect.top) || 0) + paddingTop;
  return {
    x,
    y,
    width,
    height,
    left: x,
    top: y,
    right: x + width,
    bottom: y + height,
  };
}

export function measureWidgetArea(area, getStyle = getComputedStyle) {
  const rect = measureContentRect(area, getStyle);
  return rect ? { width: rect.width, height: rect.height } : null;
}

export function measureGridFrame(grid, getStyle = getComputedStyle) {
  if (!grid?.closest) return null;
  const frame = grid.closest(".mha-page-panel--grid");
  const rect = measureContentRect(frame, getStyle);
  return rect ? { width: rect.width, height: rect.height } : null;
}

function parseCssPixelValue(style, propertyName, fallback = 0) {
  if (!style?.getPropertyValue) return fallback;
  const value = Number.parseFloat(style.getPropertyValue(propertyName));
  return Number.isFinite(value) ? value : fallback;
}

function roundDebugMetric(value, precision = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  const factor = 10 ** precision;
  return Math.round(numeric * factor) / factor;
}

function formatGridDebugMetrics(metrics = {}) {
  return [
    `viewportH: ${metrics.viewportHeight ?? 0}px`,
    `shellH: ${metrics.shellHeight ?? 0}px`,
    `statusReserveH: ${metrics.statusBarReservedHeight ?? 0}px`,
    `dockReserveH: ${metrics.dockReservedHeight ?? 0}px`,
    `availableH: ${metrics.gridAvailableHeight ?? 0}px`,
    `rows: ${metrics.selectedRowCount ?? 0}`,
    `rowUnitH: ${metrics.rowUnitHeight ?? 0}px`,
    `leftoverH: ${metrics.leftoverHeight ?? 0}px`,
  ].join("\n");
}

export function getDockBottomColumnBonus({
  dockPosition,
  layout,
  base,
  metrics = {},
  hostWidth = 0,
}) {
  void dockPosition;
  void layout;
  void base;
  void metrics;
  void hostWidth;
  /*
   * The shell now reserves dock footprint directly in `.mha-widget-area`.
   * Runtime grid math must trust those measured bounds instead of mutating the
   * preset again based on dock position, otherwise side and bottom docks invert
   * the available-height behavior.
   */
  return 0;
}

export function getGridBoundsFromPreset(preset = {}) {
  const columns = Math.max(1, Number(preset.columns) || 1);
  const rows = Math.max(1, Number(preset.rows) || 1);
  return {
    columns,
    rows,
    units: getInternalGridColumnCountFromLogical(columns),
    rowUnits: getInternalGridRowCountFromLogical(rows),
  };
}

export function resolveGridTrackAlignment({
  layout = "desktop",
  containerWidth = 0,
  trackWidth = 0,
  defaultPaddingStart = "",
  defaultPaddingEnd = "",
} = {}) {
  const width = Math.max(0, Number(containerWidth) || 0);
  const track = Math.max(0, Number(trackWidth) || 0);
  void layout;
  void width;
  void track;

  return {
    justify: "center",
    paddingInlineStart: defaultPaddingStart,
    paddingInlineEnd: defaultPaddingEnd,
  };
}

const MAX_DESKTOP_TRACK_ASPECT_RATIO = 1.05;

export function calculateGridTrackMetrics({
  metrics,
  preset,
  units,
  rows,
  columnGap = 0,
  rowGap = 0,
  gridPaddingX = 0,
  gridPaddingY = 0,
  hardMin = 24,
  maxUnit = 160,
  mobile = false,
  fillWidth = false,
  maxTrackAspectRatio = MAX_DESKTOP_TRACK_ASPECT_RATIO,
}) {
  if (!metrics || !units || !rows) return null;

  const availableWidth = (
    metrics.width
    - gridPaddingX
    - columnGap * (units - 1)
  );
  const availableHeight = (
    metrics.height
    - gridPaddingY
    - rowGap * (rows - 1)
  );
  if (availableWidth <= 0 || availableHeight <= 0) return null;

  const unitX = availableWidth / units;
  const unitY = availableHeight / rows;

  if (mobile || fillWidth) {
    const preferredUnit = unitX;
    const unit = Math.max(hardMin, Math.min(maxUnit, preferredUnit));
    if (!Number.isFinite(unit) || unit <= 0) return null;

    return {
      columnSize: unit,
      rowSize: unit,
      squareUnit: unit,
      matrixWidth: unit * units + columnGap * (units - 1) + gridPaddingX,
      matrixHeight: unit * rows + rowGap * (rows - 1) + gridPaddingY,
    };
  }

  /*
   * Tablet/desktop keep the shell-owned panel/container rectangle, but tracks
   * should stay square or close to square. Any excess space remains in the
   * panel as breathing room instead of stretching widgets vertically or
   * horizontally.
   */
  const safeAspectRatio = Math.max(1, Number(maxTrackAspectRatio) || 1);
  const minUnit = Math.max(1, Math.min(unitX, unitY));
  const maxAllowedUnit = minUnit * safeAspectRatio;
  const columnSize = Math.max(
    1,
    unitX <= unitY ? unitX : Math.min(unitX, maxAllowedUnit),
  );
  const rowSize = Math.max(
    1,
    unitY <= unitX ? unitY : Math.min(unitY, maxAllowedUnit),
  );
  if (!Number.isFinite(columnSize) || !Number.isFinite(rowSize)) return null;

  return {
    columnSize,
    rowSize,
    squareUnit: Math.min(columnSize, rowSize),
    matrixWidth: (
      columnSize * units
      + columnGap * (units - 1)
      + gridPaddingX
    ),
    matrixHeight: (
      rowSize * rows
      + rowGap * (rows - 1)
      + gridPaddingY
    ),
  };
}

function hasStableGridCells({
  tracks,
  preset,
  hardMin = 24,
  mobile = false,
}) {
  if (!tracks || mobile) return Boolean(tracks);
  const comfortMin = Number(preset?.minCell) || 0;
  if (!comfortMin) return true;
  const minTrackSize = Math.min(
    Number(tracks?.columnSize) || 0,
    Number(tracks?.rowSize) || 0,
  );
  return minTrackSize >= Math.max(hardMin, comfortMin * 0.6);
}

export class GridRuntime {
  constructor({
    host,
    getRoot = () => host?.shadowRoot,
    getLayoutMode,
    getEffectiveLayout,
    getDockPosition = () => "left",
    isMobileLayout,
    getWidgets = () => [],
    getPositions = () => null,
    applyPositions = () => {},
    syncDropSlots = () => {},
    setResponsiveSignature = () => {},
    getStyle = element => getComputedStyle(element),
    requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = frame => cancelAnimationFrame(frame),
    ResizeObserverClass = globalThis.ResizeObserver,
  } = {}) {
    this.host = host;
    this.getRoot = (...args) => getRoot(...args);
    this.getLayoutMode = (...args) => getLayoutMode(...args);
    this.getEffectiveLayout = (...args) => getEffectiveLayout(...args);
    this.getDockPosition = (...args) => getDockPosition(...args);
    this.isMobileLayout = (...args) => (
      isMobileLayout
        ? isMobileLayout(...args)
        : this.getResolvedLayout() === "mobile"
    );
    this.getWidgets = (...args) => getWidgets(...args);
    this.getPositions = (...args) => getPositions(...args);
    this.applyPositions = (...args) => applyPositions(...args);
    this.syncDropSlots = (...args) => syncDropSlots(...args);
    this.setResponsiveSignature = (...args) => setResponsiveSignature(...args);
    this.getStyle = (...args) => getStyle(...args);
    this.requestFrame = (...args) => requestFrame(...args);
    this.cancelFrame = (...args) => cancelFrame(...args);
    this.ResizeObserverClass = ResizeObserverClass;
    this.squareUnitFrame = 0;
    this.gridRuntimeFrame = 0;
    this.squareUnitRetryCount = 0;
    this.resizeObserver = null;
    this.observedLayoutSize = "";
  }

  getResolvedLayoutMode() {
    const datasetMode = this.host?.dataset?.layoutMode;
    if (datasetMode && datasetMode !== "auto") return datasetMode;
    return this.getLayoutMode(this.host);
  }

  getResolvedLayout() {
    const datasetLayout = this.host?.dataset?.layout;
    if (datasetLayout) return datasetLayout;
    return this.getEffectiveLayout(this.host);
  }

  getWidgetAreaMetrics() {
    const area = this.getRoot()?.querySelector?.(".mha-widget-area");
    return measureWidgetArea(area, this.getStyle);
  }

  getWidgetAreaRect() {
    const area = this.getRoot()?.querySelector?.(".mha-widget-area");
    return measureContentRect(area, this.getStyle);
  }

  getShellRect() {
    const shell = this.getRoot()?.querySelector?.(".mha-shell");
    return measureContentRect(shell, this.getStyle);
  }

  isGridDebugEnabled() {
    if (this.host?.dataset?.gridDebug === "true") return true;
    try {
      return localStorage.getItem("mha-debug-grid-layout") === "true";
    } catch (_error) {
      return false;
    }
  }

  collectGridDebugMetrics({
    metrics,
    frameMetrics,
    availableContentRect,
    bounds,
    tracks,
    containerHeight = 0,
  } = {}) {
    const root = this.getRoot();
    const shell = root?.querySelector?.(".mha-shell") || null;
    const workspace = root?.querySelector?.(".mha-workspace") || null;
    const widgetArea = root?.querySelector?.(".mha-widget-area") || null;
    const dockZone = root?.querySelector?.(".mha-dock-zone") || null;
    const shellRect = shell ? measureContentRect(shell, this.getStyle) : null;
    const workspaceRect = workspace ? measureContentRect(workspace, this.getStyle) : null;
    const widgetAreaRect = widgetArea ? measureContentRect(widgetArea, this.getStyle) : null;
    const dockZoneRect = dockZone ? measureContentRect(dockZone, this.getStyle) : null;
    const workspaceStyle = workspace ? this.getStyle(workspace) : null;
    const widgetAreaStyle = widgetArea ? this.getStyle(widgetArea) : null;
    const statusBarReservedHeight = Math.max(
      0,
      parseCssPixelValue(workspaceStyle, "--mha-shell-content-top-inset"),
      Number.parseFloat(widgetAreaStyle?.paddingTop || "0") || 0,
    );
    const bottomInsetHeight = Math.max(
      0,
      parseCssPixelValue(workspaceStyle, "--mha-shell-content-bottom-inset"),
    );
    const dockReservedHeight = this.getDockPosition() === "bottom"
      ? Math.max(0, dockZoneRect?.height || 0)
      : bottomInsetHeight;
    const gridAvailableHeight = Math.max(
      0,
      Number(availableContentRect?.height) || Number(metrics?.height) || 0,
    );
    const trackHeight = Math.max(0, Number(tracks?.matrixHeight) || 0);
    const selectedRowCount = Math.max(0, Number(bounds?.rows) || 0);
    const rowUnitHeight = Math.max(0, Number(tracks?.rowSize) || 0);
    const leftoverHeight = Math.max(
      0,
      (Number(containerHeight) || gridAvailableHeight) - trackHeight,
    );

    return {
      viewportHeight: roundDebugMetric(this.host?.getBoundingClientRect?.().height || 0),
      shellHeight: roundDebugMetric(shellRect?.height || 0),
      workspaceHeight: roundDebugMetric(workspaceRect?.height || 0),
      widgetAreaHeight: roundDebugMetric(widgetAreaRect?.height || 0),
      frameHeight: roundDebugMetric(frameMetrics?.height || 0),
      statusBarReservedHeight: roundDebugMetric(statusBarReservedHeight),
      dockReservedHeight: roundDebugMetric(dockReservedHeight),
      gridAvailableHeight: roundDebugMetric(gridAvailableHeight),
      gridTrackHeight: roundDebugMetric(trackHeight),
      selectedRowCount,
      rowUnitHeight: roundDebugMetric(rowUnitHeight),
      leftoverHeight: roundDebugMetric(leftoverHeight),
    };
  }

  publishGridDebugMetrics(metrics = {}) {
    if (!this.host?.dataset || !this.host?.style) return false;

    Object.entries(metrics).forEach(([key, value]) => {
      const cssName = `--mha-grid-debug-${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}`;
      this.host.style.setProperty(cssName, String(value));
      this.host.dataset[`gridDebug${key.charAt(0).toUpperCase()}${key.slice(1)}`] = String(value);
    });
    return true;
  }

  syncGridDebugOverlay(metrics = {}) {
    const root = this.getRoot();
    if (!root?.querySelector) return false;

    const existing = root.querySelector(".mha-grid-debug-overlay");
    if (!this.isGridDebugEnabled()) {
      existing?.remove?.();
      return false;
    }

    const overlay = existing || document.createElement("pre");
    overlay.className = "mha-grid-debug-overlay";
    overlay.textContent = formatGridDebugMetrics(metrics);
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "auto 12px 12px auto";
    overlay.style.zIndex = "60";
    overlay.style.margin = "0";
    overlay.style.padding = "10px 12px";
    overlay.style.borderRadius = "12px";
    overlay.style.background = "rgba(10, 14, 24, 0.82)";
    overlay.style.color = "#f5f7ff";
    overlay.style.font = "12px/1.45 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace";
    overlay.style.whiteSpace = "pre";
    overlay.style.pointerEvents = "none";
    overlay.style.boxShadow = "0 10px 30px rgba(0,0,0,0.24)";
    if (!existing && typeof root.append === "function") {
      root.append(overlay);
    }
    console.debug("[MHA grid-runtime]", metrics);
    return true;
  }

  getGridFrameMetrics(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    return measureGridFrame(grid, this.getStyle);
  }

  getGridFrameRect(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    if (!grid?.closest) return null;
    const frame = grid.closest(".mha-page-panel--grid");
    return measureContentRect(frame, this.getStyle);
  }

  getAvailableContentRect(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    const widgetAreaRect = this.getWidgetAreaRect();
    if (this.isMobileLayout()) return widgetAreaRect;
    return this.getGridFrameRect(grid) || widgetAreaRect;
  }

  publishAvailableContentRect(rect = this.getAvailableContentRect()) {
    if (!this.host?.style || !this.host?.dataset || !rect) return false;

    this.host.style.setProperty("--mha-available-content-x", `${rect.x}px`);
    this.host.style.setProperty("--mha-available-content-y", `${rect.y}px`);
    this.host.style.setProperty("--mha-available-content-width", `${rect.width}px`);
    this.host.style.setProperty("--mha-available-content-height", `${rect.height}px`);
    this.host.dataset.availableContentX = String(Math.round(rect.x));
    this.host.dataset.availableContentY = String(Math.round(rect.y));
    this.host.dataset.availableContentWidth = String(Math.round(rect.width));
    this.host.dataset.availableContentHeight = String(Math.round(rect.height));
    return true;
  }

  publishGridTrackAlignment({
    layout = this.getResolvedLayout(),
    containerWidth = 0,
    trackWidth = 0,
    defaultPaddingStart = "",
    defaultPaddingEnd = "",
  } = {}) {
    if (!this.host?.style || !this.host?.dataset) return false;
    const alignment = resolveGridTrackAlignment({
      layout,
      containerWidth,
      trackWidth,
      defaultPaddingStart,
      defaultPaddingEnd,
    });
    this.host.style.setProperty("--mha-grid-track-justify-runtime", alignment.justify);
    this.host.style.setProperty(
      "--mha-grid-padding-inline-start-runtime",
      alignment.paddingInlineStart,
    );
    this.host.style.setProperty(
      "--mha-grid-padding-inline-end-runtime",
      alignment.paddingInlineEnd,
    );
    this.host.dataset.gridTrackJustify = alignment.justify;
    return true;
  }

  getRuntimeMetrics(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    const rect = this.getAvailableContentRect(grid);
    return rect ? { width: rect.width, height: rect.height } : null;
  }

  getPresetContentRect(rect = this.getAvailableContentRect()) {
    if (!rect) return null;
    return {
      ...rect,
      dockPosition: rect.dockPosition || this.getDockPosition(),
    };
  }

  getLogicalGridPreset({
    orientation = this.host?.dataset?.gridOrientation,
  } = {}) {
    const layout = this.getResolvedLayout();
    const fallbackOrientation = getGridOrientation(
      this.host?.getBoundingClientRect?.() || this.getRuntimeMetrics() || {},
    );
    return getGridPresetForLayout(
      layout,
      normalizeGridOrientation(orientation || fallbackOrientation),
    );
  }

  getRuntimeGridPreset({
    orientation = this.host?.dataset?.gridOrientation,
    availableContentRect = this.getAvailableContentRect(),
  } = {}) {
    const layout = this.getResolvedLayout();
    const fallbackOrientation = getGridOrientation(
      this.host?.getBoundingClientRect?.() || this.getRuntimeMetrics() || {},
    );
    const presetRect = this.getPresetContentRect(availableContentRect);
    return getGridPresetForLayout(
      layout,
      normalizeGridOrientation(orientation || fallbackOrientation),
      presetRect,
    );
  }

  getGridBounds() {
    return getGridBoundsFromPreset(this.getRuntimeGridPreset());
  }

  getResponsiveSignature() {
    const metrics = this.getRuntimeMetrics();
    const rect = this.host?.getBoundingClientRect?.() || {};
    const width = Math.round(metrics?.width || rect.width || 0);
    const height = Math.round(metrics?.height || rect.height || 0);
    const orientation = normalizeGridOrientation(
      this.host?.dataset?.gridOrientation || (width > height ? "landscape" : "portrait"),
    );
    const layoutMode = this.getResolvedLayoutMode();
    const layout = this.getResolvedLayout();
    const preset = this.getRuntimeGridPreset();
    return `${width}x${height}|${orientation}|${layoutMode}|${layout}`
      + `|${this.getDockPosition()}|${preset.columns}|${preset.rows}`
      + `|${preset.density}|${metrics?.width || 0}x${metrics?.height || 0}`;
  }

  writeRuntimeLayoutAttrs({
    layoutMode,
    layout,
    preset,
    bounds,
  } = {}) {
    if (!layoutMode || !layout || !preset || !bounds) return false;

    this.host.dataset.layoutMode = layoutMode;
    this.host.dataset.layout = layout;
    this.host.dataset.gridDensity = preset.density;
    this.host.dataset.gridUnits = String(bounds.units);
    this.host.dataset.logicalColumns = String(bounds.columns);
    this.host.dataset.gridRows = String(bounds.rowUnits);
    this.host.dataset.logicalRows = String(bounds.rows);

    this.host.style.setProperty(
      "--mha-runtime-grid-units",
      String(bounds.units),
    );
    this.host.style.setProperty(
      "--mha-runtime-grid-rows",
      String(bounds.rowUnits),
    );
    this.host.style.setProperty(
      "--mha-runtime-grid-columns",
      String(bounds.columns),
    );
    this.host.style.setProperty(
      "--mha-runtime-logical-rows",
      String(bounds.rows),
    );
    this.host.style.setProperty(
      "--mha-runtime-logical-columns",
      String(bounds.columns),
    );
    return true;
  }

  syncRuntimeLayoutAttrs() {
    const layoutMode = this.getResolvedLayoutMode();
    const layout = this.getResolvedLayout();
    const preset = this.getRuntimeGridPreset();
    const bounds = getGridBoundsFromPreset(preset);

    this.writeRuntimeLayoutAttrs({
      layoutMode,
      layout,
      preset,
      bounds,
    });
    this.publishAvailableContentRect();
    this.setResponsiveSignature(this.getResponsiveSignature());
    return { layoutMode, layout, preset, ...bounds };
  }

  syncSquareUnit() {
    const root = this.getRoot();
    const grid = root?.querySelector?.(".mha-grid");
    const area = root?.querySelector?.(".mha-widget-area");
    if (!grid || !area) return false;

    const style = this.getStyle(grid);
    const availableContentRect = this.getAvailableContentRect(grid);
    const frameMetrics = this.getGridFrameMetrics(grid) || this.getWidgetAreaMetrics();
    const metrics = availableContentRect
      ? { width: availableContentRect.width, height: availableContentRect.height }
      : this.getRuntimeMetrics(grid) || frameMetrics;
    if (!metrics) return false;

    const preset = this.getRuntimeGridPreset({
      availableContentRect,
    });
    const bounds = getGridBoundsFromPreset(preset);
    const columnGap = Number.parseFloat(style.columnGap || style.gap || "0")
      || 0;
    const rowGap = Number.parseFloat(style.rowGap || style.gap || "0") || 0;
    const gridPaddingX = (
      (Number.parseFloat(style.paddingLeft) || 0)
      + (Number.parseFloat(style.paddingRight) || 0)
    );
    const gridPaddingY = (
      (Number.parseFloat(style.paddingTop) || 0)
      + (Number.parseFloat(style.paddingBottom) || 0)
    );
    const hardMin = Number.parseFloat(
      style.getPropertyValue("--mha-square-unit-hard-min"),
    ) || 24;
    const maxUnit = Number.parseFloat(
      style.getPropertyValue("--mha-square-unit-max"),
    ) || preset.maxCell || 160;
    const tracks = calculateGridTrackMetrics({
      metrics,
      preset,
      units: bounds.units,
      rows: bounds.rowUnits,
      columnGap,
      rowGap,
      gridPaddingX,
      gridPaddingY,
      hardMin,
      maxUnit,
      mobile: this.isMobileLayout(),
    });
    if (!tracks) return false;
    if (!hasStableGridCells({
      tracks,
      preset,
      hardMin,
      mobile: this.isMobileLayout(),
    })) {
      return false;
    }

    this.writeRuntimeLayoutAttrs({
      layoutMode: this.getResolvedLayoutMode(),
      layout: this.getResolvedLayout(),
      preset,
      bounds,
    });
    this.publishAvailableContentRect(availableContentRect);
    this.host.style.setProperty("--mha-square-unit", `${tracks.squareUnit}px`);
    this.host.style.setProperty("--mha-grid-column-size", `${tracks.columnSize}px`);
    this.host.style.setProperty("--mha-grid-row-size", `${tracks.rowSize}px`);
    const panelFrameWidth = frameMetrics?.width || tracks.matrixWidth;
    const panelFrameHeight = frameMetrics?.height || tracks.matrixHeight;
    /*
     * The page panel owns the available rectangle on tablet/desktop.
     * The grid container mirrors that panel 1:1; only the internal track
     * bounds are allowed to be smaller when square units are height-limited.
     *
     * Mobile keeps its existing scrollable content behavior, so the container
     * can still expand to the track height there.
     */
    const containerWidth = this.isMobileLayout()
      ? tracks.matrixWidth
      : panelFrameWidth;
    const containerHeight = this.isMobileLayout()
      ? tracks.matrixHeight
      : panelFrameHeight;
    this.host.style.setProperty(
      "--mha-panel-frame-width",
      `${panelFrameWidth}px`,
    );
    this.host.style.setProperty(
      "--mha-panel-frame-height",
      `${panelFrameHeight}px`,
    );
    this.host.style.setProperty(
      "--mha-grid-container-width",
      `${containerWidth}px`,
    );
    this.host.style.setProperty(
      "--mha-grid-container-height",
      `${containerHeight}px`,
    );
    this.host.style.setProperty(
      "--mha-grid-track-width",
      `${tracks.matrixWidth}px`,
    );
    this.host.style.setProperty(
      "--mha-grid-track-height",
      `${tracks.matrixHeight}px`,
    );
    this.publishGridTrackAlignment({
      layout: this.getResolvedLayout(),
      containerWidth,
      trackWidth: tracks.matrixWidth,
      defaultPaddingStart: (
        style.getPropertyValue("--mha-grid-padding-inline-start").trim()
        || "var(--mha-grid-padding-inline-start)"
      ),
      defaultPaddingEnd: (
        style.getPropertyValue("--mha-grid-padding-inline-end").trim()
        || "var(--mha-grid-padding-inline-end)"
      ),
    });
    if (this.host.dataset) {
      this.host.dataset.panelFrameWidth = String(Math.round(panelFrameWidth));
      this.host.dataset.panelFrameHeight = String(Math.round(panelFrameHeight));
      this.host.dataset.gridContainerWidth = String(Math.round(containerWidth));
      this.host.dataset.gridContainerHeight = String(Math.round(containerHeight));
      this.host.dataset.gridTrackWidth = String(Math.round(tracks.matrixWidth));
      this.host.dataset.gridTrackHeight = String(Math.round(tracks.matrixHeight));
    }
    const debugMetrics = this.collectGridDebugMetrics({
      metrics,
      frameMetrics,
      availableContentRect,
      bounds,
      tracks,
      containerHeight,
    });
    this.publishGridDebugMetrics(debugMetrics);
    this.syncGridDebugOverlay(debugMetrics);
    this.syncDropSlots();
    return true;
  }

  syncGridRuntimeMetrics() {
    const runtime = this.syncRuntimeLayoutAttrs();
    const positions = this.getPositions();
    this.getWidgets().forEach(widget => {
      const element = this.getRoot()?.querySelector?.(
        `[data-widget-id="${widget.id}"]`,
      );
      if (!element) return;
      const size = normalizeWidgetForKind(widget, {
        units: runtime.units,
        rowUnits: runtime.rowUnits,
        layout: runtime.layout,
      });
      const effectiveWidth = Math.min(size.w, runtime.units);
      element.dataset.widgetConfiguredW = String(size.w);
      element.dataset.widgetW = String(effectiveWidth);
      element.dataset.widgetH = String(size.h);
      element.dataset.widgetSize = sizeToString(size);
      element.dataset.widgetDensity = getWidgetDensity(size);
      element.style.setProperty("--mha-widget-w", String(effectiveWidth));
      element.style.setProperty("--mha-widget-configured-w", String(size.w));
      element.style.setProperty("--mha-widget-h", String(size.h));
    });
    this.applyPositions(positions);
    const squareUnitSynced = this.syncSquareUnit();
    return {
      ...runtime,
      squareUnitSynced,
    };
  }

  scheduleSquareUnitSync() {
    this.cancelFrame(this.squareUnitFrame);
    if (this.getResolvedLayout() === "mobile") {
      this.squareUnitFrame = this.requestFrame(() => {
        this.squareUnitFrame = this.requestFrame(() => {
          this.squareUnitFrame = 0;
          this.syncSquareUnit();
        });
      });
      return;
    }
    this.squareUnitFrame = 0;
    this.observeLayoutSize();
    this.scheduleGridRuntimeSync();
  }

  scheduleGridRuntimeSync() {
    this.cancelFrame(this.gridRuntimeFrame);
    this.gridRuntimeFrame = this.requestFrame(() => {
      this.gridRuntimeFrame = this.requestFrame(() => {
        this.gridRuntimeFrame = 0;
        if (!this.host?.isConnected) return;
        const runtime = this.syncGridRuntimeMetrics();
        if (runtime?.squareUnitSynced === false) {
          if (this.squareUnitRetryCount < 2) {
            this.squareUnitRetryCount += 1;
            this.scheduleGridRuntimeSync();
            return;
          }
        }
        this.squareUnitRetryCount = 0;
      });
    });
  }

  disconnectLayoutResizeObserver() {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    this.observedLayoutSize = "";
  }

  observeLayoutSize() {
    this.disconnectLayoutResizeObserver();
    if (
      typeof this.ResizeObserverClass !== "function"
      || this.getResolvedLayout() === "mobile"
    ) {
      return false;
    }
    const area = this.getRoot()?.querySelector?.(".mha-page-panel--grid")
      || this.getRoot()?.querySelector?.(".mha-widget-area");
    if (!area) return false;

    this.resizeObserver = new this.ResizeObserverClass(entries => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      const signature = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      if (signature === this.observedLayoutSize) return;
      this.observedLayoutSize = signature;
      this.scheduleGridRuntimeSync();
    });
    this.resizeObserver.observe(area);
    return true;
  }

  destroy() {
    this.cancelFrame(this.squareUnitFrame);
    this.cancelFrame(this.gridRuntimeFrame);
    this.squareUnitFrame = 0;
    this.gridRuntimeFrame = 0;
    this.squareUnitRetryCount = 0;
    this.disconnectLayoutResizeObserver();
  }
}

export function createGridRuntime(options) {
  return new GridRuntime(options);
}
