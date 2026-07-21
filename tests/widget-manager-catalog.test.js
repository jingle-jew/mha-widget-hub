import test from "node:test";
import assert from "node:assert/strict";
import { WIDGET_MANAGER_CATEGORIES } from "../src/widget-manager/widget-manager.js";
import { getWidgetRendererName } from "../src/widgets/widget-registry.js";
import { hasWidgetContentRenderer } from "../src/widgets/widget-renderers.js";

test("widget manager only exposes concrete renderable widgets", () => {
  const categories = WIDGET_MANAGER_CATEGORIES;
  const items = categories.flatMap(category => category.widgets);
  const weatherBrief = items.find(item => item.kind === "weather-metric" && item.metricKey === "summary");

  assert.ok(categories.every(category => category.widgets.length > 0));
  assert.ok(items.length > 0);
  assert.ok(items.every(item => item.kind !== "empty"));
  assert.ok(items.every(item => item.kind !== "toggle-buttons"));
  assert.ok(items.every(item => item.kind !== "slider"));
  assert.ok(items.every(item => item.kind !== "scenes"));
  assert.ok(items.every(item => item.variant !== "temperature-slider"));
  assert.equal(items.some(item => item.kind === "weather-narrative"), false);
  assert.equal(weatherBrief?.variant, "weather-metric-text-tall");
  assert.equal(weatherBrief?.sourceType, "weather-attribute");
  assert.equal(weatherBrief?.valueKind, "text");
  assert.deepEqual(weatherBrief?.size, { w: 4, h: 2 });
  assert.ok(items.filter(item => ["button", "toggle"].includes(item.kind)).every(
    item => item.category === "lights",
  ));
  assert.ok(items.every(item => {
    const renderer = getWidgetRendererName(item);
    return renderer && renderer !== "empty" && hasWidgetContentRenderer(renderer);
  }));
});

test("placeholder-only categories are absent and security exposes the camera widget", () => {
  const categoryIds = WIDGET_MANAGER_CATEGORIES.map(category => category.id);
  const security = WIDGET_MANAGER_CATEGORIES.find(category => category.id === "security");
  assert.ok(!categoryIds.includes("actions"));
  assert.ok(categoryIds.includes("security"));
  assert.ok(security?.widgets.some(item => item.kind === "camera"));
  assert.ok(!categoryIds.includes("system"));
});

test("widget manager categories expose icon names instead of legacy glyph text", () => {
  const iconsByCategory = Object.fromEntries(
    WIDGET_MANAGER_CATEGORIES.map(category => [category.id, category.icon]),
  );

  assert.equal(iconsByCategory.utilities, "clock");
  assert.equal(iconsByCategory.lights, "light");
  assert.equal(iconsByCategory.climate, "temperature");
  assert.equal(iconsByCategory.media, "media-player");
});

test("lights category includes switches and replaces actions", () => {
  const lights = WIDGET_MANAGER_CATEGORIES.find(category => category.id === "lights");

  assert.equal(lights?.label, "Lights & switches");
  assert.ok(lights?.widgets.some(item => item.kind === "button"));
  assert.ok(lights?.widgets.some(item => item.kind === "toggle"));
});
