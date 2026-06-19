export const PANEL_SURFACE_ROLES = Object.freeze({
  PANEL: "panel",
  POPUP: "popup",
  SUBPANEL: "subpanel",
});

export const PANEL_MOBILE_PRESENTATIONS = Object.freeze({
  SHEET: "sheet",
});

export function applyPanelSurfaceContract(panel, {
  surfaceRole = PANEL_SURFACE_ROLES.POPUP,
  mobilePresentation = PANEL_MOBILE_PRESENTATIONS.SHEET,
} = {}) {
  if (!panel) return panel;
  panel.dataset.surfaceRole = surfaceRole;
  panel.dataset.mobilePresentation = mobilePresentation;

  const sheet = panel.querySelector?.("[role='dialog']");
  if (sheet?.dataset) {
    sheet.dataset.surfaceRole = surfaceRole;
    sheet.dataset.mobilePresentation = mobilePresentation;
  }
  return panel;
}
