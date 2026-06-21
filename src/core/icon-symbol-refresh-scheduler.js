import { refreshIconSymbols } from "./icon-symbol-refresh.js";

export function scheduleIconSymbolRefresh(
  host,
  {
    requestAnimationFrameRef = requestAnimationFrame,
    cancelAnimationFrameRef = cancelAnimationFrame,
  } = {},
) {
  cancelAnimationFrameRef(host._iconSymbolRefreshFrame);
  host._iconSymbolRefreshFrame = requestAnimationFrameRef(() => {
    if (!host.isConnected || !host.shadowRoot) return;
    refreshIconSymbols(host.shadowRoot);
    host._iconSymbolRefreshFrame = 0;
  });

  return host._iconSymbolRefreshFrame;
}
