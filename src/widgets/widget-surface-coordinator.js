import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import { normalizeWidgetForKind } from "../layout/layout-engine.js";
import { updateClockWidgets } from "./clock-widget.js";
import { buildWidgetShellState } from "./widget-shell-props.js";
import { createWidgetShell } from "./widget-shell.js";
import { rerenderRegisteredWidgetContent } from "./widget-renderers.js";
import { normalizeStoredWidgetContract } from "./widget-storage.js";
import {
  getNextWidgetVariantEntries,
  getVariantCandidate,
  sameVariantSize,
} from "./widget-variants.js";

export class WidgetSurfaceCoordinator {
  constructor({
    getRoot = () => null,
    renderRoot = () => {},
    cancelWidgetRenderFrame = () => {},
    getWidgets = () => [],
    setWidgets = () => {},
    getPendingWidgetPlacement = () => null,
    setPendingWidgetPlacement = () => {},
    getActiveMoveWidgetId = () => "",
    setActiveMoveWidgetId = () => {},
    getIsEditing = () => false,
    getHass = () => null,
    getEntityVisibilityConfig = () => null,
    getGridBounds = () => ({ units: 1, rowUnits: 1 }),
    getEffectiveLayout = () => "desktop",
    getActiveWidgetPositions = () => null,
    isPositionMapValidForWidgets = () => false,
    normalizeWidgetsToGridBounds = (widgets) => widgets,
    saveCurrentWidgetPositions = () => false,
    saveWidgets = () => false,
    applyWidgetPositionsToDom = () => {},
    wireDrag = () => {},
    renderWidgetDropSlots = () => {},
    syncWidgetDropSlots = () => {},
    syncEditModeDom = () => {},
    scheduleSquareUnitSync = () => {},
    updateDockActiveState = () => {},
    toggleWidgetMoveMode = () => {},
    moveWidgetByDirection = () => {},
    removeWidget = () => {},
    startResize = () => false,
    updateResize = () => {},
    finishResize = () => {},
    openWidgetConfig = () => {},
    openScenesButtonConfig = () => {},
    updateWidgetConfig = () => false,
    createWidgetShellFn = createWidgetShell,
    rerenderWidgetContentFn = rerenderRegisteredWidgetContent,
    buildWidgetShellStateFn = buildWidgetShellState,
    normalizeStoredWidgetFn = normalizeStoredWidgetContract,
    normalizeWidgetForKindFn = normalizeWidgetForKind,
    getNextWidgetVariantEntriesFn = getNextWidgetVariantEntries,
    getVariantCandidateFn = getVariantCandidate,
    sameVariantSizeFn = sameVariantSize,
    destroyDomSubtreeFn = destroyDomSubtree,
    updateClockWidgetsFn = updateClockWidgets,
  } = {}) {
    this.getRoot = (...args) => getRoot(...args);
    this.renderRoot = (...args) => renderRoot(...args);
    this.cancelWidgetRenderFrame = (...args) => cancelWidgetRenderFrame(...args);
    this.getWidgets = (...args) => getWidgets(...args);
    this.setWidgets = (...args) => setWidgets(...args);
    this.getPendingWidgetPlacement = (...args) => getPendingWidgetPlacement(...args);
    this.setPendingWidgetPlacement = (...args) => setPendingWidgetPlacement(...args);
    this.getActiveMoveWidgetId = (...args) => getActiveMoveWidgetId(...args);
    this.setActiveMoveWidgetId = (...args) => setActiveMoveWidgetId(...args);
    this.getIsEditing = (...args) => getIsEditing(...args);
    this.getHass = (...args) => getHass(...args);
    this.getEntityVisibilityConfig = (...args) => getEntityVisibilityConfig(...args);
    this.getGridBounds = (...args) => getGridBounds(...args);
    this.getEffectiveLayout = (...args) => getEffectiveLayout(...args);
    this.getActiveWidgetPositions = (...args) => getActiveWidgetPositions(...args);
    this.isPositionMapValidForWidgets = (...args) => isPositionMapValidForWidgets(...args);
    this.normalizeWidgetsToGridBounds = (...args) => normalizeWidgetsToGridBounds(...args);
    this.saveCurrentWidgetPositions = (...args) => saveCurrentWidgetPositions(...args);
    this.saveWidgets = (...args) => saveWidgets(...args);
    this.applyWidgetPositionsToDom = (...args) => applyWidgetPositionsToDom(...args);
    this.wireDrag = (...args) => wireDrag(...args);
    this.renderWidgetDropSlots = (...args) => renderWidgetDropSlots(...args);
    this.syncWidgetDropSlots = (...args) => syncWidgetDropSlots(...args);
    this.syncEditModeDom = (...args) => syncEditModeDom(...args);
    this.scheduleSquareUnitSync = (...args) => scheduleSquareUnitSync(...args);
    this.updateDockActiveState = (...args) => updateDockActiveState(...args);
    this.toggleWidgetMoveMode = (...args) => toggleWidgetMoveMode(...args);
    this.moveWidgetByDirection = (...args) => moveWidgetByDirection(...args);
    this.removeWidget = (...args) => removeWidget(...args);
    this.startResize = (...args) => startResize(...args);
    this.updateResize = (...args) => updateResize(...args);
    this.finishResize = (...args) => finishResize(...args);
    this.openWidgetConfig = (...args) => openWidgetConfig(...args);
    this.openScenesButtonConfig = (...args) => openScenesButtonConfig(...args);
    this.updateWidgetConfig = (...args) => updateWidgetConfig(...args);
    this.createWidgetShellFn = (...args) => createWidgetShellFn(...args);
    this.rerenderWidgetContentFn = (...args) => rerenderWidgetContentFn(...args);
    this.buildWidgetShellStateFn = (...args) => buildWidgetShellStateFn(...args);
    this.normalizeStoredWidgetFn = (...args) => normalizeStoredWidgetFn(...args);
    this.normalizeWidgetForKindFn = (...args) => normalizeWidgetForKindFn(...args);
    this.getNextWidgetVariantEntriesFn = (...args) => getNextWidgetVariantEntriesFn(...args);
    this.getVariantCandidateFn = (...args) => getVariantCandidateFn(...args);
    this.sameVariantSizeFn = (...args) => sameVariantSizeFn(...args);
    this.destroyDomSubtreeFn = (...args) => destroyDomSubtreeFn(...args);
    this.updateClockWidgetsFn = (...args) => updateClockWidgetsFn(...args);
  }

