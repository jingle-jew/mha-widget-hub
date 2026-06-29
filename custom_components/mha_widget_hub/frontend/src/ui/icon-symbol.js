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
import { resolveTablerIconForMhaName } from "./tabler-icons.js";

const SVG_NS = "http://www.w3.org/2000/svg";

function createSvgPath(d = "") {
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  return path;
}

function resolveIconSymbolDefinition(name = "") {
  const tablerIcon = resolveTablerIconForMhaName(name);
  if (tablerIcon) return tablerIcon;

  const localIcon = getIconSymbol(name);
  if (localIcon) {
    return {
      provider: "local",
      renderMode: "fill",
      viewBox: localIcon.viewBox || "0 0 24 24",
      paths: localIcon.path ? [localIcon.path] : [],
    };
  }

  const fallbackIcon = getIconSymbol("grid");
  return {
    provider: fallbackIcon ? "local" : "empty",
    renderMode: "fill",
    viewBox: fallbackIcon?.viewBox || "0 0 24 24",
    paths: fallbackIcon?.path ? [fallbackIcon.path] : [],
  };
}

export function createIconSymbol({
  name = "",
  label = "",
  className = "",
} = {}) {
  const symbolDefinition = resolveIconSymbolDefinition(name);

  const symbol = document.createElement("span");
  symbol.className = ["mha-icon-symbol", className].filter(Boolean).join(" ");
  symbol.dataset.iconSymbol = name;
  symbol.dataset.iconProvider = symbolDefinition.provider || "local";

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

  for (const pathDefinition of symbolDefinition?.paths || []) {
    svg.append(createSvgPath(pathDefinition));
  }

  symbol.append(svg);

  return symbol;
}

export function createIconSymbolSvg(name = "") {
  return createIconSymbol({ name });
}
