export const STATUS_BAR_MODES = Object.freeze({
  PILL: "pill",
  TOP_BAR: "top-bar",
  HIDDEN: "hidden",
});

const STATUS_BAR_MODE_VALUES = new Set(Object.values(STATUS_BAR_MODES));

export function normalizeStatusBarMode(value = STATUS_BAR_MODES.PILL) {
  return STATUS_BAR_MODE_VALUES.has(value) ? value : STATUS_BAR_MODES.PILL;
}

export function resolveResponsiveStatusBarMode(
  value = STATUS_BAR_MODES.TOP_BAR,
  {
    hasPersistedStatusBarMode = false,
    layout = "desktop",
    isDesktopEnvironment = false,
  } = {},
) {
  const normalized = normalizeStatusBarMode(value || STATUS_BAR_MODES.TOP_BAR);
  if (
    !hasPersistedStatusBarMode
    && isDesktopEnvironment
    && layout !== "mobile"
    && normalized === STATUS_BAR_MODES.TOP_BAR
  ) {
    return STATUS_BAR_MODES.HIDDEN;
  }
  return normalized;
}
