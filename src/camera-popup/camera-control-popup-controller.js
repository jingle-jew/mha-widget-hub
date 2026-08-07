import { destroyDomSubtree } from "../core/dom-lifecycle.js";
import { getEntityState, isEntityAvailable } from "../ha/entity.js";
import {
  buildCameraPtzServiceCall,
  resolveCameraPtzProvider,
  runCameraPtzCommand,
} from "../ha/camera-ptz-adapter.js";
import { t } from "../i18n/index.js";
import {
  applyPanelSurfaceContract,
  PANEL_MOBILE_PRESENTATIONS,
  PANEL_SURFACE_ROLES,
} from "../panels/panel-surface-contract.js";
import { createPanelShell } from "../panels/panel-shell.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import {
  applyWidgetSurfaceHostLayoutState,
  syncWidgetSurfaceOpenState,
} from "../panels/widget-surface-state.js";
import { normalizeCameraPopupConfig } from "./camera-popup-config.js";
import { createCameraPopupSettingsView } from "./camera-popup-settings-view.js";
import { wireCameraPresetLongPress } from "./camera-preset-long-press.js";

export const CAMERA_PTZ_DIRECTION_LAYOUT = Object.freeze([
  ["up_left", "arrow-up", -45],
  ["up", "arrow-up", 0],
  ["up_right", "arrow-up", 45],
  ["left", "arrow-left", 0],
  ["right", "arrow-left", 180],
  ["down_left", "arrow-down", 45],
  ["down", "arrow-down", 0],
  ["down_right", "arrow-down", -45],
]);

const CAMERA_CONTEXT_RESOLVERS = Object.freeze({
  hassApi: hass => hass,
  hassConnection: hass => hass,
  hassConfig: hass => hass,
  hassInternationalization: hass => hass,
  connection: hass => hass?.connection,
  config: hass => hass?.config,
  localize: hass => hass?.localize,
});

function resolveShadowRoot(anchor) {
  const root = anchor?.getRootNode?.();
  return root?.host ? root : null;
}

function createOverlayButton({ label, icon, className = "", onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ["mha-camera-popup-overlay-button", className].filter(Boolean).join(" ");
  button.setAttribute("aria-label", label);
  button.title = label;
  if (icon) button.append(createIconSymbol({ name: icon }));
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.(event);
  };
  return button;
}

async function ensureCameraPlayerElement() {
  if (customElements.get("ha-web-rtc-player") || customElements.get("ha-hls-player")) return true;
  try {
    await globalThis.loadCardHelpers?.();
  } catch {
    // The MJPEG fallback remains visible if HA cannot load its HLS player.
  }
  return Boolean(customElements.get("ha-web-rtc-player") || customElements.get("ha-hls-player"));
}

function getCameraAccessToken(entityState) {
  const directToken = String(entityState?.attributes?.access_token || "").trim();
  if (directToken) return directToken;
  const picture = String(entityState?.attributes?.entity_picture || "").trim();
  if (!picture) return "";
  try {
    return new URL(picture, "http://mha.local").searchParams.get("token") || "";
  } catch {
    return "";
  }
}

export function buildCameraProxyStreamUrl(hass, entityId, entityState, restartId = "") {
  const query = new URLSearchParams();
  const token = getCameraAccessToken(entityState);
  if (token) query.set("token", token);
  if (restartId) query.set("_mha_stream", String(restartId));
  const suffix = query.size ? `?${query}` : "";
  const path = `/api/camera_proxy_stream/${encodeURIComponent(entityId)}${suffix}`;
  return hass?.hassUrl?.(path) || path;
}

export function resolveCameraContextValue(contextKey, hass) {
  return CAMERA_CONTEXT_RESOLVERS[String(contextKey || "")]?.(hass);
}

