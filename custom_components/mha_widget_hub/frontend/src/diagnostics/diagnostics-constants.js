export const ROOT_URL = new URL("../../", import.meta.url);
export const FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");

export const DIAGNOSTICS_PANEL_ID = "diagnostics";
export const DIAGNOSTICS_ELEMENT = "mha-diagnostics-panel";
export const DIAGNOSTICS_TITLE = "MHA Insights";

export const STYLES = Object.freeze([
  "styles/core/tokens.css",
  "styles/themes/ios.css",
  "styles/themes/oneui.css",
  "styles/themes/material.css",
  "styles/themes/accent-palettes.css",
  "styles/themes/semantic-tokens.css",
  "styles/extensions/extension-panel-shell.css",
  "styles/extensions/extension-panel-appearance-control.css",
  "styles/diagnostics/diagnostics-panel.css",
]);

export function assetUrl(path = "") {
  const url = new URL(path, ROOT_URL);
  if (FRONTEND_VERSION) url.searchParams.set("v", FRONTEND_VERSION);
  return url.href;
}
