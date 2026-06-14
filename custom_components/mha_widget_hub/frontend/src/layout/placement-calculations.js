import { normalizeWidgetForKind } from "./layout-engine.js";
import {
  getGroupBoundingRect,
  getWidgetRectFromPosition,
  isPositionMapValidForWidgets,
  rectsOverlap,
} from "./placement-geometry.js";

export function packWidgets(
  widgets,
  units,
  rowUnits,
  { allowUnboundedRows = false } = {},
) {
  const maxRows = allowUnboundedRows
    ? Number.POSITIVE_INFINITY
    : rowUnits;
  const occupied = [];
  const positions = {};

  const isFree = (x, y, w, h) => {
    if (x < 1 || x + w - 1 > units || y < 1 || y + h - 1 > maxRows) {
      return false;
    }
    for (let row = y; row < y + h; row += 1) {
      for (let column = x; column < x + w; column += 1) {
        if (occupied[row]?.[column]) return false;
      }
    }
    return true;
  };

  const occupy = (x, y, w, h) => {
    for (let row = y; row < y + h; row += 1) {
      occupied[row] ??= [];
      for (let column = x; column < x + w; column += 1) {
        occupied[row][column] = true;
      }
    }
  };

  for (const widget of widgets) {
    const size = normalizeWidgetForKind(widget);
    const width = Math.min(units, size.w);
    const height = size.h;
    let placed = null;

    for (let y = 1; !placed && y <= maxRows - height + 1; y += 1) {
      for (let x = 1; x <= units - width + 1; x += 1) {
        if (isFree(x, y, width, height)) {
          placed = { x, y };
          break;
        }
      }
    }

    if (!placed) return null;
    positions[widget.id] = placed;
    occupy(placed.x, placed.y, width, height);
  }

  return positions;
}

export function findWidgetAtCandidatePosition(
  widgets,
  ignoredWidgetId,
  candidateRect,
  positions,
  units,
) {
  return widgets.find(widget => {
    if (widget.id === ignoredWidgetId) return false;
    const position = positions?.[widget.id];
    if (!position) return false;
    return rectsOverlap(
      candidateRect,
      getWidgetRectFromPosition(widget, position, units),
    );
  }) || null;
}

export function hasNoWidgetOverlaps(widgets, positions, units) {
  for (let index = 0; index < widgets.length; index += 1) {
    const widget = widgets[index];
    const position = positions?.[widget.id];
    if (!position) continue;
    const rect = getWidgetRectFromPosition(widget, position, units);

    for (let otherIndex = index + 1; otherIndex < widgets.length; otherIndex += 1) {
      const other = widgets[otherIndex];
      const otherPosition = positions?.[other.id];
      if (!otherPosition) continue;
      const otherRect = getWidgetRectFromPosition(other, otherPosition, units);
      if (rectsOverlap(rect, otherRect)) return false;
    }
  }
  return true;
}

export function getAdjacentWidgetGroupInDirection(
  widgets,
  widgetId,
  direction,
  positions,
  units,
) {
  const widget = widgets.find(item => item.id === widgetId);
  const position = positions?.[widgetId];
  if (!widget || !position) return [];

  const activeRect = getWidgetRectFromPosition(widget, position, units);
  const isInForwardHalfPlane = rect => {
    if (direction === "right") return rect.x >= activeRect.x + activeRect.w;
    if (direction === "left") return rect.x + rect.w <= activeRect.x;
    if (direction === "down") return rect.y >= activeRect.y + activeRect.h;
    if (direction === "up") return rect.y + rect.h <= activeRect.y;
    return false;
  };
  const overlapsBand = rect => {
    if (direction === "right" || direction === "left") {
      return rect.y < activeRect.y + activeRect.h
        && rect.y + rect.h > activeRect.y;
    }
    if (direction === "down" || direction === "up") {
      return rect.x < activeRect.x + activeRect.w
        && rect.x + rect.w > activeRect.x;
    }
    return false;
  };
  const candidates = widgets
    .filter(other => other.id !== widgetId && positions?.[other.id])
    .map(other => ({
      widget: other,
      rect: getWidgetRectFromPosition(other, positions[other.id], units),
    }))
    .filter(item => isInForwardHalfPlane(item.rect) && overlapsBand(item.rect));

  if (!candidates.length) return [];

  const edgeValue = item => {
    if (direction === "right") return item.rect.x;
    if (direction === "left") return -(item.rect.x + item.rect.w);
    if (direction === "down") return item.rect.y;
    if (direction === "up") return -(item.rect.y + item.rect.h);
    return 0;
  };
  const nearestEdge = Math.min(...candidates.map(edgeValue));
  const seed = candidates.filter(item => edgeValue(item) === nearestEdge);
  const group = new Map(seed.map(item => [item.widget.id, item.widget]));
  let bounds = getGroupBoundingRect([...group.values()], positions, units);

  let changed = true;
  while (changed) {
    changed = false;
    for (const item of candidates) {
      if (group.has(item.widget.id)) continue;
      const expanded = {
        x: Math.min(bounds.x, item.rect.x),
        y: Math.min(bounds.y, item.rect.y),
        w: Math.max(bounds.x + bounds.w, item.rect.x + item.rect.w)
          - Math.min(bounds.x, item.rect.x),
        h: Math.max(bounds.y + bounds.h, item.rect.y + item.rect.h)
          - Math.min(bounds.y, item.rect.y),
      };
      const touchesOrOverlaps = (
        item.rect.x <= bounds.x + bounds.w
        && item.rect.x + item.rect.w >= bounds.x
        && item.rect.y <= bounds.y + bounds.h
        && item.rect.y + item.rect.h >= bounds.y
      );

      if (touchesOrOverlaps) {
        group.set(item.widget.id, item.widget);
        bounds = expanded;
        changed = true;
      }
    }
  }

  return [...group.values()];
}

