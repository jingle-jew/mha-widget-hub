import assert from "node:assert/strict";
import test from "node:test";

import {
  createSystemMessagePopup,
  normalizeSystemMessageVariant,
  showSystemMessage,
} from "../src/system/system-message-popup.js";
import { SYSTEM_ICONS } from "../src/system/system-icons.js";
import { getStyleManifest } from "../src/styles/style-manifest.js";
import { resolveTablerIconName } from "../src/ui/tabler-icons.js";

function createFakeNode(tagName) {
  return {
    tagName,
    attributes: {},
    children: [],
    className: "",
    dataset: {},
    textContent: "",
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    append(...nodes) {
      this.children.push(...nodes);
    },
    replaceChildren(...nodes) {
      this.children = [...nodes];
    },
  };
}

test("system message popup normalizes its reusable semantic variants", () => {
  assert.equal(normalizeSystemMessageVariant("confirmation"), "confirmation");
  assert.equal(normalizeSystemMessageVariant("warning"), "warning");
  assert.equal(normalizeSystemMessageVariant("error"), "error");
  assert.equal(normalizeSystemMessageVariant("unknown"), "info");
  for (const variant of ["confirmation", "info", "warning", "error"]) {
    assert.notEqual(resolveTablerIconName(SYSTEM_ICONS[variant]), "layout-grid");
  }
});

test("system message popup displays confirmations, system messages, and timed dismissal", () => {
  const previousDocument = globalThis.document;
  const previousSetTimeout = globalThis.setTimeout;
  const previousClearTimeout = globalThis.clearTimeout;
  const timers = new Map();
  let nextTimerId = 1;
  globalThis.document = {
    createElement: createFakeNode,
    createElementNS: (_namespace, tagName) => createFakeNode(tagName),
  };
  globalThis.setTimeout = (callback) => {
    const id = nextTimerId;
    nextTimerId += 1;
    timers.set(id, callback);
    return id;
  };
  globalThis.clearTimeout = id => timers.delete(id);

  try {
    const popup = createSystemMessagePopup({ defaultDuration: 1800 });
    assert.equal(popup.attributes.role, "status");
    assert.equal(popup.attributes["aria-live"], "polite");
    assert.equal(popup.dataset.open, "false");

    assert.equal(showSystemMessage(popup, {
      message: "Preset saved",
      variant: "confirmation",
    }), true);
    assert.equal(popup.dataset.open, "true");
    assert.equal(popup.dataset.variant, "confirmation");
    assert.equal(popup.children[0].children[0].dataset.systemIcon, "confirmation");
    assert.equal(popup.children[1].textContent, "Preset saved");
    assert.equal(timers.size, 1);

    const dismiss = timers.values().next().value;
    timers.clear();
    dismiss?.();
    assert.equal(popup.dataset.open, "false");

    assert.equal(showSystemMessage(popup, {
      message: "Connection failed",
      variant: "error",
      duration: 0,
    }), true);
    assert.equal(popup.attributes.role, "alert");
    assert.equal(popup.attributes["aria-live"], "assertive");
    assert.equal(timers.size, 0);
    popup.__mhaDestroy();
  } finally {
    globalThis.document = previousDocument;
    globalThis.setTimeout = previousSetTimeout;
    globalThis.clearTimeout = previousClearTimeout;
  }
});

test("system message popup styles are loaded by the global style manifest", () => {
  assert(getStyleManifest().some(([path, layer]) => (
    path === "styles/system/system-message-popup.css" && layer === "component"
  )));
});
