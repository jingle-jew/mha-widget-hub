import { getEntityState, getWidgetEntityId } from "../ha/entity.js";
import { runSliderAction, runToggleAction } from "../ha/actions.js";
import { getSliderBinding } from "../ha/slider.js";
import { isToggleEntityOn, supportsToggleEntity } from "../ha/toggle.js";
import { createSlider } from "../ui/slider.js";
import { createSlider2 } from "../ui/slider2.js";
import { createToggleWidgetContent } from "./toggle-widget.js";

export const TOGGLE_SLIDER_WIDGET_KIND = "toggle-slider";

export function isToggleSliderWidget(widget = {}) {
  const kind = widget?.kind || widget?.type || widget?.component;
  const variant = widget?.variant || "";

  return kind === TOGGLE_SLIDER_WIDGET_KIND
    || kind === "combined-slider-toggle"
    || kind === "combined-toggle-slider"
    || widget?.component === "toggle-slider-widget"
    || variant === "toggle-slider"
    || variant === "combined-slider-toggle"
    || variant === "combined-toggle-slider";
}

export function createToggleSliderWidgetContent(widget = {}, {
  hass,
  widgetW = Number(widget?.w) || 4,
  onToggle,
  onSliderInput,
} = {}) {
  const entityId = getWidgetEntityId(widget);
  const context = {
    hass,
    entityState: null,
    sliderBinding: null,
  };

  const root = document.createElement("div");
  root.className = "combined-toggle-slider";
  root.dataset.widgetComponent = "toggle-slider";

  const toggleSection = document.createElement("div");
  toggleSection.className = "combined-toggle-slider__toggle";
  toggleSection.append(createToggleWidgetContent({
    ...widget,
    checked: widget.checked,
    state: widget.state,
  }, {
    widgetW,
    widgetH: 1,
    disabled: false,
    onToggle: (nextChecked, currentWidget, event) => {
      if (entityId) runToggleAction(context.hass, context.entityState);
      onToggle?.(nextChecked, currentWidget, event);
    },
  }));

  const sliderSection = document.createElement("div");
  sliderSection.className = "combined-toggle-slider__slider";

  const value = widget.value ?? 68;
  const sliderValue = document.createElement("span");
  sliderValue.className = "combined-toggle-slider__slider-value";
  sliderValue.textContent = `${Math.round(Number(value) || 0)}%`;

  const sliderOptions = {
    value,
    min: widget.min ?? 0,
    max: widget.max ?? 100,
    orientation: "horizontal",
    disabled: false,
    onInput: (event) => {
      const nextValue = Number(event.currentTarget.value);
      sliderValue.textContent = `${Math.round(nextValue)}%`;
      if (entityId && context.sliderBinding) {
        runSliderAction(context.hass, context.entityState, nextValue);
      }
      onSliderInput?.(nextValue, widget, event);
    },
  };

  const slider = createSlider({
    ...sliderOptions,
    className: "combined-toggle-slider__control combined-toggle-slider__control--default",
  });

  const slider2 = createSlider2({
    ...sliderOptions,
    className: "slider2--combined combined-toggle-slider__control combined-toggle-slider__control--ios",
  });

  sliderSection.append(sliderValue, slider, slider2);
  root.append(toggleSection, sliderSection);

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    context.entityState = getEntityState(nextHass, widget);
    context.sliderBinding = getSliderBinding(context.entityState);

    const hasEntity = Boolean(context.entityState);
    const supportsToggle = widget.supportsToggle
      ?? (!entityId || (hasEntity && supportsToggleEntity(context.entityState)));
    const supportsSlider = widget.supportsSlider
      ?? (!entityId || Boolean(context.sliderBinding));
    const checked = hasEntity ? isToggleEntityOn(context.entityState) : Boolean(widget.checked);
    const nextValue = context.sliderBinding?.value ?? widget.value ?? 68;

    root.dataset.toggleSupported = String(Boolean(supportsToggle));
    root.dataset.sliderSupported = String(Boolean(supportsSlider));

    const toggleRoot = toggleSection.querySelector(".mha-toggle-widget");
    const toggleInput = toggleSection.querySelector(".mha-toggle-input");
    const toggleState = toggleSection.querySelector(".mha-toggle-widget-state");
    if (toggleRoot) toggleRoot.dataset.checked = String(checked);
    if (toggleInput) {
      toggleInput.checked = checked;
      toggleInput.disabled = !supportsToggle;
    }
    if (toggleState) {
      toggleState.textContent = checked
        ? widget.stateOn || "Activé"
        : widget.stateOff || "Désactivé";
    }

    const isSliderDragging = [slider, slider2]
      .some((control) => control.classList.contains("is-slider-dragging"));
    if (!isSliderDragging) {
      sliderValue.textContent = `${Math.round(Number(nextValue) || 0)}%`;
    }
    [slider, slider2].forEach((control) => {
      control.__mhaSliderApi?.setDisabled(!supportsSlider);
      if (!isSliderDragging) {
        control.__mhaSliderApi?.setValue(nextValue);
      }
    });
  };

  root.__mhaUpdateFromHass(hass);
  return root;
}
