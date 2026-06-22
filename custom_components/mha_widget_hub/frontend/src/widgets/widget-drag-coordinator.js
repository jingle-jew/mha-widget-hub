const DEFAULT_LONG_PRESS_DELAY = 350;
const DEFAULT_MOVE_TOLERANCE = 8;
const DEFAULT_EDGE_SNAP_COOLDOWN_MS = 650;
const DEFAULT_EDGE_SNAP_ZONE_RATIO = 0.12;
const DEFAULT_EDGE_SNAP_MIN_ZONE = 48;
const BLOCKED_DRAG_START_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[data-action]",
  ".mha-widget-resize",
  ".mha-widget-resize-handle",
  ".mha-resize-handle",
  "[data-resize-handle='true']",
].join(",");

function isPrimaryPointer(event) {
  if (event?.button != null && event.button !== 0) return false;
  return true;
}

function getPoint(event) {
  return {
    x: Number(event?.clientX || 0),
    y: Number(event?.clientY || 0),
  };
}

function getDistance(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function getElementFromPoint(host, point) {
  return host?.shadowRoot?.elementFromPoint?.(point.x, point.y)
    || document.elementFromPoint?.(point.x, point.y)
    || null;
}

function getWidgetScrollArea(host) {
  return host?.shadowRoot?.querySelector?.(".mha-widget-area") || null;
}

function getEdgeSnapDirection(scrollArea, point) {
  if (!scrollArea) return 0;
  const rect = scrollArea.getBoundingClientRect?.();
  if (!rect) return 0;
  const edgeSize = Math.max(DEFAULT_EDGE_SNAP_MIN_ZONE, rect.height * DEFAULT_EDGE_SNAP_ZONE_RATIO);
  if (point.y <= rect.top + edgeSize) return -1;
  if (point.y >= rect.bottom - edgeSize) return 1;
  return 0;
}

function maybeSnapScroll(host, session, event) {
  if (!session?.armed) return;
  const now = Date.now();
  if (now - (session.lastEdgeSnapAt || 0) < DEFAULT_EDGE_SNAP_COOLDOWN_MS) return;

  const scrollArea = getWidgetScrollArea(host);
  if (!scrollArea) return;

  const direction = getEdgeSnapDirection(scrollArea, getPoint(event));
  if (!direction) return;

  const maxScrollTop = Math.max(0, scrollArea.scrollHeight - scrollArea.clientHeight);
  if (maxScrollTop <= 0) return;
  if (direction < 0 && scrollArea.scrollTop <= 0) return;
  if (direction > 0 && scrollArea.scrollTop >= maxScrollTop) return;

  const distance = Math.max(scrollArea.clientHeight, window.innerHeight || 0);
  scrollArea.scrollBy?.({
    top: direction * distance,
    behavior: "smooth",
  });
  session.lastEdgeSnapAt = now;
}

function getSlotPosition(slot) {
  const x = Number.parseInt(slot?.dataset?.x || "", 10);
  const y = Number.parseInt(slot?.dataset?.y || "", 10);
  if (!Number.isInteger(x) || !Number.isInteger(y)) return null;
  return { x, y };
}

function clearHoveredDropSlot(session) {
  session?.hoveredDropSlot?.classList?.remove?.("is-drag-hover");
  if (session) session.hoveredDropSlot = null;
}

function syncHoveredDropSlot(host, session, event) {
  if (!session?.armed) return;
  const point = getPoint(event);
  const hovered = getElementFromPoint(host, point)?.closest?.(".mha-widget-drop-slot") || null;
  if (hovered === session.hoveredDropSlot) return;
  clearHoveredDropSlot(session);
  session.hoveredDropSlot = hovered;
  hovered?.classList?.add?.("is-drag-hover");
}

function commitHoveredDropSlot(host, session) {
  if (!session?.armed || !session.hoveredDropSlot) return false;
  const position = getSlotPosition(session.hoveredDropSlot);
  if (!position) return false;
  host._moveWidgetToDropSlot?.(session.widgetId, position.x, position.y);
  return true;
}

export function canStartWidgetDrag({ host, element, event, widgetId = "" } = {}) {
  if (!host?._isEditing) return false;
  if (host?._isMobileLandscapeLayout?.()) return false;
  if (!element || !widgetId) return false;
  if (!isPrimaryPointer(event)) return false;
  if (host?._isResizeHandleEvent?.(event)) return false;
  if (event?.target?.closest?.(BLOCKED_DRAG_START_SELECTOR)) return false;
  return true;
}

export function createWidgetDragCoordinator(host, {
  longPressDelay = DEFAULT_LONG_PRESS_DELAY,
  moveTolerance = DEFAULT_MOVE_TOLERANCE,
} = {}) {
  function clearTouchLock() {
    host?.classList?.remove?.("is-widget-drag-pending", "is-widget-dragging");
  }

  function cancelSession(session, { clearSourceState = true } = {}) {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    clearHoveredDropSlot(session);
    clearTouchLock();
    session.element?.releasePointerCapture?.(session.pointerId);
    if (clearSourceState) {
      session.element?.classList?.remove?.("is-drag-source", "is-drag-armed");
      if (session.element?.dataset) delete session.element.dataset.dragState;
    }
  }

  function armDragSession(session) {
    if (!session || session.cancelled) return;
    session.armed = true;
    host._activeMoveWidgetId = session.widgetId;
    host._pendingWidgetPlacement = null;
    host?.classList?.remove?.("is-widget-drag-pending");
    host?.classList?.add?.("is-widget-dragging");
    session.element?.classList?.add?.("is-drag-source", "is-drag-armed");
    if (session.element?.dataset) session.element.dataset.dragState = "armed";
    host._syncEditModeDom?.();
    host._syncWidgetDropSlots?.();
  }

  function wireWidget(element, widget = {}) {
    if (!element) return;
    element.__mhaWidgetDragCleanup?.();
    element.draggable = false;
    element.removeAttribute?.("draggable");

    const widgetId = widget?.id || element.dataset?.widgetId || "";
    let session = null;

    const cancelPending = () => {
      if (!session) return;
      session.cancelled = true;
      cancelSession(session);
      session = null;
    };

    const onPointerDown = (event) => {
      if (!canStartWidgetDrag({ host, element, event, widgetId })) return;
      const start = getPoint(event);
      session = {
        element,
        widgetId,
        pointerId: event.pointerId,
        start,
        hoveredDropSlot: null,
        lastEdgeSnapAt: 0,
        armed: false,
        cancelled: false,
        timer: null,
      };
      host?.classList?.add?.("is-widget-drag-pending");
      element.setPointerCapture?.(event.pointerId);
      session.timer = setTimeout(() => armDragSession(session), longPressDelay);
    };

    const onPointerMove = (event) => {
      if (!session) return;
      if (session.armed) {
        event.preventDefault?.();
        event.stopPropagation?.();
        syncHoveredDropSlot(host, session, event);
        maybeSnapScroll(host, session, event);
        return;
      }
      if (getDistance(session.start, getPoint(event)) > moveTolerance) cancelPending();
    };

    const onPointerUp = (event) => {
      if (!session) return;
      const wasArmed = session.armed;
      if (wasArmed) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
      }
      const moved = commitHoveredDropSlot(host, session);
      cancelSession(session, { clearSourceState: true });
      session = null;
      if (wasArmed && !moved) host._syncEditModeDom?.();
    };

    const onPointerCancel = () => cancelPending();

    element.addEventListener?.("pointerdown", onPointerDown);
    element.addEventListener?.("pointermove", onPointerMove);
    element.addEventListener?.("pointerup", onPointerUp);
    element.addEventListener?.("pointercancel", onPointerCancel);
    element.addEventListener?.("lostpointercapture", onPointerCancel);

    element.__mhaWidgetDragCleanup = () => {
      cancelPending();
      element.removeEventListener?.("pointerdown", onPointerDown);
      element.removeEventListener?.("pointermove", onPointerMove);
      element.removeEventListener?.("pointerup", onPointerUp);
      element.removeEventListener?.("pointercancel", onPointerCancel);
      element.removeEventListener?.("lostpointercapture", onPointerCancel);
      delete element.__mhaWidgetDragCleanup;
    };
  }

  return {
    wireWidget,
  };
}
