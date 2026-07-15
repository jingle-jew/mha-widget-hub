import { buildWeatherModel, fetchWeatherForecastBundle } from "../ha/weather.js";
import { buildWeatherNarrativeModel } from "../ha/weather-narrative.js";
import { createCurrentWeatherIcon } from "./weather-current-icons.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import {
  buildWeatherWidgetConfig,
  createWeatherConfigDraft,
  renderWeatherConfigFields,
} from "../widget-config/weather-config.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { t } from "../i18n/index.js";

const FORECAST_REFRESH_MS = 10 * 60 * 1000;

export function isWeatherNarrativeWidget(widget = {}) {
  return isLocalWidgetKind(widget, "weather-narrative", ["weather-narrative-widget"]);
}

function createText(className, text = "") {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text == null ? "" : String(text);
  return element;
}

function createNarrativeIcon(event, weather) {
  if (event.kind === "alert") {
    return createIconSymbol({
      name: "warning",
      label: event.headline,
      className: "mha-weather-narrative-icon mha-weather-narrative-icon--alert",
    });
  }
  return createCurrentWeatherIcon(weather.condition || "unknown", {
    label: event.headline || weather.summary || t("weatherPage.current.title", "Current conditions"),
    className: "mha-weather-narrative-icon",
  });
}

function renderWeatherNarrative(root, weather, widget, now = new Date()) {
  const event = buildWeatherNarrativeModel(weather, now);
  root.replaceChildren();
  root.dataset.entityAllowed = String(Boolean(weather.entityAllowed));
  root.dataset.entityAvailable = String(Boolean(weather.entityAvailable));
  root.dataset.weatherNarrativeMood = event.mood || "neutral";
  root.dataset.weatherNarrativeKind = event.kind || "summary";

  const header = document.createElement("section");
  header.className = "mha-weather-narrative-header";
  const copy = document.createElement("div");
  copy.className = "mha-weather-narrative-copy";
  copy.append(
    createText("mha-weather-narrative-temperature", weather.temperature || ""),
    createText("mha-weather-narrative-headline", event.headline),
    createText("mha-weather-narrative-secondary", event.secondary),
  );
  const icon = createNarrativeIcon(event, weather);
  header.append(copy, icon);
  root.append(header);
  void widget;
}

export function createWeatherNarrativeWidgetContent(widget = {}, {
  hass,
  entityVisibilityConfig,
} = {}) {
  const context = {
    hass,
    forecastBundle: null,
    forecastEntityId: "",
    forecastCheckedAt: 0,
    forecastRequestId: 0,
    clock: null,
  };
  const root = document.createElement("div");
  root.className = "mha-weather-narrative-widget";
  root.dataset.widgetComponent = "weather-narrative";
  root.dataset.weatherSize = "4x2";

  const renderCurrent = () => {
    const weather = buildWeatherModel(context.hass, widget, entityVisibilityConfig, context.forecastBundle);
    renderWeatherNarrative(root, weather, widget);
  };

  const hydrateForecasts = nextHass => {
    const weather = buildWeatherModel(nextHass, widget, entityVisibilityConfig, context.forecastBundle);
    if (!weather.entityId || !weather.entityAllowed || !weather.entityAvailable) return;
    const now = Date.now();
    const sameEntity = context.forecastEntityId === weather.entityId;
    if (sameEntity && context.forecastBundle && now - context.forecastCheckedAt < FORECAST_REFRESH_MS) return;
    context.forecastEntityId = weather.entityId;
    context.forecastCheckedAt = now;
    const requestId = ++context.forecastRequestId;
    fetchWeatherForecastBundle(nextHass, weather.entityId).then(bundle => {
      if (requestId !== context.forecastRequestId) return;
      context.forecastBundle = bundle;
      renderCurrent();
    });
  };

  root.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    renderCurrent();
    hydrateForecasts(nextHass);
  };
  root.__mhaDestroy = () => {
    context.forecastRequestId += 1;
    if (context.clock != null) globalThis.clearInterval?.(context.clock);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaDestroy;
  };
  root.__mhaUpdateFromHass(hass);
  if (typeof globalThis.setInterval === "function") {
    context.clock = globalThis.setInterval(renderCurrent, 60 * 1000);
  }
  return root;
}

export const WEATHER_NARRATIVE_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, entityVisibilityConfig }) => createWeatherNarrativeWidgetContent(widget, {
    hass,
    entityVisibilityConfig,
  }),
});

export const WEATHER_NARRATIVE_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "weather-narrative",
  title: "Configure weather brief",
  hint: "Choose the weather entity used for the narrative brief.",
  titleKey: "widgets.weatherNarrative.config.title",
  hintKey: "widgets.weatherNarrative.config.hint",
  createDraft: createWeatherConfigDraft,
  build: buildWeatherWidgetConfig,
  renderFields: renderWeatherConfigFields,
});

export const WEATHER_NARRATIVE_WIDGET_DEFINITION = Object.freeze({
  component: "weather-narrative-widget",
  category: "climate",
  manager: Object.freeze({
    hidden: true,
    entries: Object.freeze([
      Object.freeze({
        category: "climate",
        variant: "weather-narrative",
        label: "Weather brief",
        size: freezeSize(4, 2),
        description: "A contextual weather brief with an adaptive chart.",
        order: 45,
      }),
    ]),
  }),
  renderer: "weather-narrative",
  css: css("styles/widgets/weather-narrative-widget.css"),
  preview: "weather",
  config: "weather-narrative",
  aliases: ["weather-narrative-widget"],
  variantAliases: ["weather-narrative"],
  defaultVariant: "weather-narrative",
  defaultSize: freezeSize(4, 2),
  normalizeSize: () => ({ w: 4, h: 2 }),
  capabilities: Object.freeze({
    configurable: true,
    resizable: false,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: widget.entityId || widget.entity_id || "",
    }),
  }),
  shell: Object.freeze({ configureMode: "config" }),
  placementFlow: "configure-first",
  variants: [variant("weather-narrative", "Weather brief 4×2", 4, 2)],
});

function createWeatherNarrativePreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.weather;
  return {
    ...item,
    kind: "weather-narrative",
    type: "weather-narrative",
    component: WEATHER_NARRATIVE_WIDGET_DEFINITION.component,
    variant: item.variant || WEATHER_NARRATIVE_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "weather-narrative",
  definition: WEATHER_NARRATIVE_WIDGET_DEFINITION,
  renderer: WEATHER_NARRATIVE_WIDGET_CONTENT_RENDERER,
  config: WEATHER_NARRATIVE_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createWeatherNarrativePreviewWidget,
  }),
});
