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
      node.hidden = false;
      node.querySelector = () => null;
      node.querySelectorAll = () => [];
      node.setAttribute = (name, value) => { node[name] = value; };
      node.append = (...children) => node.childNodes.push(...children);
      node.replaceChildren = (...children) => { node.childNodes = [...children]; };
      return node;
    },
  };
}

test("clock exposes a live preview renderer", () => {
  installDom();
  assert.equal(getWidgetPreviewRenderer({ kind: "clock" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "clock" }), true);

  const preview = createLiveWidgetPreview({ kind: "clock", variant: "digital", size: { w: 2, h: 2 } });
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "clock");
  assert.equal(preview?.dataset.size, "2x2");
  assert.equal(preview?.childNodes.length, 1);
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

test("weather exposes a live preview renderer", () => {
  installDom();
  const preview = createLiveWidgetPreview({ kind: "weather", variant: "adaptive-weather", size: { w: 4, h: 2 } });
  assert.equal(getWidgetPreviewRenderer({ kind: "weather" }).mode, "live");
  assert.equal(hasLiveWidgetPreview({ kind: "weather" }), true);
  assert.equal(preview?.className, "mha-widget-manager-live-preview");
  assert.equal(preview?.dataset.kind, "weather");
  assert.equal(preview?.dataset.size, "4x2");
  assert.equal(preview?.childNodes.length, 1);
});