  buildWidgetShellProps(widget, {
    units,
    rows,
    layout = this.getEffectiveLayout(),
    position,
    widgetId = widget?.id || "",
  } = {}) {
    return {
      ...this.buildWidgetShellStateFn({
        widgetId,
        activeGridUnits: units,
        activeGridRows: rows,
        layout,
        isEditing: this.getIsEditing(),
        activeMoveWidgetId: this.getActiveMoveWidgetId(),
        position,
        hass: this.getHass(),
        entityVisibilityConfig: this.getEntityVisibilityConfig(),
      }),
      onToggleMove: (id) => this.toggleWidgetMoveMode(id),
      onMove: (id, direction) => this.moveWidgetByDirection(id, direction),
      onRemove: (id) => this.removeWidget(id),
      onStartResize: (id, event) => this.startResize(id, event),
      onUpdateResize: (event) => this.updateResize(event),
      onFinishResize: () => this.finishResize(),
      onCycleVariant: (id) => this.cycleVariant(id),
      onConfigure: (id) => this.openWidgetConfig(id),
      onConfigureSlot: (id, slotIndex) => this.openScenesButtonConfig(id, slotIndex),
      onUpdateConfig: (id, patch) => this.updateWidgetConfig(id, patch),
    };
  }

  createWidgetElement(widget, {
    units,
    rows = this.getGridBounds().rowUnits,
    layout = this.getEffectiveLayout(),
    position,
  } = {}) {
    const element = this.createWidgetShellFn(
      widget,
      this.buildWidgetShellProps(widget, {
        units,
        rows,
        layout,
        position,
      }),
    );
    this.wireDrag(element, widget);
    return element;
  }

  buildWidgetRenderContext(widget, {
    units,
    rows = this.getGridBounds().rowUnits,
    layout = this.getEffectiveLayout(),
  } = {}) {
    const size = this.normalizeWidgetForKindFn(widget, {
      units,
      rowUnits: rows,
      layout,
    });
    const widgetW = Math.min(size.w, units);

    return {
      size,
      activeGridUnits: units,
      activeGridRows: rows,
      layout,
      widgetW,
      widgetH: size.h,
      isEditing: this.getIsEditing(),
      hass: this.getHass(),
      entityVisibilityConfig: this.getEntityVisibilityConfig(),
    };
  }

  refreshActiveGridOnly() {
    this.cancelWidgetRenderFrame();
    const root = this.getRoot();
    const grid = root?.querySelector?.(".mha-grid");
    if (!grid) {
      this.renderRoot();
      return false;
    }

    grid.querySelectorAll(".mha-widget,.mha-widget-drop-slot").forEach((node) => {
      this.destroyDomSubtreeFn(node);
      node.remove();
    });

    const { units, rowUnits } = this.getGridBounds();
    const layout = this.getEffectiveLayout();
    const positions = this.getActiveWidgetPositions({ create: true });
    this.getWidgets().forEach((widget) => {
      grid.append(this.createWidgetElement(widget, {
        units,
        rows: rowUnits,
        layout,
        position: positions?.[widget.id],
      }));
    });

    this.syncEditModeDom();
    this.updateDockActiveState();
    this.syncWidgetDropSlots();
    this.scheduleSquareUnitSync();
    this.updateClockWidgetsFn(root);
    return true;
  }

