import test from "node:test";
import assert from "node:assert/strict";

import {
  createPreviewHassMock,
  createWidgetPreviewRenderContext,
  createWidgetRenderContext,
} from "../src/widgets/widget-preview-context.js";

test("normal renderer context remains interactive by default", () => {
  const context = createWidgetRenderContext({ size: { w: 3, h: 1 } });

  assert.equal(context.preview, false);
  assert.equal(context.interactive, true);
  assert.deepEqual(context.size, { w: 3, h: 1 });
  assert.equal(context.widgetW, 3);
  assert.equal(context.widgetH, 1);
});

test("preview renderer context is sandboxed and non-interactive", () => {
  const context = createWidgetPreviewRenderContext({ size: { w: 4, h: 2 } });

  assert.equal(context.preview, true);
  assert.equal(context.interactive, false);
  assert.deepEqual(context.size, { w: 4, h: 2 });
  assert.equal(context.widgetW, 4);
  assert.equal(context.widgetH, 2);
  assert.equal(typeof context.hass.callService, "function");
  assert.equal(typeof context.hass.callWS, "function");
  assert.equal(context.hass.states["weather.home"].attributes.temperature, 22);
});

test("preview hass mock accepts overrides", async () => {
  const hass = createPreviewHassMock({ callWS: async () => ["ok"] });
  assert.deepEqual(await hass.callWS(), ["ok"]);
});
