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
      }),
      widthBands: Object.freeze([
        Object.freeze({
          min: 0,
          max: 1199,
          preferredColumns: 10,
          minColumns: 10,
          maxColumns: 10,
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
          max: 759,
          preferredRows: 6,
          minRows: 6,
          maxRows: 6,
        }),
        Object.freeze({
          min: 760,
          max: Number.POSITIVE_INFINITY,
          preferredRows: 8,
          minRows: 6,
          maxRows: 8,
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
        targetCell: 62,
        maxCell: 90,
        preferredColumns: 14,
        preferredRows: 8,
        minColumns: 12,
        maxColumns: 14,
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
          preferredColumns: 14,
          minColumns: 14,
          maxColumns: 14,
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
  const widthBand = width > 0 ? resolveBand(width, profile.widthBands) : null;
  const heightBand = height > 0 ? resolveBand(height, profile.heightBands) : null;

  return {
    ...defaults,
    ...(widthBand || {}),
    ...(heightBand || {}),
  };
}
