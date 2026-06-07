import { ICONS } from "../components/icons.js";
import { getWidgetDensity, normalizeWidgetSize, sizeToString } from "../layout/layout-engine.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createWidgetInnerGrid, createWidgetSliderUnit, createWidgetText, createWidgetUnit } from "./widget-layout.js";
import { createSliderWidgetContent, isSliderWidget } from "./slider-widget.js";
import { createClockWidgetContent, isClockWidget } from "./clock-widget.js";
import { createSlider } from "../ui/slider.js";
import { createToggle } from "../ui/toggle.js";
import { createPill } from "../ui/pill.js";
import { createButton } from "../ui/button.js";

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
    onResizeStart,
  } = {},
) {
  const size = normalizeWidgetSize(widget);
  const density = getWidgetDensity(size);
  const effectiveWidgetW = Math.min(size.w, activeGridUnits);

  const el = document.createElement("article");
  el.className = "mha-widget";
  el.classList.toggle("is-move-target", isMoveTarget);
  el.dataset.widgetId = widget.id;
  if (isSliderWidget(widget) || widget.id === "slot-f" || widget.id === "slot-i") {
    el.dataset.widgetKind = "slider";
  }

  if (isClockWidget(widget)) {
    el.dataset.widgetKind = "clock";
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

  const innerGrid = createWidgetInnerGrid();

  /*
   * Temporary test:
   * Place one reusable icon in the first internal unit of the first widget.
   */
  if (widget.id === "slot-a") {
    innerGrid.append(
      createWidgetUnit({
        col: 1,
        row: 1,
        className: "mha-widget-corner-icon-unit",
        children: createIcon({
          name: "home",
          category: "home",
          label: "Test icon",
          className: "mha-widget-corner-icon-test mha-widget-unit-fit",
          children: createIconSymbol({
            name: "home",
            label: "Test icon",
          }),
        }),
      }),

      createWidgetUnit({
        col: 2,
        row: 1,
        colSpan: 2,
        justify: "start",
        className: "mha-widget-demo-title",
        children: createWidgetText({
          text: "Salon",
          className: "mha-widget-demo-title",
        }),
      }),

      createWidgetUnit({
        col: 4,
        row: 1,
        className: "mha-widget-demo-pill",
        children: createPill({ label: "21.5 °C", tone: "info" }),
      }),

      createWidgetUnit({
        col: 1,
        row: 2,
        className: "mha-widget-demo-toggle",
        children: createToggle({ label: "Activer", checked: true }),
      }),

      createWidgetUnit({
        col: 2,
        row: 2,
        className: "mha-widget-demo-button",
        children: createButton({ label: "Mode", variant: "default" }),
      }),

      createWidgetSliderUnit({
        col: 3,
        row: 2,
        colSpan: 2,
        orientation: "horizontal",
        hasLabel: false,
        className: "mha-widget-demo-slider",
        children: createSlider({ value: 68 }),
      }),
    );
  }

  if (isSliderWidget(widget) || widget.id === "slot-f" || widget.id === "slot-i") {
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

  if (isClockWidget(widget)) {
    const clockGrid = createWidgetInnerGrid({ className: "mha-clock-widget-grid" });
    clockGrid.append(
      createWidgetUnit({
        col: 1,
        row: 1,
        colSpan: effectiveWidgetW,
        rowSpan: size.h,
        align: "stretch",
        justify: "stretch",
        className: "mha-clock-widget-unit",
        children: createClockWidgetContent({
          variant: widget.variant || "digital",
        }),
      }),
    );
    el.append(clockGrid);
  }

  if (innerGrid.childElementCount > 0) el.append(innerGrid);
  const tools = document.createElement("div");
    tools.className = "mha-widget-tools";

    const dimensionButton = tool("Redimensionner le widget", "resize", () => {}, {
      className: "mha-tool-button--dimension",
    });
    dimensionButton.addEventListener("pointerdown", (event) => {
      if (isMoveTarget) return;
      onResizeStart?.(event, widget.id);
    });

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

    const handle = document.createElement("button");
    handle.className = "mha-resize-handle";
    handle.type = "button";
    handle.innerHTML = ICONS.resize;
    handle.addEventListener("pointerdown", (event) => onResizeStart?.(event, widget.id));

    const badge = document.createElement("span");
    badge.className = "mha-size-badge";
    badge.textContent = `${sizeToString(size)} · ${density}`;

    el.append(tools, moveOverlay, handle, badge);
  
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
