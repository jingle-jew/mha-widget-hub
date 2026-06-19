import { t } from "../i18n/index.js";

function createDropSlotButton(slot, mode, onSelectSlot) {
  const button = document.createElement("button");
  button.className = "mha-widget-drop-slot";
  button.type = "button";
  button.setAttribute(
    "aria-label",
    mode === "add"
      ? t("settings.addWidgetHere", "Add widget here, column {column}, row {row}", {
        column: slot.x,
        row: slot.y,
      })
      : t("settings.moveWidgetHere", "Move widget here, column {column}, row {row}", {
        column: slot.x,
        row: slot.y,
      }),
  );
  button.dataset.x = String(slot.x);
  button.dataset.y = String(slot.y);
  button.style.gridColumn = `${slot.x} / span ${slot.w}`;
  button.style.gridRow = `${slot.y} / span ${slot.h}`;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectSlot(slot, event);
  });
  return button;
}

export function syncDropSlotRenderer(
  grid,
  {
    editing = false,
    mode = "none",
    slots = [],
    onSelectSlot = () => {},
  } = {},
) {
  if (!grid) return;

  grid.querySelectorAll(".mha-widget-drop-slot").forEach((slot) => slot.remove());
  grid.dataset.dropSlotsCount = "0";
  grid.dataset.dropSlotMode = "none";
  grid.classList.remove("has-drop-slots");

  const normalizedMode = mode === "add" || mode === "move" ? mode : "none";
  if (!editing || normalizedMode === "none" || !Array.isArray(slots) || !slots.length) {
    return;
  }

  const fragment = document.createDocumentFragment();
  slots.forEach((slot) => {
    fragment.append(createDropSlotButton(slot, normalizedMode, onSelectSlot));
  });

  grid.dataset.dropSlotsCount = String(slots.length);
  grid.dataset.dropSlotMode = normalizedMode;
  grid.prepend(fragment);
  grid.classList.add("has-drop-slots");
}

