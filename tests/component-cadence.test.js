import assert from "node:assert/strict";
import test from "node:test";

import { bindComponentCadence } from "../src/core/component-cadence.js";

test("component cadences subscribe through the host coordinator and clean up", async () => {
  let subscribed = null;
  let cleanupCalls = 0;
  const coordinator = {
    subscribeCadence(cadence, callback, options) {
      subscribed = { cadence, callback, options };
      return () => {
        cleanupCalls += 1;
      };
    },
  };
  const component = {
    getRootNode: () => ({ host: { _getActivityCoordinator: () => coordinator } }),
  };
  const callback = () => {};
  const cleanup = bindComponentCadence(component, "minute", callback, { scope: "dashboard" });
  await Promise.resolve();

  assert.deepEqual(subscribed, {
    cadence: "minute",
    callback,
    options: { scope: "dashboard" },
  });
  cleanup();
  assert.equal(cleanupCalls, 1);
});

test("destroying a component before attachment prevents cadence subscription", async () => {
  let subscriptions = 0;
  const component = {
    getRootNode: () => ({
      host: {
        _getActivityCoordinator: () => ({
          subscribeCadence() {
            subscriptions += 1;
          },
        }),
      },
    }),
  };
  const cleanup = bindComponentCadence(component, "second", () => {});
  cleanup();
  await Promise.resolve();
  assert.equal(subscriptions, 0);
});
