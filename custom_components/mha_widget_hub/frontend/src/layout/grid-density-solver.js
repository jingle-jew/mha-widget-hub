const DEFAULT_LOGICAL_UNIT_SCALE = 1;
const DEFAULT_PREFERENCE_PENALTY_FACTOR = 0.06;
const DEFAULT_UNUSED_SPACE_PENALTY_FACTOR = 0.35;
const DEFAULT_IDEAL_PENALTY_FACTOR = 0.45;
const DEFAULT_COMFORT_PENALTY_FACTOR = 0.6;
const DEFAULT_RATIO_PENALTY_FACTOR = 0.35;
const DEFAULT_DENSITY_PENALTY_FACTOR = 0.45;

function clampNumber(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCount(value, fallback = 1) {
  const normalized = Math.round(Number(value) || fallback);
  return Math.max(1, normalized);
}

function normalizePositiveNumber(value, fallback = 1) {
  const normalized = Number(value);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : fallback;
}

export function normalizeAvailableContentRect(rect = null) {
  if (!rect) return null;
  const width = Math.max(0, Number(rect.width) || 0);
  const height = Math.max(0, Number(rect.height) || 0);
  if (width <= 0 || height <= 0) return null;
  const dockPosition = typeof rect.dockPosition === "string"
    ? rect.dockPosition
    : undefined;
  return dockPosition ? { width, height, dockPosition } : { width, height };
}

function resolveUsableSpan({
  availableSpan = 0,
  count = 1,
  axisGap = 0,
  axisPadding = 0,
} = {}) {
  const span = Math.max(0, Number(availableSpan) || 0);
  const gap = Math.max(0, Number(axisGap) || 0);
  const padding = Math.max(0, Number(axisPadding) || 0);
  const trackCount = Math.max(1, Math.round(Number(count) || 1));
  return Math.max(0, span - padding - (gap * Math.max(0, trackCount - 1)));
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
  axisGap = 0,
  axisPadding = 0,
} = {}) {
  const fallbackCount = clampNumber(preferredCount, minCount, maxCount);
  const span = Math.max(0, Number(availableSpan) || 0);
  if (span <= 0) return fallbackCount;

  const fill = clampNumber(Number(targetFill) || 1, 0.1, 1);
  const comfortFloor = Math.max(1, minCell);

  let bestCandidate = null;
  for (let count = minCount; count <= maxCount; count += 1) {
    const units = count * logicalUnitScale;
    const usableSpan = resolveUsableSpan({
      availableSpan: span,
      count: units,
      axisGap,
      axisPadding,
    });
    if (usableSpan <= 0) continue;
    const preferredAxisUnit = (usableSpan * fill) / units;
    if (!Number.isFinite(preferredAxisUnit) || preferredAxisUnit <= 0) continue;
    if (preferredAxisUnit < comfortFloor) continue;

    const boundedUnit = clampNumber(preferredAxisUnit, minCell, maxCell);
    const trackSpan = (
      boundedUnit * units
      + axisPadding
      + (axisGap * Math.max(0, units - 1))
    );
    const axisFill = Math.min(1, trackSpan / span);
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
  minColumns = 1,
  maxColumns = 1,
  minRows = 1,
  maxRows = 1,
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
  estimatedColumnGap = 0,
  estimatedRowGap = 0,
  estimatedPaddingX = 0,
  estimatedPaddingY = 0,
  minCellWidthAbsolute = minCell,
  minCellHeightAbsolute = minCell,
  minCellWidthComfort = targetCell,
  minCellHeightComfort = targetCell,
  idealCellWidth = targetCell,
  idealCellHeight = targetCell,
  idealCellRatio = 1,
  minCellRatioComfort = 0.9,
  maxCellRatioComfort = 1.1,
  minCellRatioAbsolute = 0.82,
  maxCellRatioAbsolute = 1.22,
  idealPenaltyFactor = DEFAULT_IDEAL_PENALTY_FACTOR,
  comfortPenaltyFactor = DEFAULT_COMFORT_PENALTY_FACTOR,
  ratioPenaltyFactor = DEFAULT_RATIO_PENALTY_FACTOR,
  densityPenaltyFactor = DEFAULT_DENSITY_PENALTY_FACTOR,
  usesResponsiveComfortScoring = false,
  enforceUsableCellAbsoluteMinimum = false,
} = {}) {
  const units = columns * logicalUnitScale;
  const rowUnits = rows * logicalUnitScale;
  const width = Math.max(0, Number(availableWidth) || 0);
  const height = Math.max(0, Number(availableHeight) || 0);
  if (width <= 0 || height <= 0 || units <= 0 || rowUnits <= 0) return null;

  const usableWidth = resolveUsableSpan({
    availableSpan: width,
    count: units,
    axisGap: estimatedColumnGap,
    axisPadding: estimatedPaddingX,
  });
  const usableHeight = resolveUsableSpan({
    availableSpan: height,
    count: rowUnits,
    axisGap: estimatedRowGap,
    axisPadding: estimatedPaddingY,
  });
  if (usableWidth <= 0 || usableHeight <= 0) return null;

  const rawCellWidth = width / units;
  const rawCellHeight = height / rowUnits;
  if (rawCellWidth < minCellWidthAbsolute || rawCellHeight < minCellHeightAbsolute) {
    return null;
  }
  const usableCellWidth = usableWidth / units;
  const usableCellHeight = usableHeight / rowUnits;
  if (
    enforceUsableCellAbsoluteMinimum
    && (usableCellWidth < minCellWidthAbsolute || usableCellHeight < minCellHeightAbsolute)
  ) {
    return null;
  }

  if (!usesResponsiveComfortScoring) {
    const unitX = usableCellWidth;
    const unitY = usableCellHeight;
    const squareUnit = Math.min(unitX, unitY);
    if (!Number.isFinite(squareUnit) || squareUnit <= 0) return null;

    const trackWidth = (
      squareUnit * units
      + estimatedPaddingX
      + (estimatedColumnGap * Math.max(0, units - 1))
    );
    const trackHeight = (
      squareUnit * rowUnits
      + estimatedPaddingY
      + (estimatedRowGap * Math.max(0, rowUnits - 1))
    );
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

  const cellWidth = usableWidth / units;
  const cellHeight = usableHeight / rowUnits;
  const cellRatio = cellHeight > 0 ? cellWidth / cellHeight : 1;
  if (cellRatio < minCellRatioAbsolute || cellRatio > maxCellRatioAbsolute) {
    return null;
  }

  const squareUnit = Math.min(cellWidth, cellHeight);
  if (!Number.isFinite(squareUnit) || squareUnit <= 0) return null;

  const trackWidth = (
    squareUnit * units
    + estimatedPaddingX
    + (estimatedColumnGap * Math.max(0, units - 1))
  );
  const trackHeight = (
    squareUnit * rowUnits
    + estimatedPaddingY
    + (estimatedRowGap * Math.max(0, rowUnits - 1))
  );
  const unusedWidth = Math.max(0, width - trackWidth);
  const unusedHeight = Math.max(0, height - trackHeight);
  const unusedWidthRatio = width > 0 ? unusedWidth / width : 0;
  const unusedHeightRatio = height > 0 ? unusedHeight / height : 0;
  const widthFill = width > 0 ? trackWidth / width : 0;
  const heightFill = height > 0 ? trackHeight / height : 0;

  const idealWidthPenalty = cellWidth < idealCellWidth
    ? ((idealCellWidth - cellWidth) / idealCellWidth)
    : (((cellWidth - idealCellWidth) / idealCellWidth) * 0.18);
  const idealHeightPenalty = cellHeight < idealCellHeight
    ? ((idealCellHeight - cellHeight) / idealCellHeight)
    : (((cellHeight - idealCellHeight) / idealCellHeight) * 0.18);
  const comfortWidthPenalty = cellWidth < minCellWidthComfort
    ? (((minCellWidthComfort - cellWidth) / minCellWidthComfort) ** 2)
    : 0;
  const comfortHeightPenalty = cellHeight < minCellHeightComfort
    ? (((minCellHeightComfort - cellHeight) / minCellHeightComfort) ** 2)
    : 0;
  const ratioDelta = Math.abs(cellRatio - idealCellRatio) / idealCellRatio;
  const ratioPenalty = (
    cellRatio < minCellRatioComfort || cellRatio > maxCellRatioComfort
      ? ratioDelta * 1.8
      : ratioDelta * 0.35
  );
  const horizontalDensity = maxColumns > preferredColumns
    ? Math.max(0, columns - preferredColumns) / Math.max(1, maxColumns - preferredColumns)
    : 0;
  const verticalDensity = maxRows > preferredRows
    ? Math.max(0, rows - preferredRows) / Math.max(1, maxRows - preferredRows)
    : 0;
  const densityPenalty = (
    (horizontalDensity * 0.55)
    + (verticalDensity * 1.1)
  ) * Math.max(0, Number(densityPenaltyFactor) || 0);
  const targetPenalty = (
    (idealWidthPenalty + idealHeightPenalty)
    * Math.max(0, Number(idealPenaltyFactor) || 0)
    * 3.2
  );
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
  const comfortPenalty = (
    (comfortWidthPenalty * 0.55)
    + (comfortHeightPenalty * 1.2)
  ) * Math.max(0, Number(comfortPenaltyFactor) || 0) * 10;
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
      + comfortPenalty
      + (ratioPenalty * Math.max(0, Number(ratioPenaltyFactor) || 0))
      + densityPenalty
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
  estimatedColumnGap,
  estimatedRowGap,
  estimatedPaddingX,
  estimatedPaddingY,
  minCellWidthAbsolute,
  minCellHeightAbsolute,
  minCellWidthComfort,
  minCellHeightComfort,
  idealCellWidth,
  idealCellHeight,
  idealCellRatio,
  minCellRatioComfort,
  maxCellRatioComfort,
  minCellRatioAbsolute,
  maxCellRatioAbsolute,
  idealPenaltyFactor,
  comfortPenaltyFactor,
  ratioPenaltyFactor,
  densityPenaltyFactor,
  usesResponsiveComfortScoring,
  enforceUsableCellAbsoluteMinimum,
}) {
  let bestCandidate = null;

  for (let columns = minColumns; columns <= maxColumns; columns += 1) {
    for (let rows = minRows; rows <= maxRows; rows += 1) {
      const candidate = scoreMatrixCandidate({
        availableWidth: availableRect.width,
        availableHeight: availableRect.height,
        columns,
        rows,
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
        estimatedColumnGap,
        estimatedRowGap,
        estimatedPaddingX,
        estimatedPaddingY,
        minCellWidthAbsolute,
        minCellHeightAbsolute,
        minCellWidthComfort,
        minCellHeightComfort,
        idealCellWidth,
        idealCellHeight,
        idealCellRatio,
        minCellRatioComfort,
        maxCellRatioComfort,
        minCellRatioAbsolute,
        maxCellRatioAbsolute,
        idealPenaltyFactor,
        comfortPenaltyFactor,
        ratioPenaltyFactor,
        densityPenaltyFactor,
        usesResponsiveComfortScoring,
        enforceUsableCellAbsoluteMinimum,
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
  const minCellWidthAbsolute = normalizePositiveNumber(
    constraints.minCellWidthAbsolute,
    minCell,
  );
  const minCellHeightAbsolute = normalizePositiveNumber(
    constraints.minCellHeightAbsolute,
    minCell,
  );
  const minCellWidthComfort = normalizePositiveNumber(
    constraints.minCellWidthComfort,
    targetCell,
  );
  const minCellHeightComfort = normalizePositiveNumber(
    constraints.minCellHeightComfort,
    targetCell,
  );
  const idealCellWidth = normalizePositiveNumber(
    constraints.idealCellWidth,
    targetCell,
  );
  const idealCellHeight = normalizePositiveNumber(
    constraints.idealCellHeight,
    targetCell,
  );
  const idealCellRatio = normalizePositiveNumber(constraints.idealCellRatio, 1);
  const minCellRatioComfort = normalizePositiveNumber(constraints.minCellRatioComfort, 0.9);
  const maxCellRatioComfort = Math.max(
    minCellRatioComfort,
    normalizePositiveNumber(constraints.maxCellRatioComfort, 1.1),
  );
  const minCellRatioAbsolute = normalizePositiveNumber(constraints.minCellRatioAbsolute, 0.82);
  const maxCellRatioAbsolute = Math.max(
    minCellRatioAbsolute,
    normalizePositiveNumber(constraints.maxCellRatioAbsolute, 1.22),
  );
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
  const idealPenaltyFactor = Math.max(
    0,
    Number(constraints.idealPenaltyFactor) || DEFAULT_IDEAL_PENALTY_FACTOR,
  );
  const comfortPenaltyFactor = Math.max(
    0,
    Number(constraints.comfortPenaltyFactor) || DEFAULT_COMFORT_PENALTY_FACTOR,
  );
  const ratioPenaltyFactor = Math.max(
    0,
    Number(constraints.ratioPenaltyFactor) || DEFAULT_RATIO_PENALTY_FACTOR,
  );
  const densityPenaltyFactor = Math.max(
    0,
    Number(constraints.densityPenaltyFactor) || DEFAULT_DENSITY_PENALTY_FACTOR,
  );
  const usesResponsiveComfortScoring = [
    "minCellWidthComfort",
    "minCellHeightComfort",
    "idealCellWidth",
    "idealCellHeight",
    "idealCellRatio",
    "minCellRatioComfort",
    "maxCellRatioComfort",
    "minCellRatioAbsolute",
    "maxCellRatioAbsolute",
  ].some(key => constraints[key] !== undefined);
  const enforceUsableCellAbsoluteMinimum = Boolean(
    constraints.enforceUsableCellAbsoluteMinimum,
  );
  const estimatedColumnGap = Math.max(0, Number(constraints.estimatedColumnGap) || 0);
  const estimatedRowGap = Math.max(0, Number(constraints.estimatedRowGap) || 0);
  const estimatedPaddingX = Math.max(0, Number(constraints.estimatedPaddingX) || 0);
  const estimatedPaddingY = Math.max(0, Number(constraints.estimatedPaddingY) || 0);
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
    minCellWidthAbsolute,
    minCellHeightAbsolute,
    minCellWidthComfort,
    minCellHeightComfort,
    idealCellWidth,
    idealCellHeight,
    idealCellRatio,
    minCellRatioComfort,
    maxCellRatioComfort,
    minCellRatioAbsolute,
    maxCellRatioAbsolute,
    idealPenaltyFactor,
    comfortPenaltyFactor,
    ratioPenaltyFactor,
    densityPenaltyFactor,
    usesResponsiveComfortScoring,
    enforceUsableCellAbsoluteMinimum,
    estimatedColumnGap,
    estimatedRowGap,
    estimatedPaddingX,
    estimatedPaddingY,
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
      estimatedColumnGap,
      estimatedRowGap,
      estimatedPaddingX,
      estimatedPaddingY,
      minCellWidthAbsolute,
      minCellHeightAbsolute,
      minCellWidthComfort,
      minCellHeightComfort,
      idealCellWidth,
      idealCellHeight,
      idealCellRatio,
      minCellRatioComfort,
      maxCellRatioComfort,
      minCellRatioAbsolute,
      maxCellRatioAbsolute,
      idealPenaltyFactor,
      comfortPenaltyFactor,
      ratioPenaltyFactor,
      densityPenaltyFactor,
      usesResponsiveComfortScoring,
      enforceUsableCellAbsoluteMinimum,
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
      axisGap: estimatedColumnGap,
      axisPadding: estimatedPaddingX,
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
      axisGap: estimatedRowGap,
      axisPadding: estimatedPaddingY,
    }),
  };
}
