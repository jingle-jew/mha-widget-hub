import assert from "node:assert/strict";
import test from "node:test";

import { syncPanelVisibility } from "../src/panels/panel-visibility-controller.js";

function createPanel() {
  return {
    dataset: {},
    attributes: {},
    style: {
      properties: {},
      setProperty(name, value) {
        this.properties[name] = value;
      },
    },
    hidden: false,
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
}

test("syncPanelVisibility queues open state and exposes the transition duration as a css var", () => {
  const previousRequestAnimationFrame = globalThis.requestAnimationFrame;
  const callbacks = [];
  globalThis.requestAnimationFrame = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };

  try {
    const panel = createPanel();
    syncPanelVisibility(panel, true, { transitionMs: 360 });

    assert.equal(panel.hidden, false);
    assert.equal(panel.dataset.open, "false");
    assert.equal(panel.attributes["aria-hidden"], "false");
    assert.equal(panel.style.properties["--mha-panel-visibility-duration"], "360ms");

    callbacks.forEach(callback => callback());
    assert.equal(panel.dataset.open, "true");
  } finally {
    globalThis.requestAnimationFrame = previousRequestAnimationFrame;
  }
});

test("syncPanelVisibility keeps a panel visible until the close animation completes", () => {
  const previousSetTimeout = globalThis.setTimeout;
  const callbacks = [];
  globalThis.setTimeout = (callback) => {
    callbacks.push(callback);
    return callbacks.length;
  };

  try {
    const panel = createPanel();
    panel.dataset.open = "true";

    syncPanelVisibility(panel, false, {
      transitionMs: 300,
      closeStateDatasetKey: "panelCloseState",
    });

    assert.equal(panel.dataset.open, "false");
    assert.equal(panel.dataset.panelCloseState, "closing");
    assert.equal(panel.hidden, false);
    assert.equal(panel.attributes["aria-hidden"], "true");

    callbacks.forEach(callback => callback());
    assert.equal(panel.hidden, true);
    assert.equal(panel.dataset.panelCloseState, undefined);
  } finally {
    globalThis.setTimeout = previousSetTimeout;
  }
});
