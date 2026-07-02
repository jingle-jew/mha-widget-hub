const DEFAULT_LOGICAL_UNIT_SCALE = 2;
const DEFAULT_PREFERENCE_PENALTY_FACTOR = 0.06;

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCount(value, fallback = 1) {
  const normalized = Math.round(Number(value) || fallback);
  return Math.max(1, normalized);
}

export function normalizeAvailableContentRect(rect = null) {
  if (!rect) return null;
  const width = Math.max(0, Number(rect.width) || 0);
  const height = Math.max(0, Number(rect.height) || 0);
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function resolveAxisCount({
  availableSpan = 0,
  targetFill = 1,
  minCount = 1,
  maxCount = 1,
  preferredCount = 1,
  logicalUnitScale = DEFAULT_LOGICAL_UNIT_SCALE,
  minCell = 1,
  targetCell = 1,
  maxCell = targetCell,
  preferencePenaltyFactor = DEFAULT_PREFERENCE_PENALTY_FACTOR,
} = {}) {
  const fallbackCount = clampNumber(preferredCount, minCount, maxCount);
  const span = Math.max(0, Number(availableSpan) || 0);
  if (span <= 0) return fallbackCount;

  const fill = clampNumber(Number(targetFill) || 1, 0.1, 1);
  const comfortFloor = Math.max(1, minCell);

  let bestCandidate = null;
  for (let count = minCount; count <= maxCount; count += 1) {
    const units = count * logicalUnitScale;
    const preferredAxisUnit = (span * fill) / units;
    if (!Number.isFinite(preferredAxisUnit) || preferredAxisUnit <= 0) continue;
    if (preferredAxisUnit < comfortFloor) continue;

    const boundedUnit = clampNumber(preferredAxisUnit, minCell, maxCell);
    const axisFill = Math.min(1, (boundedUnit * units) / span);
    const targetPenalty = Math.abs(preferredAxisUnit - targetCell) / targetCell;
    const fillPenalty = Math.abs(axisFill - fill);
    const preferencePenalty = (
      Math.abs(count - fallbackCount)
      * Math.max(0, Number(preferencePenaltyFactor) || 0)
    );
    const score = targetPenalty + (fillPenalty * 2.1) + preferencePenalty;
    const candidate = { count, score };

    if (!bestCandidate || candidate.score < bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  return bestCandidate?.count || fallbackCount;
}

export function resolveGridDensity({
  layout = "desktop",
  orientation = "landscape",
  availableContentRect = null,
  constraints = {},
  logicalUnitScale = DEFAULT_LOGICAL_UNIT_SCALE,
} = {}) {
  const preferredColumns = normalizeCount(
    constraints.preferredColumns ?? constraints.presetColumns ?? constraints.columns,
    constraints.maxColumns ?? constraints.minColumns ?? 1,
  );
  const preferredRows = normalizeCount(
    constraints.preferredRows ?? constraints.presetRows ?? constraints.rows,
    constraints.maxRows ?? constraints.minRows ?? 1,
  );
  const minColumns = normalizeCount(constraints.minColumns, preferredColumns);
  const maxColumns = normalizeCount(constraints.maxColumns, preferredColumns);
  const minRows = normalizeCount(constraints.minRows, preferredRows);
  const maxRows = normalizeCount(constraints.maxRows, preferredRows);
  const minCell = Math.max(1, Number(constraints.minCell) || 1);
  const targetCell = Math.max(minCell, Number(constraints.targetCell) || minCell);
  const maxCell = Math.max(targetCell, Number(constraints.maxCell) || targetCell);
  const fillX = clampNumber(Number(constraints.fillX) || 1, 0.1, 1);
  const fillY = clampNumber(Number(constraints.fillY) || 1, 0.1, 1);
  const forceWidthFill = Boolean(constraints.forceWidthFill);
  const preferencePenaltyFactor = Math.max(
    0,
    Number(constraints.preferencePenaltyFactor) || DEFAULT_PREFERENCE_PENALTY_FACTOR,
  );
  const availableRect = normalizeAvailableContentRect(availableContentRect);

  const fallbackResult = {
    columns: clampNumber(preferredColumns, minColumns, maxColumns),
    rows: clampNumber(preferredRows, minRows, maxRows),
    density: `${layout}-${orientation}-adaptive`,
    minCell,
    maxCell,
    targetCell,
    fillX,
    fillY,
    minColumns,
    maxColumns,
    minRows,
    maxRows,
    preferredColumns,
    preferredRows,
    forceWidthFill,
    preferencePenaltyFactor,
  };
  if (!availableRect) return fallbackResult;
  return {
    ...fallbackResult,
    columns: resolveAxisCount({
      availableSpan: availableRect.width,
      targetFill: fillX,
      minCount: minColumns,
      maxCount: maxColumns,
      preferredCount: preferredColumns,
      logicalUnitScale,
      minCell,
      targetCell,
      maxCell,
      preferencePenaltyFactor,
    }),
    rows: resolveAxisCount({
      availableSpan: availableRect.height,
      targetFill: fillY,
      minCount: minRows,
      maxCount: maxRows,
      preferredCount: preferredRows,
      logicalUnitScale,
      minCell,
      targetCell,
      maxCell,
      preferencePenaltyFactor,
    }),
  };
}
