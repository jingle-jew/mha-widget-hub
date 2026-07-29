import { resolveWeatherRadarImageUrl } from "../ha/weather-radar.js";
import { t } from "../i18n/index.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import {
  buildCameraWidgetConfig,
  createCameraConfigDraft,
  renderCameraConfigFields,
} from "../widget-config/camera-config.js";

export const CAMERA_WIDGET_KIND = "camera";

const CAMERA_REFRESH_INTERVALS = Object.freeze([0, 1000, 3000, 5000]);
const DEFAULT_CAMERA_REFRESH_INTERVAL = 5000;

export function createCameraRefreshController({
  refreshInterval = DEFAULT_CAMERA_REFRESH_INTERVAL,
  createImage = () => new Image(),
  setTimeoutRef = globalThis.setTimeout,
  clearTimeoutRef = globalThis.clearTimeout,
  now = Date.now,
  onImageReady = () => {},
  onImageUnavailable = () => {},
} = {}) {
  let sourceUrl = "";
  let refreshTimer = null;
  let refreshSequence = 0;
  let destroyed = false;
  let viewportVisible = false;
  let activityState = "active";
  let refreshPending = false;

  const canRefresh = () => (
    !destroyed
    && viewportVisible
    && activityState !== "hidden"
    && activityState !== "covered"
  );

  const clearRefreshTimer = () => {
    if (refreshTimer === null) return;
    clearTimeoutRef(refreshTimer);
    refreshTimer = null;
  };

  const scheduleRefresh = () => {
    clearRefreshTimer();
    if (!canRefresh() || refreshInterval <= 0 || !sourceUrl) return;
    refreshTimer = setTimeoutRef(() => {
      refreshTimer = null;
      refreshImage();
    }, refreshInterval);
  };

  const refreshImage = () => {
    if (!sourceUrl) return false;
    if (!canRefresh()) {
      refreshPending = true;
      clearRefreshTimer();
      return false;
    }
    refreshPending = false;
    refreshSequence += 1;
    const requestSequence = refreshSequence;
    const nextUrl = createRefreshedImageUrl(sourceUrl, `${now()}-${requestSequence}`);
    const preloader = createImage();
    preloader.decoding = "async";
    preloader.onload = () => {
      if (destroyed || requestSequence !== refreshSequence) return;
      onImageReady(nextUrl);
      scheduleRefresh();
    };
    preloader.onerror = () => {
      if (destroyed || requestSequence !== refreshSequence) return;
      onImageUnavailable();
      scheduleRefresh();
    };
    preloader.src = nextUrl;
    return true;
  };

  const resume = () => {
    if (!canRefresh() || !sourceUrl) return false;
    if (refreshPending) return refreshImage();
    scheduleRefresh();
    return true;
  };

  return {
    setSourceUrl(nextUrl = "") {
      const normalized = String(nextUrl || "");
      if (normalized === sourceUrl) return false;
      sourceUrl = normalized;
      refreshSequence += 1;
      clearRefreshTimer();
      if (!sourceUrl) {
        refreshPending = false;
        onImageUnavailable();
        return true;
      }
      refreshPending = true;
      refreshImage();
      return true;
    },
    setRuntimeActivity(nextState = "active") {
      activityState = nextState;
      if (!canRefresh()) {
        clearRefreshTimer();
        refreshSequence += 1;
        refreshPending = Boolean(sourceUrl);
        return false;
      }
      return resume();
    },
    setViewportVisible(visible) {
      viewportVisible = Boolean(visible);
      if (!canRefresh()) {
        clearRefreshTimer();
        refreshSequence += 1;
        refreshPending = Boolean(sourceUrl);
        return false;
      }
      return resume();
    },
    refreshNow() {
      clearRefreshTimer();
      refreshPending = true;
      return refreshImage();
    },
    destroy() {
      destroyed = true;
      refreshSequence += 1;
      clearRefreshTimer();
      sourceUrl = "";
    },
  };
}

function normalizeCameraRefreshInterval(value) {
  const numericValue = Number(value);
  return CAMERA_REFRESH_INTERVALS.includes(numericValue)
    ? numericValue
    : DEFAULT_CAMERA_REFRESH_INTERVAL;
}

