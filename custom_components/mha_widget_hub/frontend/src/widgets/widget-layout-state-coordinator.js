import { getGridBoundsFromPreset } from "../layout/grid-runtime.js";
import { normalizeWidgetForKind } from "../layout/layout-engine.js";
import { packWidgets } from "../layout/placement-calculations.js";
import { isPositionMapValidForWidgets } from "../layout/placement-geometry.js";

export class WidgetLayoutStateCoordinator {
  constructor({
    getWidgets = () => [],
    getWidgetPositions = () => ({}),
    setWidgetPositions = () => {},
    getActivePageId = () => "home",
    getGridBounds = () => ({ units: 1, rowUnits: 1 }),
    getEffectiveLayout = () => "desktop",
    getLogicalGridPreset = null,
    getRuntimeGridPreset = () => ({ columns: 1, rows: 1 }),
    getWidgetAreaMetrics = () => ({}),
    isMobileLayout = () => false,
    recordPersistenceResult = value => value,
    writeWidgetPositions = () => false,
    getRoot = () => null,
    normalizeWidgetForKindFn = normalizeWidgetForKind,
    packWidgetsFn = packWidgets,
    isPositionMapValidForWidgetsFn = isPositionMapValidForWidgets,
  } = {}) {
    this.getWidgets = (...args) => getWidgets(...args);
    this.getWidgetPositions = (...args) => getWidgetPositions(...args);
    this.setWidgetPositions = (...args) => setWidgetPositions(...args);
    this.getActivePageId = (...args) => getActivePageId(...args);
    this.getGridBounds = (...args) => getGridBounds(...args);
    this.getEffectiveLayout = (...args) => getEffectiveLayout(...args);
    const gridPresetReader = getLogicalGridPreset || getRuntimeGridPreset;
    this.getLogicalGridPreset = (...args) => gridPresetReader(...args);
    this.getWidgetAreaMetrics = (...args) => getWidgetAreaMetrics(...args);
    this.isMobileLayout = (...args) => isMobileLayout(...args);
    this.recordPersistenceResult = (...args) => recordPersistenceResult(...args);
    this.writeWidgetPositions = (...args) => writeWidgetPositions(...args);
    this.getRoot = (...args) => getRoot(...args);
    this.normalizeWidgetForKindFn = (...args) => normalizeWidgetForKindFn(...args);
    this.packWidgetsFn = (...args) => packWidgetsFn(...args);
    this.isPositionMapValidForWidgetsFn = (...args) => (
      isPositionMapValidForWidgetsFn(...args)
    );
  }

  getPositionKey() {
    const bounds = this.getGridBounds();
    return `${this.getActivePageId() || "home"}:${this.getEffectiveLayout()}:${bounds.units}x${bounds.rowUnits}`;
  }

  getResponsiveLayoutContext(bounds = this.getGridBounds()) {
    return {
      units: bounds.units,
      rowUnits: bounds.rowUnits,
      layout: this.isMobileLayout() ? "mobile" : "desktop",
    };
  }

  isPositionMapValidForWidgets(positions, widgets, units, rowUnits) {
    return this.isPositionMapValidForWidgetsFn(
      positions,
      widgets,
      units,
      rowUnits,
      { allowUnboundedRows: this.isMobileLayout() },
    );
  }

  persistWidgetPositions(nextPositions) {
    this.setWidgetPositions(nextPositions);
    return this.recordPersistenceResult(
      this.writeWidgetPositions(nextPositions),
    );
  }

  readStoredPositions() {
    const key = this.getPositionKey();
    const widgetPositions = this.getWidgetPositions();
    const positions = widgetPositions?.[key];
    if (!positions || typeof positions !== "object" || Array.isArray(positions)) {
      return null;
    }

    const widgets = this.getWidgets();
    const { units, rowUnits } = this.getGridBounds();
    const normalized = {};

    for (const widget of widgets) {
      const position = positions[widget.id];
      const x = Number(position?.x);
      const y = Number(position?.y);
      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        const nextPositions = { ...widgetPositions };
        delete nextPositions[key];
        this.persistWidgetPositions(nextPositions);
        return null;
      }
      normalized[widget.id] = { x, y };
    }

    if (!this.isPositionMapValidForWidgets(normalized, widgets, units, rowUnits)) {
      const nextPositions = { ...widgetPositions };
      delete nextPositions[key];
      this.persistWidgetPositions(nextPositions);
      return null;
    }

