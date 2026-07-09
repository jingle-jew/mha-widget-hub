function cancelQueuedPanelOpen(panel) {
  const frameId = panel?._mhaOpenVisibilityFrame;
  if (frameId == null) return;
  const cancelFrame = globalThis.cancelAnimationFrame || globalThis.clearTimeout;
  cancelFrame(frameId);
  panel._mhaOpenVisibilityFrame = null;
}

function cancelQueuedPanelHide(panel) {
  const timerId = panel?._mhaHideVisibilityTimer;
  if (timerId == null) return;
  globalThis.clearTimeout(timerId);
  panel._mhaHideVisibilityTimer = null;
}

function queuePanelOpen(panel) {
  const requestFrame = globalThis.requestAnimationFrame || (callback => globalThis.setTimeout(callback, 0));
  panel._mhaOpenVisibilityFrame = requestFrame(() => {
    panel._mhaOpenVisibilityFrame = null;
    if (panel?._mhaDesiredOpenState !== true) return;
    panel.dataset.open = "true";
    panel.setAttribute("aria-hidden", "false");
  });
}

export function syncPanelVisibility(panel, open, {
  transitionMs = 0,
  animateClose = true,
  closeStateDatasetKey = "",
  closeStateValue = "closing",
} = {}) {
  if (!panel) return panel;
  const nextOpen = Boolean(open);
  panel._mhaDesiredOpenState = nextOpen;
  panel.style?.setProperty?.("--mha-panel-visibility-duration", `${transitionMs}ms`);
  cancelQueuedPanelOpen(panel);
  cancelQueuedPanelHide(panel);

  if (nextOpen) {
    if (closeStateDatasetKey) delete panel.dataset[closeStateDatasetKey];
    panel.hidden = false;
    if (panel.dataset.open === "true") {
      panel.setAttribute("aria-hidden", "false");
      return panel;
    }

    panel.dataset.open = "false";
    panel.setAttribute("aria-hidden", "false");
    queuePanelOpen(panel);
    return panel;
  }

  panel.dataset.open = "false";
  panel.setAttribute("aria-hidden", "true");
  if (!animateClose || transitionMs <= 0) {
    if (closeStateDatasetKey) delete panel.dataset[closeStateDatasetKey];
    panel.hidden = true;
    return panel;
  }

  if (closeStateDatasetKey) panel.dataset[closeStateDatasetKey] = closeStateValue;
  panel.hidden = false;
  panel._mhaHideVisibilityTimer = globalThis.setTimeout(() => {
    panel._mhaHideVisibilityTimer = null;
    if (panel?._mhaDesiredOpenState === true) return;
    if (closeStateDatasetKey) delete panel.dataset[closeStateDatasetKey];
    panel.hidden = true;
  }, transitionMs);
  return panel;
}