export function getBandParticipantsForTranslatedSwap(
  widgets,
  widgetId,
  group,
  positions,
  units,
) {
  const ids = new Set([widgetId, ...group.map(widget => widget.id)]);
  const active = widgets.find(widget => widget.id === widgetId);
  const activePosition = positions?.[widgetId];
  if (!active || !activePosition) return [];

  const activeRect = getWidgetRectFromPosition(active, activePosition, units);
  const groupRect = getGroupBoundingRect(group, positions, units);
  if (!groupRect) return [];

  const band = {
    x: Math.min(activeRect.x, groupRect.x),
    y: Math.min(activeRect.y, groupRect.y),
    w: Math.max(activeRect.x + activeRect.w, groupRect.x + groupRect.w)
      - Math.min(activeRect.x, groupRect.x),
    h: Math.max(activeRect.y + activeRect.h, groupRect.y + groupRect.h)
      - Math.min(activeRect.y, groupRect.y),
  };

  return widgets
    .filter(widget => ids.has(widget.id))
    .map(widget => ({
      widget,
      rect: getWidgetRectFromPosition(widget, positions[widget.id], units),
    }))
    .filter(item => rectsOverlap(item.rect, band));
}

export function packTranslatedSwapBand(
  widgets,
  widgetId,
  group,
  direction,
  positions,
  units,
  rowUnits,
  { allowUnboundedRows = false } = {},
) {
  const participants = getBandParticipantsForTranslatedSwap(
    widgets,
    widgetId,
    group,
    positions,
    units,
  );
  if (!participants.length) return null;

  const activeItem = participants.find(item => item.widget.id === widgetId);
  if (!activeItem) return null;

  const activeRect = activeItem.rect;
  const groupRect = getGroupBoundingRect(group, positions, units);
  if (!groupRect) return null;

  const groupItems = participants.filter(item => item.widget.id !== widgetId);
  if (!groupItems.length) return null;

  const next = { ...positions };
  if (direction === "right" || direction === "left") {
    const fromX = Math.min(activeRect.x, groupRect.x);
    const toX = Math.max(
      activeRect.x + activeRect.w,
      groupRect.x + groupRect.w,
    );
    const ordered = direction === "right"
      ? [activeItem, ...groupItems.sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y)]
      : [...groupItems.sort((a, b) => a.rect.x - b.rect.x || a.rect.y - b.rect.y), activeItem];

    let cursor = fromX;
    ordered.forEach(item => {
      next[item.widget.id] = { x: cursor, y: item.rect.y };
      cursor += item.rect.w;
    });

    if (cursor !== toX) return null;
    return isPositionMapValidForWidgets(
      next,
      widgets,
      units,
      rowUnits,
      { allowUnboundedRows },
    ) ? next : null;
  }

  if (direction === "down" || direction === "up") {
    const fromY = Math.min(activeRect.y, groupRect.y);
    const toY = Math.max(
      activeRect.y + activeRect.h,
      groupRect.y + groupRect.h,
    );
    const ordered = direction === "down"
      ? [activeItem, ...groupItems.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x)]
      : [...groupItems.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x), activeItem];

    let cursor = fromY;
    ordered.forEach(item => {
      next[item.widget.id] = { x: item.rect.x, y: cursor };
      cursor += item.rect.h;
    });

    if (cursor !== toY) return null;
    return isPositionMapValidForWidgets(
      next,
      widgets,
      units,
      rowUnits,
      { allowUnboundedRows },
    ) ? next : null;
  }

  return null;
}

