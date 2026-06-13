import { ICONS } from "../components/icons.js";
import { getWidgetDensity, normalizeWidgetSize, sizeToString } from "../layout/layout-engine.js";
import { createSliderWidgetContent } from "./slider-widget.js";
import { createClockWidgetContent } from "./clock-widget.js";
import { createSimpleButtonWidgetContent, isSimpleButtonWidgetActive } from "./simple-button-widget.js";
import { createWeatherWidgetContent } from "./weather-widget.js";
import { createToggleWidgetContent } from "./toggle-widget.js";
import { createToggleButtonsWidgetContent } from "./toggle-buttons-widget.js";
import { createToggleSliderWidgetContent } from "./toggle-slider-widget.js";
import { getWidgetDefinition, resolveWidgetKind } from "./widget-registry.js";

export function createEmptyWidget(
  widget,
  {
    activeGridUnits = 2,
    isEditing = false,
    isMoveTarget = false,
    position,
    onToggleMove,
    onMove,
    onRemove,
    onCycleVariant,
    onConfigure,
    hass,
  } = {},
) {
  const widgetKind = resolveWidgetKind(widget);
  const widgetDefinition = getWidgetDefinition(widgetKind);
  const size = normalizeWidgetSize(widget);
  const density = getWidgetDensity(size);
  const effectiveWidgetW = Math.min(size.w, activeGridUnits);

  const el = document.createElement("article");
  el.className = "mha-widget";
  el.classList.toggle("is-move-target", isMoveTarget);
  el.dataset.widgetId = widget.id;
  if (widgetDefinition?.renderer !== "empty") {
    el.dataset.widgetKind = widgetKind;
  }
  if (widgetKind === "button") {
    el.dataset.active = String(isSimpleButtonWidgetActive(widget));
  }
  el.dataset.widgetConfiguredW = String(size.w);
  el.dataset.widgetW = String(effectiveWidgetW);
  el.dataset.widgetH = String(size.h);
  el.dataset.widgetSize = sizeToString(size);
  el.dataset.widgetDensity = density;

  /*
   * Expose widget dimensions to CSS so each widget can build its own internal
   * grid using the same unit count as its global footprint.
   */
  el.style.setProperty("--mha-widget-w", String(effectiveWidgetW));
  el.style.setProperty("--mha-widget-configured-w", String(size.w));
  el.style.setProperty("--mha-widget-h", String(size.h));
  if (position) {
    el.style.gridColumn = `${position.x} / span ${effectiveWidgetW}`;
    el.style.gridRow = `${position.y} / span ${size.h}`;
  }

  /* Widget internals are now rendered by each widget component directly. */

  if (widgetKind === "toggle-buttons") {
    el.append(createToggleButtonsWidgetContent(widget, {
      widgetW: effectiveWidgetW,
    }));
  } else if (widgetKind === "toggle-slider") {
    el.append(createToggleSliderWidgetContent(widget, {
      hass,
      widgetW: effectiveWidgetW,
    }));
  } else if (widgetKind === "slider") {
    el.append(
      createSliderWidgetContent(widget, {
        size,
        activeGridUnits,
        value: 68,
        orientation: "auto",
        className: "mha-widget-demo-slider",
      }),
    );
  }

  if (widgetKind === "clock") {
    /*
     * Clocks are single centered visual components, not multi-slot layouts.
     * Render them in a direct safe frame instead of the internal micro-grid so
     * every variant can center itself inside the widget padding consistently.
     */
    const clockFrame = document.createElement("div");
    clockFrame.className = "mha-clock-widget-frame";
    clockFrame.append(
      createClockWidgetContent({
        variant: widget.variant || "digital",
        widget,
      }),
    );
    el.append(clockFrame);
  }


  if (widgetKind === "button") {
    /*
     * Buttons own their layout directly. Keep them as direct children of the
     * widget shell so their local frame uses the widget safe inset cleanly.
     */
    el.append(
      createSimpleButtonWidgetContent(widget, {
        widgetW: effectiveWidgetW,
        widgetH: size.h,
      }),
    );
  }


  if (widgetKind === "toggle") {
    el.append(
      createToggleWidgetContent(widget, {
        widgetW: effectiveWidgetW,
        widgetH: size.h,
      }),
    );
  }


  if (widgetKind === "weather") {
    el.append(
      createWeatherWidgetContent(widget, {
        widgetW: effectiveWidgetW,
        widgetH: size.h,
      }),
    );
  }

  const tools = document.createElement("div");
    tools.className = "mha-widget-tools";

    const dimensionButton = widgetDefinition?.config
      ? tool("Configurer le widget", "edit", () => onConfigure?.(widget.id), {
        className: "mha-tool-button--dimension",
      })
      : tool("Variante suivante", "resize", () => {}, {
        className: "mha-tool-button--dimension",
      });
    if (!widgetDefinition?.config) {
      dimensionButton.addEventListener("pointerdown", (event) => {
        if (isMoveTarget) return;
        event.preventDefault();
        event.stopPropagation();
        onCycleVariant?.(widget.id);
      });
    }

    const moveButton = tool(
      isMoveTarget ? "Terminer le déplacement" : "Déplacer le widget",
      "move",
      () => onToggleMove?.(widget.id),
      {
        pressed: isMoveTarget,
        className: "mha-tool-button--move",
      },
    );

    const closeButton = tool("Supprimer", "close", () => onRemove?.(widget.id), {
      className: "mha-tool-button--close",
    });

    tools.append(dimensionButton, moveButton, closeButton);

    const moveOverlay = createMoveOverlay(widget.id, onMove);

    const badge = document.createElement("span");
    badge.className = "mha-size-badge";
    badge.textContent = `${sizeToString(size)} · ${density}`;

    el.append(tools, moveOverlay, badge);
  
return el;
}

function createMoveOverlay(widgetId, onMove) {
  const overlay = document.createElement("div");
  overlay.className = "mha-widget-move-overlay";

  [
    ["up", "Déplacer vers le haut"],
    ["right", "Déplacer vers la droite"],
    ["down", "Déplacer vers le bas"],
    ["left", "Déplacer vers la gauche"],
  ].forEach(([direction, label]) => {
    const button = document.createElement("button");
    button.className = "mha-widget-move-arrow";
    button.type = "button";
    button.dataset.direction = direction;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onMove?.(widgetId, direction);
    });
    overlay.append(button);
  });

  return overlay;
}

function tool(label, icon, onClick, { pressed, className = "" } = {}) {
  const button = document.createElement("button");
  button.className = ["mha-tool-button", className].filter(Boolean).join(" ");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.dataset.action = icon;
  button.innerHTML = ICONS[icon] || "";
  if (typeof pressed === "boolean") {
    button.setAttribute("aria-pressed", String(pressed));
  }
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.(event);
  };
  return button;
}
