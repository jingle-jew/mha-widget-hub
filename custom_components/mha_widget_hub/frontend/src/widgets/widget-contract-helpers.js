export const STATIC_PREVIEW_RENDERER = Object.freeze({ mode: "static" });
export const DEFAULT_CAPABILITIES = Object.freeze({
  configurable: false,
  resizable: true,
  slotConfigurable: false,
  weatherEntityConfigurable: false,
});
export const DEFAULT_SHELL = Object.freeze({
  configureMode: "variant",
});
export const DEFAULT_STORAGE = Object.freeze({});
export const DEFAULT_WIDGET_SIZE = Object.freeze({ w: 2, h: 2 });

export function normalizePreviewRenderer(module = {}, staticPreviewRenderer = STATIC_PREVIEW_RENDERER) {
  const previewRenderer = module.preview || staticPreviewRenderer;
  return Object.freeze({
    mode: previewRenderer.mode || "static",
    createWidget: previewRenderer.createWidget,
    render: previewRenderer.render,
  });
}

export function normalizeCapabilities(definition = {}, defaultCapabilities = DEFAULT_CAPABILITIES) {
  return Object.freeze({
    ...defaultCapabilities,
    configurable: Boolean(definition.config),
    ...definition.capabilities,
  });
}

export function normalizeShellBehavior(definition = {}, defaultShell = DEFAULT_SHELL) {
  return Object.freeze({
    ...defaultShell,
    configureMode: definition.config ? "config" : "variant",
    ...definition.shell,
  });
}

export function normalizeStorage(definition = {}, defaultStorage = DEFAULT_STORAGE) {
  return Object.freeze({
    ...defaultStorage,
    ...(definition.storage || {}),
  });
}

export function resolveContractValue(value, widget, definition) {
  return typeof value === "function" ? value(widget, definition) : value;
}

export function buildWidgetCreationDefaults(
  widget = {},
  {
    definition,
    kind,
    defaultWidgetSize = DEFAULT_WIDGET_SIZE,
  } = {},
) {
  return Object.freeze({
    kind,
    component: definition?.component || "empty-widget",
    category: definition?.category || "custom",
    defaultVariant: definition?.defaultVariant || kind,
    defaultSize: definition?.defaultSize || defaultWidgetSize,
  });
}

export function normalizeRegisteredWidgetSizeWithDefinition(
  widget = {},
  normalizeWidgetSize,
  {
    definition,
    defaults,
  } = {},
) {
  const rawSize = {
    ...defaults.defaultSize,
    w: widget.w ?? defaults.defaultSize.w,
    h: widget.h ?? defaults.defaultSize.h,
  };
  const size = normalizeWidgetSize(rawSize);
  return definition?.normalizeSize ? definition.normalizeSize(size) : size;
}
