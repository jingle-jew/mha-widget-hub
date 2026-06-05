import { ICONS } from "../components/icons.js";
import { getWidgetDensity, normalizeWidgetSize, sizeToString } from "../layout/layout-engine.js";
import { createIcon } from "../ui/icon.js";
import { createIconSymbol } from "../ui/icon-symbol.js";

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

  const innerGrid = document.createElement("div");
  innerGrid.className = "mha-widget-inner-grid";
  innerGrid.setAttribute("aria-hidden", "true");

  /*
   * Temporary test:
   * Place one reusable icon in the first internal unit of the first widget.
   */
  if (widget.id === "slot-a") {
    const unit = document.createElement("div");
    unit.className = "mha-widget-unit mha-widget-corner-icon-unit";
    unit.append(
      createIcon({
        name: "home",
        category: "home",
        label: "Test icon",
        className: "mha-widget-corner-icon-test",
        children: createIconSymbol({
          name: "home",
          label: "Test icon",
        }),
      }),
    );
    innerGrid.append(unit);
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
  button.innerHTML = ICONS[icon] || "";
  button.onclick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick?.();
  };
  return button;
}
