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
  return wrapper.closest(".mha-slider-widget-unit")
    || wrapper.closest(".mha-widget-slider-unit")
    || wrapper;
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

function scheduleSliderLayout(wrapper) {
  applySliderLayout(wrapper);

  /*
   * Safari can report an intermediate box during a resize/orientation flip.
   * Re-measure across two frames so the rotated rotor receives the final
   * widget-unit height/width instead of the old compact axis.
   */
  requestAnimationFrame(() => {
    applySliderLayout(wrapper);
    requestAnimationFrame(() => applySliderLayout(wrapper));
  });
}

function observeSliderLayout(wrapper) {
  if (!("ResizeObserver" in window)) {
    requestAnimationFrame(() => scheduleSliderLayout(wrapper));
    return;
  }

  requestAnimationFrame(() => {
    const measureTarget = getSliderMeasureTarget(wrapper);
    const resizeObserver = new ResizeObserver(() => scheduleSliderLayout(wrapper));

    resizeObserver.observe(measureTarget);
    wrapper.__mhaSliderResizeObserver = resizeObserver;
    scheduleSliderLayout(wrapper);
  });
}

export function createSlider({
  label = "",
  min = 0,
  max = 100,
  value = 50,
  orientation = "horizontal",
  className = "",
  onInput,
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
    wrapper.style.setProperty("--mha-slider-value", `${percent}%`);
    input.style.setProperty("--mha-slider-value", `${percent}%`);
  };

  syncValue(value);

  input.addEventListener("input", (event) => {
    syncValue(event.currentTarget.value);
    onInput?.(event);
  });

  rotor.append(oneUiTrack, input);
  wrapper.append(rotor);

  observeSliderLayout(wrapper);

  return wrapper;
}
