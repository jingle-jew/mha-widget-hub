import { WIDGET_MODULES } from "../widgets/widget-module-registry.js";
import { getWidgetConfigType as resolveWidgetConfigType } from "../widgets/widget-registry.js";

const CONFIG_MANIFESTS = Object.freeze(
  WIDGET_MODULES
    .map((module) => module?.config)
    .filter(Boolean),
);

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
  return resolveWidgetConfigType(widget);
}

export function getWidgetConfigDefinitionForWidget(widget = {}) {
  return getWidgetConfigDefinition(getWidgetConfigType(widget));
}
