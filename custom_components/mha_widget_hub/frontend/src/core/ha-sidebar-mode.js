export function applyHaSidebarMode(
  enabled = false,
  {
    documentRef = document,
    windowRef = window,
    CustomEventCtor = CustomEvent,
  } = {},
) {
  const shouldHide = Boolean(enabled);

  documentRef.documentElement.classList.toggle("mha-hide-ha-sidebar", shouldHide);
  windowRef.dispatchEvent(new CustomEventCtor("hass-kiosk-mode", {
    detail: { enable: shouldHide },
  }));
  windowRef.dispatchEvent(new CustomEventCtor("hass-dock-sidebar", {
    detail: { dock: shouldHide ? "always_hidden" : "docked" },
  }));

  return shouldHide;
}
