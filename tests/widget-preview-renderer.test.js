import test from "node:test";
import assert from "node:assert/strict";

import { getWidgetPreviewRenderer } from "../src/widgets/widget-registry.js";
import {
  createLiveWidgetPreview,
  getWidgetPreviewLayout,
  hasLiveWidgetPreview,
} from "../src/widgets/widget-preview-renderer.js";

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

test("preview layout exposes size, aspect ratio, and orientation", () => {
  assert.deepEqual(getWidgetPreviewLayout({ w: 4, h: 2 }), {
    w: 4,
    h: 2,
    aspectRatio: "4 / 2",
    orientation: "horizontal",
    sizeKey: "4x2",
  });

  assert.equal(getWidgetPreviewLayout({ w: 1, h: 4 }).orientation, "vertical");
  assert.equal(getWidgetPreviewLayout({ w: 2, h: 2 }).orientation, "square");
});

test("live preview renderer returns null when no live manifest is enabled", () => {
  installDom();
  const preview = createLiveWidgetPreview({ kind: "weather", variant: "adaptive-weather", size: { w: 4, h: 2 } });
  assert.equal(preview, null);
});
