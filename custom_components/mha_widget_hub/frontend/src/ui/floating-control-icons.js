import { createIconSymbol } from "./icon-symbol.js";

export function getPrimaryEditIconName(editing = false) {
  return editing ? "close" : "edit";
}

export function setFloatingControlButtonIcon(button, {
  name = "",
  label = "",
  className = "",
} = {}) {
  if (!button) return;

  button.replaceChildren(createIconSymbol({
    name,
    label,
    className: ["mha-floating-control-symbol", className].filter(Boolean).join(" "),
  }));
}
