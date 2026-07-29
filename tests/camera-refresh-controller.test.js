import assert from "node:assert/strict";
import test from "node:test";

import { createCameraRefreshController } from "../src/widgets/camera-widget.js";

function createHarness() {
  let requestCount = 0;
  let timerId = 0;
  const timers = new Map();
  const images = [];
  const readyUrls = [];
  const controller = createCameraRefreshController({
    refreshInterval: 5000,
    now: () => 100,
    createImage() {
      requestCount += 1;
      const image = {};
      images.push(image);
      return image;
    },
    setTimeoutRef(callback, delay) {
      timerId += 1;
      timers.set(timerId, { callback, delay });
      return timerId;
    },
    clearTimeoutRef(id) {
      timers.delete(id);
    },
    onImageReady: url => readyUrls.push(url),
  });
  return { controller, images, readyUrls, timers, getRequestCount: () => requestCount };
}

test("camera makes zero requests while hidden, covered, or outside the viewport", () => {
  const harness = createHarness();
  harness.controller.setSourceUrl("/api/camera_proxy/camera.front");
  assert.equal(harness.getRequestCount(), 0);

  harness.controller.setRuntimeActivity("hidden");
  harness.controller.setViewportVisible(true);
  harness.controller.refreshNow();
  assert.equal(harness.getRequestCount(), 0);

  harness.controller.setRuntimeActivity("covered");
  harness.controller.refreshNow();
  assert.equal(harness.getRequestCount(), 0);
  assert.equal(harness.timers.size, 0);
});

test("camera reconciles once on viewport entry and suspends its next refresh", () => {
  const harness = createHarness();
  harness.controller.setSourceUrl("/api/camera_proxy/camera.front");
  harness.controller.setViewportVisible(true);
  assert.equal(harness.getRequestCount(), 1);
  harness.images[0].onload();
  assert.equal(harness.readyUrls.length, 1);
  assert.equal(harness.timers.size, 1);

  harness.controller.setRuntimeActivity("hidden");
  assert.equal(harness.timers.size, 0);
  harness.controller.setRuntimeActivity("active");
  assert.equal(harness.getRequestCount(), 2);
});
