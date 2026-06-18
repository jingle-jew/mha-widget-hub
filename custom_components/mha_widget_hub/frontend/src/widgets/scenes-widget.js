import { buildSceneRoutineServiceCall, runSceneRoutineAction } from "../ha/actions.js";
import { getEntityDomain } from "../ha/entity.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import {
  buildScenesWidgetConfig,
  createScenesConfigDraft,
} from "../widget-config/scenes-config.js";
import {
  css,
  freezeSize,
  isLocalWidgetKind,
  variant,
} from "./widget-definition-utils.js";

export const SCENES_WIDGET_KIND = "scenes";

const EMPTY_SLOT_LABEL = "Ajouter";
const BUTTON_COUNT = 4;

function normalizeButtonType(value, entityId = "") {
  if (value === "mode" || value === "routine") return value;
  return getEntityDomain(entityId) === "scene" ? "mode" : "routine";
}

function getDefaultIcon(type) {
  return type === "mode" ? "home" : "play";
}

function getButtonLabel(button, entityState) {
  const explicitLabel = String(button?.label || "").trim();
  if (explicitLabel) return explicitLabel;
  const friendlyName = String(entityState?.attributes?.friendly_name || "").trim();
  if (friendlyName) return friendlyName;
  const entityId = String(button?.entityId || "").trim();
  if (entityId) {
    return entityId.split(".").slice(1).join(".").replace(/[_-]+/g, " ").trim() || entityId;
  }
  return EMPTY_SLOT_LABEL;
}

function getButtonModel(button = {}, hass) {
  const entityId = String(button.entityId || "").trim();
  const entityState = entityId ? hass?.states?.[entityId] || null : null;
  const type = normalizeButtonType(button.type, entityId);
  const hasEntity = Boolean(entityId);
  const actionable = Boolean(buildSceneRoutineServiceCall(entityId));
  const unavailable = hasEntity && (
    !entityState
    || ["unavailable", "none"].includes(String(entityState.state || "").toLowerCase())
  );

  return {
    type,
    entityId,
    entityState,
    label: getButtonLabel(button, entityState),
    icon: String(button.icon || "").trim() || getDefaultIcon(type),
    hasEntity,
    actionable,
    unavailable,
  };
}

function createActionButton(model, { interactive = true } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "mha-scenes-widget-button";
  button.dataset.buttonType = model.type;
  button.dataset.hasEntity = String(model.hasEntity);
  button.dataset.unavailable = String(model.unavailable);
  button.dataset.actionable = String(model.actionable && interactive);
  button.disabled = !interactive || !model.actionable || model.unavailable;
  button.title = model.label;
  button.setAttribute("aria-label", model.label);

  const iconBubble = document.createElement("span");
  iconBubble.className = "mha-scenes-widget-button-icon";
  iconBubble.append(createIconSymbol({
    name: model.hasEntity ? model.icon : "plus",
    className: "mha-scenes-widget-button-glyph",
  }));

  const label = document.createElement("span");
  label.className = "mha-scenes-widget-button-label";
  label.textContent = model.label;

  button.append(iconBubble, label);
  return button;
}

export function isScenesWidget(widget = {}) {
  return isLocalWidgetKind(widget, SCENES_WIDGET_KIND, ["scenes-widget", "modes-routines-widget"]);
}

