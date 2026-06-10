/*
 * MHA Simple Button Widget
 *
 * OneUI-inspired control pill.
 *
 * The outer MHA grid decides where the widget lives. The inside of the button
 * is intentionally a small component layout: a fixed circular icon bubble on
 * the left and a flexible two-line text stack on the right.
 */

import { createIconSymbol } from "../ui/icon-symbol.js";

export const SIMPLE_BUTTON_WIDGET_KIND = "button";

export function isSimpleButtonWidget(widget = {}) {
  const kind = widget?.kind || widget?.type || widget?.component;
  const variant = widget?.variant || "";

  return kind === "button"
    || kind === "button-widget"
    || widget?.component === "button-widget"
    || variant === "simple-button";
}

function getButtonData(widget = {}) {
  return {
    icon: widget.icon || "home",
    iconCategory: widget.iconCategory || "home",
    label: widget.label || "Bouton",
    state: widget.state || "Prêt",
  };
}

export function createSimpleButtonWidgetContent(widget = {}, {
  className = "",
  widgetW = Number(widget?.w) || 2,
  widgetH = Number(widget?.h) || 1,
} = {}) {
  const data = getButtonData(widget);
  const isSquare = Number(widgetW) === 2 && Number(widgetH) === 2;

  const root = document.createElement("div");
  root.className = ["mha-simple-button-widget", className].filter(Boolean).join(" ");
  root.dataset.widgetComponent = "simple-button";
  root.dataset.buttonLayout = isSquare ? "square" : "pill";

  const iconBubble = document.createElement("span");
  iconBubble.className = "mha-simple-button-icon-bubble";
  iconBubble.dataset.icon = data.icon;
  iconBubble.dataset.iconCategory = data.iconCategory;
  iconBubble.setAttribute("aria-hidden", "true");

  iconBubble.append(createIconSymbol({
    name: data.icon,
    label: "",
    className: "mha-simple-button-glyph",
  }));

  const textStack = document.createElement("span");
  textStack.className = "mha-simple-button-text";

  const label = document.createElement("span");
  label.className = "mha-simple-button-label";
  label.textContent = data.label;

  const state = document.createElement("span");
  state.className = "mha-simple-button-state";
  state.textContent = data.state;

  textStack.append(label, state);
  root.append(iconBubble, textStack);

  return root;
}
