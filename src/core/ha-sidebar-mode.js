function isElementVisible(element, windowRef = window) {
  if (!element || typeof element.getBoundingClientRect !== "function") return false;
  const rect = element.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return false;
  const style = windowRef?.getComputedStyle?.(element);
  return style?.display !== "none" && style?.visibility !== "hidden";
}

function findVisibleElementDeep(root, selectors = [], windowRef = window) {
  if (!root?.querySelectorAll) return null;

  for (const selector of selectors) {
    const element = root.querySelector(selector);
    if (isElementVisible(element, windowRef)) return element;
  }

  const shadowHosts = root.querySelectorAll("*");
  for (const host of shadowHosts) {
    const shadowRoot = host?.shadowRoot;
    if (!shadowRoot) continue;
    const element = findVisibleElementDeep(shadowRoot, selectors, windowRef);
    if (element) return element;
  }

  return null;
}

export function resolveHaSidebarReservedWidth({
  enabled = false,
  documentRef = document,
  windowRef = window,
} = {}) {
  if (enabled) return 0;

  const sidebar = findVisibleElementDeep(documentRef, [
    "ha-sidebar",
    "ha-drawer",
    "[slot='drawer']",
    "aside[slot='sidebar']",
    ".mdc-drawer",
  ], windowRef);

  const width = Number(sidebar?.getBoundingClientRect?.().width) || 0;
  return width > 0 ? Math.round(width) : 0;
}

export function syncHaSidebarReservedWidth(
  host,
  {
    enabled = false,
    documentRef = document,
    windowRef = window,
  } = {},
) {
  const width = resolveHaSidebarReservedWidth({
    enabled,
    documentRef,
    windowRef,
  });
  host?.style?.setProperty?.("--mha-ha-sidebar-reserved-inline-start", `${width}px`);
  return width;
}

export function scheduleHaSidebarReservedWidthSync(
  host,
  {
    enabled = false,
    documentRef = document,
    windowRef = window,
    requestAnimationFrameRef = requestAnimationFrame,
    cancelAnimationFrameRef = cancelAnimationFrame,
    setTimeoutRef = setTimeout,
    clearTimeoutRef = clearTimeout,
    timeoutMs = 180,
  } = {},
) {
  if (!host) return 0;

  cancelAnimationFrameRef(host._haSidebarReservedWidthFrame || 0);
  clearTimeoutRef(host._haSidebarReservedWidthTimeout || 0);

  const sync = () => syncHaSidebarReservedWidth(host, {
    enabled,
    documentRef,
    windowRef,
  });

  host._haSidebarReservedWidthFrame = requestAnimationFrameRef(() => {
    host._haSidebarReservedWidthFrame = requestAnimationFrameRef(() => {
      host._haSidebarReservedWidthFrame = 0;
      sync();
    });
  });

  host._haSidebarReservedWidthTimeout = setTimeoutRef(() => {
    host._haSidebarReservedWidthTimeout = 0;
    sync();
  }, timeoutMs);

  return host._haSidebarReservedWidthFrame;
}

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
