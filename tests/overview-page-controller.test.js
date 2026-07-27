import test from "node:test";
import assert from "node:assert/strict";

import { createOverviewPageController } from "../src/pages/overview-page-controller.js";

function createTimerHarness({ mobile = false } = {}) {
  const callbacks = new Map();
  const cleared = [];
  const changes = [];
  let nextId = 1;
  const controller = createOverviewPageController({
    mobile,
    config: { inactivitySeconds: 15 },
    setTimeoutFn: (callback, delay) => {
      const id = nextId++;
      callbacks.set(id, { callback, delay });
      return id;
    },
    clearTimeoutFn: (id) => {
      cleared.push(id);
      callbacks.delete(id);
    },
    onStateChange: (state, reason) => changes.push({ state, reason }),
  });
  return { controller, callbacks, cleared, changes };
}

test("overview runtime starts neutral and keeps exactly one selected room", () => {
  const { controller } = createTimerHarness();
  assert.deepEqual(controller.read(), {
    selectedAreaId: "",
    editingSection: "",
    sheetOpen: false,
  });

  assert.equal(controller.selectArea("living"), true);
  assert.equal(controller.read().selectedAreaId, "living");
  assert.equal(controller.selectArea("kitchen"), true);
  assert.equal(controller.read().selectedAreaId, "kitchen");
  assert.equal(controller.read().sheetOpen, false);
});

test("overview inactivity is restarted by activity and clears selection on expiry", () => {
  const { controller, callbacks, cleared, changes } = createTimerHarness();
  controller.selectArea("living");
  const firstTimer = controller.inactivityTimer;
  assert.equal(callbacks.get(firstTimer)?.delay, 15_000);

  assert.equal(controller.activity(), true);
  const secondTimer = controller.inactivityTimer;
  assert.notEqual(secondTimer, firstTimer);
  assert.deepEqual(cleared, [firstTimer]);

  callbacks.get(secondTimer).callback();
  assert.equal(controller.read().selectedAreaId, "");
  assert.equal(changes.at(-1).reason, "inactivity-expired");
});

test("overview local editing sections are isolated and suspend inactivity", () => {
  const { controller, callbacks } = createTimerHarness();
  controller.selectArea("living");
  assert.equal(controller.setEditingSection("rooms"), true);
  assert.equal(controller.read().editingSection, "rooms");
  assert.equal(callbacks.size, 0);
  assert.equal(controller.activity(), false);

  assert.equal(controller.setEditingSection("devices"), true);
  assert.equal(controller.read().editingSection, "devices");
  assert.equal(controller.setEditingSection(""), true);
  assert.equal(callbacks.size, 1);
});

test("mobile overview couples room selection and sheet state", () => {
  const { controller, callbacks } = createTimerHarness({ mobile: true });
  controller.selectArea("living");
  assert.deepEqual(controller.read(), {
    selectedAreaId: "living",
    editingSection: "",
    sheetOpen: true,
  });

  assert.equal(controller.closeSheet(), true);
  assert.deepEqual(controller.read(), {
    selectedAreaId: "",
    editingSection: "",
    sheetOpen: false,
  });
  assert.equal(callbacks.size, 0);
});

test("mobile inactivity expiry closes the sheet and clears the active room", () => {
  const { controller, callbacks, changes } = createTimerHarness({ mobile: true });
  controller.selectArea("living");

  callbacks.get(controller.inactivityTimer).callback();

  assert.deepEqual(controller.read(), {
    selectedAreaId: "",
    editingSection: "",
    sheetOpen: false,
  });
  assert.equal(changes.at(-1).reason, "inactivity-expired");
});

test("overview controller destruction cleans timers and ignores later activity", () => {
  const { controller, callbacks, cleared } = createTimerHarness({ mobile: true });
  controller.selectArea("living");
  const timer = controller.inactivityTimer;
  controller.destroy();

  assert.equal(callbacks.size, 0);
  assert.deepEqual(cleared, [timer]);
  assert.equal(controller.activity(), false);
  assert.equal(controller.selectArea("kitchen"), false);
});