    if (Object.keys(positions).length !== Object.keys(normalized).length) {
      this.persistWidgetPositions({
        ...widgetPositions,
        [key]: normalized,
      });
    }

    return normalized;
  }

  saveCurrentPositions(positions) {
    return this.persistWidgetPositions({
      ...this.getWidgetPositions(),
      [this.getPositionKey()]: positions,
    });
  }

  applyPositionsToDom(positions) {
    if (!positions) return;

    const root = this.getRoot();
    const bounds = this.getGridBounds();
    const context = this.getResponsiveLayoutContext(bounds);
    this.getWidgets().forEach((widget) => {
      const position = positions[widget.id];
      const element = root?.querySelector?.(`[data-widget-id="${widget.id}"]`);
      if (!position || !element) return;

      const size = this.normalizeWidgetForKindFn(widget, context);
      element.style.gridColumn = `${position.x} / span ${Math.min(bounds.units, size.w)}`;
      element.style.gridRow = `${position.y} / span ${size.h}`;
    });
  }

  clearCurrentPositions() {
    const key = this.getPositionKey();
    const widgetPositions = this.getWidgetPositions();
    if (!widgetPositions?.[key]) return;

    const nextPositions = { ...widgetPositions };
    delete nextPositions[key];
    this.persistWidgetPositions(nextPositions);
    this.getRoot()?.querySelectorAll?.(".mha-widget")?.forEach?.((element) => {
      element.style.removeProperty("grid-column");
      element.style.removeProperty("grid-row");
    });
  }

  packWidgetsForCurrentGrid() {
    const { units, rowUnits } = this.getGridBounds();
    return this.packWidgetsFn(this.getWidgets(), units, rowUnits, {
      allowUnboundedRows: this.isMobileLayout(),
      layout: this.isMobileLayout() ? "mobile" : "desktop",
    });
  }

  getActivePositions({ create = false } = {}) {
    const stored = this.readStoredPositions();
    if (stored) return stored;
    if (!create) return null;

    const packed = this.packWidgetsForCurrentGrid();
    if (packed) {
      this.saveCurrentPositions(packed);
      this.applyPositionsToDom(packed);
    }
    return packed;
  }

  getInternalGridBoundsFromPreset(preset) {
    return getGridBoundsFromPreset({
      columns: Number(preset?.columns) || 1,
      rows: Number(preset?.rows) || 1,
    });
  }

  clampWidgetSizeToGridBounds(widget, size) {
    const bounds = this.getInternalGridBoundsFromPreset(this.getLogicalGridPreset());
    const context = this.getResponsiveLayoutContext(bounds);
    const normalizedSize = this.normalizeWidgetForKindFn({ ...widget, ...size }, context);
    const x = Number(widget?.x ?? widget?.col ?? widget?.column ?? 1) || 1;
    const y = Number(widget?.y ?? widget?.row ?? widget?.rowIndex ?? 1) || 1;
    const maxW = Math.max(1, bounds.units - x + 1);
    const maxH = Math.max(1, bounds.rowUnits - y + 1);

    return {
      ...normalizedSize,
      w: Math.max(1, Math.min(Number(normalizedSize?.w) || 1, maxW)),
      h: Math.max(1, Math.min(Number(normalizedSize?.h) || 1, maxH)),
    };
  }

  clampWidgetPositionToGridBounds(widget, position) {
    const bounds = this.getInternalGridBoundsFromPreset(this.getLogicalGridPreset());
    const size = this.normalizeWidgetForKindFn(widget, this.getResponsiveLayoutContext(bounds));
    const w = Math.max(1, Number(size?.w) || 1);
    const h = Math.max(1, Number(size?.h) || 1);
    const maxX = Math.max(1, bounds.units - w + 1);
    const maxY = Math.max(1, bounds.rowUnits - h + 1);

    return {
      ...position,
      x: Math.max(1, Math.min(Number(position?.x) || 1, maxX)),
      y: Math.max(1, Math.min(Number(position?.y) || 1, maxY)),
    };
  }

  normalizeWidgetToGridBounds(widget) {
    const size = this.clampWidgetSizeToGridBounds(widget, widget);
    const position = this.clampWidgetPositionToGridBounds(
      { ...widget, ...size },
      widget,
    );
    return { ...widget, ...size, ...position };
  }

  normalizeWidgetsToGridBounds(widgets = this.getWidgets()) {
    return widgets.map(widget => this.normalizeWidgetToGridBounds(widget));
  }
}

export function createWidgetLayoutStateCoordinator(options = {}) {
  return new WidgetLayoutStateCoordinator(options);
}
