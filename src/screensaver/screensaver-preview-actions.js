export function toggleScreensaverPreviewState(host) {
  const state = host._screensaverController.read();
  host._screensaverController.setPreviewState(!state.preview);
  host._syncScreensaverDom();
}

export function toggleNowBarPreviewState(host) {
  const state = host._screensaverController.read();
  host._screensaverController.setNowBarState(!state.nowBar);
  host._syncScreensaverDom();
}

export function setScreensaverClockVariantState(host, variant = "digital") {
  host._screensaverController.setClockVariantState(variant);
  host._syncScreensaverDom();
}
