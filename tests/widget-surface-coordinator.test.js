import assert from "node:assert/strict";
import test from "node:test";

import { createWidgetSurfaceCoordinator } from "../src/widgets/widget-surface-coordinator.js";

class FakeNode {
  constructor(selector = "") {
    this.selector = selector;
    this.childNodes = [];
    this.parentNode = null;
    this.removed = false;
    this.replacedWith = null;
  }

  append(child) {
    child.parentNode = this;
    this.childNodes.push(child);
  }

  remove() {
    this.removed = true;
    if (!this.parentNode) return;
    this.parentNode.childNodes = this.parentNode.childNodes.filter((child) => child !== this);
    this.parentNode = null;
  }

  replaceWith(next) {
    this.replacedWith = next;
    if (!this.parentNode) return;
    const index = this.parentNode.childNodes.indexOf(this);
    if (index >= 0) {
      next.parentNode = this.parentNode;
      this.parentNode.childNodes.splice(index, 1, next);
    }
  }

  querySelectorAll(selector) {
    if (selector === ".mha-widget,.mha-widget-drop-slot") {
      return this.childNodes.filter((child) => (
        child.selector === ".mha-widget" || child.selector === ".mha-widget-drop-slot"
      ));
    }
    return [];
  }
}

function createHarness(overrides = {}) {
  const calls = {
    toggleMove: [],
    move: [],
    remove: [],
    startResize: [],
    updateResize: [],
    finishResize: 0,
    configure: [],
    configureSlot: [],
    wireDrag: [],
    saveCurrentWidgetPositions: [],
    saveWidgets: 0,
    applyWidgetPositionsToDom: [],
    renderWidgetDropSlots: [],
    syncWidgetDropSlots: 0,
    syncEditModeDom: 0,
    scheduleSquareUnitSync: 0,
    updateDockActiveState: 0,
    updateClockWidgets: 0,
    destroyDomSubtree: [],
    createWidgetShell: [],
    rerenderWidgetContent: [],
    renderRoot: 0,
    cancelWidgetRenderFrame: 0,
  };

  const grid = new FakeNode(".mha-grid");
  const existingWidget = new FakeNode(".mha-widget");
  existingWidget.dataset = { widgetId: "clock" };
  grid.append(existingWidget);
  grid.append(new FakeNode(".mha-widget-drop-slot"));

  const state = {
    widgets: [{ id: "clock", kind: "clock", w: 1, h: 1, variant: "small" }],
    pendingWidgetPlacement: { id: "weather", kind: "weather", w: 2, h: 1 },
    activeMoveWidgetId: "clock",
    isEditing: true,
    hass: { states: {} },
    entityVisibilityConfig: { users: [] },
    positions: { clock: { x: 2, y: 3 } },
    root: {
      querySelector(selector) {
        if (selector === ".mha-grid") return grid;
        if (selector === `[data-widget-id="clock"]`) return existingWidget;
        return null;
      },
    },
    ...overrides.state,
  };

  const coordinator = createWidgetSurfaceCoordinator({
    getRoot: () => state.root,
    renderRoot: () => { calls.renderRoot += 1; },
    cancelWidgetRenderFrame: () => { calls.cancelWidgetRenderFrame += 1; },
    getWidgets: () => state.widgets,
    setWidgets: (widgets) => { state.widgets = widgets; },
    getPendingWidgetPlacement: () => state.pendingWidgetPlacement,
    setPendingWidgetPlacement: (widget) => { state.pendingWidgetPlacement = widget; },
    getActiveMoveWidgetId: () => state.activeMoveWidgetId,
    setActiveMoveWidgetId: (id) => { state.activeMoveWidgetId = id; },
    getIsEditing: () => state.isEditing,
    getHass: () => state.hass,
    getEntityVisibilityConfig: () => state.entityVisibilityConfig,
    getGridBounds: () => ({ units: 4, rowUnits: 4 }),
    getActiveWidgetPositions: () => state.positions,
    isPositionMapValidForWidgets: (_positions, widgets) => !widgets.some((widget) => widget.variant === "invalid"),
    normalizeWidgetsToGridBounds: (widgets) => widgets.map((widget) => ({ ...widget, normalized: true })),
    saveCurrentWidgetPositions: (positions) => { calls.saveCurrentWidgetPositions.push(positions); return true; },
    saveWidgets: () => { calls.saveWidgets += 1; return true; },
    applyWidgetPositionsToDom: (positions) => { calls.applyWidgetPositionsToDom.push(positions); },
    wireDrag: (element, widget) => { calls.wireDrag.push([element.widget.id, widget.id]); },
    renderWidgetDropSlots: (targetGrid) => { calls.renderWidgetDropSlots.push(targetGrid); },
    syncWidgetDropSlots: () => { calls.syncWidgetDropSlots += 1; },
    syncEditModeDom: () => { calls.syncEditModeDom += 1; },
    scheduleSquareUnitSync: () => { calls.scheduleSquareUnitSync += 1; },
    updateDockActiveState: () => { calls.updateDockActiveState += 1; },
    toggleWidgetMoveMode: (id) => { calls.toggleMove.push(id); },
    moveWidgetByDirection: (id, direction) => { calls.move.push([id, direction]); },
    removeWidget: (id) => { calls.remove.push(id); },
    startResize: (id, event) => { calls.startResize.push([id, event?.pointerId ?? null]); return true; },
    updateResize: (event) => { calls.updateResize.push(event?.pointerId ?? null); },
    finishResize: () => { calls.finishResize += 1; },
    openWidgetConfig: (id) => { calls.configure.push(id); },
    openScenesButtonConfig: (id, slotIndex) => { calls.configureSlot.push([id, slotIndex]); },
    createWidgetShellFn: (widget, props) => {
      calls.createWidgetShell.push({ widget, props });
      const node = new FakeNode(".mha-widget");
      node.widget = widget;
      node.props = props;
      node.dataset = { widgetId: widget.id };
      return node;
    },
    rerenderWidgetContentFn: (shell, widget, context) => {
      calls.rerenderWidgetContent.push({ shell, widget, context });
      return true;
    },
    buildWidgetShellStateFn: ({
      widgetId,
      activeGridUnits,
      isEditing,
      activeMoveWidgetId,
      position,
      hass,
      entityVisibilityConfig,
    }) => ({
      widgetId,
      activeGridUnits,
      isEditing,
      isMoveTarget: activeMoveWidgetId === widgetId,
      position,
      hass,
      entityVisibilityConfig,
    }),
    normalizeStoredWidgetFn: (widget) => ({ ...widget }),
    normalizeWidgetForKindFn: (widget) => ({ w: widget.w || 1, h: widget.h || 1 }),
    getNextWidgetVariantEntriesFn: () => [],
    getVariantCandidateFn: (_widget, entry) => entry.candidate,
    sameVariantSizeFn: (a, b) => a.w === b.w && a.h === b.h,
    destroyDomSubtreeFn: (node) => { calls.destroyDomSubtree.push(node); },
    updateClockWidgetsFn: () => { calls.updateClockWidgets += 1; },
    ...overrides.options,
  });

  return { coordinator, state, calls, grid, existingWidget };
}

