export function refreshIconSymbols(root) {
  if (!root?.querySelectorAll) return 0;

  const symbols = [...root.querySelectorAll(".mha-icon-symbol")];
  for (const symbol of symbols) {
    // Force the browser to repaint SVG glyphs after theme token changes.
    symbol.style.transform = "translateZ(0)";
    symbol.getBoundingClientRect();
    symbol.style.transform = "";
  }

  return symbols.length;
}
