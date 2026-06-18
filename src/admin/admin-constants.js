export const ROOT_URL = new URL("../../", import.meta.url);
export const FRONTEND_VERSION = new URL(import.meta.url).searchParams.get("v");

export const STYLES = Object.freeze([
  "styles/core/tokens.css",
  "styles/themes/ios.css",
  "styles/themes/oneui.css",
  "styles/themes/material.css",
  "styles/themes/accent-palettes.css",
  "styles/themes/semantic-tokens.css",
  "styles/admin/admin-panel.css",
]);
