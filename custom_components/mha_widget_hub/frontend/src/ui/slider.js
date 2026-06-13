/*
 * MHA reusable slider component.
 */

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
  return root instanceof ShadowRoot ? root.host : null;
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
  input.min = String(min);
  input.max = String(max);
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

  const syncValue = (currentValue) => {
    const percent = getSliderPercent(currentValue, min, max);
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

  let activePointerId = null;
  let activeScrollContainer = null;
  const getHost = () => {
    const root = input.getRootNode();
    return root instanceof ShadowRoot ? root.host : null;
  };
  const isMobileVerticalSlider = () => (
    wrapper.dataset.orientation === "vertical"
    && getHost()?.dataset.layout === "mobile"
  );
  const finishPointerDrag = (event) => {
    if (activePointerId === null || (event.pointerId !== undefined && event.pointerId !== activePointerId)) return;
    const pointerId = activePointerId;
    activePointerId = null;
    wrapper.classList.remove("is-slider-dragging");
    activeScrollContainer?.classList.remove("is-mobile-slider-dragging");
    activeScrollContainer = null;
    if (event.type !== "lostpointercapture" && input.hasPointerCapture?.(pointerId)) {
      input.releasePointerCapture?.(pointerId);
    }
    event.stopPropagation();
  };

  input.addEventListener("pointerdown", (event) => {
    if (!isMobileVerticalSlider() || isFullSliderWidgetPointerControl(wrapper)) return;
    activePointerId = event.pointerId;
    activeScrollContainer = wrapper.closest(".mha-widget-area");
    wrapper.classList.add("is-slider-dragging");
    activeScrollContainer?.classList.add("is-mobile-slider-dragging");
    input.setPointerCapture?.(event.pointerId);
    event.stopPropagation();
  });

  input.addEventListener("pointermove", (event) => {
    if (event.pointerId !== activePointerId) return;
    event.stopPropagation();
  });

  input.addEventListener("pointerup", finishPointerDrag);
  input.addEventListener("pointercancel", finishPointerDrag);
  input.addEventListener("lostpointercapture", finishPointerDrag);

  let activeFullWidgetPointerId = null;
  let activeFullWidgetScrollContainer = null;

  const startFullWidgetPointer = (event) => {
    if (!isFullSliderWidgetPointerControl(wrapper)) return;
    activeFullWidgetPointerId = event.pointerId;
    activeFullWidgetScrollContainer = wrapper.closest(".mha-widget-area");
    wrapper.classList.add("is-slider-dragging");
    activeFullWidgetScrollContainer?.classList.add("is-mobile-slider-dragging");
    input.setPointerCapture?.(event.pointerId);
    setFullWidgetSliderValueFromPointer(wrapper, input, event, min, max);
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const moveFullWidgetPointer = (event) => {
    if (!isFullSliderWidgetPointerControl(wrapper) || event.pointerId !== activeFullWidgetPointerId) return;
    setFullWidgetSliderValueFromPointer(wrapper, input, event, min, max);
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const finishFullWidgetPointer = (event) => {
    if (!isFullSliderWidgetPointerControl(wrapper)) return;
    if (event.pointerId !== undefined && event.pointerId !== activeFullWidgetPointerId) return;

    const pointerId = activeFullWidgetPointerId;
    const hadActivePointer = pointerId !== null;
    activeFullWidgetPointerId = null;
    wrapper.classList.remove("is-slider-dragging");
    activeFullWidgetScrollContainer?.classList.remove("is-mobile-slider-dragging");
    activeFullWidgetScrollContainer = null;

    if (event.type !== "lostpointercapture" && pointerId !== null && input.hasPointerCapture?.(pointerId)) {
      input.releasePointerCapture?.(pointerId);
    }

    if (hadActivePointer) {
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    event.preventDefault?.();
    event.stopImmediatePropagation?.();
  };

  input.addEventListener("pointerdown", startFullWidgetPointer, { capture: true });
  input.addEventListener("pointermove", moveFullWidgetPointer, { capture: true });
  input.addEventListener("pointerup", finishFullWidgetPointer, { capture: true });
  input.addEventListener("pointercancel", finishFullWidgetPointer, { capture: true });
  input.addEventListener("lostpointercapture", finishFullWidgetPointer, { capture: true });

  rotor.append(oneUiTrack, input);
  wrapper.append(rotor);

  const stopObservingLayout = observeSliderLayout(wrapper);
  wrapper.__mhaDestroy = () => {
    stopObservingLayout();
    wrapper.classList.remove("is-slider-dragging");
    activeScrollContainer?.classList.remove("is-mobile-slider-dragging");
    activeFullWidgetScrollContainer?.classList.remove("is-mobile-slider-dragging");
    activePointerId = null;
    activeFullWidgetPointerId = null;
    activeScrollContainer = null;
    activeFullWidgetScrollContainer = null;
    delete wrapper.__mhaSliderApi;
  };

  return wrapper;
}
