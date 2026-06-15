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

function createClockContent(widget, { hass, entityVisibilityConfig } = {}) {
  const frame = document.createElement("div");
  frame.className = "mha-clock-widget-frame";
  frame.append(createClockWidgetContent({
    variant: widget.variant || "digital",
    widget,
    hass,
    entityVisibilityConfig,
  }));
  return frame;
}

const WIDGET_CONTENT_RENDERERS = Object.freeze({
  empty: {
    render: () => null,
  },
  clock: {
    render: ({ widget, hass, entityVisibilityConfig }) => createClockContent(widget, {
      hass,
      entityVisibilityConfig,
    }),
  },
  button: {
    decorateShell: ({ shell, widget }) => {
      shell.dataset.active = String(isSimpleButtonWidgetActive(widget));
    },
    render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => createSimpleButtonWidgetContent(widget, {
      widgetW,
      widgetH,
      hass,
      entityVisibilityConfig,
    }),
  },
  slider: {
    render: ({ widget, size, activeGridUnits, hass, entityVisibilityConfig }) => createSliderWidgetContent(widget, {
      size,
      activeGridUnits,
      hass,
      entityVisibilityConfig,
      value: widget.value ?? 68,
      orientation: "auto",
      className: "mha-widget-runtime-slider",
    }),
  },
  toggle: {
    render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => createToggleWidgetContent(widget, {
      widgetW,
      widgetH,
      bindToHass: true,
      hass,
      entityVisibilityConfig,
    }),
  },
  "toggle-slider": {
    render: ({ widget, widgetW, hass, entityVisibilityConfig }) => createToggleSliderWidgetContent(widget, {
      hass,
      entityVisibilityConfig,
      widgetW,
    }),
  },
  "toggle-buttons": {
    render: ({ widget, widgetW }) => createToggleButtonsWidgetContent(widget, {
      widgetW,
    }),
  },
  weather: {
    render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => createWeatherWidgetContent(widget, {
      widgetW,
      widgetH,
      hass,
      entityVisibilityConfig,
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
