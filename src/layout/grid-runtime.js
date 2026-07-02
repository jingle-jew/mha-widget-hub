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

export function measureWidgetArea(area, getStyle = getComputedStyle) {
  if (!area) return null;

  const style = getStyle(area);
  const rect = area.getBoundingClientRect?.() || {};
  const width = Math.max(
    0,
    (area.clientWidth || rect.width || 0)
      - (Number.parseFloat(style.paddingLeft) || 0)
      - (Number.parseFloat(style.paddingRight) || 0),
  );
  const height = Math.max(
    0,
    (area.clientHeight || rect.height || 0)
      - (Number.parseFloat(style.paddingTop) || 0)
      - (Number.parseFloat(style.paddingBottom) || 0),
  );

  return width > 0 && height > 0 ? { width, height } : null;
}

export function measureGridFrame(grid, getStyle = getComputedStyle) {
  if (!grid?.closest) return null;
  const frame = grid.closest(".mha-page-panel--grid");
  if (!frame) return null;

  const style = getStyle(frame);
  const rect = frame.getBoundingClientRect?.() || {};
  const width = Math.max(
    0,
    (frame.clientWidth || rect.width || 0)
      - (Number.parseFloat(style.paddingLeft) || 0)
      - (Number.parseFloat(style.paddingRight) || 0),
  );
  const height = Math.max(
    0,
    (frame.clientHeight || rect.height || 0)
      - (Number.parseFloat(style.paddingTop) || 0)
      - (Number.parseFloat(style.paddingBottom) || 0),
  );

  return width > 0 && height > 0 ? { width, height } : null;
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

  const columnSize = Math.max(1, unitX);
  const rowSize = Math.max(1, unitY);
  if (!Number.isFinite(columnSize) || !Number.isFinite(rowSize)) return null;

  return {
    columnSize,
    rowSize,
    squareUnit: Math.min(columnSize, rowSize),
    matrixWidth: metrics.width,
    matrixHeight: metrics.height,
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

  getGridFrameMetrics(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    return measureGridFrame(grid, this.getStyle);
  }

  getRuntimeMetrics(grid = this.getRoot()?.querySelector?.(".mha-grid")) {
    if (this.isMobileLayout()) {
      return this.getWidgetAreaMetrics();
    }
    return this.getGridFrameMetrics(grid) || this.getWidgetAreaMetrics();
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

  getRuntimeGridPreset() {
    return this.getLogicalGridPreset();
  }

  getGridBounds() {
    return getGridBoundsFromPreset(this.getLogicalGridPreset());
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
    const preset = this.getLogicalGridPreset();
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
    const preset = this.getLogicalGridPreset();
    const bounds = getGridBoundsFromPreset(preset);

    this.writeRuntimeLayoutAttrs({
      layoutMode,
      layout,
      preset,
      bounds,
    });
    this.setResponsiveSignature(this.getResponsiveSignature());
    return { layoutMode, layout, preset, ...bounds };
  }

  syncSquareUnit() {
    const root = this.getRoot();
    const grid = root?.querySelector?.(".mha-grid");
    const area = root?.querySelector?.(".mha-widget-area");
    if (!grid || !area) return false;

    const style = this.getStyle(grid);
    const frameMetrics = this.getGridFrameMetrics(grid) || this.getWidgetAreaMetrics();
    const metrics = this.getRuntimeMetrics(grid) || frameMetrics;
    if (!metrics) return false;

    const preset = this.getLogicalGridPreset();
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
    if (this.host.dataset) {
      this.host.dataset.panelFrameWidth = String(Math.round(panelFrameWidth));
      this.host.dataset.panelFrameHeight = String(Math.round(panelFrameHeight));
      this.host.dataset.gridContainerWidth = String(Math.round(containerWidth));
      this.host.dataset.gridContainerHeight = String(Math.round(containerHeight));
      this.host.dataset.gridTrackWidth = String(Math.round(tracks.matrixWidth));
      this.host.dataset.gridTrackHeight = String(Math.round(tracks.matrixHeight));
    }
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