  placePendingWidgetAtSlot(x, y) {
    if (!this.getIsEditing() || !this.getPendingWidgetPlacement()) return false;

    const widget = this.normalizeStoredWidgetFn({ ...this.getPendingWidgetPlacement() });
    const positions = this.getActiveWidgetPositions({ create: true });
    const { units, rowUnits } = this.getGridBounds();
    const layout = this.getEffectiveLayout();
    const nextPositions = {
      ...positions,
      [widget.id]: { x: Number(x) || 1, y: Number(y) || 1 },
    };
    const nextWidgets = [...this.getWidgets(), widget];

    if (!this.isPositionMapValidForWidgets(nextPositions, nextWidgets, units, rowUnits)) {
      return false;
    }

    this.setWidgets(this.normalizeWidgetsToGridBounds(nextWidgets));
    this.saveCurrentWidgetPositions(nextPositions);
    this.saveWidgets();
    this.setPendingWidgetPlacement(null);
    this.setActiveMoveWidgetId("");

    const root = this.getRoot();
    const grid = root?.querySelector?.(".mha-grid");
    if (grid) {
      grid.append(this.createWidgetElement(widget, {
        units,
        rows: rowUnits,
        layout,
        position: nextPositions[widget.id],
      }));
      this.applyWidgetPositionsToDom(nextPositions);
      this.renderWidgetDropSlots(grid);
    }

    this.syncEditModeDom();
    this.updateClockWidgetsFn(root);
    this.syncWidgetDropSlots();
    this.scheduleSquareUnitSync();
    return true;
  }

  canApplyVariant(id, candidateWidget) {
    if (!id || !candidateWidget) return false;

    const positions = this.getActiveWidgetPositions({ create: true });
    const currentPosition = positions?.[id];
    if (!positions || !currentPosition) return false;

    const { units, rowUnits } = this.getGridBounds();
    const nextWidgets = this.getWidgets().map((widget) => (
      widget.id === id
        ? this.normalizeStoredWidgetFn({ ...widget, ...candidateWidget })
        : widget
    ));

    return this.isPositionMapValidForWidgets(positions, nextWidgets, units, rowUnits);
  }

  applyWidgetVariant(id, candidateWidget) {
    const widgets = this.getWidgets();
    const index = widgets.findIndex((widget) => widget.id === id);
    if (index < 0 || !candidateWidget) return false;

    const current = widgets[index];
    const currentSize = this.normalizeWidgetForKindFn(current);
    const next = this.normalizeStoredWidgetFn({
      ...current,
      ...candidateWidget,
    });
    const nextSize = this.normalizeWidgetForKindFn(next);

    if (!this.sameVariantSizeFn(currentSize, nextSize) && !this.canApplyVariant(id, next)) {
      return false;
    }

    const nextWidgets = [...widgets];
    nextWidgets[index] = {
      ...next,
      ...nextSize,
    };

    this.setWidgets(
      this.normalizeWidgetsToGridBounds(
        nextWidgets.map((widget) => this.normalizeStoredWidgetFn(widget)),
      ),
    );
    this.saveWidgets();
    this.replaceWidgetDom(id);
    return true;
  }

  replaceWidgetDom(id) {
    const root = this.getRoot();
    const widget = this.getWidgets().find((item) => item.id === id);
    const existing = root?.querySelector?.(`[data-widget-id="${id}"]`);
    const grid = root?.querySelector?.(".mha-grid");

    if (!widget || !existing || !grid) {
      this.renderRoot();
      return false;
    }

    const { units, rowUnits } = this.getGridBounds();
    const layout = this.getEffectiveLayout();
    const positions = this.getActiveWidgetPositions({ create: true });
    const next = this.createWidgetElement(widget, {
      units,
      rows: rowUnits,
      layout,
      position: positions?.[id],
    });

    this.destroyDomSubtreeFn(existing);
    existing.replaceWith(next);
    this.applyWidgetPositionsToDom(positions);
    this.updateClockWidgetsFn(root);
    this.syncEditModeDom();
    this.syncWidgetDropSlots();
    this.scheduleSquareUnitSync();
    return true;
  }

  rerenderWidgetContent(id) {
    if (!id) return false;

    const root = this.getRoot();
    const shell = root?.querySelector?.(`[data-widget-id="${id}"]`);
    const widget = this.getWidgets().find((item) => item.id === id);
    if (!shell || !widget) return false;

    const { units, rowUnits } = this.getGridBounds();
    const layout = this.getEffectiveLayout();
    return this.rerenderWidgetContentFn(
      shell,
      widget,
      this.buildWidgetRenderContext(widget, {
        units,
        rows: rowUnits,
        layout,
      }),
      {
        destroyDomSubtreeFn: this.destroyDomSubtreeFn,
      },
    );
  }

  cycleVariant(id) {
    if (!this.getIsEditing() || !id) return false;

    const widget = this.getWidgets().find((item) => item.id === id);
    if (!widget) return false;

    const entries = this.getNextWidgetVariantEntriesFn(widget);
    if (!entries.length) return false;

    for (const entry of entries) {
      const candidate = this.getVariantCandidateFn(widget, entry);
      if (this.applyWidgetVariant(id, candidate)) return true;
    }

    return false;
  }
}

export function createWidgetSurfaceCoordinator(options = {}) {
  return new WidgetSurfaceCoordinator(options);
}
