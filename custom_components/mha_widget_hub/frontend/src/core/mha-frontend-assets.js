export function resolveFrontendAssetUrl(
  path = "",
  { frontendRootUrl = new URL(".", import.meta.url), frontendVersion = "" } = {},
) {
  const url = new URL(String(path).replace(/^\/+/, ""), frontendRootUrl);
  if (frontendVersion) url.searchParams.set("v", frontendVersion);
  return url.href;
}

export function createFrontendStyleLinks(styleManifest = [], assetOptions = {}) {
  return styleManifest
    .map(([path, layer]) => (
      `<link rel="stylesheet" data-mha-style-layer="${layer}" href="${resolveFrontendAssetUrl(path, assetOptions)}">`
    ))
    .join("");
}

export function getCriticalBootCss() {
  /*
   * External theme styles can take several seconds through Home Assistant.
   * Keep a styled wallpaper visible and all application content hidden until
   * those styles and the first measured layout are ready.
   */
  return `
    :host {
      display: block;
      position: relative;
      inline-size: 100%;
      block-size: 100dvh;
      overflow: hidden;
      color: rgba(255,255,255,.92);
      background:
        radial-gradient(circle at 20% 15%, rgba(113,128,255,.32), transparent 30%),
        radial-gradient(circle at 78% 28%, rgba(255,112,178,.28), transparent 32%),
        radial-gradient(circle at 52% 90%, rgba(56,209,255,.22), transparent 36%),
        linear-gradient(135deg, #171b30 0%, #242844 100%);
    }
    :host([data-boot-state="booting"]) > :not(style):not(link):not(.mha-background) {
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    :host([data-boot-state="booting"]) .mha-background {
      position: absolute;
      inset: -20%;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(circle at 20% 15%, var(--mha-bg-radial-1, rgba(113,128,255,.32)), transparent 30%),
        radial-gradient(circle at 78% 28%, var(--mha-bg-radial-2, rgba(255,112,178,.28)), transparent 32%),
        radial-gradient(circle at 52% 90%, var(--mha-bg-radial-3, rgba(56,209,255,.22)), transparent 36%),
        linear-gradient(135deg, var(--mha-bg-base-1, #171b30), var(--mha-bg-base-2, #242844));
    }
    :host([data-boot-state="booting"][data-wallpaper-kind="image"][data-wallpaper-source="custom"]) .mha-background,
    :host([data-boot-state="booting"][data-wallpaper-kind="image"][data-wallpaper-source="theme"]) .mha-background {
      background-image: var(--mha-active-wallpaper-image) !important;
      background-size: cover !important;
      background-position: center !important;
      background-repeat: no-repeat !important;
    }
    :host([data-boot-state="booting"][data-wallpaper-kind="css"][data-wallpaper-source="theme"]) .mha-background {
      background: var(--mha-active-wallpaper-background) !important;
    }
  `;
}

export function createCriticalBootStyle() {
  return `<style data-mha-critical-boot>${getCriticalBootCss()}</style>`;
}

export function createCriticalBootStyleElement(doc = document) {
  const style = doc.createElement("style");
  style.setAttribute("data-mha-critical-boot", "");
  style.textContent = getCriticalBootCss();
  return style;
}

export function createFrontendStyleElements(
  styleManifest = [],
  assetOptions = {},
  doc = document,
) {
  return styleManifest.map(([path, layer]) => {
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("data-mha-style-layer", layer);
    link.setAttribute("href", resolveFrontendAssetUrl(path, assetOptions));
    return link;
  });
}
