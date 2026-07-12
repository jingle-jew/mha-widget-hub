import { WIDGET_MODULE as emptyWidgetModule } from "./empty-widget.js";
import { WIDGET_MODULE as buttonWidgetModule } from "./simple-button-widget.js";
import { WIDGET_MODULE as clockWidgetModule } from "./clock-widget.js";
import { WIDGET_MODULE as mediaWidgetModule } from "./media-widget.js";
import { WIDGET_MODULE as scenesWidgetModule } from "./scenes-widget.js";
import { WIDGET_MODULE as sliderWidgetModule } from "./slider-widget.js";
import { WIDGET_MODULE as toggleButtonsWidgetModule } from "./toggle-buttons-widget.js";
import { WIDGET_MODULE as toggleSliderWidgetModule } from "./toggle-slider-widget.js";
import { WIDGET_MODULE as toggleWidgetModule } from "./toggle-widget.js";
import { WIDGET_MODULE as weatherWidgetModule } from "./weather-widget.js";
import { WIDGET_MODULE as weatherNarrativeWidgetModule } from "./weather-narrative-widget.js";
import { WIDGET_MODULE as weatherMetricWidgetModule } from "./weather-metric-widget.js";

export const WIDGET_MODULES = Object.freeze([
  emptyWidgetModule,
  clockWidgetModule,
  buttonWidgetModule,
  scenesWidgetModule,
  sliderWidgetModule,
  toggleWidgetModule,
  toggleSliderWidgetModule,
  toggleButtonsWidgetModule,
  weatherWidgetModule,
  weatherNarrativeWidgetModule,
  weatherMetricWidgetModule,
  mediaWidgetModule,
]);

export function getWidgetModules() {
  return WIDGET_MODULES;
}
