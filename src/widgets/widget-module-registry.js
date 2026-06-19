import { WIDGET_MODULE as buttonWidgetModule } from "./simple-button-widget.js";
import { WIDGET_MODULE as clockWidgetModule } from "./clock-widget.js";
import { WIDGET_MODULE as mediaWidgetModule } from "./media-widget.js";
import { WIDGET_MODULE as scenesWidgetModule } from "./scenes-widget.js";
import { WIDGET_MODULE as sliderWidgetModule } from "./slider-widget.js";
import { WIDGET_MODULE as toggleButtonsWidgetModule } from "./toggle-buttons-widget.js";
import { WIDGET_MODULE as toggleSliderWidgetModule } from "./toggle-slider-widget.js";
import { WIDGET_MODULE as toggleWidgetModule } from "./toggle-widget.js";
import { WIDGET_MODULE as weatherWidgetModule } from "./weather-widget.js";
import { css, freezeSize } from "./widget-definition-utils.js";

const EMPTY_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: () => null,
});

const EMPTY_WIDGET_DEFINITION = Object.freeze({
  component: "empty-widget",
  category: "custom",
  manager: Object.freeze({
    hidden: true,
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "light-toggle", label: "Light tile", size: freezeSize(2, 2), description: "Simple control.", order: 30 }),
      Object.freeze({ category: "climate", variant: "climate-compact", label: "Compact climate", size: freezeSize(2, 2), description: "Quick temperature.", order: 50 }),
      Object.freeze({ category: "climate", variant: "climate-wide", label: "Wide climate", size: freezeSize(4, 2), description: "Temperature + mode.", order: 60 }),
      Object.freeze({ category: "media", variant: "media-compact", label: "Compact media", size: freezeSize(2, 2), description: "Quick playback.", order: 10 }),
      Object.freeze({ category: "media", variant: "media-wide", label: "Wide media", size: freezeSize(4, 2), description: "Now playing.", order: 20 }),
      Object.freeze({ category: "security", variant: "security-state", label: "Security state", size: freezeSize(2, 2), description: "Quick status.", order: 10 }),
      Object.freeze({ category: "security", variant: "security-wide", label: "Security large", size: freezeSize(4, 2), description: "Primary controls.", order: 20 }),
      Object.freeze({ category: "system", variant: "system-compact", label: "Compact system", size: freezeSize(2, 2), description: "System state.", order: 10 }),
      Object.freeze({ category: "system", variant: "system-wide", label: "Wide system", size: freezeSize(4, 2), description: "Detailed info.", order: 20 }),
      Object.freeze({ category: "system", variant: "system-panel", label: "System panel", size: freezeSize(4, 3), description: "Large panel.", order: 30 }),
    ]),
  }),
  renderer: "empty",
  css: css(),
  preview: "status",
  aliases: ["empty-widget"],
  variantAliases: [],
  defaultSize: freezeSize(2, 2),
  capabilities: Object.freeze({
    configurable: false,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({}),
  shell: Object.freeze({
    configureMode: "variant",
  }),
  placementFlow: "direct",
});

const EMPTY_WIDGET_MODULE = Object.freeze({
  kind: "empty",
  definition: EMPTY_WIDGET_DEFINITION,
  renderer: EMPTY_WIDGET_CONTENT_RENDERER,
});

export const WIDGET_MODULES = Object.freeze([
  EMPTY_WIDGET_MODULE,
  clockWidgetModule,
  buttonWidgetModule,
  scenesWidgetModule,
  sliderWidgetModule,
  toggleWidgetModule,
  toggleSliderWidgetModule,
  toggleButtonsWidgetModule,
  weatherWidgetModule,
  mediaWidgetModule,
]);

export function getWidgetModules() {
  return WIDGET_MODULES;
}
