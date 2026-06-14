import { normalizeWidgetForKind } from "./layout-engine.js";
import {
  getAdjacentWidgetGroupInDirection,
  getDirectNeighborInDirection,
  hasNoWidgetOverlaps,
  packTranslatedSwapBand,
} from "./placement-calculations.js";
import {
  doesWidgetGroupExactlyFillRect,
  getGroupBoundingRect,
  getWidgetRectFromPosition,
  getWidgetsInCandidateRect,
  isGroupInternallyValid,
  isPositionMapValidForWidgets,
  translateWidgetGroupPositions,
} from "./placement-geometry.js";

const DIRECTION_DELTAS = Object.freeze({
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
});

export class PlacementController {
  constructor({
    getWidgets = () => [],
    getPositions = () => null,
    getGridBounds = () => ({ units: 1, rowUnits: 1 }),
    isMobileLayout = () => false,
    canMoveWidget = () => false,
    savePositions = () => {},
    applyPositions = () => {},
    applySinglePosition = () => {},
    setActiveMoveWidgetId = () => {},
    refreshDropSlots = () => {},
    syncEditMode = () => {},
    scheduleLayoutSync = () => {},
    syncDropSlots = () => {},
  } = {}) {
    this.getWidgets = (...args) => getWidgets(...args);
    this.getPositions = (...args) => getPositions(...args);
    this.getGridBounds = (...args) => getGridBounds(...args);
    this.isMobileLayout = (...args) => isMobileLayout(...args);
    this.canMoveWidget = (...args) => canMoveWidget(...args);
    this.savePositions = (...args) => savePositions(...args);
    this.applyPositions = (...args) => applyPositions(...args);
    this.applySinglePosition = (...args) => applySinglePosition(...args);
    this.setActiveMoveWidgetId = (...args) => setActiveMoveWidgetId(...args);
    this.refreshDropSlots = (...args) => refreshDropSlots(...args);
    this.syncEditMode = (...args) => syncEditMode(...args);
    this.scheduleLayoutSync = (...args) => scheduleLayoutSync(...args);
    this.syncDropSlots = (...args) => syncDropSlots(...args);
  }

  isPositionMapValid(positions, widgets, units, rowUnits) {
    return isPositionMapValidForWidgets(
      positions,
      widgets,
      units,
      rowUnits,
      { allowUnboundedRows: this.isMobileLayout() },
    );
  }

  tryDirectNeighborSwap(
    widgetId,
    direction,
    positions,
    units,
    rowUnits,
  ) {
    const widgets = this.getWidgets();
    const active = widgets.find(widget => widget.id === widgetId);
    const activePosition = positions?.[widgetId];
    if (!active || !activePosition) return false;

    const activeRect = getWidgetRectFromPosition(
      active,
      activePosition,
      units,
    );
    const neighbor = getDirectNeighborInDirection(
      widgets,
      widgetId,
      direction,
      positions,
      units,
    );
    if (!neighbor) return false;

    const next = { ...positions };
    const neighborRect = neighbor.rect;

    if (direction === "right" || direction === "left") {
      const fromX = Math.min(activeRect.x, neighborRect.x);
      const leftFirst = direction === "right"
        ? neighbor
        : { widget: active, rect: activeRect };
      const rightSecond = direction === "right"
        ? { widget: active, rect: activeRect }
        : neighbor;

      next[leftFirst.widget.id] = {
        x: fromX,
        y: leftFirst.rect.y,
      };
      next[rightSecond.widget.id] = {
        x: fromX + leftFirst.rect.w,
        y: rightSecond.rect.y,
      };
    } else if (direction === "down" || direction === "up") {
      const fromY = Math.min(activeRect.y, neighborRect.y);
      const topFirst = direction === "down"
        ? neighbor
        : { widget: active, rect: activeRect };
      const bottomSecond = direction === "down"
        ? { widget: active, rect: activeRect }
        : neighbor;

      next[topFirst.widget.id] = {
        x: topFirst.rect.x,
        y: fromY,
      };
      next[bottomSecond.widget.id] = {
        x: bottomSecond.rect.x,
        y: fromY + topFirst.rect.h,
      };
    } else {
      return false;
    }

    if (!this.isPositionMapValid(next, widgets, units, rowUnits)) {
      return false;
    }

    this.savePositions(next);
    this.applyPositions(next);
    this.scheduleLayoutSync();
    return true;
  }

  tryTranslatedGroupSwap(
    widgetId,
    direction,
    positions,
    units,
    rowUnits,
  ) {
    const widgets = this.getWidgets();
    const widget = widgets.find(item => item.id === widgetId);
    const current = positions?.[widgetId];
    if (!widget || !current) return false;

    const activeRect = getWidgetRectFromPosition(widget, current, units);
    const group = getAdjacentWidgetGroupInDirection(
      widgets,
      widgetId,
      direction,
      positions,
      units,
    );
    if (!group.length || !isGroupInternallyValid(group, positions, units)) {
      return false;
    }

    const groupRect = getGroupBoundingRect(group, positions, units);
    if (!groupRect) return false;

    const isAxisAdjacent = (
      direction === "right"
        ? groupRect.x >= activeRect.x + activeRect.w
        : direction === "left"
          ? groupRect.x + groupRect.w <= activeRect.x
          : direction === "down"
            ? groupRect.y >= activeRect.y + activeRect.h
            : direction === "up"
              ? groupRect.y + groupRect.h <= activeRect.y
              : false
    );
    if (!isAxisAdjacent) return false;

    const bandCompatible = direction === "right" || direction === "left"
      ? (
        groupRect.y <= activeRect.y
        && groupRect.y + groupRect.h >= activeRect.y + activeRect.h
      )
      : (
        groupRect.x <= activeRect.x
        && groupRect.x + groupRect.w >= activeRect.x + activeRect.w
      );
    if (!bandCompatible) return false;

    const packedPositions = packTranslatedSwapBand(
      widgets,
      widgetId,
      group,
      direction,
      positions,
      units,
      rowUnits,
      { allowUnboundedRows: this.isMobileLayout() },
    );
    if (!packedPositions) return false;

    this.savePositions(packedPositions);
    this.applyPositions(packedPositions);
    this.scheduleLayoutSync();
    return true;
  }

