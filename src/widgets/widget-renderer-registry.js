import { CLOCK_WIDGET_CONTENT_RENDERER } from "./clock-widget.js";
import { SIMPLE_BUTTON_WIDGET_CONTENT_RENDERER } from "./simple-button-widget.js";
import { SLIDER_WIDGET_CONTENT_RENDERER } from "./slider-widget.js";
import { TOGGLE_BUTTONS_WIDGET_CONTENT_RENDERER } from "./toggle-buttons-widget.js";
import { TOGGLE_SLIDER_WIDGET_CONTENT_RENDERER } from "./toggle-slider-widget.js";
import { TOGGLE_WIDGET_CONTENT_RENDERER } from "./toggle-widget.js";
import { WEATHER_WIDGET_CONTENT_RENDERER } from "./weather-widget.js";

const EMPTY_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: () => null,
});

const WIDGET_RENDERER_MANIFEST = Object.freeze({
  empty: EMPTY_WIDGET_CONTENT_RENDERER,
  clock: CLOCK_WIDGET_CONTENT_RENDERER,
  button: SIMPLE_BUTTON_WIDGET_CONTENT_RENDERER,
  slider: SLIDER_WIDGET_CONTENT_RENDERER,
  toggle: TOGGLE_WIDGET_CONTENT_RENDERER,
  "toggle-slider": TOGGLE_SLIDER_WIDGET_CONTENT_RENDERER,
  "toggle-buttons": TOGGLE_BUTTONS_WIDGET_CONTENT_RENDERER,
  weather: WEATHER_WIDGET_CONTENT_RENDERER,
});

export const WIDGET_CONTENT_RENDERERS = Object.freeze({
  ...WIDGET_RENDERER_MANIFEST,
});

export function getWidgetContentRenderers() {
  return WIDGET_CONTENT_RENDERERS;
}
