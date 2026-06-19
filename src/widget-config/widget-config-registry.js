import { WIDGET_MODULES } from "../widgets/widget-module-registry.js";
import {
  buildWidgetDefinitions,
  buildWidgetKindIndex,
  resolveWidgetKindFromIndex,
} from "../widgets/widget-kind-index.js";

const CONFIG_MANIFESTS = Object.freeze(
  WIDGET_MODULES
    .map((module) => module?.config)
    .filter(Boolean),
);
const CONFIG_DEFINITIONS = buildWidgetDefinitions(WIDGET_MODULES);
const CONFIG_KIND_INDEX = buildWidgetKindIndex(CONFIG_DEFINITIONS);

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
  const kind = resolveWidgetKindFromIndex(widget, {
    ...CONFIG_KIND_INDEX,
    fallback: "empty",
  });
  const definition = CONFIG_DEFINITIONS[kind];
  if (!definition) return "";

  const weatherEntityConfigurable = definition.capabilities?.weatherEntityConfigurable;
  const configurable = definition.capabilities?.configurable;
  const resolvedWeatherCapability = typeof weatherEntityConfigurable === "function"
    ? weatherEntityConfigurable(widget, definition)
    : Boolean(weatherEntityConfigurable);
  const resolvedConfigurable = typeof configurable === "function"
    ? configurable(widget, definition)
    : configurable ?? Boolean(definition.config);

  if (resolvedWeatherCapability) return "weather";
  if (!resolvedConfigurable) return "";
  return definition.config || "";
}

export function getWidgetConfigDefinitionForWidget(widget = {}) {
  return getWidgetConfigDefinition(getWidgetConfigType(widget));
}
