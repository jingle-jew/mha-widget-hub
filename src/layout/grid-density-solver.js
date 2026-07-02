const DEFAULT_LOGICAL_UNIT_SCALE = 1;
const DEFAULT_PREFERENCE_PENALTY_FACTOR = 0.06;
const DEFAULT_UNUSED_SPACE_PENALTY_FACTOR = 0.35;

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

function scoreMatrixCandidate({
  availableWidth = 0,
  availableHeight = 0,
  columns = 1,
  rows = 1,
  preferredColumns = 1,
  preferredRows = 1,
  logicalUnitScale = DEFAULT_LOGICAL_UNIT_SCALE,
  minCell = 1,
  targetCell = 1,
  maxCell = targetCell,
  fillX = 1,
  fillY = 1,
  preferencePenaltyFactor = DEFAULT_PREFERENCE_PENALTY_FACTOR,
  unusedSpacePenaltyFactor = DEFAULT_UNUSED_SPACE_PENALTY_FACTOR,
} = {}) {
  const units = columns * logicalUnitScale;
  const rowUnits = rows * logicalUnitScale;
  const width = Math.max(0, Number(availableWidth) || 0);
  const height = Math.max(0, Number(availableHeight) || 0);
  if (width <= 0 || height <= 0 || units <= 0 || rowUnits <= 0) return null;

  const unitX = width / units;
  const unitY = height / rowUnits;
  const squareUnit = Math.min(unitX, unitY);
  if (!Number.isFinite(squareUnit) || squareUnit <= 0) return null;

  const trackWidth = squareUnit * units;
  const trackHeight = squareUnit * rowUnits;
  const unusedWidth = Math.max(0, width - trackWidth);
  const unusedHeight = Math.max(0, height - trackHeight);
  const unusedWidthRatio = width > 0 ? unusedWidth / width : 0;
  const unusedHeightRatio = height > 0 ? unusedHeight / height : 0;
  const widthFill = width > 0 ? trackWidth / width : 0;
  const heightFill = height > 0 ? trackHeight / height : 0;

  const targetPenalty = (Math.abs(squareUnit - targetCell) / targetCell) * 3.2;
  const belowMinPenalty = squareUnit < minCell
    ? 8 + (((minCell - squareUnit) / minCell) * 16)
    : 0;
  const aboveMaxPenalty = squareUnit > maxCell
    ? (((squareUnit - maxCell) / maxCell) * 4.5)
    : 0;
  const fillPenalty = (
    Math.abs(widthFill - fillX)
    + Math.abs(heightFill - fillY)
  ) * 0.2;
  const preferencePenalty = (
    (Math.abs(columns - preferredColumns) + Math.abs(rows - preferredRows))
    * Math.max(0, Number(preferencePenaltyFactor) || 0)
  );
  const unusedSpacePenalty = (
    (unusedWidthRatio * 0.8)
    + (unusedHeightRatio * 1.15)
  ) * Math.max(0, Number(unusedSpacePenaltyFactor) || 0);

  return {
    columns,
    rows,
    score: (
      targetPenalty
      + belowMinPenalty
      + aboveMaxPenalty
      + fillPenalty
      + preferencePenalty
      + unusedSpacePenalty
    ),
  };
}

function resolveMatrixDensity({
  availableRect,
  minColumns,
  maxColumns,
  minRows,
  maxRows,
  preferredColumns,
  preferredRows,
  logicalUnitScale,
  minCell,
  targetCell,
  maxCell,
  fillX,
  fillY,
  preferencePenaltyFactor,
  unusedSpacePenaltyFactor,
}) {
  let bestCandidate = null;

  for (let columns = minColumns; columns <= maxColumns; columns += 1) {
    for (let rows = minRows; rows <= maxRows; rows += 1) {
      const candidate = scoreMatrixCandidate({
        availableWidth: availableRect.width,
        availableHeight: availableRect.height,
        columns,
        rows,
        preferredColumns,
        preferredRows,
        logicalUnitScale,
        minCell,
        targetCell,
        maxCell,
        fillX,
        fillY,
        preferencePenaltyFactor,
        unusedSpacePenaltyFactor,
      });
      if (!candidate) continue;
      if (!bestCandidate || candidate.score < bestCandidate.score) {
        bestCandidate = candidate;
      }
    }
  }

  return bestCandidate;
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
  const unusedSpacePenaltyFactor = Math.max(
    0,
    Number(constraints.unusedSpacePenaltyFactor) || DEFAULT_UNUSED_SPACE_PENALTY_FACTOR,
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
    unusedSpacePenaltyFactor,
  };
  if (!availableRect) return fallbackResult;
  if (!forceWidthFill) {
    const matrixResult = resolveMatrixDensity({
      availableRect,
      minColumns,
      maxColumns,
      minRows,
      maxRows,
      preferredColumns,
      preferredRows,
      logicalUnitScale,
      minCell,
      targetCell,
      maxCell,
      fillX,
      fillY,
      preferencePenaltyFactor,
      unusedSpacePenaltyFactor,
    });
    if (matrixResult) {
      return {
        ...fallbackResult,
        columns: matrixResult.columns,
        rows: matrixResult.rows,
      };
    }
  }
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
