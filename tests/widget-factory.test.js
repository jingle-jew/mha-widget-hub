import test from "node:test";
import assert from "node:assert/strict";
import {
  createWidgetFromCatalogItem,
} from "../src/widgets/widget-factory.js";

const deterministicId = {
  now: () => 123456789,
  random: () => 0.123456789,
};

test("catalog items become complete normalized widget contracts", () => {
  const widget = createWidgetFromCatalogItem({
    kind: "button",
    variant: "simple-button",
    label: "Lampe",
    size: { w: 4, h: 1 },
  }, deterministicId);

  assert.deepEqual(widget, {
    id: "widget-actions-simple-button-21i3v9-4fzzz",
    kind: "button",
    type: "button",
    component: "button-widget",
    category: "actions",
    variant: "simple-button",
    title: "Lampe",
    w: 4,
    h: 1,
    entityId: "",
  });
});

test("registry defaults supply missing category, variant, component and size", () => {
  const widget = createWidgetFromCatalogItem({
    kind: "clock",
  }, deterministicId);

  assert.deepEqual(
    {
      id: widget.id,
      kind: widget.kind,
      type: widget.type,
      component: widget.component,
      category: widget.category,
      variant: widget.variant,
      title: widget.title,
      w: widget.w,
      h: widget.h,
    },
    {
      id: "widget-utilities-digital-21i3v9-4fzzz",
      kind: "clock",
      type: "clock",
      component: "clock-widget",
      category: "utilities",
      variant: "digital",
      title: "Widget",
      w: 2,
      h: 2,
    },
  );
});

test("catalog sizes are normalized by the widget kind contract", () => {
  const slider = createWidgetFromCatalogItem({
    kind: "slider",
    variant: "light-slider-vertical",
    size: { w: 8, h: 4 },
  }, deterministicId);
  const toggle = createWidgetFromCatalogItem({
    kind: "toggle",
    size: { w: 1, h: 6 },
  }, deterministicId);

  assert.deepEqual(
    { variant: slider.variant, w: slider.w, h: slider.h },
    { variant: "light-slider-vertical", w: 4, h: 1 },
  );
  assert.deepEqual(
    { variant: toggle.variant, w: toggle.w, h: toggle.h },
    { variant: "toggle-widget", w: 3, h: 1 },
  );
});

test("unregistered catalog items keep the existing empty-widget fallback", () => {
  const widget = createWidgetFromCatalogItem({
    kind: "future-widget",
    label: "Prototype",
  }, deterministicId);

  assert.deepEqual(widget, {
    id: "widget-custom-future-widget-21i3v9-4fzzz",
    kind: "empty",
    type: "empty",
    component: "empty-widget",
    category: "custom",
    variant: "future-widget",
    title: "Prototype",
    w: 2,
    h: 2,
  });
});

test("weather metric catalog items preserve their detected source contract", () => {
  const widget = createWidgetFromCatalogItem({
    kind: "weather-metric",
    variant: "weather-metric-compact",
    label: "Indice UV",
    size: { w: 2, h: 1 },
    metricKey: "uv",
    icon: "uv",
    sourceType: "weather-attribute",
    valueKind: "number",
    weatherEntityId: "weather.home",
    entityId: "weather.home",
    attribute: "uv_index",
    unit: "",
  }, deterministicId);

  assert.equal(widget.kind, "weather-metric");
  assert.equal(widget.variant, "weather-metric-compact");
  assert.equal(widget.metricKey, "uv");
  assert.equal(widget.label, "Indice UV");
  assert.equal(widget.sourceType, "weather-attribute");
  assert.equal(widget.weatherEntityId, "weather.home");
  assert.equal(widget.entityId, "weather.home");
  assert.equal(widget.attribute, "uv_index");
  assert.equal(widget.w, 2);
  assert.equal(widget.h, 1);
});