export function getDirectNeighborInDirection(
  widgets,
  widgetId,
  direction,
  positions,
  units,
) {
  const widget = widgets.find(item => item.id === widgetId);
  const position = positions?.[widgetId];
  if (!widget || !position) return null;

  const activeRect = getWidgetRectFromPosition(widget, position, units);
  const candidates = widgets
    .filter(other => other.id !== widgetId && positions?.[other.id])
    .map(other => ({
      widget: other,
      rect: getWidgetRectFromPosition(other, positions[other.id], units),
    }))
    .filter(item => {
      if (direction === "right") {
        return item.rect.x >= activeRect.x + activeRect.w
          && item.rect.y < activeRect.y + activeRect.h
          && item.rect.y + item.rect.h > activeRect.y;
      }
      if (direction === "left") {
        return item.rect.x + item.rect.w <= activeRect.x
          && item.rect.y < activeRect.y + activeRect.h
          && item.rect.y + item.rect.h > activeRect.y;
      }
      if (direction === "down") {
        return item.rect.y >= activeRect.y + activeRect.h
          && item.rect.x < activeRect.x + activeRect.w
          && item.rect.x + item.rect.w > activeRect.x;
      }
      if (direction === "up") {
        return item.rect.y + item.rect.h <= activeRect.y
          && item.rect.x < activeRect.x + activeRect.w
          && item.rect.x + item.rect.w > activeRect.x;
      }
      return false;
    });

  if (!candidates.length) return null;

  const distance = item => {
    if (direction === "right") {
      return item.rect.x - (activeRect.x + activeRect.w);
    }
    if (direction === "left") {
      return activeRect.x - (item.rect.x + item.rect.w);
    }
    if (direction === "down") {
      return item.rect.y - (activeRect.y + activeRect.h);
    }
    if (direction === "up") {
      return activeRect.y - (item.rect.y + item.rect.h);
    }
    return Number.POSITIVE_INFINITY;
  };

  candidates.sort((a, b) => (
    distance(a) - distance(b)
    || a.rect.y - b.rect.y
    || a.rect.x - b.rect.x
  ));
  return candidates[0];
}

export function getAvailableDropSlotsForCandidate(
  widgets,
  candidateWidget,
  positions,
  currentPosition,
  units,
  rowUnits,
  { allowUnboundedRows = false } = {},
) {
  if (!candidateWidget) return [];

  const size = normalizeWidgetForKind(candidateWidget);
  const width = Math.min(units, Number(size.w) || 1);
  const height = Math.max(1, Number(size.h) || 1);
  const ignoredWidgetId = candidateWidget.id;
  const current = currentPosition || positions?.[ignoredWidgetId] || null;
  const maxOccupiedRow = widgets.reduce((max, widget) => {
    if (widget.id === ignoredWidgetId) return max;
    const position = positions?.[widget.id];
    if (!position) return max;
    const rect = getWidgetRectFromPosition(widget, position, units);
    return Math.max(max, rect.y + rect.h - 1);
  }, 0);
  const maxRow = allowUnboundedRows
    ? Math.max(
      maxOccupiedRow + height + 2,
      (current?.y || 1) + height + 2,
      height + 2,
    )
    : rowUnits;
  const validationWidgets = [
    ...widgets.filter(widget => widget.id !== ignoredWidgetId),
    candidateWidget,
  ];
  const slots = [];

  for (let y = 1; y <= maxRow - height + 1; y += 1) {
    for (let x = 1; x <= units - width + 1; x += 1) {
      if (current && current.x > 0 && x === current.x && y === current.y) {
        continue;
      }
      const candidatePositions = {
        ...positions,
        [ignoredWidgetId]: { x, y },
      };
      if (isPositionMapValidForWidgets(
        candidatePositions,
        validationWidgets,
        units,
        rowUnits,
        { allowUnboundedRows },
      )) {
        slots.push({ x, y, w: width, h: height });
      }
    }
  }

  return slots;
}

export function doesWidgetLayoutFitGrid(widgets, columns, rows) {
  const occupied = Array.from(
    { length: rows },
    () => Array(columns).fill(false),
  );

  for (const rawWidget of widgets) {
    const widget = normalizeWidgetForKind(rawWidget);
    const width = Math.max(1, Math.min(columns, Number(widget.w) || 1));
    const height = Math.max(1, Math.min(rows, Number(widget.h) || 1));
    let placed = false;

    for (let y = 0; y <= rows - height && !placed; y += 1) {
      for (let x = 0; x <= columns - width && !placed; x += 1) {
        let fits = true;
        for (let row = y; row < y + height && fits; row += 1) {
          for (let column = x; column < x + width; column += 1) {
            if (occupied[row]?.[column]) {
              fits = false;
              break;
            }
          }
        }
        if (!fits) continue;

        for (let row = y; row < y + height; row += 1) {
          for (let column = x; column < x + width; column += 1) {
            occupied[row][column] = true;
          }
        }
        placed = true;
      }
    }

    if (!placed) return false;
  }

  return true;
}
