import test from "node:test";
import assert from "node:assert/strict";

import { getWidgetPreviewRenderer } from "../src/widgets/widget-registry.js";
import { createLiveWidgetPreview, hasLiveWidgetPreview } from "../src/widgets/widget-preview-renderer.js";

function installDom() {
  class FakeNode {}
  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement(tag) {
      const node = new FakeNode();
      node.tagName = tag.toUpperCase();
      node.childNodes = [];
      node.dataset = {};
      node.style = { setProperty(name, value) { this[name] = value; } };
      node.className = "";
      node.append = (...children) => node.childNodes.push(...children);
      return node;
    },
  };
}

test("preview renderer falls back to static mode by default", () => {
  assert.equal(getWidgetPreviewRenderer({ kind: "clock" }).mode, "static");
  assert.equal(hasLiveWidgetPreview({ kind: "clock" }), false);
  assert.equal(createLiveWidgetPreview({ kind: "clock", size: { w: 2, h: 2 } }), null);
});

test("live preview renderer returns null when no live manifest is enabled", () => {
  installDom();
  const preview = createLiveWidgetPreview({ kind: "weather", variant: "adaptive-weather", size: { w: 4, h: 2 } });
  assert.equal(preview, null);
});
