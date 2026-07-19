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
import { getEntityDomain, getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import { isToggleEntityOn, supportsToggleEntity } from "../ha/toggle.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { clampWidth, css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";
import {
  buildToggleWidgetConfig,
  createToggleConfigDraft,
  renderToggleConfigFields,
} from "../widget-config/toggle-config.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import { t } from "../i18n/index.js";
import { openLightControlPopup } from "../light-popup/light-control-popup-controller.js";
import { normalizeLightPopupConfig } from "../light-popup/light-popup-config.js";

export const TOGGLE_WIDGET_KIND = "toggle";

export function isToggleWidget(widget = {}) {
  return isLocalWidgetKind(widget, TOGGLE_WIDGET_KIND, ["toggle-widget", "simple-toggle"]);
}

function getToggleExplicitIcon(widget = {}) {
  const icon = String(widget.icon || "").trim();
  const iconCategory = String(widget.iconCategory || "").trim().toLowerCase();
  if (icon !== "home") return icon;
  if (iconCategory && iconCategory !== "home") return icon;
  return "";
}

function getToggleWidgetData(widget = {}) {
  const checked = typeof widget.checked === "boolean"
    ? widget.checked
    : ["on", "true", "active", "open"].includes(String(widget.state || "").toLowerCase());
  const icon = resolveWidgetIconName({
    explicitIcon: getToggleExplicitIcon(widget),
    label: widget.label || widget.title,
    entityId: widget.entityId || widget.entity_id || "",
    domain: getEntityDomain(widget.entityId || widget.entity_id || ""),
    kind: TOGGLE_WIDGET_KIND,
    fallback: "toggle",
  });

  return {
    icon,
    iconCategory: widget.iconCategory || "home",
    label: widget.label || widget.title || "Toggle",
    stateOn: widget.stateOn || t("states.on", "On"),
    stateOff: widget.stateOff || t("states.off", "Off"),
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
  onOpenDetails,
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

  const detailsTrigger = document.createElement("button");
  detailsTrigger.type = "button";
  detailsTrigger.className = "mha-toggle-widget-details-trigger";
  detailsTrigger.setAttribute("aria-label", t("lightPopup.open", "Open light controls"));
  detailsTrigger.disabled = typeof onOpenDetails !== "function";
  detailsTrigger.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenDetails?.(detailsTrigger, event, context.hass);
  };

  root.append(iconBubble, textStack, toggle, detailsTrigger);

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
          context.entityAllowed ? data.label : t("common.unauthorizedEntity", "Unauthorized entity"),
        );
      }
      label.textContent = context.entityAllowed ? data.label : t("common.unauthorizedEntity", "Unauthorized entity");
      state.textContent = !context.entityAllowed
        ? t("common.unauthorized", "Unauthorized")
        : context.entityAvailable
        ? supportsToggle
          ? checked
            ? data.stateOn
            : data.stateOff
          : t("common.unsupported", "Unsupported")
        : t("states.unavailable", "Unavailable");
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
  render: ({
    widget,
    widgetW,
    widgetH,
    hass,
    entityVisibilityConfig,
    interactive = true,
    isEditing = false,
    updateWidgetConfig,
  }) => createToggleWidgetContent(widget, {
    widgetW,
    widgetH,
    disabled: !interactive,
    bindToHass: true,
    hass,
    entityVisibilityConfig,
    onOpenDetails: interactive && !isEditing && getEntityDomain(getWidgetEntityId(widget)) === "light"
      ? (anchor, _event, currentHass) => openLightControlPopup({
        anchor,
        widget,
        hass: currentHass,
        entityVisibilityConfig,
        updateWidgetConfig,
      })
      : undefined,
  }),
});

export const TOGGLE_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "toggle",
  title: "Configure toggle",
  hint: "Choose the device type, entity, and display name.",
  titleKey: "widgets.config.configureToggle",
  hintKey: "widgets.config.toggleHint",
  createDraft: createToggleConfigDraft,
  build: buildToggleWidgetConfig,
  renderFields: renderToggleConfigFields,
});

export const TOGGLE_WIDGET_DEFINITION = Object.freeze({
  component: "toggle-widget",
  category: "lights",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "toggle-widget", label: "Toggle", size: freezeSize(3, 1), description: "Icon, state, and switch.", order: 30 }),
      Object.freeze({ category: "lights", variant: "toggle-widget", label: "Toggle large", size: freezeSize(4, 1), description: "Switch with more space.", order: 40 }),
    ]),
  }),
  renderer: "toggle",
  css: css("styles/widgets/toggle-widget.css"),
  preview: "toggle",
  config: "toggle",
  aliases: ["toggle-widget"],
  variantAliases: ["toggle-widget", "simple-toggle"],
  defaultVariant: "toggle-widget",
  defaultSize: freezeSize(3, 1),
  normalizeSize: (size) => ({ ...clampWidth(size, 3, 4), h: 1 }),
  capabilities: Object.freeze({
    configurable: true,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => {
      const entityId = widget.entityId || widget.entity_id || "";
      return {
        entityId,
        ...(getEntityDomain(entityId) === "light" && widget.lightPopup
          ? { lightPopup: normalizeLightPopupConfig(widget.lightPopup) }
          : {}),
      };
    },
  }),
  shell: Object.freeze({
    configureMode: "config",
  }),
  placementFlow: "configure-first",
  variants: [
    variant("toggle-widget", "Toggle 3×1", 3, 1),
    variant("toggle-widget", "Toggle 4×1", 4, 1),
  ],
});

function createTogglePreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.toggle;
  return {
    ...item,
    kind: "toggle",
    type: "toggle",
    component: TOGGLE_WIDGET_DEFINITION.component,
    variant: item.variant || TOGGLE_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
    label: item.label || item.title || previewData.name,
    title: item.title || item.label || previewData.name,
    icon: item.icon || "home",
    iconCategory: item.iconCategory || "home",
    checked: item.checked ?? true,
    state: item.state || previewData.state,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "toggle",
  definition: TOGGLE_WIDGET_DEFINITION,
  renderer: TOGGLE_WIDGET_CONTENT_RENDERER,
  config: TOGGLE_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createTogglePreviewWidget,
  }),
});
