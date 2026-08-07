import { callHomeAssistantService } from "./actions.js";
import { normalizeCameraPopupConfig } from "../camera-popup/camera-popup-config.js";

export const CAMERA_PTZ_DIRECTIONS = Object.freeze([
  "up_left",
  "up",
  "up_right",
  "left",
  "right",
  "down_left",
  "down",
  "down_right",
]);

function hasService(hass, domain, service) {
  const services = hass?.services?.[domain];
  return Boolean(services && Object.hasOwn(services, service));
}

function getEntityPlatform(hass, entityId) {
  return String(
    hass?.entities?.[entityId]?.platform
    || hass?.states?.[entityId]?.attributes?.integration
    || hass?.states?.[entityId]?.attributes?.platform
    || "",
  ).trim().toLowerCase();
}

export function resolveCameraPtzProvider(hass, entityId, configuredProvider = "auto") {
  if (["esee_cloud", "onvif", "custom"].includes(configuredProvider)) {
    return configuredProvider;
  }

  const platform = getEntityPlatform(hass, entityId);
  if (platform === "esee_cloud" || platform === "onvif") return platform;

  const available = [
    hasService(hass, "esee_cloud", "ptz") ? "esee_cloud" : "",
    hasService(hass, "onvif", "ptz") ? "onvif" : "",
  ].filter(Boolean);
  return available.length === 1 ? available[0] : "";
}

function getDirectionalAxes(command) {
  const normalized = String(command || "").toLowerCase();
  return {
    pan: normalized.includes("left") ? "LEFT" : normalized.includes("right") ? "RIGHT" : "",
    tilt: normalized.includes("up") ? "UP" : normalized.includes("down") ? "DOWN" : "",
  };
}

function buildEseeServiceCall({ entityId, command, speed, preset }) {
  if (command === "preset" || command === "set_preset") {
    const presetNumber = command === "set_preset" && String(preset).toLowerCase() === "home"
      ? 0
      : Number(preset);
    if (!Number.isInteger(presetNumber) || presetNumber < 0 || presetNumber > 255) return null;
    return {
      domain: "esee_cloud",
      service: "ptz",
      data: {
        entity_id: entityId,
        command: command === "set_preset" ? "SET_PRESET" : "GOTO_PRESET",
        preset: presetNumber,
      },
    };
  }
  return {
    domain: "esee_cloud",
    service: "ptz",
    data: {
      entity_id: entityId,
      command: command === "home" ? "HOME" : command.toUpperCase(),
      speed,
      duration: 0.25,
    },
  };
}

function buildOnvifServiceCall({ entityId, command, speed, preset }) {
  if (command === "set_preset") return null;
  if (command === "home" || command === "preset") {
    return {
      domain: "onvif",
      service: "ptz",
      data: {
        move_mode: "GotoPreset",
        preset: String(preset || (command === "home" ? "home" : "")),
        speed,
      },
      target: { entity_id: entityId },
    };
  }
  const axes = getDirectionalAxes(command);
  return {
    domain: "onvif",
    service: "ptz",
    data: {
      ...(axes.pan ? { pan: axes.pan } : {}),
      ...(axes.tilt ? { tilt: axes.tilt } : {}),
      move_mode: "RelativeMove",
      distance: 0.1,
      speed,
    },
    target: { entity_id: entityId },
  };
}

function interpolateTemplateValue(value, variables) {
  if (typeof value === "string") {
    const exactMatch = value.match(/^\{\{\s*([a-z_]+)\s*\}\}$/i);
    if (exactMatch && Object.hasOwn(variables, exactMatch[1])) return variables[exactMatch[1]];
    return value.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_match, key) => (
      Object.hasOwn(variables, key) ? String(variables[key] ?? "") : ""
    ));
  }
  if (Array.isArray(value)) return value.map(item => interpolateTemplateValue(item, variables));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, interpolateTemplateValue(item, variables)]),
    );
  }
  return value;
}

function buildCustomServiceCall({ entityId, command, speed, preset, customActions }) {
  const action = customActions?.[command]
    || (CAMERA_PTZ_DIRECTIONS.includes(command) ? customActions?.move : null);
  if (!action?.domain || !action?.service) return null;
  return {
    domain: action.domain,
    service: action.service,
    data: interpolateTemplateValue(action.data || {}, {
      entity_id: entityId,
      command,
      speed,
      preset: preset ?? "",
    }),
    ...(action.target ? {
      target: interpolateTemplateValue(action.target, {
        entity_id: entityId,
        command,
        speed,
        preset: preset ?? "",
      }),
    } : {}),
  };
}

export function buildCameraPtzServiceCall(hass, {
  entityId,
  popupConfig,
  command,
  preset,
} = {}) {
  const normalizedEntityId = String(entityId || "").trim();
  const normalizedCommand = String(command || "").trim().toLowerCase();
  if (!normalizedEntityId || ![
    ...CAMERA_PTZ_DIRECTIONS,
    "home",
    "preset",
    "set_preset",
  ].includes(normalizedCommand)) return null;

  const normalized = normalizeCameraPopupConfig(popupConfig);
  const { ptz } = normalized;
  const provider = resolveCameraPtzProvider(hass, normalizedEntityId, ptz.provider);
  const context = {
    entityId: normalizedEntityId,
    command: normalizedCommand,
    speed: ptz.speed,
    preset,
    customActions: ptz.customActions,
  };
  if (provider === "esee_cloud") return buildEseeServiceCall(context);
  if (provider === "onvif") return buildOnvifServiceCall(context);
  if (provider === "custom") return buildCustomServiceCall(context);
  return null;
}

export function runCameraPtzCommand(hass, context = {}) {
  return callHomeAssistantService(hass, buildCameraPtzServiceCall(hass, context));
}
