import { getEntityState, getWidgetEntityId, isEntityAvailable } from "../ha/entity.js";
import {
  createLatestValueAction,
  runSliderAction,
  runToggleAction,
} from "../ha/actions.js";
import { getSliderBinding } from "../ha/slider.js";
import { isToggleEntityOn, supportsToggleEntity } from "../ha/toggle.js";
import { createSlider } from "../ui/slider.js";
import { createSlider2 } from "../ui/slider2.js";
import { createToggleWidgetContent } from "./toggle-widget.js";
import { clampWidth, css, freezeSize, isLocalWidgetKind, variant } from "./widget-definition-utils.js";
import { isEntityAllowedForCurrentUser } from "../admin/entity-permissions.js";
import { buildToggleSliderWidgetConfig, createToggleSliderConfigDraft } from "../widget-config/toggle-slider-config.js";
import { WIDGET_PREVIEW_DATA } from "./widget-preview-data.js";

export const TOGGLE_SLIDER_WIDGET_KIND = "toggle-slider";
const SLIDER_SERVICE_INTERVAL_MS = 80;

export function isToggleSliderWidget(widget = {}) {
  return isLocalWidgetKind(widget, TOGGLE_SLIDER_WIDGET_KIND, ["toggle-slider-widget", "combined-slider-toggle", "combined-toggle-slider"]);
}

export function createToggleSliderWidgetContent(widget = {}, {
  hass,
  entityVisibilityConfig,
  widgetW = Number(widget?.w) || 4,
  onToggle,
  onSliderInput,
} = {}) {
  const entityId = getWidgetEntityId(widget);
  const context = {
    hass,
    entityState: null,
    sliderBinding: null,
    entityAvailable: false,
    entityAllowed: true,
  };
  const sliderAction = createLatestValueAction(
    (nextValue) => runSliderAction(context.hass, context.entityState, nextValue),
    { intervalMs: SLIDER_SERVICE_INTERVAL_MS },
  );

  const root = document.createElement("div");
  root.className = "combined-toggle-slider";
  root.dataset.widgetComponent = "toggle-slider";

  const toggleSection = document.createElement("div");
  toggleSection.className = "combined-toggle-slider__toggle";
  toggleSection.append(createToggleWidgetContent({
    ...widget,
    checked: widget.checked,
    state: widget.state,
  }, {
    widgetW,
    widgetH: 1,
    disabled: false,
    onToggle: (nextChecked, currentWidget, event) => {
      if (entityId && context.entityAvailable) {
        runToggleAction(context.hass, context.entityState);
      }
      onToggle?.(nextChecked, currentWidget, event);
    },
  }));

  const sliderSection = document.createElement("div");
  sliderSection.className = "combined-toggle-slider__slider";

  const value = widget.value ?? 68;
  const sliderValue = document.createElement("span");
  sliderValue.className = "combined-toggle-slider__slider-value";
  sliderValue.textContent = `${Math.round(Number(value) || 0)}%`;

  const sliderOptions = {
    value,
    min: widget.min ?? 0,
    max: widget.max ?? 100,
    orientation: "horizontal",
    disabled: false,
    onInput: (event) => {
      const nextValue = Number(event.currentTarget.value);
      sliderValue.textContent = `${Math.round(nextValue)}%`;
      if (entityId && context.entityAvailable && context.sliderBinding) {
        sliderAction.update(nextValue);
      }
      onSliderInput?.(nextValue, widget, event);
    },
    onChange: (event) => {
      const nextValue = Number(event.currentTarget.value);
      if (entityId && context.entityAvailable && context.sliderBinding) {
        sliderAction.commit(nextValue);
      }
    },
  };

  const slider = createSlider({
    ...sliderOptions,
    className: "combined-toggle-slider__control combined-toggle-slider__control--default",
  });

  const slider2 = createSlider2({
    ...sliderOptions,
    className: "slider2--combined combined-toggle-slider__control combined-toggle-slider__control--ios",
  });

  sliderSection.append(sliderValue, slider, slider2);
  root.append(toggleSection, sliderSection);

  root.__mhaUpdateFromHass = (nextHass) => {
    context.hass = nextHass;
    context.entityAllowed = isEntityAllowedForCurrentUser(
      nextHass,
      entityId,
      entityVisibilityConfig,
    );
    context.entityState = context.entityAllowed
      ? getEntityState(nextHass, widget)
      : null;
    context.sliderBinding = getSliderBinding(context.entityState);
    context.entityAvailable = !entityId || isEntityAvailable(context.entityState);

    const hasEntity = Boolean(context.entityState);
    const supportsToggle = context.entityAvailable && (
      widget.supportsToggle
      ?? (!entityId || (hasEntity && supportsToggleEntity(context.entityState)))
    );
    const supportsSlider = context.entityAvailable && (
      widget.supportsSlider
      ?? (!entityId || Boolean(context.sliderBinding))
    );
    const checked = hasEntity ? isToggleEntityOn(context.entityState) : Boolean(widget.checked);
    const nextValue = context.sliderBinding?.value ?? widget.value ?? 68;

    root.dataset.entityAvailable = String(context.entityAvailable);
    root.dataset.entityAllowed = String(context.entityAllowed);
    root.dataset.toggleSupported = String(Boolean(supportsToggle));
    root.dataset.sliderSupported = String(Boolean(supportsSlider));
    if (!context.entityAvailable) sliderAction.clear();

    const toggleRoot = toggleSection.querySelector(".mha-toggle-widget");
    const toggleInput = toggleSection.querySelector(".mha-toggle-input");
    const toggleLabel = toggleSection.querySelector(".mha-toggle-widget-label");
    const toggleState = toggleSection.querySelector(".mha-toggle-widget-state");
    if (toggleRoot) toggleRoot.dataset.checked = String(checked);
    if (toggleInput) {
      toggleInput.checked = checked;
      toggleInput.disabled = !supportsToggle;
      toggleInput.setAttribute(
        "aria-label",
        context.entityAllowed
          ? widget.label || "Toggle"
          : "Entité non autorisée",
      );
    }
    if (toggleLabel) {
      toggleLabel.textContent = context.entityAllowed
        ? widget.label || widget.title || "Toggle"
        : "Entité non autorisée";
    }
    if (toggleState) {
      toggleState.textContent = !context.entityAllowed
        ? "Non autorisé"
        : context.entityAvailable
        ? checked
          ? widget.stateOn || "Activé"
          : widget.stateOff || "Désactivé"
        : "Indisponible";
    }

    const isSliderDragging = [slider, slider2]
      .some((control) => control.classList.contains("is-slider-dragging"));
    if (!isSliderDragging) {
      sliderValue.textContent = `${Math.round(Number(nextValue) || 0)}%`;
    }
    [slider, slider2].forEach((control) => {
      control.__mhaSliderApi?.setDisabled(!supportsSlider);
      if (!isSliderDragging) {
        control.__mhaSliderApi?.setValue(nextValue);
      }
    });
  };

  root.__mhaDestroy = () => {
    sliderAction.clear();
    context.hass = null;
    context.entityState = null;
    context.sliderBinding = null;
    context.entityAvailable = false;
    context.entityAllowed = true;
    delete root.__mhaUpdateFromHass;
  };

  root.__mhaUpdateFromHass(hass);
  return root;
}


