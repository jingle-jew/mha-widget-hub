import assert from "node:assert/strict";
import test from "node:test";

import { createBootLifecycleCoordinator } from "../src/core/boot-lifecycle-coordinator.js";
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
