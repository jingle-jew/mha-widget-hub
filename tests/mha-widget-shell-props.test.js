import test from "node:test";
import assert from "node:assert/strict";
import { buildWidgetShellState } from "../src/widgets/widget-shell-props.js";

test("widget shell state derives move-target state from the active widget id", () => {
  assert.deepEqual(buildWidgetShellState({
    widgetId: "clock-1",
    activeGridUnits: 4,
    isEditing: true,
    activeMoveWidgetId: "clock-1",
    position: { x: 2, y: 3 },
    hass: { states: {} },
    entityVisibilityConfig: { users: [] },
  }), {
    activeGridUnits: 4,
    activeGridRows: 2,
    layout: "desktop",
    isEditing: true,
    isMoveTarget: true,
    position: { x: 2, y: 3 },
    hass: { states: {} },
    entityVisibilityConfig: { users: [] },
  });
});

test("widget shell state never marks a widget as move target outside edit mode", () => {
  assert.equal(buildWidgetShellState({
    widgetId: "clock-1",
    isEditing: false,
    activeMoveWidgetId: "clock-1",
  }).isMoveTarget, false);
});
