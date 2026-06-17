import { PREVIEW_HASS_STATES, WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";

const freezeSize = (size = {}) => Object.freeze({
  w: Number(size.w) || 2,
  h: Number(size.h) || 2,
});

export function createPreviewHassMock(overrides = {}) {
  return Object.freeze({
    states: PREVIEW_HASS_STATES,
    previewData: WIDGET_PREVIEW_DATA,
    user: Object.freeze({ name: "Preview" }),
    connection: Object.freeze({
      subscribeEvents: () => () => undefined,
    }),
    localize: (key) => key,
    callService: () => undefined,
    callWS: async () => [],
    ...overrides,
  });
}

export function createWidgetRenderContext(context = {}) {
  const preview = Boolean(context.preview);
  const size = freezeSize(context.size || { w: context.widgetW, h: context.widgetH });

  return {
    ...context,
    preview,
    interactive: context.interactive ?? !preview,
    hass: context.hass || (preview ? createPreviewHassMock() : undefined),
    size,
    widgetW: context.widgetW ?? size.w,
    widgetH: context.widgetH ?? size.h,
  };
}

export function createWidgetPreviewRenderContext(item = {}, context = {}) {
  const size = freezeSize(item.size || { w: item.w, h: item.h });
  return createWidgetRenderContext({
    ...context,
    preview: true,
    interactive: false,
    hass: context.hass || createPreviewHassMock(),
    size,
    widgetW: size.w,
    widgetH: size.h,
  });
}
