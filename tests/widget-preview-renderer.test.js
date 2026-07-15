import test from "node:test";
import assert from "node:assert/strict";

import { getWidgetPreviewRenderer } from "../src/widgets/widget-registry.js";
import {
  createLiveWidgetPreview,
  getWidgetPreviewLayout,
  hasLiveWidgetPreview,
} from "../src/widgets/widget-preview-renderer.js";
import { createWeatherRadarWidgetContent } from "../src/widgets/weather-radar-widget.js";

function installDom() {
  class FakeNode {}
  globalThis.Node = FakeNode;
  const createNode = (tag) => {
    const node = new FakeNode();
    node.tagName = tag.toUpperCase();
    node.childNodes = [];
    node.dataset = {};
    node.style = { setProperty(name, value) { this[name] = value; } };
    node.className = "";
    node.hidden = false;
    node.querySelector = () => null;
    node.querySelectorAll = () => [];
    node.setAttribute = (name, value) => { node[name] = value; };
    node.removeAttribute = (name) => { delete node[name]; };
    const listeners = new Map();
    node.addEventListener = (name, listener) => {
      const eventListeners = listeners.get(name) || [];
      eventListeners.push(listener);
      listeners.set(name, eventListeners);
    };
    node.dispatchEvent = event => {
      (listeners.get(event.type) || []).forEach(listener => listener.call(node, event));
    };
    node.append = (...children) => node.childNodes.push(...children);
    node.replaceChildren = (...children) => { node.childNodes = [...children]; };
    return node;
  };
  globalThis.document = {
    createElement: createNode,
    createElementNS(namespace, tag) {
      void namespace;
      return createNode(tag);
    },
  };
}

test("clock exposes a live preview renderer", () => {
  installDom();
  assert.equal(getWidgetPreviewRenderer({ kind: "clock" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "clock" }), true);

  const preview = createLiveWidgetPreview({ kind: "clock", variant: "digital", size: { w: 2, h: 2 } });
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "clock");
  assert.equal(preview?.dataset.size, "2x2");
  assert.equal(preview?.childNodes.length, 1);
});

test("preview layout exposes size, aspect ratio, and orientation", () => {
  assert.deepEqual(getWidgetPreviewLayout({ w: 4, h: 2 }), {
    w: 4,
    h: 2,
    aspectRatio: "4 / 2",
    orientation: "horizontal",
    sizeKey: "4x2",
  });

  assert.equal(getWidgetPreviewLayout({ w: 1, h: 4 }).orientation, "vertical");
  assert.equal(getWidgetPreviewLayout({ w: 2, h: 2 }).orientation, "square");
});

test("weather exposes a live preview renderer", () => {
  installDom();
  const preview = createLiveWidgetPreview({ kind: "weather", variant: "adaptive-weather", size: { w: 4, h: 2 } });
  assert.equal(getWidgetPreviewRenderer({ kind: "weather" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "weather" }), true);
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "weather");
  assert.equal(preview?.dataset.size, "4x2");
  assert.equal(preview?.childNodes.length, 1);
});

test("weather narrative exposes a live preview renderer", () => {
  installDom();
  const setInterval = globalThis.setInterval;
  globalThis.setInterval = () => null;
  let preview;
  try {
    preview = createLiveWidgetPreview({
      kind: "weather-narrative",
      variant: "weather-narrative",
      size: { w: 4, h: 2 },
    });
  } finally {
    globalThis.setInterval = setInterval;
  }

  assert.equal(getWidgetPreviewRenderer({ kind: "weather-narrative" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "weather-narrative" }), true);
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "weather-narrative");
  assert.equal(preview?.dataset.size, "4x2");
  assert.equal(preview?.childNodes.length, 1);
});

test("weather metric exposes a live preview renderer with fallback preview data", () => {
  installDom();
  const preview = createLiveWidgetPreview({
    kind: "weather-metric",
    variant: "weather-metric-square",
    size: { w: 2, h: 2 },
    metricKey: "air-quality-pm25",
    sourceType: "entity",
    entityId: "sensor.real_pm25",
    unit: "µg/m³",
  });

  assert.equal(getWidgetPreviewRenderer({ kind: "weather-metric" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "weather-metric" }), true);
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "weather-metric");
  assert.equal(preview?.dataset.size, "2x2");
  assert.equal(preview?.childNodes.length, 1);
});

test("weather radar exposes a live 4x3 preview", () => {
  installDom();
  const preview = createLiveWidgetPreview({
    kind: "weather-radar",
    variant: "weather-radar",
    size: { w: 4, h: 3 },
  });

  assert.equal(getWidgetPreviewRenderer({ kind: "weather-radar" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "weather-radar" }), true);
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "weather-radar");
  assert.equal(preview?.dataset.size, "4x3");
  assert.equal(preview?.childNodes.length, 1);
});

test("weather radar remains visible after an unchanged Home Assistant update", () => {
  installDom();
  const hass = {
    states: {
      "camera.home_radar": {
        entity_id: "camera.home_radar",
        state: "streaming",
        attributes: {
          entity_picture: "https://ha.local/api/camera_proxy/camera.home_radar?token=test",
        },
      },
    },
  };
  const content = createWeatherRadarWidgetContent(
    { entityId: "camera.home_radar" },
    { hass },
  );
  const viewport = content.childNodes[1];
  const image = viewport.childNodes[0];

  assert.equal(viewport.dataset.imageState, "loading");
  image.dispatchEvent({ type: "load" });
  assert.equal(viewport.dataset.imageState, "ready");

  content.__mhaUpdateFromHass(hass);

  assert.equal(viewport.dataset.imageState, "ready");
});
