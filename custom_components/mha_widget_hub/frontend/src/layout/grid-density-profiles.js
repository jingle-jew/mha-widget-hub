function normalizeGridOrientation(orientation = "landscape") {
  return orientation === "portrait" ? "portrait" : "landscape";
}

function matchesBand(value, band = {}) {
  const min = Number.isFinite(band.min) ? band.min : 0;
  const max = Number.isFinite(band.max) ? band.max : Number.POSITIVE_INFINITY;
  return value >= min && value <= max;
}

function resolveBand(value, bands = []) {
  return bands.find(band => matchesBand(value, band)) || null;
}

function normalizeDockPosition(dockPosition = "") {
  return ["left", "right", "bottom"].includes(dockPosition)
    ? dockPosition
    : "";
}

function isSideDockPosition(dockPosition = "") {
  const normalizedDockPosition = normalizeDockPosition(dockPosition);
  return normalizedDockPosition === "left" || normalizedDockPosition === "right";
}

const TABLET_SIDE_DOCK_LANDSCAPE_OVERRIDES = Object.freeze({
  preferredColumns: 11,
  minColumns: 11,
  maxColumns: 11,
  preferredRows: 8,
  minRows: 8,
  maxRows: 8,
  estimatedColumnGap: 12,
  estimatedRowGap: 12,
  estimatedPaddingX: 14,
  estimatedPaddingY: 14,
});

const TABLET_SIDE_DOCK_LANDSCAPE_WIDTH_BANDS = Object.freeze([
  Object.freeze({
    min: 0,
    max: 899,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    minCellWidthComfort: 70,
    minCellHeightComfort: 70,
    idealCellWidth: 74,
    idealCellHeight: 74,
    idealCellRatio: 1,
    minCellRatioComfort: 0.9,
    maxCellRatioComfort: 1.12,
    minCellRatioAbsolute: 0.8,
    maxCellRatioAbsolute: 1.2,
    idealPenaltyFactor: 0.12,
    comfortPenaltyFactor: 0.15,
    ratioPenaltyFactor: 0.24,
    densityPenaltyFactor: 0.02,
  }),
  Object.freeze({
    min: 900,
    max: 1199,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    minCellWidthComfort: 82,
    minCellHeightComfort: 79,
    idealCellWidth: 90,
    idealCellHeight: 86,
    idealCellRatio: 1,
    minCellRatioComfort: 0.92,
    maxCellRatioComfort: 1.12,
    minCellRatioAbsolute: 0.82,
    maxCellRatioAbsolute: 1.2,
    idealPenaltyFactor: 0.48,
    comfortPenaltyFactor: 0.72,
    ratioPenaltyFactor: 0.35,
    densityPenaltyFactor: 0.6,
  }),
  Object.freeze({
    min: 1200,
    max: 1499,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    minCellWidthComfort: 88,
    minCellHeightComfort: 82,
    idealCellWidth: 96,
    idealCellHeight: 90,
    idealCellRatio: 1,
    minCellRatioComfort: 0.92,
    maxCellRatioComfort: 1.12,
    minCellRatioAbsolute: 0.82,
    maxCellRatioAbsolute: 1.2,
    idealPenaltyFactor: 0.56,
    comfortPenaltyFactor: 0.9,
    ratioPenaltyFactor: 0.4,
    densityPenaltyFactor: 0.78,
  }),
  Object.freeze({
    min: 1500,
    max: Number.POSITIVE_INFINITY,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    minCellWidthComfort: 92,
    minCellHeightComfort: 84,
    idealCellWidth: 100,
    idealCellHeight: 92,
    idealCellRatio: 1,
    minCellRatioComfort: 0.92,
    maxCellRatioComfort: 1.12,
    minCellRatioAbsolute: 0.82,
    maxCellRatioAbsolute: 1.2,
    idealPenaltyFactor: 0.6,
    comfortPenaltyFactor: 0.96,
    ratioPenaltyFactor: 0.42,
    densityPenaltyFactor: 0.84,
  }),
]);

const TABLET_BOTTOM_DOCK_LANDSCAPE_WIDTH_BANDS = Object.freeze([
  Object.freeze({
    min: 900,
    max: 1199,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    estimatedColumnGap: 12,
    estimatedRowGap: 12,
    estimatedPaddingX: 14,
    estimatedPaddingY: 14,
    enforceUsableCellAbsoluteMinimum: true,
  }),
  Object.freeze({
    min: 1200,
    max: 1499,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    estimatedColumnGap: 12,
    estimatedRowGap: 12,
    estimatedPaddingX: 14,
    estimatedPaddingY: 14,
    enforceUsableCellAbsoluteMinimum: true,
  }),
  Object.freeze({
    min: 1500,
    max: Number.POSITIVE_INFINITY,
    minCellWidthAbsolute: 82,
    minCellHeightAbsolute: 82,
    estimatedColumnGap: 12,
    estimatedRowGap: 12,
    estimatedPaddingX: 14,
    estimatedPaddingY: 14,
    enforceUsableCellAbsoluteMinimum: true,
  }),
]);