export function resolveCameraStreamPlayerType(capabilities, registry = globalThis.customElements) {
  const streamTypes = Array.isArray(capabilities?.frontend_stream_types)
    ? capabilities.frontend_stream_types
    : [];
  if (streamTypes.includes("web_rtc") && registry?.get?.("ha-web-rtc-player")) return "web_rtc";
  if (streamTypes.includes("hls") && registry?.get?.("ha-hls-player")) return "hls";
  return "";
}

function createHomeAssistantContextBridge(surface, getHass) {
  const subscriptions = new Map();
  const onContextRequest = (event) => {
    const value = resolveCameraContextValue(event.context, getHass());
    if (value === undefined || typeof event.callback !== "function") return;
    event.stopPropagation();
    if (!event.subscribe) {
      event.callback(value);
      return;
    }
    const unsubscribe = () => subscriptions.delete(event.callback);
    subscriptions.set(event.callback, { contextKey: event.context, unsubscribe });
    event.callback(value, unsubscribe);
  };
  surface.addEventListener("context-request", onContextRequest);
  return {
    sync() {
      const hass = getHass();
      subscriptions.forEach(({ contextKey, unsubscribe }, callback) => {
        callback(resolveCameraContextValue(contextKey, hass), unsubscribe);
      });
    },
    destroy() {
      surface.removeEventListener("context-request", onContextRequest);
      subscriptions.clear();
    },
  };
}

function getPosterUrl(hass, entityId, entityState) {
  const picture = String(entityState?.attributes?.entity_picture || "").trim();
  if (picture) return hass?.hassUrl?.(picture) || picture;
  const path = `/api/camera_proxy/${entityId}`;
  return hass?.hassUrl?.(path) || path;
}

function createStreamSurface(context) {
  const surface = document.createElement("div");
  surface.className = "mha-camera-popup-stream";
  const snapshot = document.createElement("img");
  snapshot.className = "mha-camera-popup-snapshot";
  snapshot.alt = t("widgets.camera.imageAlt", "Camera image");
  snapshot.decoding = "async";
  snapshot.draggable = false;
  surface.append(snapshot);

  let stream = null;
  let destroyed = false;
  let fallbackSequence = 0;
  const contextBridge = createHomeAssistantContextBridge(surface, () => context.hass);
  const startFallbackStream = () => {
    if (destroyed || surface.dataset.live === "true") return;
    fallbackSequence += 1;
    snapshot.src = buildCameraProxyStreamUrl(
      context.hass,
      context.entityId,
      context.entityState,
      `${Date.now()}-${fallbackSequence}`,
    );
  };
  snapshot.onerror = () => {
    if (destroyed || surface.dataset.live === "true") return;
    globalThis.setTimeout?.(startFallbackStream, 1500);
  };
  const sync = (nextHass) => {
    context.hass = nextHass;
    context.entityState = getEntityState(nextHass, context.entityId) || context.entityState;
    contextBridge.sync();
    if (!snapshot.src || surface.dataset.live !== "true") startFallbackStream();
    if (stream) {
      stream.hass = nextHass;
      stream._api = nextHass;
      stream._connection = nextHass;
      stream._config = nextHass;
      stream._localize = nextHass?.localize;
    }
    surface.dataset.available = String(isEntityAvailable(context.entityState));
  };

  ensureCameraPlayerElement().then(async (available) => {
    if (!available || destroyed || !surface.isConnected) return;
    try {
      const capabilities = await context.hass?.callWS?.({
        type: "camera/capabilities",
        entity_id: context.entityId,
      });
      const playerType = resolveCameraStreamPlayerType(capabilities);
      const useWebRtc = playerType === "web_rtc";
      const useHls = playerType === "hls";
      if (!playerType || destroyed || !surface.isConnected) return;

      let streamUrl = "";
      if (useHls) {
        const streamInfo = await context.hass?.callWS?.({
          type: "camera/stream",
          entity_id: context.entityId,
          format: "hls",
        });
        if (!streamInfo?.url || destroyed || !surface.isConnected) return;
        streamUrl = context.hass?.hassUrl?.(streamInfo.url) || streamInfo.url;
      }

      stream = document.createElement(useWebRtc ? "ha-web-rtc-player" : "ha-hls-player");
      stream.className = "mha-camera-popup-live-stream";
      stream.dataset.streamReady = "false";
      stream.hass = context.hass;
      stream._api = context.hass;
      stream._connection = context.hass;
      stream._config = context.hass;
      stream._localize = context.hass?.localize;
      if (useWebRtc) stream.entityid = context.entityId;
      else stream.url = streamUrl;
      stream.autoPlay = true;
      stream.muted = true;
      stream.playsInline = true;
      stream.controls = false;
      stream.fitMode = "contain";
      stream.addEventListener("streams", (event) => {
        if (event.detail?.hasVideo !== true) {
          surface.dataset.live = "false";
          stream?.remove();
          stream = null;
          startFallbackStream();
          return;
        }
        surface.dataset.live = "true";
        stream.dataset.streamReady = "true";
        snapshot.src = getPosterUrl(context.hass, context.entityId, context.entityState);
        requestAnimationFrame(() => {
          stream?.shadowRoot?.querySelector?.("video")?.play?.().catch?.(() => {});
        });
      });
      surface.prepend(stream);
    } catch {
      surface.dataset.live = "false";
      startFallbackStream();
    }
  });

  surface.__mhaUpdateFromHass = sync;
  surface.__mhaDestroy = () => {
    destroyed = true;
    stream?.remove();
    stream = null;
    snapshot.onerror = null;
    contextBridge.destroy();
    delete surface.__mhaUpdateFromHass;
    delete surface.__mhaDestroy;
  };
  sync(context.hass);
  return surface;
}

