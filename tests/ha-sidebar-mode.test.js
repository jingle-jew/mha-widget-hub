import assert from "node:assert/strict";
import test from "node:test";

import { applyHaSidebarMode } from "../src/core/ha-sidebar-mode.js";

function createDomHarness() {
  const toggles = [];
  const events = [];

  class TestCustomEvent {
    constructor(type, init = {}) {
      this.type = type;
      this.detail = init.detail;
    }
  }

  return {
    documentRef: {
      documentElement: {
        classList: {
          toggle(className, enabled) {
            toggles.push({ className, enabled });
          },
        },
      },
    },
    windowRef: {
      dispatchEvent(event) {
        events.push(event);
      },
    },
    CustomEventCtor: TestCustomEvent,
    toggles,
    events,
  };
}

test("applyHaSidebarMode hides the Home Assistant sidebar", () => {
  const harness = createDomHarness();

  const result = applyHaSidebarMode(true, harness);

  assert.equal(result, true);
  assert.deepEqual(harness.toggles, [
    { className: "mha-hide-ha-sidebar", enabled: true },
  ]);
  assert.equal(harness.events[0].type, "hass-kiosk-mode");
  assert.deepEqual(harness.events[0].detail, { enable: true });
  assert.equal(harness.events[1].type, "hass-dock-sidebar");
  assert.deepEqual(harness.events[1].detail, { dock: "always_hidden" });
});

test("applyHaSidebarMode restores the Home Assistant sidebar", () => {
  const harness = createDomHarness();

  const result = applyHaSidebarMode(false, harness);

  assert.equal(result, false);
  assert.deepEqual(harness.toggles, [
    { className: "mha-hide-ha-sidebar", enabled: false },
  ]);
  assert.equal(harness.events[0].type, "hass-kiosk-mode");
  assert.deepEqual(harness.events[0].detail, { enable: false });
  assert.equal(harness.events[1].type, "hass-dock-sidebar");
  assert.deepEqual(harness.events[1].detail, { dock: "docked" });
});
