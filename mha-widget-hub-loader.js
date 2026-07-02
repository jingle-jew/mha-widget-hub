/*
 * Home Assistant loads this tiny module before the application dependency
 * graph. It prevents the undefined panel element from exposing fallback text
 * while the real custom element and its styles are still downloading.
 */
const BOOT_STYLE_ID = "mha-widget-hub-boot-style";

if (!document.getElementById(BOOT_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = BOOT_STYLE_ID;
  style.textContent = `
    mha-widget-hub:not(:defined) {
      color: transparent !important;
      font-size: 0 !important;
      overflow: hidden !important;
      visibility: visible !important;
    }

    mha-app:not(:defined),
    mha-dock:not(:defined),
    mha-widget:not(:defined),
    mha-status-bar:not(:defined) {
      display: none !important;
      visibility: hidden !important;
    }

    mha-widget-hub:not(:defined) {
      display: block !important;
      inline-size: 100% !important;
      block-size: 100dvh !important;
      min-block-size: 100% !important;
      background:
        radial-gradient(circle at 20% 15%, rgba(113,128,255,.32), transparent 30%),
        radial-gradient(circle at 78% 28%, rgba(255,112,178,.28), transparent 32%),
        radial-gradient(circle at 52% 90%, rgba(56,209,255,.22), transparent 36%),
        linear-gradient(135deg, #171b30 0%, #242844 100%) !important;
    }

    mha-widget-hub:not(:defined) > * {
      display: none !important;
    }
  `;
  document.head.append(style);
}

const appUrl = new URL("./mha-widget-hub.js", import.meta.url);
const frontendRootUrl = new URL("./", import.meta.url).href;
window.__MHA_FRONTEND_ROOT_URL__ = frontendRootUrl.endsWith("/")
  ? frontendRootUrl
  : `${frontendRootUrl}/`;
const frontendVersion = new URL(import.meta.url).searchParams.get("v");
if (frontendVersion) appUrl.searchParams.set("v", frontendVersion);

const loaderWatchdog = window.setTimeout(() => {
  if (customElements.get("mha-widget-hub")) return;
  console.warn("[MHA] Boot fallback: the application module did not register within 1200ms.");
}, 1200);

import(appUrl.href)
  .catch(error => {
    console.error("[MHA] Failed to load the application module.", error);
    document.getElementById(BOOT_STYLE_ID)?.remove();
  })
  .finally(() => window.clearTimeout(loaderWatchdog));
