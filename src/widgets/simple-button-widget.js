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
import { runButtonAction } from "../ha/actions.js";
import { resolveAuthorizedEntity } from "../ha/entity-access.js";
import { getEntityDisplayName } from "../widget-config/light-options.js";
import { isToggleEntityOn } from "../ha/toggle.js";
import { getEntityDomain } from "../ha/entity.js";
import { resolveWidgetIconName } from "../ui/icon-name-resolver.js";
import { clampWidth, css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import {
  buildButtonWidgetConfig,
  createButtonConfigDraft,
  renderButtonConfigFields,
} from "../widget-config/button-config.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";
import { t } from "../i18n/index.js";

export const SIMPLE_BUTTON_WIDGET_KIND = "button";

export function isSimpleButtonWidget(widget = {}) {
  return isLocalWidgetKind(widget, SIMPLE_BUTTON_WIDGET_KIND, ["button-widget"]);
}

export function isSimpleButtonWidgetActive(widget = {}) {
  const raw = widget.active ?? widget.checked ?? widget.isActive ?? widget.on ?? widget.state;
  if (typeof raw === "boolean") return raw;

  return ["on", "true", "active", "open", "enabled", "playing"].includes(
    String(raw ?? "").trim().toLowerCase(),
  );
}

function getButtonExplicitIcon(widget = {}) {
  const icon = String(widget.icon || "").trim();
  const iconCategory = String(widget.iconCategory || "").trim().toLowerCase();
  if (icon !== "home") return icon;
  if (iconCategory && iconCategory !== "home") return icon;
  return "";
}

function getButtonData(widget = {}) {
  const active = isSimpleButtonWidgetActive(widget);
  const hasExplicitState = widget.state != null && widget.state !== "";
  const stateOn = widget.stateOn || widget.onLabel || widget.activeState || t("states.on", "On");
  const stateOff = widget.stateOff || widget.offLabel || widget.inactiveState || t("states.off", "Off");
  const icon = resolveWidgetIconName({
    explicitIcon: getButtonExplicitIcon(widget),
    label: widget.label,
    entityId: widget.entityId || widget.entity_id || "",
    domain: widget.buttonType === "action" ? "" : getEntityDomain(widget.entityId || widget.entity_id || ""),
    kind: SIMPLE_BUTTON_WIDGET_KIND,
    fallback: "button",
  });

  return {
    icon,
    iconCategory: widget.iconCategory || "home",
    label: widget.label || "Button",
    state: hasExplicitState ? String(widget.state) : (active ? stateOn : stateOff),
    stateOn,
    stateOff,
    active,
  };
}

function getActionEntityIds(widget = {}) {
  const raw = widget.action?.data?.entity_id ?? widget.actionData?.entity_id;
  return (Array.isArray(raw) ? raw : [raw])
    .filter(value => typeof value === "string" && value.trim())
    .map(value => value.trim());
}

export function createSimpleButtonWidgetContent(widget = {}, {
  className = "",
  widgetW = Number(widget?.w) || 2,
  widgetH = Number(widget?.h) || 1,
  hass,
  entityVisibilityConfig,
  interactive = true,
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

  const context = { hass, access: null, actionable: false };

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

  async function activate(event) {
    event.preventDefault();
    if (!context.actionable) return;
    const access = resolveAuthorizedEntity(context.hass, widget, {
      allowedDomains: ["light", "switch", "input_boolean", "button"],
      visibilityConfig: entityVisibilityConfig,
    });
    const hasConfiguredAction = Boolean(
      widget.actionDomain
      || widget.service
      || widget.action?.domain
      || widget.action?.service,
    );
    const actionAccess = getActionEntityIds(widget).map(entityId => (
      resolveAuthorizedEntity(context.hass, entityId, {
        visibilityConfig: entityVisibilityConfig,
      })
    ));
    if (access.entityId && (!access.entityAllowed || !access.entityAvailable)) return;
    if (actionAccess.some(candidate => !candidate.entityAllowed || !candidate.entityAvailable)) return;
    if (!access.entityId && !hasConfiguredAction) return;

    await runButtonAction(context.hass, widget, access.entityState);
    root.dispatchEvent(new CustomEvent("mha-button-click", {
      bubbles: true,
      detail: {
        widget,
        active: root.dataset.active === "true",
      },
    }));
  }

  if (interactive) {
    root.addEventListener("click", activate);

    root.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      root.click();
    });
  }

  textStack.append(label, state);
  root.append(iconBubble, textStack);

  root.__mhaUpdateFromHass = nextHass => {
    context.hass = nextHass;
    const access = resolveAuthorizedEntity(nextHass, widget, {
      allowedDomains: ["light", "switch", "input_boolean", "button"],
      visibilityConfig: entityVisibilityConfig,
    });
    const toggleDomain = ["light", "switch", "input_boolean"].includes(access.domain);
    const momentary = access.domain === "button";
    const configuredAction = !access.entityId && Boolean(
      widget.actionDomain
      || widget.service
      || widget.action?.domain
      || widget.action?.service,
    );
    const actionTargets = getActionEntityIds(widget).map(entityId => (
      resolveAuthorizedEntity(nextHass, entityId, {
        visibilityConfig: entityVisibilityConfig,
      })
    ));
    const actionTargetsAllowed = actionTargets.every(candidate => (
      candidate.entityAllowed && candidate.entityAvailable
    ));
    context.access = access;
    context.actionable = (configuredAction && actionTargetsAllowed) || (
      access.entityAllowed
      && access.entityAvailable
      && (toggleDomain || momentary)
    );

    const active = toggleDomain && access.entityAvailable
      ? isToggleEntityOn(access.entityState)
      : false;
    setPressed(active);
    root.dataset.entityAllowed = String(
      access.entityAllowed || (configuredAction && actionTargetsAllowed),
    );
    root.dataset.entityAvailable = String(
      access.entityAvailable || (configuredAction && actionTargetsAllowed),
    );
    root.dataset.actionable = String(context.actionable);
    root.setAttribute("aria-disabled", String(!context.actionable));
    root.tabIndex = context.actionable ? 0 : -1;
    root.setAttribute("aria-pressed", toggleDomain ? String(active) : "false");

    if (access.entityAllowed && access.entityState && !widget.label) {
      label.textContent = getEntityDisplayName(access.entityState, access.entityId);
    } else {
      label.textContent = data.label;
    }

    state.textContent = !access.entityId
      ? configuredAction ? (widget.state || t("common.action", "Action")) : t("common.notConfigured", "Not configured")
      : !access.domainAllowed
        ? t("common.unsupported", "Unsupported")
        : !access.entityAllowed
          ? t("common.unauthorized", "Unauthorized")
        : !access.entityAvailable
            ? t("states.unavailable", "Unavailable")
            : toggleDomain
              ? active ? data.stateOn : data.stateOff
              : t("common.press", "Press");
  };
  root.__mhaDestroy = () => {
    context.hass = null;
    context.access = null;
    context.actionable = false;
    delete root.__mhaUpdateFromHass;
  };
  root.__mhaUpdateFromHass(hass);

  return root;
}


