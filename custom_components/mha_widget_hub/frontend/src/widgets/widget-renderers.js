import { createClockWidgetContent } from "./clock-widget.js";
import {
  createSimpleButtonWidgetContent,
  isSimpleButtonWidgetActive,
} from "./simple-button-widget.js";
import { createSliderWidgetContent } from "./slider-widget.js";
import { createToggleButtonsWidgetContent } from "./toggle-buttons-widget.js";
import { createToggleSliderWidgetContent } from "./toggle-slider-widget.js";
import { createToggleWidgetContent } from "./toggle-widget.js";
import { createWeatherWidgetContent } from "./weather-widget.js";
import { getWidgetDefinition } from "./widget-registry.js";

function createClockContent(widget) {
  const frame = document.createElement("div");
  frame.className = "mha-clock-widget-frame";
  frame.append(createClockWidgetContent({
    variant: widget.variant || "digital",
    widget,
  }));
  return frame;
}

const WIDGET_CONTENT_RENDERERS = Object.freeze({
  empty: {
    render: () => null,
  },
  clock: {
    render: ({ widget }) => createClockContent(widget),
  },
  button: {
    decorateShell: ({ shell, widget }) => {
      shell.dataset.active = String(isSimpleButtonWidgetActive(widget));
    },
    render: ({ widget, widgetW, widgetH }) => createSimpleButtonWidgetContent(widget, {
      widgetW,
      widgetH,
    }),
  },
  slider: {
    render: ({ widget, size, activeGridUnits, hass }) => createSliderWidgetContent(widget, {
      size,
      activeGridUnits,
      hass,
      value: widget.value ?? 68,
      orientation: "auto",
      className: "mha-widget-demo-slider",
    }),
  },
  toggle: {
    render: ({ widget, widgetW, widgetH }) => createToggleWidgetContent(widget, {
      widgetW,
      widgetH,
    }),
  },
  "toggle-slider": {
    render: ({ widget, widgetW, hass }) => createToggleSliderWidgetContent(widget, {
      hass,
      widgetW,
    }),
  },
  "toggle-buttons": {
    render: ({ widget, widgetW }) => createToggleButtonsWidgetContent(widget, {
      widgetW,
    }),
  },
  weather: {
    render: ({ widget, widgetW, widgetH }) => createWeatherWidgetContent(widget, {
      widgetW,
      widgetH,
    }),
  },
});

function getRenderer(widget) {
  const rendererName = getWidgetDefinition(widget)?.renderer || "empty";
  return WIDGET_CONTENT_RENDERERS[rendererName] || WIDGET_CONTENT_RENDERERS.empty;
}

export function hasWidgetContentRenderer(rendererName) {
  return Object.hasOwn(WIDGET_CONTENT_RENDERERS, rendererName);
}

export function decorateWidgetShell(shell, widget, context = {}) {
  getRenderer(widget).decorateShell?.({ shell, widget, ...context });
}

export function createRegisteredWidgetContent(widget, context = {}) {
  return getRenderer(widget).render({ widget, ...context });
}
