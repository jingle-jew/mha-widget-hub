import { writeJson } from "../core/storage.js";
import { POSITIONS } from "../core/mha-persistence.js";
import { syncDropSlotRenderer } from "./drop-slot-renderer.js";
import { createWidgetDragCoordinator } from "./widget-drag-coordinator.js";
import { getPrimaryEditIconName, setFloatingControlButtonIcon } from "../ui/floating-control-icons.js";
import { t } from "../i18n/index.js";

const TOUCH_EDIT_LONG_PRESS_MS = 420;
const TOUCH_EDIT_MOVE_THRESHOLD_PX = 12;
const TOUCH_EDIT_SCROLL_THRESHOLD_PX = 12;
const TOUCH_EDIT_TOUCH_POINTER_DEDUPE_MS = 750;
const TOUCH_EDIT_BLOCKED_TARGET_SELECTOR = [
  ".mha-widget",
  ".mha-widget [data-action]",
  ".mha-widget button",
  ".mha-widget input",
  ".mha-widget select",
  ".mha-widget textarea",
  ".mha-drop-slot",
  ".mha-mobile-dock",
  ".mha-dock",
  ".mha-edit-button",
  ".mha-add-widget-button",
  ".mha-settings-panel",
  ".mha-widget-manager-panel",
  ".mha-widget-config-panel",
  ".mha-page-creator-panel",
  ".mha-screensaver",
  ".mha-media-page",
  ".mha-panel",
  "button",
  "input",
  "select",
  "textarea",
  "a",
  "[role='button']",
  "[role='dialog']",
  "[data-action]",
  "[data-resize-handle='true']",
  "[contenteditable='true']",
].join(", ");

