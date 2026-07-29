import assert from "node:assert/strict";
import test from "node:test";

import {
  createBootLifecycleCoordinator,
  handleRuntimeUserActivity,
} from "../src/core/boot-lifecycle-coordinator.js";
import { bindComponentHassContract } from "../src/core/hass-update-router.js";

function createHost(stateRef) {
  let componentUpdates = 0;
  let screensaverUpdates = 0;
  const component = {
    __mhaUpdateFromHass() {
      componentUpdates += 1;
    },
  };
  bindComponentHassContract(component, { kind: "toggle", entityId: "light.kitchen" });
  const host = {
    _hass: { states: { "light.kitchen": { state: "on", attributes: {} } } },
    _lastRoutedHass: null,
    _hassReconcilePending: false,
    _getActivityCoordinator: () => ({ read: () => stateRef.value }),
    shadowRoot: { querySelectorAll: () => [component] },
    _screensaverCoordinator: {
      requestNowBarCalendarEvents() {
        screensaverUpdates += 1;
      },
    },
    _syncScreensaverDom() {
      screensaverUpdates += 1;
    },
  };
  return {
    host,
    counts: () => ({ componentUpdates, screensaverUpdates }),
  };
}

test("hidden HA updates do no render work and reconcile exactly once when visible", () => {
  const stateRef = { value: "hidden" };
  const { host, counts } = createHost(stateRef);
  const lifecycle = createBootLifecycleCoordinator(host);

  const deferred = lifecycle.updateFromHass();
  assert.equal(deferred.deferred, true);
  assert.equal(host._hassReconcilePending, true);
  assert.deepEqual(counts(), { componentUpdates: 0, screensaverUpdates: 0 });

  stateRef.value = "active";
  const reconciled = lifecycle.updateFromHass();
  assert.equal(reconciled.updateCount, 1);
  assert.equal(host._hassReconcilePending, false);
  assert.deepEqual(counts(), { componentUpdates: 1, screensaverUpdates: 2 });

  const unchanged = lifecycle.updateFromHass();
  assert.equal(unchanged.updateCount, 0);
  assert.deepEqual(counts(), { componentUpdates: 1, screensaverUpdates: 4 });
});

test("user activity wakes the screensaver before runtime coverage is reconciled", () => {
  const calls = [];
  handleRuntimeUserActivity({
    _handleUserActivity() {
      calls.push("wake");
    },
  }, {
    markActive() {
      calls.push("reconcile");
    },
  });

  assert.deepEqual(calls, ["wake", "reconcile"]);
});

function installBootRevealGlobals() {
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
    setTimeout: globalThis.setTimeout,
    clearTimeout: globalThis.clearTimeout,
  };
  let timeoutCallback = null;

  globalThis.window = {
    matchMedia: () => ({ matches: false }),
  };
  globalThis.document = {
    getElementById: () => null,
  };
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setTimeout = (callback) => {
    timeoutCallback = callback;
    return 41;
  };
  globalThis.clearTimeout = () => {};

  return {
    runTimeout() {
      const callback = timeoutCallback;
      timeoutCallback = null;
      callback?.();
    },
    restore() {
      Object.entries(previous).forEach(([name, value]) => {
        if (value === undefined) delete globalThis[name];
        else globalThis[name] = value;
      });
    },
  };
}

function createBootRevealHost({ activityState = "active", animations = [] } = {}) {
  const classes = new Set();
  let deferredUiAppends = 0;
  let animationReads = 0;
  let dockStateSyncs = 0;
  let runtimeSyncs = 0;
  const grid = {
    getAnimations() {
      animationReads += 1;
      return animations;
    },
  };
  const host = {
    isConnected: true,
    _bootComplete: false,
    _bootWatchdog: 0,
    _bootRevealTimer: 0,
    _readyRaf: 0,
    _pendingDeferredUi: { layout: "desktop", renderId: 1 },
    dataset: {},
    classList: {
      add: name => classes.add(name),
      remove: name => classes.delete(name),
    },
    setAttribute() {},
    shadowRoot: {
      querySelector(selector) {
        return selector === ".mha-grid" ? grid : null;
      },
    },
    _getActivityCoordinator: () => ({ read: () => activityState }),
    _appendDeferredUi() {
      deferredUiAppends += 1;
    },
    _syncRuntimeActivity() {
      runtimeSyncs += 1;
    },
    _updateDockActiveState() {
      dockStateSyncs += 1;
    },
    _scheduleIconSymbolRefresh() {},
  };

  return {
    host,
    read: () => ({
      animationReads,
      deferredUiAppends,
      dockStateSyncs,
      runtimeSyncs,
      revealing: classes.has("is-boot-revealing"),
    }),
  };
}

test("boot reveal finalizes immediately when runtime animations are covered", () => {
  const globals = installBootRevealGlobals();
  try {
    const harness = createBootRevealHost({ activityState: "covered" });
    createBootLifecycleCoordinator(harness.host).finishBoot();

    assert.deepEqual(harness.read(), {
      animationReads: 0,
      deferredUiAppends: 1,
      dockStateSyncs: 1,
      runtimeSyncs: 1,
      revealing: false,
    });
  } finally {
    globals.restore();
  }
});

test("boot reveal has a bounded fallback for a paused finite animation", () => {
  const globals = installBootRevealGlobals();
  try {
    const harness = createBootRevealHost({
      animations: [{
        effect: { getTiming: () => ({ iterations: 1 }) },
        finished: new Promise(() => {}),
      }],
    });
    createBootLifecycleCoordinator(harness.host).finishBoot();

    assert.deepEqual(harness.read(), {
      animationReads: 1,
      deferredUiAppends: 0,
      dockStateSyncs: 0,
      runtimeSyncs: 0,
      revealing: true,
    });

    globals.runTimeout();
    assert.deepEqual(harness.read(), {
      animationReads: 1,
      deferredUiAppends: 1,
      dockStateSyncs: 1,
      runtimeSyncs: 1,
      revealing: false,
    });
  } finally {
    globals.restore();
  }
});
