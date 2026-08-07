export const CAMERA_PTZ_PROVIDERS = Object.freeze([
  "auto",
  "esee_cloud",
  "onvif",
  "custom",
]);

const DEFAULT_SPEED = 0.5;
const PRESET_COUNT = 8;
const CUSTOM_COMMAND_KEYS = Object.freeze([
  "move",
  "up",
  "down",
  "left",
  "right",
  "up_left",
  "up_right",
  "down_left",
  "down_right",
  "home",
  "preset",
  "set_preset",
]);

function clamp(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeAction(action) {
  if (!action || typeof action !== "object" || Array.isArray(action)) return null;
  const domain = String(action.domain || "").trim();
  const service = String(action.service || "").trim();
  if (!domain || !service) return null;
  return {
    domain,
    service,
    data: action.data && typeof action.data === "object" && !Array.isArray(action.data)
      ? structuredClone(action.data)
      : {},
    ...(action.target && typeof action.target === "object" && !Array.isArray(action.target)
      ? { target: structuredClone(action.target) }
      : {}),
  };
}

export function normalizeCameraPtzCustomActions(actions = {}) {
  if (!actions || typeof actions !== "object" || Array.isArray(actions)) return {};
  return Object.fromEntries(
    CUSTOM_COMMAND_KEYS
      .map(key => [key, normalizeAction(actions[key])])
      .filter(([, action]) => Boolean(action)),
  );
}

function defaultPreset(index) {
  if (index === 0) {
    return { id: "home", label: "Home", value: "home", enabled: true, home: true };
  }
  return {
    id: `preset-${index}`,
    label: String(index),
    value: String(index),
    enabled: true,
    home: false,
  };
}

function normalizePreset(preset, index) {
  const fallback = defaultPreset(index);
  const source = preset && typeof preset === "object" ? preset : {};
  const label = String(source.label ?? fallback.label).trim() || fallback.label;
  const value = String(source.value ?? source.preset ?? fallback.value).trim();
  return {
    id: index === 0 ? "home" : `preset-${index}`,
    label,
    value,
    enabled: source.enabled !== false,
    home: index === 0,
  };
}

export function normalizeCameraPopupConfig(config = {}) {
  const source = config && typeof config === "object" ? config : {};
  const ptzSource = source.ptz && typeof source.ptz === "object" ? source.ptz : source;
  const provider = CAMERA_PTZ_PROVIDERS.includes(ptzSource.provider)
    ? ptzSource.provider
    : "auto";
  const presets = Array.from({ length: PRESET_COUNT }, (_, index) => (
    normalizePreset(ptzSource.presets?.[index], index)
  ));

  return {
    ptz: {
      provider,
      speed: clamp(ptzSource.speed, 0, 1, DEFAULT_SPEED),
      presets,
      customActions: normalizeCameraPtzCustomActions(ptzSource.customActions),
    },
  };
}

export function getCameraPtzCustomActionExample() {
  return {
    move: {
      domain: "my_camera",
      service: "ptz",
      data: {
        entity_id: "{{entity_id}}",
        direction: "{{command}}",
        speed: "{{speed}}",
      },
    },
    preset: {
      domain: "my_camera",
      service: "ptz",
      data: {
        entity_id: "{{entity_id}}",
        preset: "{{preset}}",
      },
    },
    set_preset: {
      domain: "my_camera",
      service: "ptz",
      data: {
        entity_id: "{{entity_id}}",
        command: "SET_PRESET",
        preset: "{{preset}}",
      },
    },
  };
}
