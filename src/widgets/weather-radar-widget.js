import { buildWeatherRadarModel } from "../ha/weather-radar.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";

export function isWeatherRadarWidget(widget = {}) {
  return isLocalWidgetKind(widget, "weather-radar", ["weather-radar-widget"]);
}

function createRadarHeader() {
  const header = document.createElement("div");
  header.className = "mha-weather-radar-header";

  const icon = createIconSymbol({
    name: "wind",
    className: "mha-weather-radar-header-icon",
  });
  const title = document.createElement("span");
  title.className = "mha-weather-radar-title";
  title.textContent = t("weatherPage.radar.title", "Radar map");
  header.append(icon, title);
  return header;
}

export function createWeatherRadarWidgetContent(widget = {}, {
  hass,
  preview = false,
} = {}) {
  const root = document.createElement("div");
  root.className = "mha-weather-radar";
  root.dataset.widgetComponent = "weather-radar";
  if (preview) root.dataset.preview = "true";

  const viewport = document.createElement("div");
  viewport.className = "mha-weather-radar-viewport";

  const image = document.createElement("img");
  image.className = "mha-weather-radar-image";
  image.alt = t("weatherPage.radar.imageAlt", "Weather radar map");
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;

  const fallback = document.createElement("div");
  fallback.className = "mha-weather-radar-fallback";
  fallback.append(
    createIconSymbol({ name: "image", className: "mha-weather-radar-fallback-icon" }),
  );
  const fallbackText = document.createElement("span");
  fallbackText.textContent = t("weatherPage.radar.unavailable", "Radar image unavailable");
  fallback.append(fallbackText);

  image.addEventListener("load", () => {
    viewport.dataset.imageState = "ready";
  });
  image.addEventListener("error", () => {
    viewport.dataset.imageState = "unavailable";
  });
  viewport.append(image, fallback);
  root.append(createRadarHeader(), viewport);

  let currentImageUrl = "";

  function applyModel(nextHass) {
    const model = buildWeatherRadarModel(nextHass, widget);
    root.dataset.entityId = model.entityId;
    if (model.imageUrl) {
      if (model.imageUrl === currentImageUrl) return;
      currentImageUrl = model.imageUrl;
      viewport.dataset.imageState = "loading";
      image.src = model.imageUrl;
      return;
    }
    currentImageUrl = "";
    image.removeAttribute("src");
    viewport.dataset.imageState = preview ? "preview" : "unavailable";
  }

  root.__mhaUpdateFromHass = nextHass => applyModel(nextHass);
  root.__mhaDestroy = () => {
    delete root.__mhaUpdateFromHass;
    delete root.__mhaDestroy;
  };
  applyModel(hass);
  return root;
}

export const WEATHER_RADAR_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, preview }) => createWeatherRadarWidgetContent(widget, {
    hass,
    preview,
  }),
});

export const WEATHER_RADAR_WIDGET_DEFINITION = Object.freeze({
  component: "weather-radar-widget",
  category: "climate",
  manager: Object.freeze({
    hidden: true,
    entries: Object.freeze([]),
  }),
  renderer: "weather-radar",
  css: css("styles/widgets/weather-radar-widget.css"),
  preview: "weather",
  aliases: ["weather-radar-widget"],
  variantAliases: ["weather-radar"],
  defaultVariant: "weather-radar",
  defaultSize: freezeSize(4, 3),
  normalizeSize: () => ({ w: 4, h: 3 }),
  capabilities: Object.freeze({
    configurable: false,
    resizable: false,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: String(widget.entityId || widget.entity_id || ""),
    }),
  }),
  shell: Object.freeze({ configureMode: "variant" }),
  placementFlow: "direct",
  variants: [variant("weather-radar", "Weather radar 4×3", 4, 3)],
});

export const WIDGET_MODULE = Object.freeze({
  kind: "weather-radar",
  definition: WEATHER_RADAR_WIDGET_DEFINITION,
  renderer: WEATHER_RADAR_WIDGET_CONTENT_RENDERER,
  preview: Object.freeze({ mode: "live" }),
});
