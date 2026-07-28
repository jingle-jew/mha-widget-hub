const DEFAULT_LONG_PRESS_DELAY_MS = 560;
const DEFAULT_MOVE_TOLERANCE_PX = 10;
const DEFAULT_CLICK_SUPPRESSION_GRACE_MS = 500;

export const WIDGET_LONG_PRESS_BLOCKED_SELECTOR = [
  // These controls own a press/drag gesture. Tap-only controls remain eligible
  // and have their trailing click suppressed only when the hold actually wins.
  ".mha-slider",
  ".mha-toggle",
  "input",
  "select",
  "textarea",
  ".mha-widget-tools",
  ".mha-widget-move-overlay",
  ".mha-widget-resize",
  ".mha-widget-resize-handle",
  ".mha-resize-handle",
  "[data-resize-handle='true']",
].join(", ");

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

function isPrimaryPointer(event) {
  if (!event) return false;
  if (typeof event.button === "number" && event.button !== 0) return false;
  if (event.isPrimary === false) return false;
  return true;
}

export function resolveGridLongPressTarget({ host, event, grid } = {}) {
  const pointTarget = (
    host?.shadowRoot?.elementFromPoint?.(Number(event?.clientX || 0), Number(event?.clientY || 0))
    || document.elementFromPoint?.(Number(event?.clientX || 0), Number(event?.clientY || 0))
    || event?.target
    || null
  );
  if (typeof pointTarget?.closest !== "function") return pointTarget?.parentElement || null;
  if (grid?.contains?.(pointTarget)) return pointTarget;
  return event?.target && grid?.contains?.(event.target) ? event.target : null;
}

export function canStartGridEmptyLongPress({ host, grid, event, target } = {}) {
  if (!host || !grid || !event) return false;
  if (host._isEditing) return false;
  const layout = host.dataset?.layout || host._layout || "";
  if (layout !== "mobile" && layout !== "tablet") return false;
  if (!isPrimaryPointer(event)) return false;
  if (!target?.closest) return false;
  if (!grid.contains?.(target)) return false;
  if (target === grid) return true;

  const widget = target.closest(".mha-widget");
  if (!widget || !grid.contains?.(widget)) return false;
  return !target.closest(WIDGET_LONG_PRESS_BLOCKED_SELECTOR);
}

export function createGridEmptyLongPressCoordinator(host, {
  longPressDelay = DEFAULT_LONG_PRESS_DELAY_MS,
  moveTolerance = DEFAULT_MOVE_TOLERANCE_PX,
} = {}) {
  let boundGrid = null;
  let scrollArea = null;
  let session = null;
  let clickSuppression = null;
  let handlers = null;

  function clearSession() {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    session = null;
  }

  function clearClickSuppression() {
    if (!clickSuppression) return;
    if (clickSuppression.timer) clearTimeout(clickSuppression.timer);
    clickSuppression = null;
  }

  function armClickSuppression(originWidget, pointerId) {
    if (!originWidget) return;
    clearClickSuppression();
    clickSuppression = {
      originWidget,
      pointerId,
      timer: 0,
    };
  }

  function clear() {
    clearSession();
    clearClickSuppression();
    if (boundGrid && handlers) {
      boundGrid.removeEventListener("pointerdown", handlers.onPointerDown);
      boundGrid.removeEventListener("pointermove", handlers.onPointerMove);
      boundGrid.removeEventListener("pointerup", handlers.onPointerEnd);
      boundGrid.removeEventListener("pointercancel", handlers.onPointerEnd);
      boundGrid.removeEventListener("lostpointercapture", handlers.onPointerEnd);
      boundGrid.removeEventListener("click", handlers.onClick, true);
    }
    if (scrollArea && handlers) {
      scrollArea.removeEventListener("scroll", handlers.onScroll);
    }
    boundGrid = null;
    scrollArea = null;
    handlers = null;
  }

  function trigger() {
    if (!session || host?._isEditing) {
      clearSession();
      return;
    }
    const { originWidget, pointerId } = session;
    host.toggleEditMode?.();
    if (host?._isEditing) armClickSuppression(originWidget, pointerId);
    clearSession();
  }

  function wire(grid) {
    clear();
    if (!grid) return;

    boundGrid = grid;
    scrollArea = grid.closest?.(".mha-widget-area") || null;

    const onPointerDown = (event) => {
      if (
        clickSuppression
        && event.isPrimary !== false
        && event.pointerId !== clickSuppression.pointerId
      ) {
        clearClickSuppression();
      }
      clearSession();
      const target = resolveGridLongPressTarget({ host, event, grid: boundGrid });
      if (!canStartGridEmptyLongPress({ host, grid: boundGrid, event, target })) return;
      session = {
        pointerId: event.pointerId,
        start: getPoint(event),
        originWidget: target.closest?.(".mha-widget") || null,
        timer: setTimeout(() => trigger(), longPressDelay),
      };
    };

    const onPointerMove = (event) => {
      if (!session || event.pointerId !== session.pointerId) return;
      if (getDistance(session.start, getPoint(event)) > moveTolerance) clearSession();
    };

    const onPointerEnd = (event) => {
      if (clickSuppression && event.pointerId === clickSuppression.pointerId) {
        if (event.type === "pointerup") {
          clickSuppression.timer = setTimeout(
            () => clearClickSuppression(),
            DEFAULT_CLICK_SUPPRESSION_GRACE_MS,
          );
        } else {
          clearClickSuppression();
        }
      }
      if (!session || event.pointerId !== session.pointerId) return;
      clearSession();
    };

    const onScroll = () => clearSession();

    const onClick = (event) => {
      if (!clickSuppression) return;
      const targetWidget = event.target?.closest?.(".mha-widget") || null;
      if (targetWidget !== clickSuppression.originWidget) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      clearClickSuppression();
    };

    handlers = {
      onPointerDown,
      onPointerMove,
      onPointerEnd,
      onScroll,
      onClick,
    };

    boundGrid.addEventListener("pointerdown", onPointerDown);
    boundGrid.addEventListener("pointermove", onPointerMove);
    boundGrid.addEventListener("pointerup", onPointerEnd);
    boundGrid.addEventListener("pointercancel", onPointerEnd);
    boundGrid.addEventListener("lostpointercapture", onPointerEnd);
    boundGrid.addEventListener("click", onClick, true);
    scrollArea?.addEventListener("scroll", onScroll, { passive: true });
  }

  return {
    wire,
    clear,
  };
}