function createDirectionPad(onCommand) {
  const pad = document.createElement("div");
  pad.className = "mha-camera-popup-direction-pad";
  pad.setAttribute("aria-label", t("cameraPopup.directionControls", "PTZ direction controls"));
  CAMERA_PTZ_DIRECTION_LAYOUT.forEach(([command, icon, rotation]) => {
    const button = createOverlayButton({
      label: t(`cameraPopup.commands.${command}`, command.replaceAll("_", " ")),
      icon,
      className: `mha-camera-popup-direction mha-camera-popup-direction--${command.replaceAll("_", "-")}`,
      onClick: () => onCommand(command),
    });
    button.style.setProperty("--mha-camera-ptz-icon-rotation", `${rotation}deg`);
    pad.append(button);
  });
  return pad;
}

function createPresetBar(config, { onPreset, onSavePreset } = {}) {
  const bar = document.createElement("div");
  bar.className = "mha-camera-popup-presets";
  bar.setAttribute("aria-label", t("cameraPopup.presets", "PTZ presets"));
  config.ptz.presets.forEach((preset) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mha-camera-popup-preset";
    const disabledPreset = !preset.enabled || !preset.value;
    button.disabled = disabledPreset;
    button.dataset.disabledPreset = String(disabledPreset);
    button.textContent = preset.label;
    const actionLabel = t(
      "cameraPopup.presetActionHint",
      "{label}: click to recall, long press to save",
      { label: preset.label },
    );
    button.title = actionLabel;
    button.setAttribute("aria-label", actionLabel);
    button.onclick = (event) => {
      event.preventDefault();
      event.stopPropagation();
      onPreset?.(preset);
    };
    button.__mhaDestroy = wireCameraPresetLongPress(button, {
      onLongPress: () => onSavePreset?.(preset, button),
    });
    bar.append(button);
  });
  return bar;
}

