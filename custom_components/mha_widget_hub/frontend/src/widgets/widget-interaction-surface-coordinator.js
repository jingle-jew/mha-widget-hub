import { writeJson } from "../core/storage.js";
import { POSITIONS } from "../core/mha-persistence.js";
import { syncDropSlotRenderer } from "./drop-slot-renderer.js";
import { createWidgetDragCoordinator } from "./widget-drag-coordinator.js";
import { createGridEmptyLongPressCoordinator } from "./grid-empty-long-press-coordinator.js";
import { getPrimaryEditIconName, setFloatingControlButtonIcon } from "../ui/floating-control-icons.js";
import { t } from "../i18n/index.js";

export function createWidgetInteractionSurfaceCoordinator(host) {
  const dragCoordinator = createWidgetDragCoordinator(host);
  const gridEmptyLongPressCoordinator = createGridEmptyLongPressCoordinator(host);
  function isTouchEditLayout() {
    const layout = host.dataset?.layout || host._layout || "";
    return layout === "mobile" || layout === "tablet";
  }

  function syncEditModeDom() {
    if (!host._isEditing || host._isMobileLandscapeLayout()) {
      const hadWidgetConfig = Boolean(host._widgetConfigSession);
      const preserveScenesSlotConfig = Boolean(
        host._widgetConfigSession
        && host._widgetConfigSession.configType === "scenes"
        && Number.isInteger(host._widgetConfigSession.buttonIndex)
        && !host._isMobileLandscapeLayout()
      );
      host._activeMoveWidgetId = "";
      host._pendingWidgetPlacement = null;
      host._widgetManagerOpen = false;
      host._widgetManagerCategory = "";
      host._widgetConfigSession = preserveScenesSlotConfig ? host._widgetConfigSession : null;
      host._pageCreatorOpen = false;
      const grid = host.shadowRoot?.querySelector?.(".mha-grid");
      if (grid) renderDropSlots(grid);
      host._syncPageCreatorDom?.();
      if (hadWidgetConfig) host._syncWidgetConfigDom?.();
    }
    host.classList.toggle("is-editing", host._isEditing);
    host.classList.toggle("is-placing-widget", Boolean(host._pendingWidgetPlacement));
    host.dataset.editing = String(host._isEditing);
    if (host._isEditing) host.classList.remove("is-mobile-floating-controls-hidden", "is-dock-hidden");
    const edit = host.shadowRoot.querySelector(".mha-primary-edit-button");
    if (edit) {
      const label = t(host._isEditing ? "common.close" : "common.edit", host._isEditing ? "Close" : "Edit");
      edit.setAttribute("aria-label", label);
      edit.hidden = isTouchEditLayout() ? !host._isEditing : false;
      edit.dataset.touchEditClose = String(isTouchEditLayout() && host._isEditing);
      setFloatingControlButtonIcon(edit, {
        name: getPrimaryEditIconName(host._isEditing),
        label,
      });
    }
    const add = host.shadowRoot.querySelector(".mha-add-widget-button");
    if (add) add.hidden = !host._isEditing || host._isMobileLandscapeLayout() || host._canAddWidgetToActivePage?.() === false;
    host.shadowRoot?.querySelectorAll?.(".mha-widget")?.forEach((element) => {
      element.draggable = false;
      element.removeAttribute("draggable");
      element.classList.toggle("is-editing", host._isEditing);
      const active = host._isEditing && element.dataset.widgetId === host._activeMoveWidgetId;
      element.classList.toggle("is-move-target", active);
      element.querySelector('[data-action="move"]')?.setAttribute("aria-pressed", String(active));
    });
  }

  function isResizeHandleEvent(event) {
    return Boolean(event?.target?.closest?.(
      ".mha-widget-resize, .mha-widget-resize-handle, .mha-resize-handle, [data-resize-handle='true']",
    ));
  }

  function markResizeInteraction(event) {
    if (!host._isEditing || !isResizeHandleEvent(event)) return;
    host._isResizingWidget = true;
    const widget = event.target.closest?.(".mha-widget");
    if (widget) widget.dataset.resizing = "true";
    event.stopPropagation?.();
  }

  function clearResizeInteraction() {
    host._isResizingWidget = false;
    host.shadowRoot?.querySelectorAll?.('.mha-widget[data-resizing="true"]').forEach((element) => {
      delete element.dataset.resizing;
    });
  }

  function removeWidget(id) {
    if (!host._widgets.some((widget) => widget.id === id)) return;
    if (host._activeMoveWidgetId === id) host._activeMoveWidgetId = "";
    host._widgets = host._widgets.filter((widget) => widget.id !== id);
    Object.values(host._widgetPositions).forEach((layout) => {
      if (layout && typeof layout === "object") delete layout[id];
    });
    const positionsSaved = writeJson(POSITIONS, host._widgetPositions);
    const widgetsSaved = host._saveWidgets();
    host._recordPersistenceResult(positionsSaved && widgetsSaved);
    clearDropState();
    host._refreshActiveGridOnly();
  }

  function moveWidget(sourceId, targetId, placement = "before") {
    if (!sourceId || !targetId || sourceId === targetId) return;
    const sourceIndex = host._widgets.findIndex((widget) => widget.id === sourceId);
    const targetIndex = host._widgets.findIndex((widget) => widget.id === targetId);
    if (sourceIndex < 0 || targetIndex < 0) return;
    const next = [...host._widgets];
    const [moved] = next.splice(sourceIndex, 1);
    const adjustedTargetIndex = next.findIndex((widget) => widget.id === targetId);
    next.splice(placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex, 0, moved);
    const normalized = host._normalizeWidgetsToGridBounds(next);
    if (!host._doesWidgetLayoutFitGrid(normalized)) return;
    host._widgets = normalized;
    host._clearCurrentWidgetPositions();
    host._saveWidgets();
    moveWidgetDom(sourceId, targetId, placement);
  }

  function moveWidgetDom(sourceId, targetId, placement = "before") {
    const grid = host.shadowRoot.querySelector(".mha-grid");
    const source = host.shadowRoot.querySelector(`[data-widget-id="${sourceId}"]`);
    const target = host.shadowRoot.querySelector(`[data-widget-id="${targetId}"]`);
    if (!grid || !source || !target) return;
    if (placement === "after") target.after(source);
    else target.before(source);
    host._scheduleSquareUnitSync();
  }

  function toggleMoveMode(id) {
    if (!host._isEditing || !host._widgets.some((widget) => widget.id === id)) return;
    host._activeMoveWidgetId = host._activeMoveWidgetId === id ? "" : id;
    syncEditModeDom();
    syncDropSlots();
  }

  function renderDropSlots(grid) {
    if (!grid) return;
    const positions = host._getActiveWidgetPositions({ create: true });
    const placementWidget = host._pendingWidgetPlacement;
    const activeId = host._activeMoveWidgetId;
    const slots = placementWidget
      ? host._getAvailableDropSlotsForCandidate(placementWidget, positions, { x: 0, y: 0 })
      : activeId
        ? host._getAvailableDropSlotsForWidget(activeId, positions)
        : [];
    syncDropSlotRenderer(grid, {
      editing: host._isEditing,
      mode: placementWidget ? "add" : activeId ? "move" : "none",
      slots,
      onSelectSlot: (slot) => {
        if (host._pendingWidgetPlacement) host._placePendingWidgetAtSlot(slot.x, slot.y);
        else host._moveWidgetToDropSlot(host._activeMoveWidgetId, slot.x, slot.y);
      },
    });
  }

  function syncDropSlots() {
    cancelAnimationFrame(host._widgetDropSlotsFrame);
    host._widgetDropSlotsFrame = requestAnimationFrame(() => {
      host._widgetDropSlotsFrame = 0;
      const grid = host.shadowRoot?.querySelector?.(".mha-grid");
      if (grid) renderDropSlots(grid);
    });
  }

  function clearDropState() {
    host.shadowRoot.querySelectorAll(".is-drop-before,.is-drop-after").forEach((node) => {
      node.classList.remove("is-drop-before", "is-drop-after");
      node.removeAttribute("data-drop-placement");
    });
  }

  function wireDrag(element, widget = {}) {
    dragCoordinator.wireWidget(element, widget);
  }

  function wireTouchEditLongPress(grid) {
    gridEmptyLongPressCoordinator.wire(grid);
  }

  function clearTouchEditLongPress() {
    gridEmptyLongPressCoordinator.clear();
  }

  return {
    syncEditModeDom,
    isResizeHandleEvent,
    markResizeInteraction,
    clearResizeInteraction,
    removeWidget,
    moveWidget,
    moveWidgetDom,
    toggleMoveMode,
    renderDropSlots,
    syncDropSlots,
    clearDropState,
    wireDrag,
    wireTouchEditLongPress,
    clearTouchEditLongPress,
  };
}
