/*
 * MHA Icon Symbol component.
 *
 * Icon symbol = the sign/pictogram only.
 * Icon shape/container = handled separately by src/ui/icon.js and
 * styles/components/icon.css.
 *
 * Any symbol can be placed in any icon shape later.
 */

import { getTablerIcon, resolveTablerIconName } from "./tabler-icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function resolveIconSymbolDefinition(name = "") {
  return getTablerIcon(name);
}

function createSvgNode([tagName = "path", attributes = {}] = []) {
  const node = document.createElementNS(SVG_NS, tagName);
  Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, String(value)));
  return node;
}

export function createIconSymbol({
  name = "",
  label = "",
  className = "",
} = {}) {
  const symbolDefinition = resolveIconSymbolDefinition(name);
  const resolvedName = resolveTablerIconName(name);

  const symbol = document.createElement("span");
  symbol.className = ["mha-icon-symbol", className].filter(Boolean).join(" ");
  symbol.dataset.iconSymbol = name;
  symbol.dataset.iconResolved = resolvedName;
  symbol.dataset.iconProvider = "tabler";

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
  svg.dataset.iconRenderMode = symbolDefinition?.renderMode || "fill";

  if (symbolDefinition?.renderMode === "stroke") {
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", String(symbolDefinition?.strokeWidth || 2));
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
  } else {
    svg.setAttribute("fill", "currentColor");
    svg.setAttribute("stroke", "none");
  }

  for (const nodeDefinition of symbolDefinition?.nodes || []) {
    svg.append(createSvgNode(nodeDefinition));
  }

  symbol.append(svg);

  return symbol;
}

export function createIconSymbolSvg(name = "") {
  return createIconSymbol({ name });
}
