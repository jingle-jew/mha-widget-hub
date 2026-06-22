const DEFAULT_LONG_PRESS_DELAY = 350;
const DEFAULT_MOVE_TOLERANCE = 8;
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
  function cancelSession(session, { clearSourceState = true } = {}) {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
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
        armed: false,
        cancelled: false,
        timer: null,
      };
      element.setPointerCapture?.(event.pointerId);
      session.timer = setTimeout(() => armDragSession(session), longPressDelay);
    };

    const onPointerMove = (event) => {
      if (!session || session.armed) return;
      if (getDistance(session.start, getPoint(event)) > moveTolerance) cancelPending();
    };

    const onPointerUp = () => {
      if (!session) return;
      const wasArmed = session.armed;
      cancelSession(session, { clearSourceState: true });
      session = null;
      if (wasArmed) host._syncEditModeDom?.();
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
