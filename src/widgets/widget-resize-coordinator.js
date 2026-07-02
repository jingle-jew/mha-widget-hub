import {
  getWidgetDensity,
  normalizeWidgetForKind,
  sizeToString,
} from "../layout/layout-engine.js";

export class WidgetResizeCoordinator {
  constructor({
    getResizeState = () => null,
    setResizeState = () => {},
    getWidgets = () => [],
    setWidgets = () => {},
    getGridMetrics = () => null,
    getActiveGridUnits = () => 1,
    doesWidgetLayoutFitGrid = () => true,
    normalizeWidgetsToGridBounds = widgets => widgets,
    clampWidgetSizeToGridBounds = (_widget, size) => size,
    queryWidgetElement = () => null,
    saveWidgets = () => false,
    scheduleSquareUnitSync = () => {},
    normalizeWidgetForKindFn = normalizeWidgetForKind,
    getWidgetDensityFn = getWidgetDensity,
    sizeToStringFn = sizeToString,
  } = {}) {
    this.getResizeState = (...args) => getResizeState(...args);
    this.setResizeState = (...args) => setResizeState(...args);
    this.getWidgets = (...args) => getWidgets(...args);
    this.setWidgets = (...args) => setWidgets(...args);
    this.getGridMetrics = (...args) => getGridMetrics(...args);
    this.getActiveGridUnits = (...args) => getActiveGridUnits(...args);
    this.doesWidgetLayoutFitGrid = (...args) => doesWidgetLayoutFitGrid(...args);
    this.normalizeWidgetsToGridBounds = (...args) => normalizeWidgetsToGridBounds(...args);
    this.clampWidgetSizeToGridBounds = (...args) => clampWidgetSizeToGridBounds(...args);
    this.queryWidgetElement = (...args) => queryWidgetElement(...args);
    this.saveWidgets = (...args) => saveWidgets(...args);
    this.scheduleSquareUnitSync = (...args) => scheduleSquareUnitSync(...args);
    this.normalizeWidgetForKindFn = (...args) => normalizeWidgetForKindFn(...args);
    this.getWidgetDensityFn = (...args) => getWidgetDensityFn(...args);
    this.sizeToStringFn = (...args) => sizeToStringFn(...args);
  }

  startResize() {
    return false;
  }

  findFittingResize(current, requested) {
    let next = this.clampWidgetSizeToGridBounds(current, requested);
    const originalWidgets = this.getWidgets();

    while (next.h >= 1) {
      let testWidgets = originalWidgets.map(widget => (
        widget.id === current.id
          ? { ...widget, responsiveSizeMode: "", ...next }
          : widget
      ));
      testWidgets = this.normalizeWidgetsToGridBounds(testWidgets);

      if (this.doesWidgetLayoutFitGrid(testWidgets)) return next;

      if (next.h > 1) {
        next = { ...next, h: next.h - 1 };
        continue;
      }

      if (next.w > 1) {
        next = {
          ...next,
          w: next.w - 1,
          h: Math.max(1, requested.h),
        };
        continue;
      }

      break;
    }

    return this.normalizeWidgetForKindFn(current);
  }

  updateResize(event) {
    const state = this.getResizeState();
    if (!state || event.pointerId !== state.pointerId) return;

    event.preventDefault();
    const current = this.getWidgets().find(widget => widget.id === state.widgetId) || {};
    let nextSize = this.normalizeWidgetForKindFn({
      ...current,
      responsiveSizeMode: "",
      w: state.startW + Math.round((event.clientX - state.startX) / state.metrics.columnStep),
      h: state.startH + Math.round((event.clientY - state.startY) / state.metrics.rowStep),
    });
    nextSize = this.findFittingResize(current, nextSize);

    const nextWidgets = this.getWidgets().map(widget => (
      widget.id === state.widgetId
        ? { ...widget, responsiveSizeMode: "", ...nextSize }
        : widget
    ));
    const normalizedWidgets = this.normalizeWidgetsToGridBounds(nextWidgets);
    if (!this.doesWidgetLayoutFitGrid(normalizedWidgets)) return;

    this.setWidgets(normalizedWidgets);

    const element = this.queryWidgetElement(state.widgetId);
    if (!element) return;

    const density = this.getWidgetDensityFn(nextSize);
    const activeUnits = this.getActiveGridUnits();
    element.dataset.widgetConfiguredW = String(nextSize.w);
    element.dataset.widgetW = String(Math.min(nextSize.w, activeUnits));
    element.dataset.widgetH = String(nextSize.h);
    element.dataset.widgetSize = this.sizeToStringFn(nextSize);
    element.dataset.widgetDensity = density;
    element.style.setProperty("--mha-widget-w", String(Math.min(nextSize.w, activeUnits)));
    element.style.setProperty("--mha-widget-configured-w", String(nextSize.w));
    element.style.setProperty("--mha-widget-h", String(nextSize.h));

    const badge = element.querySelector(".mha-size-badge");
    if (badge) {
      badge.textContent = `${this.sizeToStringFn(nextSize)} · ${density}`;
    }
  }

  finishResize() {
    const state = this.getResizeState();
    if (!state) return;

    this.queryWidgetElement(state.widgetId)?.classList?.remove?.("is-resizing");
    this.setResizeState(null);
    this.saveWidgets();
    this.scheduleSquareUnitSync();
  }
}

export function createWidgetResizeCoordinator(options = {}) {
  return new WidgetResizeCoordinator(options);
}