test("widget surface coordinator builds widget shell props with the existing callbacks", () => {
  const { coordinator, calls } = createHarness();
  coordinator.cycleVariant = (id) => { calls.cycleVariant = id; return true; };

  const props = coordinator.buildWidgetShellProps(
    { id: "clock", kind: "clock" },
    { units: 6, position: { x: 2, y: 1 } },
  );

  assert.equal(props.widgetId, "clock");
  assert.equal(props.activeGridUnits, 6);
  assert.equal(props.isEditing, true);
  assert.equal(props.isMoveTarget, true);
  assert.deepEqual(props.position, { x: 2, y: 1 });
  assert.equal(props.hass.states !== undefined, true);
  assert.equal(props.entityVisibilityConfig.users.length, 0);

  props.onToggleMove("clock");
  props.onMove("clock", "right");
  props.onRemove("clock");
  props.onStartResize("clock", { pointerId: 44 });
  props.onUpdateResize({ pointerId: 44 });
  props.onFinishResize();
  props.onCycleVariant("clock");
  props.onConfigure("clock");
  props.onConfigureSlot("clock", 2);

  assert.deepEqual(calls.toggleMove, ["clock"]);
  assert.deepEqual(calls.move, [["clock", "right"]]);
  assert.deepEqual(calls.remove, ["clock"]);
  assert.deepEqual(calls.startResize, [["clock", 44]]);
  assert.deepEqual(calls.updateResize, [44]);
  assert.equal(calls.finishResize, 1);
  assert.equal(calls.cycleVariant, "clock");
  assert.deepEqual(calls.configure, ["clock"]);
  assert.deepEqual(calls.configureSlot, [["clock", 2]]);
});

