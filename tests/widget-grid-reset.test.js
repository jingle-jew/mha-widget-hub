import assert from "node:assert/strict";
import test from "node:test";

import { resetWidgetGridState } from "../src/widgets/widget-grid-reset.js";

test("resetWidgetGridState clears grid storage and reloads persisted state", () => {
  const calls = [];
  const nextPages = [{ id: "home" }];
  const nextWidgets = [{ id: "weather" }];
  const host = {
    _widgetPositions: { weather: { x: 1, y: 1 } },
    _activeMoveWidgetId: "weather",
    _pages: [],
    _activePageId: "old",
    _widgets: [],
    _readPages() {
      calls.push("readPages");
      return nextPages;
    },
    _readActivePageId() {
      calls.push("readActivePageId");
      return "home";
    },
    _readWidgets() {
      calls.push("readWidgets");
      return nextWidgets;
    },
    render() {
      calls.push("render");
    },
  };

  const result = resetWidgetGridState(host, {
    clearGridStorageRef() {
      calls.push("clearGridStorage");
    },
  });

  assert.equal(result, host);
  assert.deepEqual(host._widgetPositions, {});
  assert.equal(host._activeMoveWidgetId, "");
  assert.equal(host._pages, nextPages);
  assert.equal(host._activePageId, "home");
  assert.equal(host._widgets, nextWidgets);
  assert.deepEqual(calls, [
    "clearGridStorage",
    "readPages",
    "readActivePageId",
    "readWidgets",
    "render",
  ]);
});
