import { getStoredLayoutMode, normalizeLayoutMode } from "./layout-mode.js";

/*
 * Application-wide responsive contract.
 *
 * CSS mirrors these boundaries:
 * - mobile:  width < 768px
 * - tablet:  768px <= width < 1400px
 * - desktop: width >= 1400px
 *
 * Orientation refines a layout but never changes its identity by itself.
 * The 520px dock rules are local compact-mode adaptations, not app layouts.
 *
 * A stored explicit layout mode is treated as a user preference. "auto" keeps
 * the width-based matrix above.
 */
export const RESPONSIVE_BREAKPOINTS = Object.freeze({
  tablet: 768,
  desktop: 1400,
  compactDock: 520,
});

export function getLayoutForWidth(width = 0, { layoutMode = getStoredLayoutMode() } = {}) {
  const preferredMode = normalizeLayoutMode(layoutMode);
  if (preferredMode !== "auto") return preferredMode;

  const value = Math.max(0, Number(width) || 0);
  if (value >= RESPONSIVE_BREAKPOINTS.desktop) return "desktop";
  if (value >= RESPONSIVE_BREAKPOINTS.tablet) return "tablet";
  return "mobile";
}
