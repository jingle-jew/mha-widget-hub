import { SIMPLE_BUTTON_WIDGET_CONFIG_MANIFEST } from "../widgets/simple-button-widget.js";
import { SLIDER_WIDGET_CONFIG_MANIFEST } from "../widgets/slider-widget.js";
import { TOGGLE_SLIDER_WIDGET_CONFIG_MANIFEST } from "../widgets/toggle-slider-widget.js";
import { TOGGLE_WIDGET_CONFIG_MANIFEST } from "../widgets/toggle-widget.js";
import { WEATHER_WIDGET_CONFIG_MANIFEST } from "../widgets/weather-widget.js";
import { getWidgetDefinition } from "../widgets/widget-registry.js";

const CONFIG_MANIFESTS = Object.freeze([
  SIMPLE_BUTTON_WIDGET_CONFIG_MANIFEST,
  SLIDER_WIDGET_CONFIG_MANIFEST,
  TOGGLE_SLIDER_WIDGET_CONFIG_MANIFEST,
  TOGGLE_WIDGET_CONFIG_MANIFEST,
  WEATHER_WIDGET_CONFIG_MANIFEST,
]);

export const WIDGET_CONFIG_REGISTRY = Object.freeze(
  Object.fromEntries(
    CONFIG_MANIFESTS.map((manifest) => [
      manifest.type,
      Object.freeze({ ...manifest }),
    ]),
  ),
);

export function getWidgetConfigDefinition(configType = "") {
  return WIDGET_CONFIG_REGISTRY[configType] || null;
}

export function getWidgetConfigType(widget = {}) {
  return getWidgetDefinition(widget)?.config || "";
}

export function getWidgetConfigDefinitionForWidget(widget = {}) {
  return getWidgetConfigDefinition(getWidgetConfigType(widget));
}
