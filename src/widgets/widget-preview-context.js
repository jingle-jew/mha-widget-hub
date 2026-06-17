const freezeSize = (size = {}) => Object.freeze({
  w: Number(size.w) || 2,
  h: Number(size.h) || 2,
});

const PREVIEW_HASS_STATES = Object.freeze({
  "weather.home": Object.freeze({
    entity_id: "weather.home",
    state: "partlycloudy",
    attributes: Object.freeze({
      friendly_name: "Maison",
      temperature: 22,
      humidity: 54,
      wind_speed: 12,
      forecast: Object.freeze([
        Object.freeze({ datetime: "2026-06-17", temperature: 22, condition: "partlycloudy" }),
        Object.freeze({ datetime: "2026-06-18", temperature: 21, condition: "sunny" }),
        Object.freeze({ datetime: "2026-06-19", temperature: 20, condition: "cloudy" }),
      ]),
    }),
  }),
  "light.preview": Object.freeze({
    entity_id: "light.preview",
    state: "on",
    attributes: Object.freeze({
      friendly_name: "Salon",
      brightness: 174,
      supported_color_modes: Object.freeze(["brightness", "color_temp"]),
    }),
  }),
  "switch.preview": Object.freeze({
    entity_id: "switch.preview",
    state: "on",
    attributes: Object.freeze({ friendly_name: "Prise" }),
  }),
  "media_player.preview": Object.freeze({
    entity_id: "media_player.preview",
    state: "playing",
    attributes: Object.freeze({
      friendly_name: "Salon",
      media_title: "Now Playing",
      media_artist: "MHA Preview",
      volume_level: 0.68,
    }),
  }),
});

export function createPreviewHassMock(overrides = {}) {
  return Object.freeze({
    states: PREVIEW_HASS_STATES,
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
