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
import { runToggleAction } from "../ha/actions.js";
import { getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import { isToggleEntityOn, supportsToggleEntity } from "../ha/toggle.js";
import { isWidgetKind } from "./widget-registry.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";

export const TOGGLE_WIDGET_KIND = "toggle";

export function isToggleWidget(widget = {}) {
  return isWidgetKind(widget, TOGGLE_WIDGET_KIND);
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
  bindToHass = false,
  hass,
  entityVisibilityConfig,
  onToggle,
} = {}) {
  const data = getToggleWidgetData(widget);
  const entityId = getWidgetEntityId(widget);
  const context = {
    hass,
    entityState: null,
    entityAvailable: false,
    entityAllowed: true,
  };

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
      if (bindToHass && entityId && context.entityAvailable) {
        runToggleAction(context.hass, context.entityState, checked);
      }
      onToggle?.(checked, widget, event);
    },
  });

  root.append(iconBubble, textStack, toggle);

  if (bindToHass) {
    root.__mhaUpdateFromHass = nextHass => {
      context.hass = nextHass;
      context.entityAllowed = isEntityAllowedForCurrentUser(
        nextHass,
        entityId,
        entityVisibilityConfig,
      );
      context.entityState = context.entityAllowed
        ? getEntityState(nextHass, widget)
        : null;
      context.entityAvailable = isEntityAvailable(context.entityState);

      const supportsToggle = context.entityAvailable
        && supportsToggleEntity(context.entityState);
      const checked = supportsToggle
        ? isToggleEntityOn(context.entityState)
        : false;
      const input = toggle.querySelector(".mha-toggle-input");

      root.dataset.entityAvailable = String(context.entityAvailable);
      root.dataset.entityAllowed = String(context.entityAllowed);
      root.dataset.toggleSupported = String(Boolean(supportsToggle));
      root.dataset.checked = String(checked);
      if (input) {
        input.checked = checked;
        input.disabled = !supportsToggle;
        input.setAttribute(
          "aria-label",
          context.entityAllowed ? data.label : "Entité non autorisée",
        );
      }
      label.textContent = context.entityAllowed ? data.label : "Entité non autorisée";
      state.textContent = !context.entityAllowed
        ? "Non autorisé"
        : context.entityAvailable
        ? supportsToggle
          ? checked
            ? data.stateOn
            : data.stateOff
          : "Non pris en charge"
        : "Indisponible";
    };

    root.__mhaDestroy = () => {
      context.hass = null;
      context.entityState = null;
      context.entityAvailable = false;
      context.entityAllowed = true;
      delete root.__mhaUpdateFromHass;
    };

    root.__mhaUpdateFromHass(hass);
  }

  return root;
}


export const TOGGLE_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig }) => createToggleWidgetContent(widget, {
    widgetW,
    widgetH,
    bindToHass: true,
    hass,
    entityVisibilityConfig,
  }),
});
