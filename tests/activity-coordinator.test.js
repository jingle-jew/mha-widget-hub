import assert from "node:assert/strict";
import test from "node:test";

import {
  RUNTIME_ACTIVITY_STATES,
  createActivityCoordinator,
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
