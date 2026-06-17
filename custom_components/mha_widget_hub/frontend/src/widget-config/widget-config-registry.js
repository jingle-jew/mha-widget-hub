import {
  buildToggleSliderWidgetConfig,
  createToggleSliderConfigDraft,
} from "./toggle-slider-config.js";
import {
  buildSliderWidgetConfig,
  createSliderConfigDraft,
} from "./slider-config.js";
import {
  buildToggleWidgetConfig,
  createToggleConfigDraft,
} from "./toggle-config.js";
import { getWidgetDefinition } from "../widgets/widget-registry.js";

export const WIDGET_CONFIG_REGISTRY = Object.freeze({
  slider: Object.freeze({
    type: "slider",
    title: "Configurer le slider",
    hint: "Choisis l’action, l’appareil et le nom à afficher.",
    createDraft: createSliderConfigDraft,
    build: buildSliderWidgetConfig,
  }),
  toggle: Object.freeze({
    type: "toggle",
    title: "Configurer le toggle",
    hint: "Choisis le type d’appareil, l’entité et le nom à afficher.",
    createDraft: createToggleConfigDraft,
    build: buildToggleWidgetConfig,
  }),
  "toggle-slider": Object.freeze({
    type: "toggle-slider",
    title: "Configurer la lumière",
    hint: "Choisis la lumière et le contrôle à afficher.",
    createDraft: createToggleSliderConfigDraft,
    build: buildToggleSliderWidgetConfig,
  }),
});

export function getWidgetConfigDefinition(configType = "") {
  return WIDGET_CONFIG_REGISTRY[configType] || null;
}

export function getWidgetConfigType(widget = {}) {
  return getWidgetDefinition(widget)?.config || "";
}

export function getWidgetConfigDefinitionForWidget(widget = {}) {
  return getWidgetConfigDefinition(getWidgetConfigType(widget));
}
