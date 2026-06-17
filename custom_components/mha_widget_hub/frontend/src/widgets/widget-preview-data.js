const freeze = (value) => Object.freeze(value);

export const WIDGET_PREVIEW_DATA = freeze({
  clock: freeze({
    time: "12:45",
    date: "Mer. 17 juin",
    weather: "22° · Part. nuageux",
  }),
  weather: freeze({
    entityId: "weather.home",
    name: "Maison",
    state: "partlycloudy",
    condition: "Partiellement nuageux",
    temperature: 22,
    humidity: 54,
    windSpeed: 12,
    forecast: freeze([
      freeze({ datetime: "2026-06-17", day: "Mer", temperature: 22, condition: "partlycloudy" }),
      freeze({ datetime: "2026-06-18", day: "Jeu", temperature: 21, condition: "sunny" }),
      freeze({ datetime: "2026-06-19", day: "Ven", temperature: 20, condition: "cloudy" }),
    ]),
  }),
  media: freeze({
    entityId: "media_player.preview",
    name: "Salon",
    state: "playing",
    title: "Now Playing",
    artist: "MHA Preview",
    volume: 0.68,
  }),
  toggle: freeze({
    entityId: "switch.preview",
    name: "Prise",
    state: "on",
  }),
  light: freeze({
    entityId: "light.preview",
    name: "Salon",
    state: "on",
    brightness: 174,
    brightnessPercent: 68,
    supportedColorModes: freeze(["brightness", "color_temp"]),
  }),
  slider: freeze({
    value: 68,
    min: 0,
    max: 100,
    unit: "%",
  }),
});

export const PREVIEW_HASS_STATES = freeze({
  [WIDGET_PREVIEW_DATA.weather.entityId]: freeze({
    entity_id: WIDGET_PREVIEW_DATA.weather.entityId,
    state: WIDGET_PREVIEW_DATA.weather.state,
    attributes: freeze({
      friendly_name: WIDGET_PREVIEW_DATA.weather.name,
      temperature: WIDGET_PREVIEW_DATA.weather.temperature,
      humidity: WIDGET_PREVIEW_DATA.weather.humidity,
      wind_speed: WIDGET_PREVIEW_DATA.weather.windSpeed,
      forecast: WIDGET_PREVIEW_DATA.weather.forecast,
    }),
  }),
  [WIDGET_PREVIEW_DATA.light.entityId]: freeze({
    entity_id: WIDGET_PREVIEW_DATA.light.entityId,
    state: WIDGET_PREVIEW_DATA.light.state,
    attributes: freeze({
      friendly_name: WIDGET_PREVIEW_DATA.light.name,
      brightness: WIDGET_PREVIEW_DATA.light.brightness,
      supported_color_modes: WIDGET_PREVIEW_DATA.light.supportedColorModes,
    }),
  }),
  [WIDGET_PREVIEW_DATA.toggle.entityId]: freeze({
    entity_id: WIDGET_PREVIEW_DATA.toggle.entityId,
    state: WIDGET_PREVIEW_DATA.toggle.state,
    attributes: freeze({ friendly_name: WIDGET_PREVIEW_DATA.toggle.name }),
  }),
  [WIDGET_PREVIEW_DATA.media.entityId]: freeze({
    entity_id: WIDGET_PREVIEW_DATA.media.entityId,
    state: WIDGET_PREVIEW_DATA.media.state,
    attributes: freeze({
      friendly_name: WIDGET_PREVIEW_DATA.media.name,
      media_title: WIDGET_PREVIEW_DATA.media.title,
      media_artist: WIDGET_PREVIEW_DATA.media.artist,
      volume_level: WIDGET_PREVIEW_DATA.media.volume,
    }),
  }),
});

export function getWidgetPreviewData(kind = "") {
  return WIDGET_PREVIEW_DATA[kind] || null;
}
