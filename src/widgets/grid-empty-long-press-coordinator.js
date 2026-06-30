const DEFAULT_LONG_PRESS_DELAY_MS = 560;
const DEFAULT_MOVE_TOLERANCE_PX = 10;

export const GRID_EMPTY_LONG_PRESS_BLOCKED_SELECTOR = [
  ".mha-widget",
  ".mha-widget button",
  ".mha-widget a",
  ".mha-widget input",
  ".mha-widget select",
  ".mha-widget textarea",
  ".mha-widget [role='button']",
  ".mha-widget [data-action]",
  ".mha-dock",
  ".mha-mobile-dock",
  ".mha-settings-panel",
  ".mha-widget-manager-panel",
  ".mha-widget-config-panel",
  ".mha-page-creator-panel",
  ".mha-panel",
  ".mha-drop-slot",
  ".mha-widget-drop-slot",
  ".mha-widget-resize",
  ".mha-widget-resize-handle",
  ".mha-resize-handle",
  "[data-resize-handle='true']",
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[data-action]",
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
  if (host._isMobileLandscapeLayout?.()) return false;
  const layout = host.dataset?.layout || host._layout || "";
  if (layout !== "mobile" && layout !== "tablet") return false;
  if (!isPrimaryPointer(event)) return false;
  if (!target?.closest) return false;
  if (!grid.contains?.(target)) return false;
  if (target !== grid) return false;
  if (target.closest(GRID_EMPTY_LONG_PRESS_BLOCKED_SELECTOR)) return false;
  return true;
}

export function createGridEmptyLongPressCoordinator(host, {
  longPressDelay = DEFAULT_LONG_PRESS_DELAY_MS,
  moveTolerance = DEFAULT_MOVE_TOLERANCE_PX,
} = {}) {
  let boundGrid = null;
  let scrollArea = null;
  let session = null;
  let handlers = null;

  function clearSession() {
    if (!session) return;
    if (session.timer) clearTimeout(session.timer);
    session = null;
  }

  function clear() {
    clearSession();
    if (boundGrid && handlers) {
      boundGrid.removeEventListener("pointerdown", handlers.onPointerDown);
      boundGrid.removeEventListener("pointermove", handlers.onPointerMove);
      boundGrid.removeEventListener("pointerup", handlers.onPointerEnd);
      boundGrid.removeEventListener("pointercancel", handlers.onPointerEnd);
      boundGrid.removeEventListener("lostpointercapture", handlers.onPointerEnd);
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
    host.toggleEditMode?.();
    clearSession();
  }

  function wire(grid) {
    clear();
    if (!grid) return;

    boundGrid = grid;
    scrollArea = grid.closest?.(".mha-widget-area") || null;

    const onPointerDown = (event) => {
      clearSession();
      const target = resolveGridLongPressTarget({ host, event, grid: boundGrid });
      if (!canStartGridEmptyLongPress({ host, grid: boundGrid, event, target })) return;
      session = {
        pointerId: event.pointerId,
        start: getPoint(event),
        timer: setTimeout(() => trigger(), longPressDelay),
      };
    };

    const onPointerMove = (event) => {
      if (!session || event.pointerId !== session.pointerId) return;
      if (getDistance(session.start, getPoint(event)) > moveTolerance) clearSession();
    };

    const onPointerEnd = (event) => {
      if (!session || event.pointerId !== session.pointerId) return;
      clearSession();
    };

    const onScroll = () => clearSession();

    handlers = {
      onPointerDown,
      onPointerMove,
      onPointerEnd,
      onScroll,
    };

    boundGrid.addEventListener("pointerdown", onPointerDown);
    boundGrid.addEventListener("pointermove", onPointerMove);
    boundGrid.addEventListener("pointerup", onPointerEnd);
    boundGrid.addEventListener("pointercancel", onPointerEnd);
    boundGrid.addEventListener("lostpointercapture", onPointerEnd);
    scrollArea?.addEventListener("scroll", onScroll, { passive: true });
  }

  return {
    wire,
    clear,
  };
}
