/*
 * MHA system icon catalog.
 *
 * These SVG pictograms are reserved for system UI controls
 * (back, close, add, edit, delete, ordering, etc.). They are kept
 * separate from the general widget/page icon catalog so system buttons
 * stay visually consistent and do not depend on user-facing icon names.
 */

const SVG_NS = "http://www.w3.org/2000/svg";

export const SYSTEM_ICONS = Object.freeze({
  back: Object.freeze({ viewBox: "0 0 24 24", path: "M20 11v2H8.8l4.6 4.6L12 19 5 12l7-7 1.4 1.4L8.8 11H20Z" }),
  close: Object.freeze({ viewBox: "0 0 24 24", path: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z" }),
  up: Object.freeze({ viewBox: "0 0 24 24", path: "M11 20V8.8l-4.6 4.6L5 12l7-7 7 7-1.4 1.4L13 8.8V20h-2Z" }),
  down: Object.freeze({ viewBox: "0 0 24 24", path: "M11 4h2v11.2l4.6-4.6L19 12l-7 7-7-7 1.4-1.4 4.6 4.6V4Z" }),
  add: Object.freeze({ viewBox: "0 0 24 24", path: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z" }),
  edit: Object.freeze({ viewBox: "0 0 24 24", path: "M4 17.25V20h2.75L17.81 8.94l-2.75-2.75L4 17.25Zm15.71-10.04a1 1 0 0 0 0-1.42l-1.5-1.5a1 1 0 0 0-1.42 0l-1.1 1.1 2.75 2.75 1.27-1.27Z" }),
  delete: Object.freeze({ viewBox: "0 0 24 24", path: "M9 3h6l1 2h4v2H4V5h4l1-2Zm-2 6h10l-.8 12H7.8L7 9Zm3 2 .35 8h1.5L11.5 11H10Zm3.5 0-.35 8h1.5L15 11h-1.5Z" }),
});

const SYSTEM_ICON_ALIASES = Object.freeze({
  "arrow-left": "back",
  "arrow-up": "up",
  "arrow-down": "down",
  plus: "add",
  trash: "delete",
  remove: "close",
  pencil: "edit",
});

export function getSystemIcon(name = "") {
  const normalizedName = SYSTEM_ICONS[name] ? name : SYSTEM_ICON_ALIASES[name];
  return SYSTEM_ICONS[normalizedName] || SYSTEM_ICONS.add;
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
  const icon = getSystemIcon(iconName);
  const symbol = document.createElement("span");
  symbol.className = ["mha-icon-symbol", "mha-system-icon-symbol", className].filter(Boolean).join(" ");
  symbol.dataset.systemIcon = iconName;

  if (label) {
    symbol.setAttribute("role", "img");
    symbol.setAttribute("aria-label", label);
  } else {
    symbol.setAttribute("aria-hidden", "true");
  }

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", icon.viewBox || "0 0 24 24");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", icon.path || "");
  svg.append(path);
  symbol.append(svg);

  return symbol;
}
