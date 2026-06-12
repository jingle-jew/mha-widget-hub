import { createSlider } from "../ui/slider.js";
import { createSlider2 } from "../ui/slider2.js";
import { createToggleWidgetContent } from "./toggle-widget.js";

export const TOGGLE_SLIDER_WIDGET_KIND = "toggle-slider";

const TOGGLE_DOMAINS = new Set([
  "fan",
  "humidifier",
  "input_boolean",
  "light",
  "media_player",
  "switch",
]);

function getEntityId(widget = {}) {
  return widget.entityId || widget.entity_id || widget.entity || "";
}

function getEntityState(widget = {}, hass) {
  const entityId = getEntityId(widget);
  return entityId ? hass?.states?.[entityId] || null : null;
}

function getSliderBinding(widget = {}, entityState) {
  const attributes = entityState?.attributes || {};
  const domain = getEntityId(widget).split(".")[0];

  if (Number.isFinite(Number(attributes.brightness)) || domain === "light") {
    return {
      value: Math.round((Number(attributes.brightness) || 0) / 2.55),
      min: 0,
      max: 100,
      service: "turn_on",
      data: (value) => ({ brightness_pct: Math.round(value) }),
    };
  }

  if (Number.isFinite(Number(attributes.percentage)) || domain === "fan") {
    return {
      value: Number(attributes.percentage) || 0,
      min: 0,
      max: 100,
      service: "set_percentage",
      data: (value) => ({ percentage: Math.round(value) }),
    };
  }

  if (Number.isFinite(Number(attributes.volume_level)) || domain === "media_player") {
    return {
      value: Math.round((Number(attributes.volume_level) || 0) * 100),
      min: 0,
      max: 100,
      service: "volume_set",
      data: (value) => ({ volume_level: Number(value) / 100 }),
    };
  }

  if (Number.isFinite(Number(attributes.position))) {
    return {
      value: Number(attributes.position),
      min: 0,
      max: 100,
      service: "set_cover_position",
      data: (value) => ({ position: Math.round(value) }),
    };
  }

  return null;
}

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
  const entityId = getEntityId(widget);
  const entityState = getEntityState(widget, hass);
  const domain = entityId.split(".")[0];
  const hasEntity = Boolean(entityState);
  const supportsToggle = widget.supportsToggle ?? (!entityId || (hasEntity && TOGGLE_DOMAINS.has(domain)));
  const sliderBinding = getSliderBinding(widget, entityState);
  const supportsSlider = widget.supportsSlider ?? (!entityId || Boolean(sliderBinding));
  const checked = hasEntity
    ? !["off", "closed", "idle", "standby", "unavailable", "unknown"].includes(entityState.state)
    : widget.checked;

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
      if (entityId && hass?.callService) {
        hass.callService(domain, nextChecked ? "turn_on" : "turn_off", { entity_id: entityId });
      }
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
      if (entityId && sliderBinding && hass?.callService) {
        hass.callService(domain, sliderBinding.service, {
          entity_id: entityId,
          ...sliderBinding.data(nextValue),
        });
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
  return root;
}
