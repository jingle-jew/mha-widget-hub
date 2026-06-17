import { WIDGET_MODULE as buttonWidgetModule } from "./simple-button-widget.js";
import { WIDGET_MODULE as clockWidgetModule } from "./clock-widget.js";
import { WIDGET_MODULE as mediaWidgetModule } from "./media-widget.js";
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
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "light-toggle", label: "Tuile lumière", size: freezeSize(2, 2), description: "Contrôle simple.", order: 30 }),
      Object.freeze({ category: "climate", variant: "climate-compact", label: "Climat compact", size: freezeSize(2, 2), description: "Température rapide.", order: 50 }),
      Object.freeze({ category: "climate", variant: "climate-wide", label: "Climat large", size: freezeSize(4, 2), description: "Température + mode.", order: 60 }),
      Object.freeze({ category: "media", variant: "media-compact", label: "Média compact", size: freezeSize(2, 2), description: "Lecture rapide.", order: 10 }),
      Object.freeze({ category: "media", variant: "media-wide", label: "Média large", size: freezeSize(4, 2), description: "Now playing.", order: 20 }),
      Object.freeze({ category: "security", variant: "security-state", label: "État sécurité", size: freezeSize(2, 2), description: "Statut rapide.", order: 10 }),
      Object.freeze({ category: "security", variant: "security-wide", label: "Sécurité large", size: freezeSize(4, 2), description: "Contrôles principaux.", order: 20 }),
      Object.freeze({ category: "system", variant: "system-compact", label: "Système compact", size: freezeSize(2, 2), description: "État système.", order: 10 }),
      Object.freeze({ category: "system", variant: "system-wide", label: "Système large", size: freezeSize(4, 2), description: "Infos détaillées.", order: 20 }),
      Object.freeze({ category: "system", variant: "system-panel", label: "Panneau système", size: freezeSize(4, 3), description: "Grand panneau.", order: 30 }),
    ]),
  }),
  renderer: "empty",
  css: css(),
  preview: "status",
  aliases: ["empty-widget"],
  variantAliases: [],
  defaultSize: freezeSize(2, 2),
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
