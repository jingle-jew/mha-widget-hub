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
import { isWidgetKind } from "./widget-registry.js";

export const SIMPLE_BUTTON_WIDGET_KIND = "button";

export function isSimpleButtonWidget(widget = {}) {
  return isWidgetKind(widget, SIMPLE_BUTTON_WIDGET_KIND);
}

export function isSimpleButtonWidgetActive(widget = {}) {
  const raw = widget.active ?? widget.checked ?? widget.isActive ?? widget.on ?? widget.state;
  if (typeof raw === "boolean") return raw;

  return ["on", "true", "active", "open", "enabled", "playing"].includes(
    String(raw ?? "").trim().toLowerCase(),
  );
}

function getButtonData(widget = {}) {
  const active = isSimpleButtonWidgetActive(widget);
  const hasExplicitState = widget.state != null && widget.state !== "";
  const stateOn = widget.stateOn || widget.onLabel || widget.activeState || "Activé";
  const stateOff = widget.stateOff || widget.offLabel || widget.inactiveState || "Désactivé";

  return {
    icon: widget.icon || "home",
    iconCategory: widget.iconCategory || "home",
    label: widget.label || "Bouton",
    state: hasExplicitState ? String(widget.state) : (active ? stateOn : stateOff),
    stateOn,
    stateOff,
    active,
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
  root.dataset.active = String(data.active);
  root.dataset.state = data.active ? "on" : "off";
  root.setAttribute("role", "button");
  root.setAttribute("tabindex", "0");
  root.setAttribute("aria-pressed", String(data.active));
  root.setAttribute("aria-label", data.label);

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

  function setPressed(nextActive) {
    const active = Boolean(nextActive);
    root.dataset.active = String(active);
    root.dataset.state = active ? "on" : "off";
    root.setAttribute("aria-pressed", String(active));

    const shell = root.closest?.('.mha-widget[data-widget-kind="button"]');
    if (shell) {
      shell.dataset.active = String(active);
      shell.dataset.state = active ? "on" : "off";
    }

    if (widget.state == null || widget.state === "") {
      state.textContent = active ? data.stateOn : data.stateOff;
    }
  }

  root.addEventListener("click", (event) => {
    event.preventDefault();
    setPressed(root.dataset.active !== "true");
    root.dispatchEvent(new CustomEvent("mha-button-click", {
      bubbles: true,
      detail: {
        widget,
        active: root.dataset.active === "true",
      },
    }));
  });

  root.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    root.click();
  });

  textStack.append(label, state);
  root.append(iconBubble, textStack);

  return root;
}
