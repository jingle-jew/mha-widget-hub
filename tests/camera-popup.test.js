import assert from "node:assert/strict";
import test from "node:test";

import {
  CAMERA_PTZ_DIRECTION_LAYOUT,
  buildCameraProxyStreamUrl,
  resolveCameraContextValue,
  resolveCameraStreamPlayerType,
} from "../src/camera-popup/camera-control-popup-controller.js";
import {
  normalizeCameraPopupConfig,
  normalizeCameraPtzCustomActions,
} from "../src/camera-popup/camera-popup-config.js";
import { wireCameraPresetLongPress } from "../src/camera-popup/camera-preset-long-press.js";
import {
  buildCameraPtzServiceCall,
  resolveCameraPtzProvider,
  runCameraPtzCommand,
} from "../src/ha/camera-ptz-adapter.js";
import { CAMERA_WIDGET_DEFINITION } from "../src/widgets/camera-widget.js";
import { resolveTablerIconName } from "../src/ui/tabler-icons.js";

test("camera popup PTZ directions only use available glyphs and mirror left for right", () => {
  const right = CAMERA_PTZ_DIRECTION_LAYOUT.find(([command]) => command === "right");

  assert.deepEqual(right, ["right", "arrow-left", 180]);
  CAMERA_PTZ_DIRECTION_LAYOUT.forEach(([, icon]) => {
    assert.notEqual(resolveTablerIconName(icon), "layout-grid");
  });
});

test("camera popup stream fallback carries the HA camera token and a restart nonce", () => {
  const url = buildCameraProxyStreamUrl(
    { hassUrl: path => `https://ha.example${path}` },
    "camera.front",
    {
      attributes: {
        entity_picture: "/api/camera_proxy/camera.front?token=signed-camera-token",
      },
    },
    "retry-2",
  );

  assert.equal(
    url,
    "https://ha.example/api/camera_proxy_stream/camera.front?token=signed-camera-token&_mha_stream=retry-2",
  );
});

test("camera popup bridges the HA contexts consumed by the native stream player", () => {
  const localize = () => "translated";
  const hass = {
    callWS() {},
    connection: { connected: true },
    config: { state: "RUNNING" },
    localize,
  };

  assert.equal(resolveCameraContextValue("hassApi", hass), hass);
  assert.equal(resolveCameraContextValue("hassConnection", hass), hass);
  assert.equal(resolveCameraContextValue("hassConfig", hass), hass);
  assert.equal(resolveCameraContextValue("hassInternationalization", hass), hass);
  assert.equal(resolveCameraContextValue("connection", hass), hass.connection);
  assert.equal(resolveCameraContextValue("config", hass), hass.config);
  assert.equal(resolveCameraContextValue("localize", hass), localize);
  assert.equal(resolveCameraContextValue("unknown", hass), undefined);
});

test("camera popup prefers a confirmed WebRTC player and falls back to HLS", () => {
  const available = new Set(["ha-web-rtc-player", "ha-hls-player"]);
  const registry = { get: name => available.has(name) ? class {} : undefined };
  const capabilities = { frontend_stream_types: ["hls", "web_rtc"] };

  assert.equal(resolveCameraStreamPlayerType(capabilities, registry), "web_rtc");
  available.delete("ha-web-rtc-player");
  assert.equal(resolveCameraStreamPlayerType(capabilities, registry), "hls");
  available.clear();
  assert.equal(resolveCameraStreamPlayerType(capabilities, registry), "");
});

test("camera popup configuration keeps one home slot and seven PTZ preset slots", () => {
  const config = normalizeCameraPopupConfig({
    ptz: {
      provider: "onvif",
      speed: 2,
      presets: [
        { label: "Maison", value: "home-token" },
        { label: "Porte", value: "door-token" },
      ],
    },
  });

  assert.equal(config.ptz.provider, "onvif");
  assert.equal(config.ptz.speed, 1);
  assert.equal(config.ptz.presets.length, 8);
  assert.deepEqual(config.ptz.presets[0], {
    id: "home",
    label: "Maison",
    value: "home-token",
    enabled: true,
    home: true,
  });
  assert.equal(config.ptz.presets[1].label, "Porte");
  assert.equal(config.ptz.presets[7].value, "7");
});

test("legacy click-only camera refresh migrates to the five-second interval", () => {
  const normalized = CAMERA_WIDGET_DEFINITION.storage.normalize({
    entityId: "camera.front",
    refreshInterval: 0,
  });

  assert.equal(normalized.refreshInterval, 5000);
});

test("automatic PTZ provider follows the entity platform and avoids ambiguous services", () => {
  assert.equal(resolveCameraPtzProvider({
    entities: { "camera.front": { platform: "esee_cloud" } },
    services: { esee_cloud: { ptz: {} }, onvif: { ptz: {} } },
  }, "camera.front"), "esee_cloud");

  assert.equal(resolveCameraPtzProvider({
    services: { onvif: { ptz: {} } },
  }, "camera.front"), "onvif");

  assert.equal(resolveCameraPtzProvider({
    services: { esee_cloud: { ptz: {} }, onvif: { ptz: {} } },
  }, "camera.front"), "");
});

