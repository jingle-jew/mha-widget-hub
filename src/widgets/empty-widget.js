// Compatibility export for integrations still importing the former module.
export { createWidgetShell as createEmptyWidget } from "./widget-shell.js";

export const EMPTY_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: () => null,
});

export const WIDGET_MODULE = Object.freeze({
  kind: "empty",
  renderer: EMPTY_WIDGET_CONTENT_RENDERER,
});