export const TOGGLE_SLIDER_WIDGET_CONTENT_RENDERER = Object.freeze({
  render: ({ widget, widgetW, hass, entityVisibilityConfig }) => createToggleSliderWidgetContent(widget, {
    hass,
    entityVisibilityConfig,
    widgetW,
  }),
});

export const TOGGLE_SLIDER_WIDGET_CONFIG_MANIFEST = Object.freeze({
  type: "toggle-slider",
  title: "Configurer la lumière",
  hint: "Choisis la lumière et le contrôle à afficher.",
  createDraft: createToggleSliderConfigDraft,
  build: buildToggleSliderWidgetConfig,
});

export const TOGGLE_SLIDER_WIDGET_DEFINITION = Object.freeze({
  component: "toggle-slider-widget",
  category: "lights",
  manager: Object.freeze({
    entries: Object.freeze([
      Object.freeze({ category: "lights", variant: "toggle-slider", label: "Lumière combinée", size: freezeSize(4, 2), description: "État et intensité dans une seule tuile.", order: 10 }),
    ]),
  }),
  renderer: "toggle-slider",
  css: css("styles/widgets/toggle-slider-widget.css"),
  preview: "toggle-slider",
  config: "toggle-slider",
  aliases: [
    "toggle-slider-widget",
    "combined-slider-toggle",
    "combined-toggle-slider",
  ],
  variantAliases: [
    "toggle-slider",
    "combined-slider-toggle",
    "combined-toggle-slider",
  ],
  defaultVariant: "toggle-slider",
  defaultSize: freezeSize(4, 2),
  normalizeSize: (size) => ({ ...clampWidth(size, 3, 4), h: 2 }),
  variants: [
    variant("toggle-slider", "Combiné 3×2", 3, 2),
    variant("toggle-slider", "Combiné 4×2", 4, 2),
  ],
});

function createToggleSliderPreviewWidget(item = {}) {
  const previewData = WIDGET_PREVIEW_DATA.light;
  const sliderData = WIDGET_PREVIEW_DATA.slider;
  const entityId = item.lightEntityId || item.entityId || item.entity_id || previewData.entityId;

  return {
    ...item,
    kind: "toggle-slider",
    type: "toggle-slider",
    component: TOGGLE_SLIDER_WIDGET_DEFINITION.component,
    variant: item.variant || TOGGLE_SLIDER_WIDGET_DEFINITION.defaultVariant,
    lightEntityId: entityId,
    entityId,
    entity_id: entityId,
    label: item.label || item.title || previewData.name,
    title: item.title || item.label || previewData.name,
    checked: item.checked ?? previewData.state === "on",
    state: item.state || previewData.state,
    value: item.value ?? sliderData.value,
    min: item.min ?? sliderData.min,
    max: item.max ?? sliderData.max,
    sliderMode: item.sliderMode || "brightness",
  };
}

export const WIDGET_MODULE = Object.freeze({
  kind: "toggle-slider",
  definition: TOGGLE_SLIDER_WIDGET_DEFINITION,
  renderer: TOGGLE_SLIDER_WIDGET_CONTENT_RENDERER,
  config: TOGGLE_SLIDER_WIDGET_CONFIG_MANIFEST,
  preview: Object.freeze({
    mode: "live",
    createWidget: createToggleSliderPreviewWidget,
  }),
});
