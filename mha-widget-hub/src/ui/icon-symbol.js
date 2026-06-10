/*
 * MHA Icon Symbol component.
 *
 * Icon symbol = the sign/pictogram only.
 * Icon shape/container = handled separately by src/ui/icon.js and
 * styles/components/icon.css.
 *
 * Any symbol can be placed in any icon shape later.
 */

import { getIconSymbol } from "../icons/icon-symbol-catalog.js";

const SVG_NS = "http://www.w3.org/2000/svg";

export function createIconSymbol({
  name = "",
  label = "",
  className = "",
} = {}) {
  const symbolDefinition = getIconSymbol(name);

  const symbol = document.createElement("span");
  symbol.className = ["mha-icon-symbol", className].filter(Boolean).join(" ");
  symbol.dataset.iconSymbol = name;

  if (label) {
    symbol.setAttribute("role", "img");
    symbol.setAttribute("aria-label", label);
  } else {
    symbol.setAttribute("aria-hidden", "true");
  }

  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", symbolDefinition?.viewBox || "0 0 24 24");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("aria-hidden", "true");

  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", symbolDefinition?.path || "");
  svg.append(path);

  symbol.append(svg);

  return symbol;
}

export function createIconSymbolSvg(name = "") {
  return createIconSymbol({ name });
}
