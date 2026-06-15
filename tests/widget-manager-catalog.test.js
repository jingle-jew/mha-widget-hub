import test from "node:test";
import assert from "node:assert/strict";
import { WIDGET_MANAGER_CATEGORIES } from "../src/widget-manager/widget-manager.js";
import { getWidgetDefinition } from "../src/widgets/widget-registry.js";
import { hasWidgetContentRenderer } from "../src/widgets/widget-renderers.js";

test("widget manager only exposes concrete renderable widgets", () => {
  const categories = WIDGET_MANAGER_CATEGORIES;
  const items = categories.flatMap(category => category.widgets);

  assert.ok(categories.every(category => category.widgets.length > 0));
  assert.ok(items.length > 0);
  assert.ok(items.every(item => item.kind !== "empty"));
  assert.ok(items.every(item => item.kind !== "toggle-buttons"));
  assert.ok(items.every(item => item.variant !== "temperature-slider"));
  assert.ok(items.every(item => {
    const renderer = getWidgetDefinition(item)?.renderer;
    return renderer && renderer !== "empty" && hasWidgetContentRenderer(renderer);
  }));
});

test("placeholder-only categories are absent from the widget manager", () => {
  const categoryIds = WIDGET_MANAGER_CATEGORIES.map(category => category.id);
  assert.ok(!categoryIds.includes("security"));
  assert.ok(!categoryIds.includes("system"));
});
