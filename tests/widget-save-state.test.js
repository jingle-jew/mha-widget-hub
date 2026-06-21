import assert from "node:assert/strict";
import test from "node:test";

import { saveWidgetsForCurrentPage } from "../src/widgets/widget-save-state.js";

test("saveWidgetsForCurrentPage normalizes widgets before syncing the active page", () => {
  const calls = [];
  const sourceWidgets = [{ id: "weather" }, { id: "media" }];
  const normalizedWidgets = sourceWidgets.map(widget => ({
    ...widget,
    normalized: true,
  }));
  const boundedWidgets = normalizedWidgets.map(widget => ({
    ...widget,
    bounded: true,
  }));

  const host = {
    _widgets: sourceWidgets,
    _normalizeWidgetsToGridBounds(widgets) {
      calls.push(["normalizeWidgetsToGridBounds", widgets]);
      assert.deepEqual(widgets, normalizedWidgets);
      return boundedWidgets;
    },
    _syncActivePageWidgets() {
      calls.push(["syncActivePageWidgets", this._widgets]);
      return "saved";
    },
  };

  const result = saveWidgetsForCurrentPage(host, {
    normalizeStoredWidgetContractRef(widget) {
      calls.push(["normalizeStoredWidgetContract", widget]);
      return { ...widget, normalized: true };
    },
  });

  assert.equal(result, "saved");
  assert.equal(host._widgets, boundedWidgets);
  assert.deepEqual(calls, [
    ["normalizeStoredWidgetContract", sourceWidgets[0]],
    ["normalizeStoredWidgetContract", sourceWidgets[1]],
    ["normalizeWidgetsToGridBounds", normalizedWidgets],
    ["syncActivePageWidgets", boundedWidgets],
  ]);
});