export function createWidgetInteractionSurfaceCoordinator(host) {
  const dragCoordinator = createWidgetDragCoordinator(host);

  function getEventElementTarget(event) {
    const target = event?.target || null;
    if (!target) return null;
    if (typeof target.closest === "function") return target;
    return target.parentElement || null;
  }

  function getTouchEditLongPressScope() {
    return host._touchEditLongPressScope
      || host.shadowRoot?.querySelector?.(".mha-grid")
      || null;
  }

  function getTouchEditPointerId(event) {
    if (event?.pointerId != null) return event.pointerId;
    const touch = event?.touches?.[0] || event?.changedTouches?.[0] || null;
    return touch?.identifier ?? "touch";
  }

  function getTouchEditPoint(event) {
    const touch = event?.touches?.[0] || event?.changedTouches?.[0] || null;
    return {
      x: Number(touch?.clientX ?? event?.clientX ?? 0),
      y: Number(touch?.clientY ?? event?.clientY ?? 0),
    };
  }

  function isTouchEditLayout() {
    const layout = host.dataset?.layout || host._layout || "";
    return layout === "mobile" || layout === "tablet";
  }

  function clearTouchEditLongPressState() {
    if (host._touchEditLongPressTimer) {
      clearTimeout(host._touchEditLongPressTimer);
      host._touchEditLongPressTimer = 0;
    }
    host._touchEditLongPressPointerId = null;
    host._touchEditLongPressTriggered = false;
    host._touchEditLongPressTarget = null;
    host._touchEditLongPressStartX = 0;
    host._touchEditLongPressStartY = 0;
    host._touchEditLongPressStartScrollTop = 0;
    host._touchEditLongPressSource = "";
  }

  function shouldIgnoreTouchBackfilledPointer(event) {
    if (event?.pointerType !== "touch") return false;
    const lastTouchStartAt = Number(host._touchEditLastTouchStartAt || 0);
    if (!lastTouchStartAt) return false;
    return (Date.now() - lastTouchStartAt) < TOUCH_EDIT_TOUCH_POINTER_DEDUPE_MS;
  }

  function shouldStartTouchEditLongPress(event) {
    if (!isTouchEditLayout() || host._isEditing || host._isMobileLandscapeLayout()) return false;
    if (!event || (typeof event.button === "number" && event.button !== 0)) return false;
    if (event.isPrimary === false) return false;
    const target = getEventElementTarget(event);
    if (!target) return false;
    const scope = getTouchEditLongPressScope();
    if (!scope) return false;
    if (event.currentTarget !== scope) {
      const path = typeof event.composedPath === "function" ? event.composedPath() : [];
      const withinScope = path.includes(scope) || target.closest(".mha-widget-area") === scope;
      if (!withinScope) return false;
    }
    if (target.closest(TOUCH_EDIT_BLOCKED_TARGET_SELECTOR)) return false;
    return true;
  }

  function triggerTouchEditLongPress() {
    if (host._touchEditLongPressPointerId == null || host._touchEditLongPressTriggered) return;
    host._touchEditLongPressTriggered = true;
    host.toggleEditMode?.();
    clearTouchEditLongPressState();
  }

  function wireTouchEditLongPress(surface) {
    host._touchEditLongPressScope = surface?.matches?.(".mha-grid")
      ? surface
      : surface?.querySelector?.(".mha-grid")
        || null;
    const scope = getTouchEditLongPressScope();
    if (!scope) return;
    const usePointerEvents = "PointerEvent" in globalThis;

    if (!host._touchEditLongPressHandlers) {
      const onPressStart = (event) => {
        if (shouldIgnoreTouchBackfilledPointer(event)) return;
        const source = event?.type?.startsWith?.("touch") ? "touch" : "pointer";
        if (
          host._touchEditLongPressPointerId != null
          && host._touchEditLongPressSource
          && host._touchEditLongPressSource !== source
        ) return;
        clearTouchEditLongPressState();
        if (!shouldStartTouchEditLongPress(event)) return;
        const point = getTouchEditPoint(event);
        if (source === "touch") host._touchEditLastTouchStartAt = Date.now();
        host._touchEditLongPressPointerId = getTouchEditPointerId(event);
        host._touchEditLongPressSource = source;
        host._touchEditLongPressTarget = event.target;
        host._touchEditLongPressStartX = point.x;
        host._touchEditLongPressStartY = point.y;
        host._touchEditLongPressStartScrollTop = Number(scope.closest?.(".mha-widget-area")?.scrollTop || 0);
        host._touchEditLongPressTimer = setTimeout(triggerTouchEditLongPress, TOUCH_EDIT_LONG_PRESS_MS);
      };

      const onPressMove = (event) => {
        if (host._touchEditLongPressPointerId == null) return;
        if (shouldIgnoreTouchBackfilledPointer(event)) return;
        const source = event?.type?.startsWith?.("touch") ? "touch" : "pointer";
        if (host._touchEditLongPressSource && host._touchEditLongPressSource !== source) return;
        if (getTouchEditPointerId(event) !== host._touchEditLongPressPointerId) return;
        const point = getTouchEditPoint(event);
        const deltaX = Math.abs(point.x - host._touchEditLongPressStartX);
        const deltaY = Math.abs(point.y - host._touchEditLongPressStartY);
        if (deltaX > TOUCH_EDIT_MOVE_THRESHOLD_PX || deltaY > TOUCH_EDIT_MOVE_THRESHOLD_PX) {
          clearTouchEditLongPressState();
        }
      };

      const onPressEnd = (event) => {
        if (host._touchEditLongPressPointerId == null) return;
        if (shouldIgnoreTouchBackfilledPointer(event)) return;
        const source = event?.type?.startsWith?.("touch") ? "touch" : "pointer";
        if (host._touchEditLongPressSource && host._touchEditLongPressSource !== source) return;
        if (getTouchEditPointerId(event) !== host._touchEditLongPressPointerId) return;
        clearTouchEditLongPressState();
      };

      host._touchEditLongPressHandlers = {
        onPointerDown: onPressStart,
        onPointerMove: onPressMove,
        onPointerUp: onPressEnd,
        onPointerCancel: onPressEnd,
        onMouseDown: onPressStart,
        onMouseMove: onPressMove,
        onMouseUp: onPressEnd,
        onTouchStart: onPressStart,
        onTouchMove: onPressMove,
        onTouchEnd: onPressEnd,
        onTouchCancel: onPressEnd,
      };
    }

    host._touchEditLongPressEventTarget?.removeEventListener?.("pointerdown", host._touchEditLongPressHandlers.onPointerDown);
    host._touchEditLongPressEventTarget?.removeEventListener?.("pointermove", host._touchEditLongPressHandlers.onPointerMove);
    host._touchEditLongPressEventTarget?.removeEventListener?.("pointerup", host._touchEditLongPressHandlers.onPointerUp);
    host._touchEditLongPressEventTarget?.removeEventListener?.("pointercancel", host._touchEditLongPressHandlers.onPointerCancel);
    host._touchEditLongPressEventTarget?.removeEventListener?.("mousedown", host._touchEditLongPressHandlers.onMouseDown);
    host._touchEditLongPressEventTarget?.removeEventListener?.("mousemove", host._touchEditLongPressHandlers.onMouseMove);
    host._touchEditLongPressEventTarget?.removeEventListener?.("mouseup", host._touchEditLongPressHandlers.onMouseUp);
    host._touchEditLongPressEventTarget?.removeEventListener?.("touchstart", host._touchEditLongPressHandlers.onTouchStart);
    host._touchEditLongPressEventTarget?.removeEventListener?.("touchmove", host._touchEditLongPressHandlers.onTouchMove);
    host._touchEditLongPressEventTarget?.removeEventListener?.("touchend", host._touchEditLongPressHandlers.onTouchEnd);
    host._touchEditLongPressEventTarget?.removeEventListener?.("touchcancel", host._touchEditLongPressHandlers.onTouchCancel);

    if (usePointerEvents) {
      scope.addEventListener("pointerdown", host._touchEditLongPressHandlers.onPointerDown, { passive: true, capture: true });
      scope.addEventListener("pointermove", host._touchEditLongPressHandlers.onPointerMove, { passive: true, capture: true });
      scope.addEventListener("pointerup", host._touchEditLongPressHandlers.onPointerUp, { passive: true, capture: true });
      scope.addEventListener("pointercancel", host._touchEditLongPressHandlers.onPointerCancel, { passive: true, capture: true });
    } else {
      scope.addEventListener("mousedown", host._touchEditLongPressHandlers.onMouseDown, { passive: true, capture: true });
      scope.addEventListener("mousemove", host._touchEditLongPressHandlers.onMouseMove, { passive: true, capture: true });
      scope.addEventListener("mouseup", host._touchEditLongPressHandlers.onMouseUp, { passive: true, capture: true });
    }
    scope.addEventListener("touchstart", host._touchEditLongPressHandlers.onTouchStart, { passive: true, capture: true });
    scope.addEventListener("touchmove", host._touchEditLongPressHandlers.onTouchMove, { passive: true, capture: true });
    scope.addEventListener("touchend", host._touchEditLongPressHandlers.onTouchEnd, { passive: true, capture: true });
    scope.addEventListener("touchcancel", host._touchEditLongPressHandlers.onTouchCancel, { passive: true, capture: true });
    host._touchEditLongPressEventTarget = scope;
    host._touchEditLongPressUsesPointerEvents = usePointerEvents;

    host._touchEditLongPressScrollCleanup?.();
    host._touchEditLongPressScrollCleanup = null;
    const scrollContainer = scope.closest?.(".mha-widget-area");
    if (!scrollContainer) return;

    const onScopedScroll = () => {
      if (host._touchEditLongPressPointerId == null) return;
      const currentScrollTop = Number(scrollContainer.scrollTop || 0);
      if (Math.abs(currentScrollTop - host._touchEditLongPressStartScrollTop) > TOUCH_EDIT_SCROLL_THRESHOLD_PX) {
        clearTouchEditLongPressState();
      }
    };
    scrollContainer.addEventListener("scroll", onScopedScroll, { passive: true });
    host._touchEditLongPressScrollCleanup = () => {
      scrollContainer.removeEventListener("scroll", onScopedScroll);
    };
  }

  function clearTouchEditLongPress() {
    clearTouchEditLongPressState();
    host._touchEditLongPressScrollCleanup?.();
    host._touchEditLongPressScrollCleanup = null;
    host._touchEditLongPressScope = null;
    const handlers = host._touchEditLongPressHandlers;
    const target = host._touchEditLongPressEventTarget;
    if (!handlers || !target) return;
    if (host._touchEditLongPressUsesPointerEvents) {
      target.removeEventListener("pointerdown", handlers.onPointerDown, true);
      target.removeEventListener("pointermove", handlers.onPointerMove, true);
      target.removeEventListener("pointerup", handlers.onPointerUp, true);
      target.removeEventListener("pointercancel", handlers.onPointerCancel, true);
    } else {
      target.removeEventListener("mousedown", handlers.onMouseDown, true);
      target.removeEventListener("mousemove", handlers.onMouseMove, true);
      target.removeEventListener("mouseup", handlers.onMouseUp, true);
    }
    target.removeEventListener("touchstart", handlers.onTouchStart, true);
    target.removeEventListener("touchmove", handlers.onTouchMove, true);
    target.removeEventListener("touchend", handlers.onTouchEnd, true);
    target.removeEventListener("touchcancel", handlers.onTouchCancel, true);
    host._touchEditLongPressEventTarget = null;
    host._touchEditLongPressUsesPointerEvents = false;
    host._touchEditLongPressHandlers = null;
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
