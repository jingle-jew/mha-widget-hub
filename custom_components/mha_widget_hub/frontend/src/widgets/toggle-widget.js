/*
 * MHA Toggle Widget
 *
 * A full-widget toggle control with a OneUI/iOS style control row:
 * circular icon bubble on the left, label/state stack in the middle, and the
 * reusable toggle component anchored to the right.
 *
 * The widget owns its internal layout directly and does not use the legacy
 * inner-grid system.
 */

import { createIconSymbol } from "../ui/icon-symbol.js";
import { createToggle } from "../ui/toggle.js";

export const TOGGLE_WIDGET_KIND = "toggle";

export function isToggleWidget(widget = {}) {
  const kind = widget?.kind || widget?.type || widget?.component;
  const variant = widget?.variant || "";

  return kind === "toggle"
    || kind === "toggle-widget"
    || widget?.component === "toggle-widget"
    || variant === "toggle-widget"
    || variant === "simple-toggle";
}

function getToggleWidgetData(widget = {}) {
  const checked = typeof widget.checked === "boolean"
    ? widget.checked
    : ["on", "true", "active", "open"].includes(String(widget.state || "").toLowerCase());

  return {
    icon: widget.icon || "home",
    iconCategory: widget.iconCategory || "home",
    label: widget.label || widget.title || "Toggle",
    stateOn: widget.stateOn || "Activé",
    stateOff: widget.stateOff || "Désactivé",
    checked,
  };
}

export function createToggleWidgetContent(widget = {}, {
  className = "",
  widgetW = Number(widget?.w) || 3,
  widgetH = Number(widget?.h) || 1,
  disabled = false,
  onToggle,
} = {}) {
  const data = getToggleWidgetData(widget);

  const root = document.createElement("div");
  root.className = ["mha-toggle-widget", className].filter(Boolean).join(" ");
  root.dataset.widgetComponent = "toggle";
  root.dataset.toggleLayout = `${widgetW}x${widgetH}`;
  root.dataset.checked = String(data.checked);

  const iconBubble = document.createElement("span");
  iconBubble.className = "mha-toggle-widget-icon-bubble";
  iconBubble.dataset.icon = data.icon;
  iconBubble.dataset.iconCategory = data.iconCategory;
  iconBubble.setAttribute("aria-hidden", "true");
  iconBubble.append(createIconSymbol({
    name: data.icon,
    label: "",
    className: "mha-toggle-widget-glyph",
  }));

  const textStack = document.createElement("span");
  textStack.className = "mha-toggle-widget-text";

  const label = document.createElement("span");
  label.className = "mha-toggle-widget-label";
  label.textContent = data.label;

  const state = document.createElement("span");
  state.className = "mha-toggle-widget-state";
  state.textContent = data.checked ? data.stateOn : data.stateOff;

  textStack.append(label, state);

  const toggle = createToggle({
    label: data.label,
    checked: data.checked,
    disabled,
    className: "mha-toggle-widget-control",
    onChange: (event) => {
      const checked = Boolean(event.currentTarget?.checked);
      root.dataset.checked = String(checked);
      state.textContent = checked ? data.stateOn : data.stateOff;
      onToggle?.(checked, widget, event);
    },
  });

  root.append(iconBubble, textStack, toggle);

  return root;
}