test("widget surface coordinator persists a targeted widget configuration update", () => {
  const { coordinator, state, calls } = createHarness({
    state: {
      widgets: [{ id: "clock", kind: "toggle", entityId: "light.salon", w: 3, h: 1 }],
    },
  });

  assert.equal(coordinator.updateWidgetConfig("clock", {
    lightPopup: { orientation: "horizontal" },
  }), true);
  assert.deepEqual(state.widgets[0].lightPopup, { orientation: "horizontal" });
  assert.equal(calls.saveWidgets, 1);
  assert.equal(calls.rerenderWidgetContent.length, 1);
});

test("replace widget keeps position and rebuilds the shell with the same callback contract", () => {
  const { coordinator, calls, existingWidget, grid } = createHarness();

  assert.equal(coordinator.replaceWidgetDom("clock"), true);
  assert.equal(existingWidget.replacedWith?.widget.id, "clock");
  assert.equal(grid.childNodes[0].widget.id, "clock");
  assert.deepEqual(calls.wireDrag, [["clock", "clock"]]);
  assert.equal(calls.destroyDomSubtree[0], existingWidget);
  assert.deepEqual(calls.applyWidgetPositionsToDom[0], { clock: { x: 2, y: 3 } });
  assert.equal(calls.updateClockWidgets, 1);
  assert.equal(calls.syncEditModeDom, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
  assert.equal(calls.scheduleSquareUnitSync, 1);

  const rebuiltProps = existingWidget.replacedWith.props;
  assert.equal(typeof rebuiltProps.onToggleMove, "function");
  assert.equal(typeof rebuiltProps.onMove, "function");
  assert.equal(typeof rebuiltProps.onRemove, "function");
  assert.equal(typeof rebuiltProps.onStartResize, "function");
  assert.equal(typeof rebuiltProps.onUpdateResize, "function");
  assert.equal(typeof rebuiltProps.onFinishResize, "function");
  assert.equal(typeof rebuiltProps.onCycleVariant, "function");
});

test("rerender widget content uses the current widget size and render context", () => {
  const { coordinator, calls, existingWidget } = createHarness({
    state: {
      widgets: [{ id: "clock", kind: "clock", w: 4, h: 2, variant: "wide" }],
    },
  });

  assert.equal(coordinator.rerenderWidgetContent("clock"), true);
  assert.equal(calls.rerenderWidgetContent.length, 1);
  assert.equal(calls.rerenderWidgetContent[0].shell, existingWidget);
  assert.equal(calls.rerenderWidgetContent[0].widget.variant, "wide");
  assert.deepEqual(calls.rerenderWidgetContent[0].context.size, { w: 4, h: 2 });
  assert.equal(calls.rerenderWidgetContent[0].context.widgetW, 4);
  assert.equal(calls.rerenderWidgetContent[0].context.widgetH, 2);
  assert.equal(calls.rerenderWidgetContent[0].context.isEditing, true);
});

test("cycle variant skips invalid layout candidates and applies the first valid one", () => {
  const { coordinator, state, calls } = createHarness({
    options: {
      getNextWidgetVariantEntriesFn: () => [
        { candidate: { variant: "invalid", w: 3, h: 2 } },
        { candidate: { variant: "wide", w: 2, h: 1 } },
      ],
    },
  });

  coordinator.replaceWidgetDom = (id) => { calls.replacedVariant = id; return true; };

  assert.equal(coordinator.cycleVariant("clock"), true);
  assert.equal(state.widgets[0].variant, "wide");
  assert.equal(state.widgets[0].normalized, true);
  assert.equal(calls.saveWidgets, 1);
  assert.equal(calls.replacedVariant, "clock");
});

test("refresh active grid rebuilds widgets and still refreshes clocks", () => {
  const { coordinator, calls, grid } = createHarness({
    state: {
      widgets: [
        { id: "clock", kind: "clock", w: 1, h: 1 },
        { id: "weather", kind: "weather", w: 2, h: 1 },
      ],
      positions: {
        clock: { x: 1, y: 1 },
        weather: { x: 2, y: 1 },
      },
    },
  });

  assert.equal(coordinator.refreshActiveGridOnly(), true);
  assert.equal(calls.cancelWidgetRenderFrame, 1);
  assert.equal(calls.destroyDomSubtree.length, 2);
  assert.equal(grid.childNodes.filter((node) => node.selector === ".mha-widget").length, 2);
  assert.equal(calls.updateDockActiveState, 1);
  assert.equal(calls.syncWidgetDropSlots, 1);
  assert.equal(calls.syncEditModeDom, 1);
  assert.equal(calls.scheduleSquareUnitSync, 1);
  assert.equal(calls.updateClockWidgets, 1);
});
