import assert from "node:assert/strict";
import test from "node:test";

import {
  RUNTIME_ACTIVITY_STATES,
  createActivityCoordinator,
  isHostRuntimeCovered,
} from "../src/core/activity-coordinator.js";

function createHarness({ idleAfterMs = 1000 } = {}) {
  let timestamp = 0;
  let nextTimerId = 1;
  const timers = new Map();
  const listeners = new Map();
  const documentRef = {
    visibilityState: "visible",
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type, callback) {
      if (listeners.get(type) === callback) listeners.delete(type);
    },
  };
  const host = { dataset: {} };
  let covered = false;
  const coordinator = createActivityCoordinator({
    host,
    documentRef,
    idleAfterMs,
    now: () => timestamp,
    isCovered: () => covered,
    setTimeoutRef(callback, delay) {
      const id = nextTimerId;
      nextTimerId += 1;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeoutRef(id) {
      timers.delete(id);
    },
  });
  return {
    coordinator,
    documentRef,
    host,
    listeners,
    timers,
    setCovered(value) { covered = value; },
    setTimestamp(value) { timestamp = value; },
  };
}

test("runtime coverage ignores stale presentation classes", () => {
  const host = {
    _getScreensaverVisible: () => false,
    _settingsOpen: false,
    _screensaverSettingsOpen: false,
    _widgetSurfaceOpen: false,
    classList: {
      contains: () => true,
    },
  };

  assert.equal(isHostRuntimeCovered(host), false);
  host._widgetSurfaceOpen = true;
  assert.equal(isHostRuntimeCovered(host), true);
});

test("native window timers keep their required Window receiver", () => {
  const timerWindow = {};
  const calls = [];
  const documentRef = {
    defaultView: timerWindow,
    visibilityState: "visible",
    addEventListener() {},
    removeEventListener() {},
  };
  let nextTimerId = 0;
  const coordinator = createActivityCoordinator({
    documentRef,
    now: () => 0,
    setTimeoutRef(callback, delay) {
      assert.equal(this, timerWindow);
      calls.push(["set", delay]);
      nextTimerId += 1;
      return nextTimerId;
    },
    clearTimeoutRef(timerId) {
      assert.equal(this, timerWindow);
      calls.push(["clear", timerId]);
    },
  });

  coordinator.start();
  coordinator.markActive();
  coordinator.stop();

  assert.ok(calls.some(([type]) => type === "set"));
  assert.ok(calls.some(([type]) => type === "clear"));
});

test("activity coordinator exposes active, idle-visible, covered, and hidden states", () => {
  const harness = createHarness();
  const { coordinator, documentRef, host } = harness;
  coordinator.start();
  assert.equal(coordinator.read(), RUNTIME_ACTIVITY_STATES.ACTIVE);
  assert.equal(host.dataset.runtimeActivity, "active");

  harness.setTimestamp(1000);
  coordinator.sync();
  assert.equal(coordinator.read(), RUNTIME_ACTIVITY_STATES.IDLE_VISIBLE);

  harness.setCovered(true);
  coordinator.sync();
  assert.equal(coordinator.read(), RUNTIME_ACTIVITY_STATES.COVERED);

  documentRef.visibilityState = "hidden";
  harness.listeners.get("visibilitychange")();
  assert.equal(coordinator.read(), RUNTIME_ACTIVITY_STATES.HIDDEN);

  documentRef.visibilityState = "visible";
  harness.setCovered(false);
  coordinator.markActive();
  assert.equal(coordinator.read(), RUNTIME_ACTIVITY_STATES.ACTIVE);
});

test("hidden state cancels cadence timers and reconciles once when visible again", () => {
  const harness = createHarness();
  const calls = [];
  harness.coordinator.subscribeCadence("second", (_date, detail) => calls.push(detail));
  harness.coordinator.start();
  assert.equal(calls.length, 1);
  assert.ok(harness.timers.size > 0);

  harness.documentRef.visibilityState = "hidden";
  harness.listeners.get("visibilitychange")();
  assert.equal(harness.timers.size, 0);
  assert.equal(harness.coordinator.runCadences({ force: true }), 0);

  harness.setTimestamp(5000);
  harness.documentRef.visibilityState = "visible";
  harness.listeners.get("visibilitychange")();
  assert.equal(calls.length, 2);
  assert.equal(calls[1].reconcile, true);
});

test("cadence scopes separate dashboard work from covered overlay work", () => {
  const harness = createHarness();
  let dashboardCalls = 0;
  let overlayCalls = 0;
  harness.coordinator.subscribeCadence("second", () => { dashboardCalls += 1; }, { scope: "dashboard" });
  harness.coordinator.subscribeCadence("second", () => { overlayCalls += 1; }, { scope: "overlay" });
  harness.coordinator.start();
  assert.equal(dashboardCalls, 1);
  assert.equal(overlayCalls, 0);

  harness.setCovered(true);
  harness.coordinator.sync();
  harness.setTimestamp(1000);
  harness.coordinator.runCadences();
  assert.equal(dashboardCalls, 1);
  assert.equal(overlayCalls, 1);

  harness.coordinator.markActive();
  harness.setCovered(false);
  harness.coordinator.sync();
  harness.setTimestamp(2000);
  harness.coordinator.runCadences();
  assert.equal(dashboardCalls, 2);
  assert.equal(overlayCalls, 1);
});

test("one viewport observer publishes visibility and runtime state to tracked widgets", () => {
  let observerCallback = null;
  const observed = [];
  class FakeIntersectionObserver {
    constructor(callback) { observerCallback = callback; }
    observe(element) { observed.push(element); }
    unobserve() {}
    disconnect() {}
  }
  const harness = createHarness();
  harness.coordinator.IntersectionObserverClass = FakeIntersectionObserver;
  const calls = [];
  const component = {
    dataset: {},
    __mhaSetRuntimeActivity: state => calls.push(["activity", state]),
  };
  const cleanup = harness.coordinator.observeViewport(component, visible => calls.push(["viewport", visible]));
  assert.equal(observed[0], component);
  assert.equal(component.dataset.runtimeViewport, "hidden");
  observerCallback([{ target: component, isIntersecting: true, intersectionRatio: 1 }]);
  assert.equal(component.dataset.runtimeViewport, "visible");
  assert.deepEqual(calls, [
    ["activity", "active"],
    ["viewport", false],
    ["viewport", true],
  ]);
  cleanup();
  assert.equal(component.dataset.runtimeViewport, undefined);
});
