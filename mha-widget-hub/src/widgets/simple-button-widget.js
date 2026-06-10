/*
 * MHA Simple Button Widget
 *
 * Compact control-pill layout.
 *
 * External size: 2x1
 * Internal layout: icon bubble + vertical text stack.
 *
 * Important:
 * This widget intentionally does not use the generic 8x4 inner-grid.
 * A pill button behaves better as a small component layout: fixed visual
 * icon bubble on the left, flexible label/state stack on the right.
 */

import { createIcon } from "../ui/icon.js";
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
} = {}) {
  const data = getButtonData(widget);

  const root = document.createElement("div");
  root.className = ["mha-simple-button-widget", className].filter(Boolean).join(" ");
  root.dataset.widgetComponent = "simple-button";

  const icon = createIcon({
    name: data.icon,
    category: data.iconCategory,
    label: data.label,
    className: "mha-simple-button-icon",
    children: createIconSymbol({
      name: data.icon,
      label: data.label,
    }),
  });

  const textStack = document.createElement("div");
  textStack.className = "mha-simple-button-text";

  const label = document.createElement("span");
  label.className = "mha-simple-button-label";
  label.textContent = data.label;

  const state = document.createElement("span");
  state.className = "mha-simple-button-state";
  state.textContent = data.state;

  textStack.append(label, state);
  root.append(icon, textStack);

  return root;
}
