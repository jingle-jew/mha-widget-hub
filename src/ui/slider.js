/*
 * MHA reusable slider component.
 */

export const SLIDER_ARM_DELAY_MS = 140;
export const SLIDER_MOVE_TOLERANCE_PX = 8;
export const SLIDER_AXIS_LOCK_PX = 10;

function getSliderPercent(value, min, max) {
  const minNumber = Number(min);
  const maxNumber = Number(max);
  const valueNumber = Number(value);

  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber) || maxNumber === minNumber) {
    return 0;
  }

  const percent = ((valueNumber - minNumber) / (maxNumber - minNumber)) * 100;
  return Math.max(0, Math.min(100, percent));
}

function normalizeSliderOrientation(orientation) {
  if (orientation === "vertical" || orientation === "auto") return orientation;
  return "horizontal";
}

function getSliderMeasureTarget(wrapper) {
  /*
   * Prefer the widget/unit shell over the slider itself.
   *
   * During auto-rotation the slider's own box may already be affected by the
   * previous orientation. The widget unit exposes the real available space, so
   * the rotor can use the true long axis after resize.
   */
  return wrapper.closest(".mha-slider-widget-unit") || wrapper;
}

function measureSliderBox(wrapper) {
  const measureTarget = getSliderMeasureTarget(wrapper);
  const previewShell = wrapper.closest?.(".mha-widget-manager-live-widget-shell");

  /*
   * Live previews render the real widget at its virtual dashboard size and then
   * scale the whole sandbox down with CSS transform. getBoundingClientRect()
   * includes that transform, which made SliderWidget measure the already-scaled
   * box and then render its rotor at a second scaled-down width. In preview, use
   * layout dimensions instead so the slider fills the real virtual widget before
   * the manager applies the single outer scale.
   */
  if (previewShell) {
    return {
      width: Math.max(0, measureTarget.offsetWidth || measureTarget.clientWidth || 0),
      height: Math.max(0, measureTarget.offsetHeight || measureTarget.clientHeight || 0),
    };
  }

  const rect = measureTarget.getBoundingClientRect();

  return {
    width: Math.max(0, rect.width),
    height: Math.max(0, rect.height),
  };
}

function applySliderLayout(wrapper) {
  const mode = wrapper.dataset.orientationMode || "horizontal";
  const input = wrapper.querySelector(".mha-slider-input");
  const { width, height } = measureSliderBox(wrapper);

  if (width > 0) {
    wrapper.style.setProperty("--mha-slider-available-inline", `${width}px`);
  }

  if (height > 0) {
    wrapper.style.setProperty("--mha-slider-available-block", `${height}px`);
  }

  const nextOrientation = mode === "auto"
    ? height > width ? "vertical" : "horizontal"
    : mode;

  if (wrapper.dataset.orientation !== nextOrientation) {
    wrapper.dataset.orientation = nextOrientation;
  }

  input?.setAttribute("aria-orientation", nextOrientation);
}

function observeSliderLayout(wrapper) {
  let resizeObserver = null;
  let destroyed = false;
  const frameIds = new Set();

  const scheduleFrame = (callback) => {
    const frameId = requestAnimationFrame(() => {
      frameIds.delete(frameId);
      if (!destroyed) callback();
    });
    frameIds.add(frameId);
  };

  const scheduleLayout = () => {
    if (destroyed) return;
    applySliderLayout(wrapper);

    /*
     * Safari can report an intermediate box during a resize/orientation flip.
     * Re-measure across two frames so the rotated rotor receives the final
     * widget frame height/width instead of the old compact axis.
     */
    scheduleFrame(() => {
      applySliderLayout(wrapper);
      scheduleFrame(() => applySliderLayout(wrapper));
    });
  };

  if (!("ResizeObserver" in window)) {
    scheduleFrame(scheduleLayout);
  } else {
    scheduleFrame(() => {
      const measureTarget = getSliderMeasureTarget(wrapper);
      resizeObserver = new ResizeObserver(scheduleLayout);
      resizeObserver.observe(measureTarget);
      scheduleLayout();
    });
  }

  return () => {
    destroyed = true;
    resizeObserver?.disconnect();
    resizeObserver = null;
    frameIds.forEach(frameId => cancelAnimationFrame(frameId));
    frameIds.clear();
  };
}