export function createScenesWidgetContent(widget = {}, {
  hass,
  interactive = true,
} = {}) {
  const root = document.createElement("div");
  root.className = "mha-scenes-widget";
  root.dataset.widgetComponent = "scenes";

  const buttons = Array.from({ length: BUTTON_COUNT }, (_, index) => (
    widget?.buttons?.[index] || {}
  ));

  const buttonNodes = buttons.map((buttonConfig) => createActionButton(
    getButtonModel(buttonConfig, hass),
    { interactive },
  ));
  root.append(...buttonNodes);

  async function activate(index, event) {
    event.preventDefault();
    event.stopPropagation();
    const buttonConfig = buttons[index] || {};
    const model = getButtonModel(buttonConfig, hass);
    if (!interactive || !model.actionable || model.unavailable) return;
    await runSceneRoutineAction(hass, model.entityId);
  }

  buttonNodes.forEach((buttonNode, index) => {
    buttonNode.addEventListener("click", event => {
      void activate(index, event);
    });
  });

  root.__mhaUpdateFromHass = nextHass => {
    hass = nextHass;
    buttonNodes.forEach((buttonNode, index) => {
      const model = getButtonModel(buttons[index] || {}, nextHass);
      buttonNode.dataset.buttonType = model.type;
      buttonNode.dataset.hasEntity = String(model.hasEntity);
      buttonNode.dataset.unavailable = String(model.unavailable);
      buttonNode.dataset.actionable = String(model.actionable && interactive);
      buttonNode.disabled = !interactive || !model.actionable || model.unavailable;
      buttonNode.title = model.label;
      buttonNode.setAttribute("aria-label", model.label);
      const icon = buttonNode.querySelector(".mha-scenes-widget-button-icon");
      const label = buttonNode.querySelector(".mha-scenes-widget-button-label");
      icon?.replaceChildren(createIconSymbol({
        name: model.hasEntity ? model.icon : "plus",
        className: "mha-scenes-widget-button-glyph",
      }));
      if (label) label.textContent = model.label;
    });
  };

  root.__mhaDestroy = () => {
    delete root.__mhaUpdateFromHass;
  };

  root.__mhaUpdateFromHass(hass);
  return root;
}

export const SCENES_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, hass, interactive }) => createScenesWidgetContent(widget, {
    hass,
    interactive,
  }),
});

export const SCENES_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "scenes",
  title: "Configurer les modes & routines",
  hint: "Configure jusqu’à 4 Modes ou Routines.",
  createDraft: createScenesConfigDraft,
  build: buildScenesWidgetConfig,
});

export const SCENES_WIDGET_DEFINITION = Object.freeze({
  component: "scenes-widget",
  category: "actions",
  manager: Object.freeze({
    entries: Object.freeze([
      Object.freeze({
        category: "actions",
        variant: "modes-routines-2x2",
        label: "Modes & routines",
        size: freezeSize(2, 2),
        description: "Dossier compact de 4 raccourcis Home Assistant.",
        order: 30,
      }),
    ]),
  }),
  renderer: "scenes",
  css: css("styles/widgets/scenes-widget.css"),
  preview: "scenes",
  config: "scenes",
  aliases: ["scenes-widget", "modes-routines-widget"],
  variantAliases: ["modes-routines-2x2"],
  defaultVariant: "modes-routines-2x2",
  defaultSize: freezeSize(2, 2),
  normalizeSize: () => freezeSize(2, 2),
  variants: [
    variant("modes-routines-2x2", "Modes & routines 2×2", 2, 2),
  ],
});

function createScenesPreviewWidget(item = {}) {
  return {
    ...item,
    kind: "scenes",
    type: "scenes",
    component: SCENES_WIDGET_DEFINITION.component,
    variant: item.variant || SCENES_WIDGET_DEFINITION.defaultVariant,
    buttons: Array.isArray(item.buttons) && item.buttons.length
      ? item.buttons
      : [
        { type: "mode", entityId: "scene.preview_evening", label: "Soir", icon: "home" },
        { type: "routine", entityId: "script.preview_sleep", label: "Nuit", icon: "play" },
        { type: "routine", entityId: "automation.preview_focus", label: "Focus", icon: "refresh" },
        { type: "mode", entityId: "scene.preview_movie", label: "Cinéma", icon: "room" },
      ],
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "scenes",
  definition: SCENES_WIDGET_DEFINITION,
  renderer: SCENES_WIDGET_CONTENT_RENDERER,
  config: SCENES_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createScenesPreviewWidget,
  }),
});