export const GRID_DENSITY_PROFILES = Object.freeze({
  tablet: Object.freeze({
    landscape: Object.freeze({
      defaults: Object.freeze({
        minCell: 70,
        targetCell: 75,
        maxCell: 80,
        preferredColumns: 10,
        preferredRows: 6,
        minColumns: 10,
        maxColumns: 14,
        minRows: 6,
        maxRows: 8,
        fillX: 0.88,
        fillY: 0.76,
        preferencePenaltyFactor: 0.06,
        unusedSpacePenaltyFactor: 0.9,
      }),
      /*
       * Tablet landscape needs one intermediate band:
       * - side-dock panels around ~880px should stay capped at 10 columns;
       * - wider bottom-dock panels around ~1090px can safely unlock 11.
       *
       * The solver works from the panel frame before runtime track gaps/padding
       * are applied, so this band keeps the 10->11 step aligned with the real
       * shell geometry without opening the 12-column band too early.
       */
      widthBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 899,
          preferredColumns: 10,
          minColumns: 10,
          maxColumns: 10,
        }),
        Object.freeze({
          min: 900,
          max: 1199,
          preferredColumns: 11,
          minColumns: 10,
          maxColumns: 11,
        }),
        Object.freeze({
          min: 1200,
          max: 1499,
          preferredColumns: 12,
          minColumns: 12,
          maxColumns: 12,
        }),
        Object.freeze({
          min: 1500,
          max: Number.POSITIVE_INFINITY,
          preferredColumns: 14,
          minColumns: 12,
          maxColumns: 14,
        }),
      ]),
      heightBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 599,
          preferredRows: 6,
          minRows: 6,
          maxRows: 6,
        }),
        Object.freeze({
          min: 600,
          max: 699,
          preferredRows: 7,
          minRows: 6,
          maxRows: 8,
        }),
        Object.freeze({
          min: 700,
          max: 839,
          preferredRows: 8,
          minRows: 7,
          maxRows: 10,
        }),
        Object.freeze({
          min: 840,
          max: Number.POSITIVE_INFINITY,
          preferredRows: 10,
          minRows: 8,
          maxRows: 12,
        }),
      ]),
    }),
    portrait: Object.freeze({
      defaults: Object.freeze({
        minCell: 52,
        targetCell: 60,
        maxCell: 88,
        preferredColumns: 8,
        preferredRows: 12,
        minColumns: 6,
        maxColumns: 12,
        minRows: 8,
        maxRows: 16,
        fillX: 0.82,
        fillY: 0.88,
        preferencePenaltyFactor: 0.06,
      }),
      widthBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 679,
          preferredColumns: 8,
          minColumns: 8,
          maxColumns: 8,
        }),
        Object.freeze({
          min: 680,
          max: Number.POSITIVE_INFINITY,
          preferredColumns: 10,
          minColumns: 8,
          maxColumns: 10,
        }),
      ]),
      heightBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 859,
          preferredRows: 12,
          minRows: 10,
          maxRows: 12,
        }),
        Object.freeze({
          min: 860,
          max: Number.POSITIVE_INFINITY,
          preferredRows: 14,
          minRows: 12,
          maxRows: 14,
        }),
      ]),
    }),
  }),
  desktop: Object.freeze({
    landscape: Object.freeze({
      defaults: Object.freeze({
        minCell: 52,
        targetCell: 72,
        maxCell: 90,
        preferredColumns: 15,
        preferredRows: 8,
        minColumns: 12,
        maxColumns: 16,
        minRows: 6,
        maxRows: 12,
        fillX: 0.9,
        fillY: 0.72,
        preferencePenaltyFactor: 0.06,
      }),
      widthBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 1499,
          preferredColumns: 14,
          minColumns: 14,
          maxColumns: 14,
        }),
        Object.freeze({
          min: 1500,
          max: Number.POSITIVE_INFINITY,
          preferredColumns: 16,
          minColumns: 14,
          maxColumns: 16,
        }),
      ]),
      heightBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 799,
          preferredRows: 8,
          minRows: 6,
          maxRows: 8,
        }),
        Object.freeze({
          min: 800,
          max: Number.POSITIVE_INFINITY,
          preferredRows: 10,
          minRows: 8,
          maxRows: 10,
        }),
      ]),
    }),
  }),
});

export function getGridDensityProfile(layout, orientation = "landscape") {
  return GRID_DENSITY_PROFILES[layout]?.[normalizeGridOrientation(orientation)] || null;
}

export function resolveGridDensityProfileConstraints(
  layout,
  orientation = "landscape",
  availableContentRect = null,
) {
  const profile = getGridDensityProfile(layout, orientation);
  if (!profile) return null;

  const defaults = profile.defaults || {};
  const width = Math.max(0, Number(availableContentRect?.width) || 0);
  const height = Math.max(0, Number(availableContentRect?.height) || 0);
  const dockPosition = normalizeDockPosition(availableContentRect?.dockPosition || "");
  const widthBand = width > 0 ? resolveBand(width, profile.widthBands) : null;
  const heightBand = height > 0 ? resolveBand(height, profile.heightBands) : null;
  const constraints = {
    ...defaults,
    ...(widthBand || {}),
    ...(heightBand || {}),
  };
  if (layout === "tablet" && normalizeGridOrientation(orientation) === "landscape" && isSideDockPosition(dockPosition)) {
    const sideDockWidthBand = width > 0
      ? resolveBand(width, TABLET_SIDE_DOCK_LANDSCAPE_WIDTH_BANDS)
      : null;
    return {
      ...constraints,
      ...TABLET_SIDE_DOCK_LANDSCAPE_OVERRIDES,
      ...(sideDockWidthBand || {}),
    };
  }
  if (layout === "tablet" && normalizeGridOrientation(orientation) === "landscape" && dockPosition === "bottom") {
    const bottomDockWidthBand = width > 0
      ? resolveBand(width, TABLET_BOTTOM_DOCK_LANDSCAPE_WIDTH_BANDS)
      : null;
    return {
      ...constraints,
      ...(bottomDockWidthBand || {}),
    };
  }
  return constraints;
}
