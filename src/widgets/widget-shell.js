import { ICONS } from "../components/icons.js";
import {
  getWidgetDensity,
  normalizeWidgetSize,
  sizeToString,
} from "../layout/layout-engine.js";
import {
  createRegisteredWidgetContent,
  decorateWidgetShell,
} from "./widget-renderers.js";
import {
  getWidgetConfigType,
  getWidgetDefinition,
  getWidgetShellBehavior,
  resolveWidgetKind,
} from "./widget-registry.js";
import { t } from "../i18n/index.js";

export function createWidgetShell(
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
    onConfigureSlot,
    hass,
    entityVisibilityConfig,
  } = {},
) {
  const widgetKind = resolveWidgetKind(widget);
  const widgetDefinition = getWidgetDefinition(widgetKind);
  const shellBehavior = getWidgetShellBehavior(widget);
  const widgetConfigType = getWidgetConfigType(widget);
  const size = normalizeWidgetSize(widget);
  const density = getWidgetDensity(size);
  const effectiveWidgetW = Math.min(size.w, activeGridUnits);
  const renderContext = {
    size,
    activeGridUnits,
    widgetW: effectiveWidgetW,
    widgetH: size.h,
    isEditing,
    hass,
    entityVisibilityConfig,
  };

  const shell = document.createElement("article");
  shell.className = "mha-widget";
  shell.classList.toggle("is-move-target", isMoveTarget);
  shell.dataset.widgetId = widget.id;
  if (widgetDefinition?.renderer !== "empty") {
    shell.dataset.widgetKind = widgetKind;
  }
  shell.dataset.widgetConfiguredW = String(size.w);
  shell.dataset.widgetW = String(effectiveWidgetW);
  shell.dataset.widgetH = String(size.h);
  shell.dataset.widgetSize = sizeToString(size);
  shell.dataset.widgetDensity = density;

  shell.style.setProperty("--mha-widget-w", String(effectiveWidgetW));
  shell.style.setProperty("--mha-widget-configured-w", String(size.w));
  shell.style.setProperty("--mha-widget-h", String(size.h));
  if (position) {
    shell.style.gridColumn = `${position.x} / span ${effectiveWidgetW}`;
    shell.style.gridRow = `${position.y} / span ${size.h}`;
  }

  decorateWidgetShell(shell, widget, renderContext);
  const content = createRegisteredWidgetContent(widget, renderContext);
  if (content) shell.append(content);

  shell.addEventListener("mha-configure-widget-slot", (event) => {
    const detail = event?.detail || {};
    if (!Number.isInteger(detail.buttonIndex)) return;
    event.preventDefault();
    event.stopPropagation();
    onConfigureSlot?.(detail.widgetId || widget.id, detail.buttonIndex);
  });

  const tools = document.createElement("div");
  tools.className = "mha-widget-tools";

  const shouldOpenConfig = shellBehavior.configureMode === "config" && Boolean(widgetConfigType);
  const dimensionButton = shouldOpenConfig
    ? tool(t("widgets.tools.configureWidget", "Configure widget"), "edit", () => onConfigure?.(widget.id), {
      className: "mha-tool-button--dimension",
    })
    : tool(t("widgets.tools.nextVariant", "Next variant"), "resize", () => {}, {
      className: "mha-tool-button--dimension",
    });

  if (!shouldOpenConfig) {
    dimensionButton.addEventListener("pointerdown", (event) => {
      if (isMoveTarget) return;
      event.preventDefault();
      event.stopPropagation();
      onCycleVariant?.(widget.id);
    });
  }

  const moveButton = tool(
    isMoveTarget ? t("widgets.tools.finishMoving", "Finish moving") : t("widgets.tools.moveWidget", "Move widget"),
    "move",
    () => onToggleMove?.(widget.id),
    {
      pressed: isMoveTarget,
      className: "mha-tool-button--move",
    },
  );

  const closeButton = tool(t("common.delete", "Delete"), "close", () => onRemove?.(widget.id), {
    className: "mha-tool-button--close",
  });

  tools.append(dimensionButton, moveButton, closeButton);

  const badge = document.createElement("span");
  badge.className = "mha-size-badge";
  badge.textContent = `${sizeToString(size)} · ${density}`;

  shell.append(
    tools,
    createMoveOverlay(widget.id, onMove),
    badge,
  );

  return shell;
}

function createMoveOverlay(widgetId, onMove) {
  const overlay = document.createElement("div");
  overlay.className = "mha-widget-move-overlay";

  [
    ["up", t("widgets.tools.moveUp", "Move up")],
    ["right", t("widgets.tools.moveRight", "Move right")],
    ["down", t("widgets.tools.moveDown", "Move down")],
    ["left", t("widgets.tools.moveLeft", "Move left")],
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
