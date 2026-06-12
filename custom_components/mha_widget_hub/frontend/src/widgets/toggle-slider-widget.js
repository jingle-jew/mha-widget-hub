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
  const entityState = getEntityState(hass, widget);
  const hasEntity = Boolean(entityState);
  const supportsToggle = widget.supportsToggle ?? (!entityId || (hasEntity && supportsToggleEntity(entityState)));
  const sliderBinding = getSliderBinding(entityState);
  const supportsSlider = widget.supportsSlider ?? (!entityId || Boolean(sliderBinding));
  const checked = hasEntity ? isToggleEntityOn(entityState) : widget.checked;

  const root = document.createElement("div");
  root.className = "combined-toggle-slider";
  root.dataset.widgetComponent = "toggle-slider";
  root.dataset.toggleSupported = String(Boolean(supportsToggle));
  root.dataset.sliderSupported = String(Boolean(supportsSlider));

  const toggleSection = document.createElement("div");
  toggleSection.className = "combined-toggle-slider__toggle";
  toggleSection.append(createToggleWidgetContent({
    ...widget,
    checked,
    state: entityState?.state || widget.state,
  }, {
    widgetW,
    widgetH: 1,
    disabled: !supportsToggle,
    onToggle: (nextChecked, currentWidget, event) => {
      if (entityId) runToggleAction(hass, entityState);
      onToggle?.(nextChecked, currentWidget, event);
    },
  }));

  const sliderSection = document.createElement("div");
  sliderSection.className = "combined-toggle-slider__slider";

  const value = sliderBinding?.value ?? widget.value ?? 68;
  const sliderValue = document.createElement("span");
  sliderValue.className = "combined-toggle-slider__slider-value";
  sliderValue.textContent = `${Math.round(Number(value) || 0)}%`;

  const sliderOptions = {
    value,
    min: sliderBinding?.min ?? widget.min ?? 0,
    max: sliderBinding?.max ?? widget.max ?? 100,
    orientation: "horizontal",
    disabled: !supportsSlider,
    onInput: (event) => {
      const nextValue = Number(event.currentTarget.value);
      sliderValue.textContent = `${Math.round(nextValue)}%`;
      if (entityId && sliderBinding) runSliderAction(hass, entityState, nextValue);
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
  return root;
}
