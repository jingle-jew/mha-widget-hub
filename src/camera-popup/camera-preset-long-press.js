export const CAMERA_PRESET_LONG_PRESS_DELAY_MS = 600;

const MOVE_TOLERANCE_PX = 10;
const CLICK_SUPPRESSION_GRACE_MS = 500;

function getPoint(event) {
  return {
    x: Number(event?.clientX || 0),
    y: Number(event?.clientY || 0),
  };
}

function movedPastTolerance(start, event, tolerance) {
  const point = getPoint(event);
  return Math.hypot(point.x - start.x, point.y - start.y) > tolerance;
}

function isPrimaryPointer(event) {
  if (!event || event.isPrimary === false) return false;
  return typeof event.button !== "number" || event.button === 0;
}

export function wireCameraPresetLongPress(button, {
  onLongPress,
  delay = CAMERA_PRESET_LONG_PRESS_DELAY_MS,
  moveTolerance = MOVE_TOLERANCE_PX,
} = {}) {
  let session = null;
  let clickSuppression = null;

  const clearSession = () => {
    if (!session) return;
    if (session.timer) globalThis.clearTimeout?.(session.timer);
    session = null;
    delete button.dataset.longPressActive;
  };

  const clearClickSuppression = () => {
    if (!clickSuppression) return;
    if (clickSuppression.timer) globalThis.clearTimeout?.(clickSuppression.timer);
    clickSuppression = null;
  };

  const trigger = () => {
    if (!session || button.disabled) {
      clearSession();
      return;
    }
    const pointerId = session.pointerId;
    clearSession();
    clearClickSuppression();
    clickSuppression = { pointerId, timer: 0 };
    onLongPress?.();
  };

  const onPointerDown = (event) => {
    if (!isPrimaryPointer(event) || button.disabled) return;
    if (clickSuppression && event.pointerId !== clickSuppression.pointerId) {
      clearClickSuppression();
    }
    clearSession();
    session = {
      pointerId: event.pointerId,
      start: getPoint(event),
      timer: globalThis.setTimeout?.(trigger, delay),
    };
    button.dataset.longPressActive = "true";
    button.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event) => {
    if (!session || event.pointerId !== session.pointerId) return;
    if (movedPastTolerance(session.start, event, moveTolerance)) clearSession();
  };

  const onPointerEnd = (event) => {
    if (session && event.pointerId === session.pointerId) clearSession();
    if (!clickSuppression || event.pointerId !== clickSuppression.pointerId) return;
    if (event.type !== "pointerup") {
      clearClickSuppression();
      return;
    }
    clickSuppression.timer = globalThis.setTimeout?.(
      clearClickSuppression,
      CLICK_SUPPRESSION_GRACE_MS,
    );
  };

  const onLostPointerCapture = (event) => {
    if (session && event.pointerId === session.pointerId) clearSession();
  };

  const onClick = (event) => {
    if (!clickSuppression) return;
    event.preventDefault?.();
    event.stopPropagation?.();
    event.stopImmediatePropagation?.();
    clearClickSuppression();
  };

  const onContextMenu = (event) => event.preventDefault?.();

  button.addEventListener("pointerdown", onPointerDown);
  button.addEventListener("pointermove", onPointerMove);
  button.addEventListener("pointerup", onPointerEnd);
  button.addEventListener("pointercancel", onPointerEnd);
  button.addEventListener("lostpointercapture", onLostPointerCapture);
  button.addEventListener("click", onClick, true);
  button.addEventListener("contextmenu", onContextMenu);

  return () => {
    clearSession();
    clearClickSuppression();
    button.removeEventListener("pointerdown", onPointerDown);
    button.removeEventListener("pointermove", onPointerMove);
    button.removeEventListener("pointerup", onPointerEnd);
    button.removeEventListener("pointercancel", onPointerEnd);
    button.removeEventListener("lostpointercapture", onLostPointerCapture);
    button.removeEventListener("click", onClick, true);
    button.removeEventListener("contextmenu", onContextMenu);
  };
}
