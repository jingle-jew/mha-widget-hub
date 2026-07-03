export const STATUS_BAR_MODES = Object.freeze({
  PILL: "pill",
  TOP_BAR: "top-bar",
  HIDDEN: "hidden",
});

const STATUS_BAR_MODE_VALUES = new Set(Object.values(STATUS_BAR_MODES));

export function normalizeStatusBarMode(value = STATUS_BAR_MODES.PILL) {
  return STATUS_BAR_MODE_VALUES.has(value) ? value : STATUS_BAR_MODES.PILL;
}
