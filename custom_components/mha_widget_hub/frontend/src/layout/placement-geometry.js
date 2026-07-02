import { normalizeWidgetForKind } from "./layout-engine.js";

export function rectsOverlap(a, b) {
  return (
    a.x < b.x + b.w
    && a.x + a.w > b.x
    && a.y < b.y + b.h
    && a.y + a.h > b.y
  );
}

export function getWidgetRectFromPosition(widget, position, units, {
  rowUnits = null,
  layout = "desktop",
} = {}) {
  const size = normalizeWidgetForKind(widget, { units, rowUnits, layout });
  return {
    x: Number(position?.x) || 1,
    y: Number(position?.y) || 1,
    w: Math.min(units, Number(size.w) || 1),
    h: Number(size.h) || 1,
  };
}

export function getWidgetsInCandidateRect(
  widgets,
  ignoredWidgetId,
  candidateRect,
  positions,
  units,
  context = {},
) {
  return widgets.filter(widget => {
    if (widget.id === ignoredWidgetId) return false;
    const position = positions?.[widget.id];
    if (!position) return false;
    return rectsOverlap(
      candidateRect,
      getWidgetRectFromPosition(widget, position, units, context),
    );
  });
}

export function doesWidgetGroupExactlyFillRect(
  widgets,
  targetRect,
  positions,
  units,
  context = {},
) {
  if (!widgets?.length) return false;

  const width = Math.max(1, Number(targetRect.w) || 1);
  const height = Math.max(1, Number(targetRect.h) || 1);
  const cells = Array.from({ length: height }, () => Array(width).fill(false));

  for (const widget of widgets) {
    const position = positions?.[widget.id];
    if (!position) return false;

    const rect = getWidgetRectFromPosition(widget, position, units, context);
    if (
      rect.x < targetRect.x
      || rect.y < targetRect.y
      || rect.x + rect.w > targetRect.x + targetRect.w
      || rect.y + rect.h > targetRect.y + targetRect.h
    ) {
      return false;
    }

    for (let y = rect.y; y < rect.y + rect.h; y += 1) {
      for (let x = rect.x; x < rect.x + rect.w; x += 1) {
        const localX = x - targetRect.x;
        const localY = y - targetRect.y;
        if (cells[localY]?.[localX]) return false;
        cells[localY][localX] = true;
      }
    }
  }

  return cells.every(row => row.every(Boolean));
}

export function translateWidgetGroupPositions(
  group,
  targetRect,
  destinationRect,
  positions,
) {
  const dx = destinationRect.x - targetRect.x;
  const dy = destinationRect.y - targetRect.y;
  const next = { ...positions };

  group.forEach(widget => {
    const position = positions?.[widget.id];
    if (position) {
      next[widget.id] = {
        x: position.x + dx,
        y: position.y + dy,
      };
    }
  });

  return next;
}

export function getGroupBoundingRect(group, positions, units, context = {}) {
  if (!group?.length) return null;

  const rects = group.map(widget => (
    getWidgetRectFromPosition(widget, positions?.[widget.id], units, context)
  ));
  const minX = Math.min(...rects.map(rect => rect.x));
  const minY = Math.min(...rects.map(rect => rect.y));
  const maxX = Math.max(...rects.map(rect => rect.x + rect.w));
  const maxY = Math.max(...rects.map(rect => rect.y + rect.h));

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
}

export function isGroupInternallyValid(group, positions, units, context = {}) {
  for (let index = 0; index < group.length; index += 1) {
    const a = getWidgetRectFromPosition(
      group[index],
      positions?.[group[index].id],
      units,
      context,
    );
    for (let otherIndex = index + 1; otherIndex < group.length; otherIndex += 1) {
      const b = getWidgetRectFromPosition(
        group[otherIndex],
        positions?.[group[otherIndex].id],
        units,
        context,
      );
      if (rectsOverlap(a, b)) return false;
    }
  }
  return true;
}

export function isPositionMapValidForWidgets(
  positions,
  widgets,
  units,
  rowUnits,
  { allowUnboundedRows = false } = {},
) {
  const maxRows = allowUnboundedRows
    ? Number.POSITIVE_INFINITY
    : rowUnits;
  const context = {
    rowUnits,
    layout: allowUnboundedRows ? "mobile" : "desktop",
  };

  for (const widget of widgets) {
    const position = positions?.[widget.id];
    if (!position) return false;
    const rect = getWidgetRectFromPosition(widget, position, units, context);
    if (
      rect.x < 1
      || rect.y < 1
      || rect.x + rect.w - 1 > units
      || rect.y + rect.h - 1 > maxRows
    ) {
      return false;
    }
  }

  return isGroupInternallyValid(widgets, positions, units, context);
}