export function openCameraControlPopup({
  anchor,
  widget,
  hass,
  updateWidgetConfig,
} = {}) {
  const shadowRoot = resolveShadowRoot(anchor);
  const entityId = String(widget?.entityId || widget?.entity_id || "").trim();
  if (!shadowRoot || !entityId.startsWith("camera.")) return null;

  const previous = shadowRoot.querySelector(".mha-camera-control-popup");
  if (previous) {
    destroyDomSubtree(previous);
    previous.remove();
  }

  const context = {
    hass,
    entityId,
    entityState: getEntityState(hass, entityId),
    config: normalizeCameraPopupConfig(widget.cameraPopup),
    trigger: anchor,
  };
  let settingsView = null;
  let streamSurface = null;
  let presetBar = null;
  let presetFeedbackTimer = 0;
  let presetFeedbackButton = null;

  const close = () => {
    if (!root.isConnected) return;
    root.dataset.open = "false";
    root.setAttribute("aria-hidden", "true");
    root.hidden = true;
    destroyDomSubtree(root);
    root.remove();
    syncWidgetSurfaceOpenState(shadowRoot);
    context.trigger?.focus?.({ preventScroll: true });
  };

  const root = applyPanelSurfaceContract(createPanelShell({
    open: true,
    rootClassName: "mha-camera-control-popup mha-page-creator",
    scrimClassName: "mha-camera-control-popup-scrim mha-page-creator-scrim",
    sheetClassName: "mha-camera-control-popup-sheet mha-page-creator-sheet",
    headerClassName: "mha-camera-control-popup-header mha-page-creator-header",
    closeClassName: "mha-camera-control-popup-close mha-page-creator-close",
    title: widget.label || widget.title || context.entityState?.attributes?.friendly_name || t("widgets.camera.title", "Camera"),
    ariaLabel: t("cameraPopup.ariaLabel", "Live camera and PTZ controls"),
    closeLabel: t("common.close", "Close"),
    onClose: close,
  }), {
    surfaceRole: PANEL_SURFACE_ROLES.POPUP,
    mobilePresentation: PANEL_MOBILE_PRESENTATIONS.SHEET,
  });
  root.dataset.widgetComponent = "camera-control-popup";
  root.dataset.entityId = entityId;
  root.dataset.runtimeScope = "overlay";
  root.__mhaEntityDependencies = new Set([entityId]);
  root.hidden = false;

  const sheet = root.querySelector(".mha-camera-control-popup-sheet");
  const body = document.createElement("div");
  body.className = "mha-camera-control-popup-body";
  streamSurface = createStreamSurface(context);
  const presetFeedback = document.createElement("div");
  presetFeedback.className = "mha-camera-popup-preset-feedback";
  presetFeedback.setAttribute("role", "status");
  presetFeedback.setAttribute("aria-live", "polite");
  presetFeedback.dataset.visible = "false";

  const syncProviderState = () => {
    const provider = resolveCameraPtzProvider(
      context.hass,
      entityId,
      context.config.ptz.provider,
    );
    root.dataset.ptzProvider = provider || "unavailable";
    root.dataset.ptzAvailable = String(Boolean(provider));
    body.querySelectorAll(".mha-camera-popup-direction,.mha-camera-popup-preset").forEach((button) => {
      const presetEnabled = !button.classList.contains("mha-camera-popup-preset")
        || button.dataset.disabledPreset !== "true";
      button.disabled = !provider || !presetEnabled;
    });
  };

  const runCommand = (command, preset) => {
    syncProviderState();
    if (root.dataset.ptzAvailable !== "true") return Promise.resolve(false);
    return runCameraPtzCommand(context.hass, {
      entityId,
      popupConfig: context.config,
      command,
      preset,
    });
  };

  const showPresetFeedback = (message, state, button) => {
    if (presetFeedbackTimer) globalThis.clearTimeout?.(presetFeedbackTimer);
    if (presetFeedbackButton && presetFeedbackButton !== button) {
      delete presetFeedbackButton.dataset.presetSaveState;
    }
    presetFeedbackButton = button || null;
    if (presetFeedbackButton) presetFeedbackButton.dataset.presetSaveState = state;
    presetFeedback.textContent = message;
    presetFeedback.dataset.state = state;
    presetFeedback.dataset.visible = "true";
    presetFeedbackTimer = globalThis.setTimeout?.(() => {
      presetFeedback.dataset.visible = "false";
      delete presetFeedback.dataset.state;
      if (presetFeedbackButton) delete presetFeedbackButton.dataset.presetSaveState;
      presetFeedbackButton = null;
      presetFeedbackTimer = 0;
    }, 2400);
  };

  const savePreset = async (preset, button) => {
    syncProviderState();
    const provider = root.dataset.ptzProvider || "unavailable";
    const commandContext = {
      entityId,
      popupConfig: context.config,
      command: "set_preset",
      preset: preset.value,
    };
    if (!buildCameraPtzServiceCall(context.hass, commandContext)) {
      showPresetFeedback(t(
        "cameraPopup.presetSaveUnsupported",
        "{provider} does not provide a preset save action.",
        { provider: t(`cameraPopup.providers.${provider}`, provider) },
      ), "unsupported", button);
      return false;
    }
    showPresetFeedback(t(
      "cameraPopup.presetSaving",
      "Saving {label}…",
      { label: preset.label },
    ), "saving", button);
    const saved = await runCommand("set_preset", preset.value);
    showPresetFeedback(t(
      saved ? "cameraPopup.presetSaved" : "cameraPopup.presetSaveFailed",
      saved ? "{label} saved." : "Could not save {label}.",
      { label: preset.label },
    ), saved ? "saved" : "error", button);
    return saved;
  };

  const createCurrentPresetBar = () => createPresetBar(context.config, {
    onPreset: (preset) => runCommand(preset.home ? "home" : "preset", preset.value),
    onSavePreset: savePreset,
  });

  const directionPad = createDirectionPad(command => runCommand(command));
  presetBar = createCurrentPresetBar();
  const gear = createOverlayButton({
    label: t("cameraPopup.openSettings", "Open PTZ settings"),
    icon: "settings",
    className: "mha-camera-popup-settings-button",
    onClick: () => toggleSettings(true),
  });

  function toggleSettings(open) {
    if (!open) {
      if (settingsView) destroyDomSubtree(settingsView);
      settingsView?.remove();
      settingsView = null;
      root.dataset.settingsOpen = "false";
      gear.focus?.({ preventScroll: true });
      return;
    }
    if (settingsView) return;
    settingsView = createCameraPopupSettingsView({
      config: context.config,
      onCancel: () => toggleSettings(false),
      onSave: (nextConfig) => {
        context.config = normalizeCameraPopupConfig(nextConfig);
        updateWidgetConfig?.({ cameraPopup: context.config });
        const nextPresetBar = createCurrentPresetBar();
        destroyDomSubtree(presetBar);
        presetBar.replaceWith(nextPresetBar);
        presetBar = nextPresetBar;
        syncProviderState();
        toggleSettings(false);
      },
    });
    body.append(settingsView);
    root.dataset.settingsOpen = "true";
    settingsView.querySelector?.("input")?.focus?.({ preventScroll: true });
  }

  body.append(streamSurface, presetFeedback, gear, directionPad, presetBar);
  sheet.append(body);
  syncProviderState();

  const onKeyDown = (event) => {
    if (event.key !== "Escape") return;
    if (settingsView) toggleSettings(false);
    else close();
    event.preventDefault();
  };
  root.addEventListener("keydown", onKeyDown);
  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    context.entityState = getEntityState(nextHass, entityId) || context.entityState;
    streamSurface?.__mhaUpdateFromHass?.(nextHass);
    syncProviderState();
  };
  root.__mhaDestroy = () => {
    if (presetFeedbackTimer) globalThis.clearTimeout?.(presetFeedbackTimer);
    root.removeEventListener("keydown", onKeyDown);
    delete root.__mhaUpdateFromHass;
    delete root.__mhaDestroy;
  };

  shadowRoot.append(applyWidgetSurfaceHostLayoutState(shadowRoot, root));
  syncWidgetSurfaceOpenState(shadowRoot);
  requestAnimationFrame(() => sheet.focus?.({ preventScroll: true }));
  return root;
}
