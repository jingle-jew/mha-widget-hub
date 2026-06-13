import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWidgetSize } from "../src/layout/layout-engine.js";
import {
  normalizeWidgetContract,
  resolveWidgetKind,
} from "../src/widgets/widget-registry.js";
import {
  getNextWidgetVariantEntries,
  getWidgetVariants,
} from "../src/widgets/widget-variants.js";

test("legacy widget identities resolve to a canonical kind", () => {
  assert.equal(resolveWidgetKind({ type: "weather-widget" }), "weather");
  assert.equal(resolveWidgetKind({ component: "toggle-slider-widget" }), "toggle-slider");
  assert.equal(resolveWidgetKind({ variant: "light-slider-vertical" }), "slider");
  assert.equal(resolveWidgetKind({ id: "slot-f" }), "slider");
});

test("normalization migrates toggle-slider entity aliases", () => {
  const widget = normalizeWidgetContract({
    type: "combined-slider-toggle",
    entity_id: "light.kitchen",
    w: 99,
    h: 1,
  }, normalizeWidgetSize);

  assert.deepEqual(
    {
      kind: widget.kind,
      type: widget.type,
      component: widget.component,
      lightEntityId: widget.lightEntityId,
      entityId: widget.entityId,
      sliderMode: widget.sliderMode,
      w: widget.w,
      h: widget.h,
    },
    {
      kind: "toggle-slider",
      type: "toggle-slider",
      component: "toggle-slider-widget",
      lightEntityId: "light.kitchen",
      entityId: "light.kitchen",
      sliderMode: "brightness",
      w: 4,
      h: 2,
    },
  );
});

test("normalization preserves standalone slider configuration", () => {
  const widget = normalizeWidgetContract({
    kind: "slider",
    variant: "volume-slider",
    entity_id: "media_player.salon",
    label: "Salon",
    w: 4,
    h: 1,
  }, normalizeWidgetSize);

  assert.deepEqual(
    {
      kind: widget.kind,
      variant: widget.variant,
      entityId: widget.entityId,
      sliderAction: widget.sliderAction,
      label: widget.label,
    },
    {
      kind: "slider",
      variant: "volume-slider",
      entityId: "media_player.salon",
      sliderAction: "volume",
      label: "Salon",
    },
  );
});

test("slider variants follow widget orientation", () => {
  const horizontal = getWidgetVariants({ kind: "slider", w: 4, h: 1 });
  const vertical = getWidgetVariants({ kind: "slider", w: 1, h: 4 });

  assert.equal(horizontal.length, 3);
  assert.ok(horizontal.every(entry => entry.size.h === 1));
  assert.equal(vertical.length, 3);
  assert.ok(vertical.every(entry => entry.size.w === 1));
});

test("variant cycling starts after the current size", () => {
  const entries = getNextWidgetVariantEntries({
    kind: "button",
    variant: "simple-button",
    w: 3,
    h: 1,
  });

  assert.deepEqual(entries[0].size, { w: 4, h: 1 });
  assert.deepEqual(entries.at(-1).size, { w: 3, h: 1 });
});
