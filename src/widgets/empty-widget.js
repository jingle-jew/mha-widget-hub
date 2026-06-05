import { ICONS } from "../components/icons.js";
import { getWidgetDensity, normalizeWidgetSize, sizeToString } from "../layout/layout-engine.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";
import { createWidgetInnerGrid, createWidgetText, createWidgetUnit } from "./widget-layout.js";
import { createSlider } from "../ui/slider.js";
import { createToggle } from "../ui/toggle.js";
import { createPill } from "../ui/pill.js";
import { createButton } from "../ui/button.js";

export function createEmptyWidget(
  widget,
  {
    activeGridUnits = 2,
    isEditing = false,
    onRemove,
    onResizeStart,
  } = {},
) {
  const size = normalizeWidgetSize(widget);
  const density = getWidgetDensity(size);

  const el = document.createElement("article");
  el.className = "mha-widget";
  el.dataset.widgetId = widget.id;
  el.dataset.widgetConfiguredW = String(size.w);
  el.dataset.widgetW = String(Math.min(size.w, activeGridUnits));
  el.dataset.widgetH = String(size.h);
  el.dataset.widgetSize = sizeToString(size);
  el.dataset.widgetDensity = density;

  /*
   * Expose widget dimensions to CSS so each widget can build its own internal
   * grid using the same unit count as its global footprint.
   */
  el.style.setProperty("--mha-widget-w", String(Math.min(size.w, activeGridUnits)));
  el.style.setProperty("--mha-widget-configured-w", String(size.w));
  el.style.setProperty("--mha-widget-h", String(size.h));

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

      createWidgetUnit({
        col: 3,
        row: 2,
        colSpan: 2,
        justify: "stretch",
        className: "mha-widget-demo-slider",
        children: createSlider({ label: "Intensité", value: 68 }),
      }),
    );
  }

  el.append(innerGrid);
  const tools = document.createElement("div");
    tools.className = "mha-widget-tools";
    tools.append(
      tool("Déplacer", "move"),
      tool("Supprimer", "close", () => onRemove?.(widget.id)),
    );

    const handle = document.createElement("button");
    handle.className = "mha-resize-handle";
    handle.type = "button";
    handle.innerHTML = ICONS.resize;
    handle.addEventListener("pointerdown", (event) => onResizeStart?.(event, widget.id));

    const badge = document.createElement("span");
    badge.className = "mha-size-badge";
    badge.textContent = `${sizeToString(size)} · ${density}`;

    el.append(tools, handle, badge);
  
return el;
}

function tool(label, icon, onClick) {
  const button = document.createElement("button");
  button.className = "mha-tool-button";
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.dataset.action = icon;
  button.innerHTML = ICONS[icon] || "";
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };
  return button;
}
