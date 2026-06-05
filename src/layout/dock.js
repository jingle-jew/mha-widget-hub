/*
 * Empty dock container.
 *
 * The dock is visible and intentionally contains no children yet.
 */

export function createDock() {
  const dock = document.createElement("nav");
  dock.className = "mha-dock";
  dock.setAttribute("aria-label", "Dock vide");
  return dock;
}