test("Esee Cloud adapter maps diagonal, home, and numbered preset commands", () => {
  const hass = { entities: { "camera.front": { platform: "esee_cloud" } } };
  const popupConfig = { ptz: { speed: 0.65 } };

  assert.deepEqual(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "up_left",
  }), {
    domain: "esee_cloud",
    service: "ptz",
    data: {
      entity_id: "camera.front",
      command: "UP_LEFT",
      speed: 0.65,
      duration: 0.25,
    },
  });
  assert.equal(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "preset",
    preset: "lobby",
  }), null);
  assert.deepEqual(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "home",
  })?.data.command, "HOME");
  assert.deepEqual(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "preset",
    preset: "4",
  })?.data, {
    entity_id: "camera.front",
    command: "GOTO_PRESET",
    preset: 4,
  });
  assert.deepEqual(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "set_preset",
    preset: "4",
  })?.data, {
    entity_id: "camera.front",
    command: "SET_PRESET",
    preset: 4,
  });
  assert.equal(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "set_preset",
    preset: "home",
  })?.data.preset, 0);
});

test("ONVIF adapter combines pan and tilt and supports preset tokens", () => {
  const hass = { entities: { "camera.front": { platform: "onvif" } } };
  const popupConfig = { ptz: { speed: 0.4 } };

  assert.deepEqual(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "down_right",
  }), {
    domain: "onvif",
    service: "ptz",
    data: {
      pan: "RIGHT",
      tilt: "DOWN",
      move_mode: "RelativeMove",
      distance: 0.1,
      speed: 0.4,
    },
    target: { entity_id: "camera.front" },
  });
  const presetCall = buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "preset",
    preset: "Door",
  });
  assert.deepEqual(presetCall?.data, {
    move_mode: "GotoPreset",
    preset: "Door",
    speed: 0.4,
  });
  assert.deepEqual(presetCall?.target, { entity_id: "camera.front" });
  assert.equal(buildCameraPtzServiceCall(hass, {
    entityId: "camera.front",
    popupConfig,
    command: "set_preset",
    preset: "Door",
  }), null);
});

test("custom PTZ actions interpolate typed command variables before calling HA", async () => {
  const customActions = normalizeCameraPtzCustomActions({
    move: {
      domain: "custom_camera",
      service: "move",
      data: {
        target: "{{entity_id}}",
        direction: "{{command}}",
        speed: "{{speed}}",
        nested: { label: "move-{{command}}" },
      },
    },
    set_preset: {
      domain: "custom_camera",
      service: "save_preset",
      data: {
        entity_id: "{{entity_id}}",
        preset: "{{preset}}",
      },
    },
  });
  const calls = [];
  const hass = { callService: async (...args) => calls.push(args) };
  const result = await runCameraPtzCommand(hass, {
    entityId: "camera.front",
    popupConfig: { ptz: { provider: "custom", speed: 0.35, customActions } },
    command: "left",
  });

  assert.equal(result, true);
  assert.deepEqual(calls, [["custom_camera", "move", {
    target: "camera.front",
    direction: "left",
    speed: 0.35,
    nested: { label: "move-left" },
  }]]);

  await runCameraPtzCommand(hass, {
    entityId: "camera.front",
    popupConfig: { ptz: { provider: "custom", speed: 0.35, customActions } },
    command: "set_preset",
    preset: "door",
  });
  assert.deepEqual(calls[1], ["custom_camera", "save_preset", {
    entity_id: "camera.front",
    preset: "door",
  }]);
});

test("preset long press saves once and suppresses only its trailing recall click", () => {
  const listeners = new Map();
  const button = {
    dataset: {},
    disabled: false,
    addEventListener(type, listener, capture = false) {
      listeners.set(`${type}:${capture}`, listener);
    },
    removeEventListener(type, _listener, capture = false) {
      listeners.delete(`${type}:${capture}`);
    },
    setPointerCapture() {},
  };
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let nextTimerId = 1;
  globalThis.setTimeout = (callback) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, callback);
    return id;
  };
  globalThis.clearTimeout = id => timers.delete(id);
  let saveCalls = 0;

  try {
    const destroy = wireCameraPresetLongPress(button, {
      onLongPress: () => { saveCalls += 1; },
    });
    listeners.get("pointerdown:false")?.({
      pointerId: 7,
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 12,
    });
    assert.equal(button.dataset.longPressActive, "true");
    const longPressTimer = timers.get(1);
    timers.delete(1);
    longPressTimer?.();
    assert.equal(saveCalls, 1);
    assert.equal(button.dataset.longPressActive, undefined);

    listeners.get("pointerup:false")?.({ pointerId: 7, type: "pointerup" });
    const suppressed = [];
    listeners.get("click:true")?.({
      preventDefault: () => suppressed.push("preventDefault"),
      stopPropagation: () => suppressed.push("stopPropagation"),
      stopImmediatePropagation: () => suppressed.push("stopImmediatePropagation"),
    });
    assert.deepEqual(suppressed, [
      "preventDefault",
      "stopPropagation",
      "stopImmediatePropagation",
    ]);

    listeners.get("pointerdown:false")?.({
      pointerId: 8,
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 12,
    });
    listeners.get("pointerup:false")?.({ pointerId: 8, type: "pointerup" });
    const shortClick = [];
    listeners.get("click:true")?.({ preventDefault: () => shortClick.push("blocked") });
    assert.deepEqual(shortClick, []);
    assert.equal(saveCalls, 1);

    listeners.get("pointerdown:false")?.({
      pointerId: 9,
      button: 0,
      isPrimary: true,
      clientX: 10,
      clientY: 12,
    });
    listeners.get("pointermove:false")?.({ pointerId: 9, clientX: 40, clientY: 12 });
    assert.equal(button.dataset.longPressActive, undefined);
    assert.equal(saveCalls, 1);
    destroy();
  } finally {
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});