export const SIMPLE_BUTTON_WIDGET_CONTENT_RENDERER = Object.freeze({
  decorateShell: ({ shell, widget }) => {
    shell.dataset.active = String(isSimpleButtonWidgetActive(widget));
  },
  render: ({ widget, widgetW, widgetH, hass, entityVisibilityConfig, interactive }) => createSimpleButtonWidgetContent(widget, {
    widgetW,
    widgetH,
    hass,
    entityVisibilityConfig,
    interactive,
  }),
});

export const SIMPLE_BUTTON_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "button",
  title: "Configure button",
  hint: "Choose the action type, entity, and display name.",
  titleKey: "widgets.config.configureButton",
  hintKey: "widgets.config.buttonHint",
  createDraft: createButtonConfigDraft,
  build: buildButtonWidgetConfig,
  renderFields: renderButtonConfigFields,
});

export const SIMPLE_BUTTON_WIDGET_DEFINITION = Object.freeze({
  component: "button-widget",
  category: "lights",
  manager: Object.freeze({
    hidden: false,
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "simple-button", label: "Simple button", size: freezeSize(2, 1), description: "Icon, label, and state.", order: 10 }),
      Object.freeze({ category: "lights", variant: "simple-button", label: "Square button", size: freezeSize(2, 2), description: "Home-inspired action tile.", order: 20 }),
    ]),
  }),
  renderer: "button",
  css: css("styles/widgets/simple-button-widget.css"),
  preview: "button",
  config: "button",
  aliases: ["button-widget"],
  variantAliases: ["simple-button"],
  defaultVariant: "simple-button",
  defaultSize: freezeSize(2, 1),
  normalizeSize: (size) => size.h >= 2
    ? { w: 2, h: 2 }
    : { ...clampWidth(size, 2, 4), h: 1 },
  capabilities: Object.freeze({
    configurable: true,
    resizable: true,
    slotConfigurable: false,
    weatherEntityConfigurable: false,
  }),
  storage: Object.freeze({
    normalize: (widget = {}) => ({
      entityId: widget.entityId || widget.entity_id || "",
    }),
  }),
  shell: Object.freeze({
    configureMode: "config",
  }),
  placementFlow: "configure-first",
  variants: [
    variant("simple-button", "Pill 2×1", 2, 1),
    variant("simple-button", "Pill 3×1", 3, 1),
    variant("simple-button", "Pill 4×1", 4, 1),
    variant("simple-button", "Square 2×2", 2, 2),
  ],
});


function createSimpleButtonPreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.toggle;
  return {
    ...item,
    kind: "button",
    type: "button",
    component: SIMPLE_BUTTON_WIDGET_DEFINITION.component,
    variant: item.variant || SIMPLE_BUTTON_WIDGET_DEFINITION.defaultVariant,
    entityId: item.entityId || item.entity_id || previewData.entityId,
    entity_id: item.entity_id || item.entityId || previewData.entityId,
    label: item.label || item.title || previewData.name,
    title: item.title || item.label || previewData.name,
    icon: item.icon || "home",
    iconCategory: item.iconCategory || "home",
    active: item.active ?? true,
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "button",
  definition: SIMPLE_BUTTON_WIDGET_DEFINITION,
  renderer: SIMPLE_BUTTON_WIDGET_CONTENT_RENDERER,
  config: SIMPLE_BUTTON_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createSimpleButtonPreviewWidget,
  }),
});