  moveToDropSlot(widgetId, x, y) {
    if (!this.canMoveWidget(widgetId)) return false;

    const positions = this.getPositions();
    const widgets = this.getWidgets();
    const { units, rowUnits } = this.getGridBounds();
    const next = {
      ...positions,
      [widgetId]: {
        x: Number(x) || 1,
        y: Number(y) || 1,
      },
    };
    if (!this.isPositionMapValid(next, widgets, units, rowUnits)) {
      return false;
    }

    this.savePositions(next);
    this.setActiveMoveWidgetId("");
    this.applyPositions(next);
    this.refreshDropSlots();
    this.syncEditMode();
    this.scheduleLayoutSync();
    return true;
  }

  moveByDirection(widgetId, direction) {
    if (!this.canMoveWidget(widgetId)) return false;

    const positions = this.getPositions();
    const widgets = this.getWidgets();
    const current = positions?.[widgetId];
    const widget = widgets.find(item => item.id === widgetId);
    if (!positions || !current || !widget) return false;

    const delta = DIRECTION_DELTAS[direction];
    if (!delta) return false;

    const { units, rowUnits } = this.getGridBounds();
    const size = normalizeWidgetForKind(widget);
    const width = Math.min(units, size.w);
    const height = size.h;
    const currentRect = {
      x: current.x,
      y: current.y,
      w: width,
      h: height,
    };
    const maxY = this.isMobileLayout()
      ? Number.POSITIVE_INFINITY
      : rowUnits - height + 1;
    const isCandidateInBounds = candidate => !(
      candidate.x < 1
      || candidate.x + width - 1 > units
      || candidate.y < 1
      || candidate.y > maxY
    );

    const applyEmptyMove = candidate => {
      positions[widgetId] = candidate;
      this.savePositions(positions);
      this.applySinglePosition({
        widgetId,
        position: candidate,
        width,
        height,
      });
      this.scheduleLayoutSync();
      this.syncDropSlots();
    };

    const tryGroupSwap = candidate => {
      if (!isCandidateInBounds(candidate)) return false;

      const candidateRect = {
        ...candidate,
        w: width,
        h: height,
      };
      const occupants = getWidgetsInCandidateRect(
        widgets,
        widgetId,
        candidateRect,
        positions,
        units,
      );
      if (
        !occupants.length
        || !doesWidgetGroupExactlyFillRect(
          occupants,
          candidateRect,
          positions,
          units,
        )
      ) {
        return false;
      }

      let nextPositions = {
        ...positions,
        [widgetId]: {
          x: candidateRect.x,
          y: candidateRect.y,
        },
      };
      nextPositions = translateWidgetGroupPositions(
        occupants,
        candidateRect,
        currentRect,
        nextPositions,
      );
      if (!hasNoWidgetOverlaps(widgets, nextPositions, units)) return false;

      this.savePositions(nextPositions);
      this.applyPositions(nextPositions);
      this.scheduleLayoutSync();
      this.syncDropSlots();
      return true;
    };

    const unitCandidate = {
      x: current.x + delta.x,
      y: current.y + delta.y,
    };
    if (!isCandidateInBounds(unitCandidate)) return false;

    const unitRect = {
      ...unitCandidate,
      w: width,
      h: height,
    };
    const unitOccupants = getWidgetsInCandidateRect(
      widgets,
      widgetId,
      unitRect,
      positions,
      units,
    );

    if (!unitOccupants.length) {
      applyEmptyMove(unitCandidate);
      return true;
    }

    if (
      doesWidgetGroupExactlyFillRect(
        unitOccupants,
        unitRect,
        positions,
        units,
      )
      && tryGroupSwap(unitCandidate)
    ) {
      return true;
    }

    if (
      this.tryDirectNeighborSwap(
        widgetId,
        direction,
        positions,
        units,
        rowUnits,
      )
    ) {
      return true;
    }

    const adjacentCandidate = {
      x: current.x + delta.x * width,
      y: current.y + delta.y * height,
    };
    if (
      (
        adjacentCandidate.x !== unitCandidate.x
        || adjacentCandidate.y !== unitCandidate.y
      )
      && tryGroupSwap(adjacentCandidate)
    ) {
      return true;
    }

    return this.tryTranslatedGroupSwap(
      widgetId,
      direction,
      positions,
      units,
      rowUnits,
    );
  }
}

export function createPlacementController(options) {
  return new PlacementController(options);
}