function getSliderWidgetShell(wrapper) {
  return wrapper.closest?.('.mha-widget[data-widget-kind="slider"]') || null;
}

function getSliderHost(wrapper) {
  const root = wrapper.getRootNode();
  return typeof ShadowRoot !== "undefined" && root instanceof ShadowRoot ? root.host : null;
}

function isPrimaryPointer(event) {
  if (event?.button != null && event.button !== 0) return false;
  return true;
}

export function canStartMobileSliderSession({
  layout = "",
  disabled = false,
  isEditing = false,
  isPreview = false,
  event = null,
} = {}) {
  if (layout !== "mobile") return false;
  if (disabled || isEditing || isPreview) return false;
  return isPrimaryPointer(event);
}

function isFullSliderWidgetPointerControl(wrapper) {
  const shell = getSliderWidgetShell(wrapper);
  const host = getSliderHost(wrapper);
  const isMobile = host?.dataset?.layout === "mobile";
  const isVertical = wrapper.dataset.orientation === "vertical";
  const themeStyle = host?.dataset?.themeStyle || "";
  const isIosSlider2 = themeStyle === "ios" && wrapper.classList.contains("slider2");

  if (!shell && !isIosSlider2) return false;

  /*
   * iOS always used custom full-widget pointer control, which is why it worked
   * reliably on Android too. OneUI/Material vertical full SliderWidget controls
   * need the same pointer mapping on mobile because native rotated range drag is
   * unreliable there: tap works, continuous vertical drag often does not.
   */
  return isIosSlider2 || themeStyle === "ios" || (isMobile && isVertical);
}

export function resolvePendingSliderGesture({
  orientation = "horizontal",
  deltaX = 0,
  deltaY = 0,
  moveTolerance = SLIDER_MOVE_TOLERANCE_PX,
  axisLockPx = SLIDER_AXIS_LOCK_PX,
} = {}) {
  const absX = Math.abs(Number(deltaX) || 0);
  const absY = Math.abs(Number(deltaY) || 0);

  if (absX <= moveTolerance && absY <= moveTolerance) return "pending";

  if (orientation === "horizontal") {
    if (absY >= axisLockPx && absY > absX) return "cancel";
    return "pending";
  }

  /*
   * Vertical sliders compete directly with page scroll on mobile. Until the
   * slider is armed, prefer cancelling and letting the page gesture win.
   */
  if (absX >= axisLockPx || absY >= axisLockPx) return "cancel";
  return "pending";
}

function getFullWidgetSliderValueFromPointer(wrapper, input, event, min, max) {
  const shell = getSliderWidgetShell(wrapper) || wrapper;
  const rect = shell.getBoundingClientRect();
  const minNumber = Number(min);
  const maxNumber = Number(max);

  if (!Number.isFinite(minNumber) || !Number.isFinite(maxNumber) || maxNumber === minNumber) {
    return Number(input.value) || 0;
  }

  const orientation = wrapper.dataset.orientation || "horizontal";
  const ratio = orientation === "vertical"
    ? 1 - ((event.clientY - rect.top) / Math.max(1, rect.height))
    : (event.clientX - rect.left) / Math.max(1, rect.width);

  const clamped = Math.max(0, Math.min(1, ratio));
  return minNumber + ((maxNumber - minNumber) * clamped);
}

