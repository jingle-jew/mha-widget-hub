import assert from "node:assert/strict";
import test from "node:test";

import {
  canToggleEditMode,
  clearWidgetPlacementState,
  getNextEditMode,
} from "../src/widgets/widget-edit-state.js";

function createClassList(...tokens) {
  const set = new Set(tokens);
  return {
    remove(...values) {
      values.forEach((value) => set.delete(value));
    },
    contains(value) {
      return set.has(value);
    },
  };
}

test("canToggleEditMode allows entering edit mode in mobile landscape", () => {
  assert.equal(canToggleEditMode({ isEditing: false, isMobileLandscape: true }), true);
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
    classList: createClassList("is-widget-drag-pending", "is-widget-dragging"),
  };

  const result = clearWidgetPlacementState(host);

  assert.equal(result, host);
  assert.equal(host._activeMoveWidgetId, "");
  assert.equal(host._pendingWidgetPlacement, null);
  assert.equal(host._widgetManagerOpen, false);
  assert.equal(host._widgetManagerCategory, "");
  assert.equal(host.classList.contains("is-widget-drag-pending"), false);
  assert.equal(host.classList.contains("is-widget-dragging"), false);
});
