export const FRONTEND_SOURCES = Object.freeze([
  ["mha-widget-hub-loader.js", "mha-widget-hub-loader.js"],
  ["mha-admin-loader.js", "mha-admin-loader.js"],
  ["mha-diagnostics-loader.js", "mha-diagnostics-loader.js"],
  ["mha-widget-hub.js", "mha-widget-hub.js"],
  ["src", "src"],
  ["styles", "styles"],
  ["assets", "assets"],
]);

export const INTEGRATION_FRONTEND = "custom_components/mha_widget_hub/frontend";
export const INTEGRATION_SOURCE = "custom_components/mha_widget_hub";
export const REQUIRED_FRONTEND_FILES = Object.freeze([
  "mha-widget-hub.js",
  "mha-widget-hub-loader.js",
  "mha-admin-loader.js",
  "mha-diagnostics-loader.js",
]);
export const REQUIRED_FRONTEND_DIRECTORIES = Object.freeze([
  "src",
  "styles",
  "assets",
]);
export const REQUIRED_INTEGRATION_FILES = Object.freeze([
  "__init__.py",
  "config_flow.py",
  "const.py",
  "manifest.json",
]);
export const REQUIRED_INTEGRATION_DIRECTORIES = Object.freeze([
  "brand",
  "translations",
]);
