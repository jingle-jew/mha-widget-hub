import { createIconSymbol } from "../ui/icon-symbol.js";
import { getTablerIcon } from "../ui/tabler-icons.js";

export const SYSTEM_ICONS = Object.freeze({
  back: "arrow-left",
  close: "x",
  up: "arrow-up",
  down: "arrow-down",
  add: "plus",
  edit: "pencil",
  settings: "settings",
  delete: "trash",
});

const SYSTEM_ICON_ALIASES = Object.freeze({
  "arrow-left": "back",
  "arrow-up": "up",
  "arrow-down": "down",
  plus: "add",
  trash: "delete",
  remove: "close",
  pencil: "edit",
  gear: "settings",
});

export function getSystemIcon(name = "") {
  return getTablerIcon(SYSTEM_ICONS[getSystemIconName(name)] || SYSTEM_ICONS.add);
}

export function getSystemIconName(name = "") {
  if (SYSTEM_ICONS[name]) return name;
  return SYSTEM_ICON_ALIASES[name] || "add";
}

export function createSystemIconSymbol({
  name = "add",
  label = "",
  className = "",
} = {}) {
  const iconName = getSystemIconName(name);
  const symbol = createIconSymbol({
    name: SYSTEM_ICONS[iconName],
    label,
    className: ["mha-system-icon-symbol", className].filter(Boolean).join(" "),
  });
  symbol.dataset.systemIcon = iconName;
  return symbol;
}
