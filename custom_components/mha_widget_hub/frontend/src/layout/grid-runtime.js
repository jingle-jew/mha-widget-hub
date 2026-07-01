import {
  getInternalGridColumnCountFromLogical,
  getInternalGridRowCountFromLogical,
  normalizeWidgetSize,
} from "./layout-engine.js";
import { RESPONSIVE_BREAKPOINTS } from "./responsive.js";

export function measureWidgetArea(area, getStyle = getComputedStyle) {
  if (!area) return null;

  const style = getStyle(area);
  const width = Math.max(
    0,
    area.clientWidth
      - (Number.parseFloat(style.paddingLeft) || 0)
      - (Number.parseFloat(style.paddingRight) || 0),
  );
  const height = Math.max(
    0,
    area.clientHeight
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
  if (dockPosition !== "bottom" || layout === "mobile") return 0;
  if (hostWidth < RESPONSIVE_BREAKPOINTS.tablet) return 0;

  const requestedBonus = layout === "desktop" ? 2 : 1;
  const baseColumns = Math.max(1, Number(base?.columns) || 1);
  const availableWidth = Number(metrics?.width) || hostWidth;
  const minComfortWidth = Math.max(
    Number(base?.minCell) || 0,
    (Number(base?.targetCell) || 0) * 0.9,
    1,
  );
  const maxComfortColumns = Math.max(
    baseColumns,
    Math.floor(availableWidth / minComfortWidth),
  );
  return Math.max(
    0,
    Math.min(requestedBonus, maxComfortColumns - baseColumns),
  );
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

export function calculateSquareGridMetrics({
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

  const unitX = (
    metrics.width
    - gridPaddingX
    - columnGap * (units - 1)
  ) / units;
  const unitY = (
    metrics.height
    - gridPaddingY
    - rowGap * (rows - 1)
  ) / rows;
  const preferredUnit = (mobile || fillWidth) ? unitX : Math.min(unitX, unitY);
  const unit = Math.max(hardMin, Math.min(maxUnit, preferredUnit));
  if (!Number.isFinite(unit) || unit <= 0) return null;

  return {
    unit,
    matrixWidth: unit * units + columnGap * (units - 1) + gridPaddingX,
    matrixHeight: unit * rows + rowGap * (rows - 1) + gridPaddingY,
  };
}

function hasStableSquareUnit({
  square,
  preset,
  hardMin = 24,
  mobile = false,
}) {
  if (!square || mobile) return Boolean(square);
  const comfortMin = Number(preset?.minCell) || 0;
  if (!comfortMin) return true;
  return square.unit >= Math.max(hardMin, comfortMin * 0.6);
}

export class GridRuntime {
  constructor({
    host,
    getRoot = () => host?.shadowRoot,
    getLayoutMode,
    getEffectiveLayout,
    getGridPreset,
    getDockPosition = () => "left",
    isMobileLayout,
    getWidgets = () => [],
    getPositions = () => null,
    applyPositions = () => {},
    syncDropSlots = () => {},
    setResponsiveSignature = () => {},
    getStyle = element => getComputedStyle(element),
    getViewportWidth = () => window.innerWidth || 0,
    requestFrame = callback => requestAnimationFrame(callback),
    cancelFrame = frame => cancelAnimationFrame(frame),
    ResizeObserverClass = globalThis.ResizeObserver,
  } = {}) {
    this.host = host;
    this.getRoot = (...args) => getRoot(...args);
    this.getLayoutMode = (...args) => getLayoutMode(...args);
    this.getEffectiveLayout = (...args) => getEffectiveLayout(...args);
    this.getGridPreset = (...args) => getGridPreset(...args);
    this.getDockPosition = (...args) => getDockPosition(...args);
    this.isMobileLayout = (...args) => (
      isMobileLayout
        ? isMobileLayout(...args)
        : this.getEffectiveLayout(this.host) === "mobile"
    );
    this.getWidgets = (...args) => getWidgets(...args);
    this.getPositions = (...args) => getPositions(...args);
    this.applyPositions = (...args) => applyPositions(...args);
    this.syncDropSlots = (...args) => syncDropSlots(...args);
    this.setResponsiveSignature = (...args) => setResponsiveSignature(...args);
    this.getStyle = (...args) => getStyle(...args);
    this.getViewportWidth = (...args) => getViewportWidth(...args);
    this.requestFrame = (...args) => requestFrame(...args);
    this.cancelFrame = (...args) => cancelFrame(...args);
    this.ResizeObserverClass = ResizeObserverClass;
    this.squareUnitFrame = 0;
    this.gridRuntimeFrame = 0;
    this.squareUnitRetryCount = 0;
    this.resizeObserver = null;
    this.observedLayoutSize = "";
  }

  getWidgetAreaMetrics() {
    const area = this.getRoot()?.querySelector?.(".mha-widget-area");
    return measureWidgetArea(area, this.getStyle);
  }

  getDockBottomColumnBonus(layout, base, metrics = {}) {
    const hostWidth = this.host?.getBoundingClientRect?.().width
      || this.getViewportWidth()
      || 0;
    return getDockBottomColumnBonus({
      dockPosition: this.getDockPosition(),
      layout,
      base,
      metrics,
      hostWidth,
    });
  }

  getRuntimeGridPreset() {
    const layout = this.getEffectiveLayout(this.host);
    const metrics = this.getWidgetAreaMetrics() || {};
    const base = this.getGridPreset(this.host, layout, metrics);
    const bonus = this.getDockBottomColumnBonus(layout, base, metrics);
    if (!bonus) return base;
    return {
      ...base,
      columns: Math.max(1, (Number(base.columns) || 1) + bonus),
      density: `${base.density}-dock-bottom-${bonus}col`,
    };
  }

  getGridBounds() {
    return getGridBoundsFromPreset(this.getRuntimeGridPreset());
  }

  getResponsiveSignature() {
    const rect = this.host?.getBoundingClientRect?.() || {};
    const width = Math.round(rect.width || this.getViewportWidth() || 0);
    const height = Math.round(
      rect.height
      || globalThis.window?.innerHeight
      || 0,
    );
    const orientation = width > height ? "landscape" : "portrait";
    const layoutMode = this.getLayoutMode(this.host);
    const layout = this.getEffectiveLayout(this.host);
    const metrics = this.getWidgetAreaMetrics();
    const preset = this.getRuntimeGridPreset();
    return `${width}x${height}|${orientation}|${layoutMode}|${layout}`
      + `|${this.getDockPosition()}|${preset.columns}|${preset.rows}`
      + `|${preset.density}|${metrics?.width || 0}x${metrics?.height || 0}`;
  }

  syncRuntimeLayoutAttrs() {
    const layoutMode = this.getLayoutMode(this.host);
    const layout = this.getEffectiveLayout(this.host);
    const preset = this.getRuntimeGridPreset();
    const bounds = getGridBoundsFromPreset(preset);

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
    this.setResponsiveSignature(this.getResponsiveSignature());
    return { layoutMode, layout, preset, ...bounds };
  }

  syncSquareUnit() {
    const root = this.getRoot();
    const grid = root?.querySelector?.(".mha-grid");
    const area = root?.querySelector?.(".mha-widget-area");
    if (!grid || !area) return false;

    const style = this.getStyle(grid);
    const metrics = this.getWidgetAreaMetrics();
    if (!metrics) return false;

    const preset = this.getRuntimeGridPreset();
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
    const fillWidth = this.getDockPosition() === "bottom" && !this.isMobileLayout();
    const square = calculateSquareGridMetrics({
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
      fillWidth,
    });
    if (!square) return false;
    if (!hasStableSquareUnit({
      square,
      preset,
      hardMin,
      mobile: this.isMobileLayout(),
    })) {
      return false;
    }

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
      "--mha-runtime-logical-columns",
      String(bounds.columns),
    );
    this.host.style.setProperty(
      "--mha-runtime-logical-rows",
      String(bounds.rows),
    );
    this.host.style.setProperty("--mha-square-unit", `${square.unit}px`);
    grid.style.setProperty("--mha-square-unit", `${square.unit}px`);
    grid.style.setProperty(
      "--mha-grid-matrix-width",
      `${square.matrixWidth}px`,
    );
    grid.style.setProperty(
      "--mha-grid-matrix-height",
      `${square.matrixHeight}px`,
    );
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
      const size = normalizeWidgetSize(widget);
      const effectiveWidth = Math.min(size.w, runtime.units);
      element.dataset.widgetW = String(effectiveWidth);
      element.style.setProperty("--mha-widget-w", String(effectiveWidth));
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
    if (this.getEffectiveLayout(this.host) === "mobile") {
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
      || this.getEffectiveLayout(this.host) === "mobile"
    ) {
      return false;
    }
    const area = this.getRoot()?.querySelector?.(".mha-widget-area");
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
