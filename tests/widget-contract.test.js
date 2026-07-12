import test from "node:test";
import assert from "node:assert/strict";
import { normalizeWidgetSize } from "../src/layout/layout-engine.js";
import {
  getWidgetCapabilities,
  getWidgetCatalogEntries,
  getWidgetCreationDefaults,
  getWidgetConfigType,
  getWidgetManagerBehavior,
  getWidgetPlacementFlow,
  getWidgetRendererName,
  getWidgetShellBehavior,
  getWidgetStorageAdapter,
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

test("weather-capable widgets expose configuration without affecting other clocks", () => {
  assert.equal(getWidgetConfigType({ kind: "weather" }), "weather");
  assert.equal(getWidgetConfigType({ kind: "button" }), "button");
  assert.equal(getWidgetConfigType({ kind: "scenes" }), "scenes");
  assert.equal(getWidgetConfigType({ kind: "clock", variant: "digital-weather" }), "weather");
  assert.equal(getWidgetConfigType({ kind: "clock", variant: "digital" }), "");
});

test("widget capabilities and flows are read from the widget contract", () => {
  assert.equal(getWidgetCapabilities({ kind: "clock", variant: "digital" }).configurable, false);
  assert.equal(getWidgetCapabilities({ kind: "clock", variant: "digital-weather" }).weatherEntityConfigurable, true);
  assert.equal(getWidgetShellBehavior({ kind: "clock", variant: "digital" }).configureMode, "variant");
  assert.equal(getWidgetShellBehavior({ kind: "clock", variant: "digital-weather" }).configureMode, "config");
  assert.equal(getWidgetShellBehavior({ kind: "scenes" }).configureMode, "variant");
  assert.equal(getWidgetPlacementFlow({ kind: "scenes" }), "slot-config-first");
  assert.equal(getWidgetPlacementFlow({ kind: "button" }), "configure-first");
  assert.equal(getWidgetPlacementFlow({ kind: "clock" }), "direct");
  assert.equal(getWidgetCapabilities({ kind: "weather", displayMode: "current" }).resizable, true);
  assert.equal(getWidgetCapabilities({ kind: "weather", displayMode: "forecast" }).resizable, false);
});

test("widget manager visibility is declared in widget definitions", async () => {
  const { WIDGET_REGISTRY } = await import("../src/widgets/widget-registry.js");
  assert.equal(WIDGET_REGISTRY.empty.manager.hidden, true);
  assert.equal(WIDGET_REGISTRY["toggle-buttons"].manager.hidden, true);
  assert.equal(
    getWidgetCatalogEntries({ kind: "slider" }).some((entry) => entry.variant === "temperature-slider" && entry.hidden),
    true,
  );
});

test("contract helpers expose stable manager, renderer, and creation defaults", () => {
  assert.equal(getWidgetManagerBehavior({ kind: "toggle-buttons" }).hidden, true);
  assert.equal(getWidgetRendererName({ kind: "weather" }), "weather");
  assert.deepEqual(getWidgetCreationDefaults({ kind: "clock" }), {
    kind: "clock",
    component: "clock-widget",
    category: "utilities",
    defaultVariant: "digital",
    defaultSize: { w: 2, h: 2 },
  });
});

test("migrated widgets expose storage adapters from their definitions", () => {
  assert.equal(typeof getWidgetStorageAdapter({ kind: "clock" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "slider" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "toggle" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "button" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "weather" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "scenes" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "toggle-slider" }).normalize, "function");
  assert.equal(typeof getWidgetStorageAdapter({ kind: "media" }).normalize, "function");
});

test("normalization preserves button and weather entity bindings", () => {
  const button = normalizeWidgetContract({
    kind: "button",
    entity_id: "switch.coffee",
  }, normalizeWidgetSize);
  const weather = normalizeWidgetContract({
    kind: "weather",
    entity_id: "weather.home",
    forecastType: "hourly",
  }, normalizeWidgetSize);
  const scenes = normalizeWidgetContract({
    kind: "scenes",
    buttons: [
      { type: "mode", entity_id: "scene.movie_time" },
      { type: "routine", entityId: "script.good_night" },
    ],
  }, normalizeWidgetSize);
  const clock = normalizeWidgetContract({
    kind: "clock",
    variant: "digital-weather",
    entity_id: "weather.home",
  }, normalizeWidgetSize);

  assert.equal(button.entityId, "switch.coffee");
  assert.equal(weather.entityId, "weather.home");
  assert.equal(weather.forecastType, "hourly");
  assert.equal(scenes.buttons[0].entityId, "scene.movie_time");
  assert.equal(scenes.buttons[1].entityId, "script.good_night");
  assert.equal(clock.entityId, "weather.home");
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

test("normalization preserves standalone toggle entity configuration", () => {
  const widget = normalizeWidgetContract({
    kind: "toggle",
    entity_id: "switch.coffee",
    label: "Cafetière",
    w: 4,
    h: 1,
  }, normalizeWidgetSize);

  assert.deepEqual(
    {
      kind: widget.kind,
      variant: widget.variant,
      entityId: widget.entityId,
      label: widget.label,
    },
    {
      kind: "toggle",
      variant: "toggle-widget",
      entityId: "switch.coffee",
      label: "Cafetière",
    },
  );
});

test("normalization preserves media entity aliases", () => {
  const widget = normalizeWidgetContract({
    kind: "media",
    entity_id: "media_player.salon",
    label: "Salon",
  }, normalizeWidgetSize);

  assert.deepEqual(
    {
      kind: widget.kind,
      entityId: widget.entityId,
      mediaEntityId: widget.mediaEntityId,
      label: widget.label,
    },
    {
      kind: "media",
      entityId: "media_player.salon",
      mediaEntityId: "media_player.salon",
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

test("weather metric variants depend on the metric kind", () => {
  const metricVariants = getWidgetVariants({
    kind: "weather-metric",
    metricKey: "wind",
    w: 2,
    h: 2,
  });
  const sunVariants = getWidgetVariants({
    kind: "weather-metric",
    metricKey: "sun",
    w: 4,
    h: 1,
  });
  const summaryVariants = getWidgetVariants({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    w: 4,
    h: 2,
  });
  const tendencyVariants = getWidgetVariants({
    kind: "weather-metric",
    metricKey: "pressure-tendency",
    valueKind: "text",
    w: 2,
    h: 1,
  });

  assert.deepEqual(metricVariants.map(entry => entry.size), [
    { w: 2, h: 2 },
    { w: 2, h: 1 },
  ]);
  assert.deepEqual(sunVariants.map(entry => entry.size), [
    { w: 2, h: 2 },
    { w: 4, h: 1 },
  ]);
  assert.deepEqual(summaryVariants.map(entry => entry.size), [
    { w: 4, h: 2 },
    { w: 4, h: 1 },
  ]);
  assert.deepEqual(tendencyVariants.map(entry => entry.size), [
    { w: 2, h: 1 },
    { w: 4, h: 1 },
  ]);
});

test("weather metric size normalization preserves compact contracts", () => {
  const metric = normalizeWidgetContract({
    kind: "weather-metric",
    metricKey: "humidity",
    w: 4,
    h: 1,
  }, normalizeWidgetSize);
  const sun = normalizeWidgetContract({
    kind: "weather-metric",
    metricKey: "sun",
    w: 4,
    h: 1,
  }, normalizeWidgetSize);
  const summary = normalizeWidgetContract({
    kind: "weather-metric",
    metricKey: "summary",
    valueKind: "text",
    w: 4,
    h: 2,
  }, normalizeWidgetSize);
  const tendency = normalizeWidgetContract({
    kind: "weather-metric",
    metricKey: "pressure-tendency",
    valueKind: "text",
    w: 2,
    h: 2,
  }, normalizeWidgetSize);

  assert.deepEqual({ w: metric.w, h: metric.h }, { w: 2, h: 1 });
  assert.deepEqual({ w: sun.w, h: sun.h }, { w: 4, h: 1 });
  assert.deepEqual({ w: summary.w, h: summary.h }, { w: 4, h: 2 });
  assert.deepEqual({ w: tendency.w, h: tendency.h }, { w: 2, h: 1 });
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

test("registered widgets expose preview renderer manifests", async () => {
  const { WIDGET_REGISTRY, getWidgetPreviewRenderer } = await import("../src/widgets/widget-registry.js");

  const expectedModes = new Map([
    ["clock", "live"],
    ["weather", "live"],
    ["button", "live"],
    ["toggle", "live"],
    ["slider", "live"],
    ["toggle-slider", "live"],
    ["media", "live"],
    ["scenes", "live"],
    ["weather-metric", "live"],
  ]);

  for (const [kind, definition] of Object.entries(WIDGET_REGISTRY)) {
    const expectedMode = expectedModes.get(kind) || "static";
    assert.equal(definition.previewRenderer.mode, expectedMode, `${kind} should expose its preview mode`);
    assert.equal(getWidgetPreviewRenderer(kind).mode, expectedMode);
  }

  assert.equal(getWidgetPreviewRenderer("unknown-widget").mode, "static");
});

test("config manifests expose widget-owned field renderers", async () => {
  const { WIDGET_CONFIG_REGISTRY } = await import("../src/widget-config/widget-config-registry.js");

  assert.equal(typeof WIDGET_CONFIG_REGISTRY.button.renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY.slider.renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY.toggle.renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY["toggle-slider"].renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY.weather.renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY.media.renderFields, "function");
  assert.equal(typeof WIDGET_CONFIG_REGISTRY.scenes.renderFields, "function");
});
