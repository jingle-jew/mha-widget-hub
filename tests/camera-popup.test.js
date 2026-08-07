import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCameraProxyStreamUrl,
  resolveCameraContextValue,
  resolveCameraStreamPlayerType,
} from "../src/camera-popup/camera-control-popup-controller.js";
import {
  normalizeCameraPopupConfig,
  normalizeCameraPtzCustomActions,
} from "../src/camera-popup/camera-popup-config.js";
import {
  buildCameraPtzServiceCall,
  resolveCameraPtzProvider,
  runCameraPtzCommand,
} from "../src/ha/camera-ptz-adapter.js";
import { CAMERA_WIDGET_DEFINITION } from "../src/widgets/camera-widget.js";

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
});
