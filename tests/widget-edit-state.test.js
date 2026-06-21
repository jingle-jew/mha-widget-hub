import assert from "node:assert/strict";
import test from "node:test";

import {
  canToggleEditMode,
  clearWidgetPlacementState,
  getNextEditMode,
} from "../src/widgets/widget-edit-state.js";

test("canToggleEditMode blocks entering edit mode in mobile landscape", () => {
  assert.equal(canToggleEditMode({ isEditing: false, isMobileLandscape: true }), false);
});

test("canToggleEditMode allows leaving edit mode in mobile landscape", () => {
  assert.equal(canToggleEditMode({ isEditing: true, isMobileLandscape: true }), true);
});

test("canToggleEditMode allows toggling outside mobile landscape", () => {
  assert.equal(canToggleEditMode({ isEditing: false, isMobileLandscape: false }), true);
  assert.equal(canToggleEditMode({ isEditing: true, isMobileLandscape: false }), true);
});

test("getNextEditMode toggles the editing state", () => {
  assert.equal(getNextEditMode(false), true);
  assert.equal(getNextEditMode(true), false);
});

test("clearWidgetPlacementState resets transient widget placement state", () => {
  const host = {
    _activeMoveWidgetId: "widget-1",
    _pendingWidgetPlacement: { id: "widget-2" },
    _widgetManagerOpen: true,
    _widgetManagerCategory: "lighting",
  };

  const result = clearWidgetPlacementState(host);

  assert.equal(result, host);
  assert.equal(host._activeMoveWidgetId, "");
  assert.equal(host._pendingWidgetPlacement, null);
  assert.equal(host._widgetManagerOpen, false);
  assert.equal(host._widgetManagerCategory, "");
});