function setFullWidgetSliderValueFromPointer(wrapper, input, event, min, max) {
  const nextValue = getFullWidgetSliderValueFromPointer(wrapper, input, event, min, max);
  input.value = String(nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function getSliderValueFromPointer(wrapper, input, event, min, max) {
  if (isFullSliderWidgetPointerControl(wrapper)) {
    return getFullWidgetSliderValueFromPointer(wrapper, input, event, min, max);
  }

  const rect = input.getBoundingClientRect?.() || wrapper.getBoundingClientRect?.();
  const minNumber = Number(min);
  const maxNumber = Number(max);

  if (!rect || !Number.isFinite(minNumber) || !Number.isFinite(maxNumber) || maxNumber === minNumber) {
    return Number(input.value) || 0;
  }

  const orientation = wrapper.dataset.orientation || "horizontal";
  const ratio = orientation === "vertical"
    ? 1 - ((event.clientY - rect.top) / Math.max(1, rect.height))
    : (event.clientX - rect.left) / Math.max(1, rect.width);

  const clamped = Math.max(0, Math.min(1, ratio));
  return minNumber + ((maxNumber - minNumber) * clamped);
}

function setSliderValueFromPointer(wrapper, input, event, min, max) {
  const nextValue = getSliderValueFromPointer(wrapper, input, event, min, max);
  input.value = String(nextValue);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

export function createSlider({
  label = "",
  min = 0,
  max = 100,
  value = 50,
  orientation = "horizontal",
  disabled = false,
  className = "",
  onInput,
  onChange,
} = {}) {
  let currentMin = min;
  let currentMax = max;
  const resolvedOrientation = normalizeSliderOrientation(orientation);
  const initialOrientation = resolvedOrientation === "auto" ? "horizontal" : resolvedOrientation;
  const wrapper = document.createElement("label");
  wrapper.className = ["mha-slider", className].filter(Boolean).join(" ");
  wrapper.dataset.orientationMode = resolvedOrientation;
  wrapper.dataset.orientation = initialOrientation;

  if (label) {
    const text = document.createElement("span");
    text.className = "mha-slider-label";
    text.textContent = label;
    wrapper.append(text);
  }

  const input = document.createElement("input");
  input.className = "mha-slider-input";
  input.type = "range";
  input.min = String(currentMin);
  input.max = String(currentMax);
  input.value = String(value);
  input.disabled = Boolean(disabled);
  input.setAttribute("aria-label", label || "Slider");
  input.setAttribute("aria-orientation", initialOrientation);

  const oneUiTrack = document.createElement("span");
  oneUiTrack.className = "mha-slider-oneui-track";

  const oneUiFill = document.createElement("span");
  oneUiFill.className = "mha-slider-oneui-fill";
  oneUiTrack.append(oneUiFill);

  const rotor = document.createElement("span");
  rotor.className = "mha-slider-rotor";
  const mobileInteractionTarget = wrapper;

  const syncValue = (currentValue) => {
    const percent = getSliderPercent(currentValue, currentMin, currentMax);
    const percentValue = `${percent}%`;
    wrapper.style.setProperty("--mha-slider-value", percentValue);
    input.style.setProperty("--mha-slider-value", percentValue);

    /*
     * Full SliderWidget visuals may be drawn by the widget shell itself.
     * CSS variables do not inherit upward, so expose the value on the nearest
     * slider widget parent while keeping the reusable slider component generic.
     */
    const sliderWidget = wrapper.closest?.('.mha-widget[data-widget-kind="slider"]');
    sliderWidget?.style?.setProperty("--mha-slider-value", percentValue);
  };

  wrapper.__mhaSliderApi = {
    setValue(nextValue) {
      input.value = String(nextValue);
      syncValue(nextValue);
    },
    setDisabled(nextDisabled) {
      input.disabled = Boolean(nextDisabled);
    },
    setRange(nextMin, nextMax) {
      currentMin = nextMin;
      currentMax = nextMax;
      input.min = String(currentMin);
      input.max = String(currentMax);
      syncValue(input.value);
    },
  };

  syncValue(value);

  input.addEventListener("input", (event) => {
    syncValue(event.currentTarget.value);
    onInput?.(event);
  });
  input.addEventListener("change", (event) => {
    syncValue(event.currentTarget.value);
    onChange?.(event);
  });

  let mobileSession = null;

  const getInteractionState = () => {
    const host = getSliderHost(wrapper);
    return {
      host,
      layout: host?.dataset?.layout || "",
      isEditing: Boolean(host?.classList?.contains?.("is-editing")),
      isPreview: Boolean(wrapper.closest?.(".mha-widget-manager-live-preview")),
    };
  };

  const clearMobileSession = (event, { emitChange = false } = {}) => {
    if (!mobileSession) return;

    const { pointerId, state, scrollContainer } = mobileSession;
    clearTimeout(mobileSession.armTimer);
    mobileSession.armTimer = 0;
    wrapper.classList.remove("is-slider-dragging");
    scrollContainer?.classList?.remove?.("is-mobile-slider-dragging");

    if (
      state === "active"
      && event?.type !== "lostpointercapture"
      && mobileInteractionTarget.hasPointerCapture?.(pointerId)
    ) {
      mobileInteractionTarget.releasePointerCapture?.(pointerId);
    }

    if (emitChange && state === "active") {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    mobileSession = null;
  };

  const armMobileSession = () => {
    if (!mobileSession || mobileSession.state !== "pending") return;
    mobileSession.state = "active";
    wrapper.classList.add("is-slider-dragging");
    mobileSession.scrollContainer?.classList?.add?.("is-mobile-slider-dragging");
    mobileInteractionTarget.setPointerCapture?.(mobileSession.pointerId);
    if (mobileSession.lastEvent) {
      setSliderValueFromPointer(wrapper, input, mobileSession.lastEvent, currentMin, currentMax);
    }
  };

  const handleMobilePointerDown = (event) => {
    const state = getInteractionState();
    if (!canStartMobileSliderSession({
      layout: state.layout,
      disabled: input.disabled,
      isEditing: state.isEditing,
      isPreview: state.isPreview,
      event,
    })) {
      return;
    }
    if (mobileSession?.pointerId === event.pointerId) return;

    clearMobileSession(null);
    mobileSession = {
      state: "pending",
      pointerId: event.pointerId,
      startX: Number(event.clientX || 0),
      startY: Number(event.clientY || 0),
      lastEvent: event,
      scrollContainer: wrapper.closest(".mha-widget-area"),
      armTimer: setTimeout(() => armMobileSession(), SLIDER_ARM_DELAY_MS),
    };
  };

  const handleMobilePointerMove = (event) => {
    if (!mobileSession || event.pointerId !== mobileSession.pointerId) return;
    mobileSession.lastEvent = event;

    if (mobileSession.state === "pending") {
      const outcome = resolvePendingSliderGesture({
        orientation: wrapper.dataset.orientation || "horizontal",
        deltaX: Number(event.clientX || 0) - mobileSession.startX,
        deltaY: Number(event.clientY || 0) - mobileSession.startY,
      });
      if (outcome === "cancel") {
        clearMobileSession(event);
      }
      return;
    }

    setSliderValueFromPointer(wrapper, input, event, currentMin, currentMax);
    event.preventDefault?.();
    event.stopPropagation?.();
  };

  const finishMobilePointer = (event) => {
    if (!mobileSession || (event.pointerId !== undefined && event.pointerId !== mobileSession.pointerId)) return;

    const wasActive = mobileSession.state === "active";
    if (wasActive) {
      setSliderValueFromPointer(wrapper, input, event, currentMin, currentMax);
      event.preventDefault?.();
      event.stopPropagation?.();
    }

    clearMobileSession(event, { emitChange: wasActive });
  };

  [mobileInteractionTarget, input].forEach((target) => {
    target.addEventListener("pointerdown", handleMobilePointerDown);
    target.addEventListener("pointermove", handleMobilePointerMove);
    target.addEventListener("pointerup", finishMobilePointer);
    target.addEventListener("pointercancel", finishMobilePointer);
    target.addEventListener("lostpointercapture", finishMobilePointer);
  });

  rotor.append(oneUiTrack, input);
  wrapper.append(rotor);

  const stopObservingLayout = observeSliderLayout(wrapper);
  wrapper.__mhaDestroy = () => {
    stopObservingLayout();
    wrapper.classList.remove("is-slider-dragging");
    clearMobileSession(null);
    [mobileInteractionTarget, input].forEach((target) => {
      target.removeEventListener?.("pointerdown", handleMobilePointerDown);
      target.removeEventListener?.("pointermove", handleMobilePointerMove);
      target.removeEventListener?.("pointerup", finishMobilePointer);
      target.removeEventListener?.("pointercancel", finishMobilePointer);
      target.removeEventListener?.("lostpointercapture", finishMobilePointer);
    });
    delete wrapper.__mhaSliderApi;
  };

  return wrapper;
}