function createRefreshedImageUrl(url, refreshId) {
  const cleanUrl = String(url || "")
    .replace(/([?&])_mha_refresh=[^&#]*&?/g, "$1")
    .replace(/[?&]$/, "");
  if (!cleanUrl) return "";
  const separator = cleanUrl.includes("?") ? "&" : "?";
  return `${cleanUrl}${separator}_mha_refresh=${encodeURIComponent(refreshId)}`;
}

export function isCameraWidget(widget = {}) {
  return isLocalWidgetKind(widget, CAMERA_WIDGET_KIND, ["camera-widget"]);
}

function createCameraHeader(widget = {}) {
  const header = document.createElement("div");
  header.className = "mha-weather-radar-header";
  header.append(createIconSymbol({
    name: "camera",
    className: "mha-weather-radar-header-icon",
  }));
  const title = document.createElement("span");
  title.className = "mha-weather-radar-title";
  title.textContent = String(widget.label || widget.title || t("widgets.camera.title", "Camera"));
  header.append(title);
  return header;
}

function buildCameraModel(hass, widget = {}) {
  const entityId = String(widget.entityId || widget.entity_id || "").trim();
  const entity = entityId ? hass?.states?.[entityId] : null;
  return {
    entityId,
    imageUrl: resolveWeatherRadarImageUrl(hass, entity),
  };
}

export function createCameraWidgetContent(widget = {}, { hass, preview = false } = {}) {
  const root = document.createElement("div");
  root.className = "mha-weather-radar mha-camera-widget";
  root.dataset.widgetComponent = "camera";
  if (preview) root.dataset.preview = "true";

  const viewport = document.createElement("div");
  viewport.className = "mha-weather-radar-viewport";
  if (!preview) {
    viewport.tabIndex = 0;
    viewport.setAttribute("role", "button");
    viewport.setAttribute("aria-label", t("widgets.camera.refreshNow", "Refresh camera image"));
  }

  const image = document.createElement("img");
  image.className = "mha-weather-radar-image";
  image.alt = String(widget.label || widget.title || t("widgets.camera.imageAlt", "Camera image"));
  image.loading = "lazy";
  image.decoding = "async";
  image.draggable = false;

  const fallback = document.createElement("div");
  fallback.className = "mha-weather-radar-fallback";
  fallback.append(createIconSymbol({
    name: "camera-off",
    className: "mha-weather-radar-fallback-icon",
  }));
  const fallbackText = document.createElement("span");
  fallbackText.textContent = t("widgets.camera.unavailable", "Camera image unavailable");
  fallback.append(fallbackText);

  viewport.append(image, fallback);
  root.append(createCameraHeader(widget), viewport);

  const refreshInterval = preview ? 0 : normalizeCameraRefreshInterval(widget.refreshInterval);
  const refreshController = createCameraRefreshController({
    refreshInterval,
    onImageReady(nextUrl) {
      image.src = nextUrl;
      viewport.dataset.imageState = "ready";
    },
    onImageUnavailable() {
      if (!image.getAttribute("src")) viewport.dataset.imageState = preview ? "preview" : "unavailable";
    },
  });
  refreshController.setViewportVisible(preview);

  function requestManualRefresh() {
    if (preview) return;
    refreshController.refreshNow();
  }

  viewport.addEventListener("click", requestManualRefresh);
  viewport.addEventListener("keydown", (event) => {
    if (!["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    requestManualRefresh();
  });

  function applyModel(nextHass) {
    const model = buildCameraModel(nextHass, widget);
    root.dataset.entityId = model.entityId;
    if (model.imageUrl) {
      refreshController.setSourceUrl(model.imageUrl);
      return;
    }
    refreshController.setSourceUrl("");
    image.removeAttribute("src");
    viewport.dataset.imageState = preview ? "preview" : "unavailable";
  }

  root.__mhaUpdateFromHass = nextHass => applyModel(nextHass);
  root.__mhaSetRuntimeActivity = state => refreshController.setRuntimeActivity(state);
  root.__mhaSetRuntimeViewport = visible => refreshController.setViewportVisible(visible);
  root.__mhaDestroy = () => {
    refreshController.destroy();
    delete root.__mhaUpdateFromHass;
    delete root.__mhaSetRuntimeActivity;
    delete root.__mhaSetRuntimeViewport;
    delete root.__mhaDestroy;
  };
  applyModel(hass);
  return root;
}

export const CAMERA_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, preview }) => createCameraWidgetContent(widget, { hass, preview }),
});

export const CAMERA_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "camera",
  title: "Configure camera",
  hint: "Choose the camera entity and the name displayed in the widget header.",
  titleKey: "widgets.config.configureCamera",
  hintKey: "widgets.config.cameraHint",
  createDraft: createCameraConfigDraft,
  build: buildCameraWidgetConfig,
  renderFields: renderCameraConfigFields,
});

export const CAMERA_WIDGET_DEFINITION = Object.freeze({
  component: "camera-widget",
  category: "security",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({
        category: "security",
        variant: "camera",
        label: "Camera",
        size: freezeSize(4, 3),
        description: "Live camera image from Home Assistant.",
        order: 30,
      }),
    ]),
  }),
  renderer: "camera",
  css: css("styles/widgets/weather-radar-widget.css"),
  preview: "camera",
  config: "camera",
  aliases: ["camera-widget"],
  variantAliases: ["camera"],
  defaultVariant: "camera",
  defaultSize: freezeSize(4, 3),
  normalizeSize: () => ({ w: 4, h: 3 }),
  capabilities: Object.freeze({
    configurable: true,
    resizable: false,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: String(widget.entityId || widget.entity_id || ""),
      label: String(widget.label || widget.title || "Camera"),
      title: String(widget.title || widget.label || "Camera"),
      refreshInterval: normalizeCameraRefreshInterval(widget.refreshInterval),
    }),
  }),
  shell: Object.freeze({ configureMode: "config" }),
  placementFlow: "configure-first",
  variants: [variant("camera", "Camera 4×3", 4, 3)],
});

export const WIDGET_MODULE = Object.freeze({
  kind: CAMERA_WIDGET_KIND,
  definition: CAMERA_WIDGET_DEFINITION,
  renderer: CAMERA_WIDGET_CONTENT_RENDERER,
  config: CAMERA_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({ mode: "live" }),
});
