const SVG_NS = "http://www.w3.org/2000/svg";
const BLURRED_SHEET_SELECTORS = [".sheet-2", ".sheet-5", ".sheet-7"];
const WALLPAPER_BLUR_FILTER_ID = "mha-ios-sheet-blur";

const WALLPAPER_ASSET_URL = (() => {
  const assetUrl = new URL("../../styles/themes/wallpaper.svg", import.meta.url);
  const version = new URL(import.meta.url).searchParams.get("v");
  if (version) assetUrl.searchParams.set("v", version);
  return assetUrl.href;
})();

let cachedWallpaper = null;
let cachedTemplatePromise = null;
let observedWallpaperHost = null;
let wallpaperHostObserver = null;

async function readWallpaperMarkup() {
  const assetUrl = new URL(WALLPAPER_ASSET_URL);

  if (assetUrl.protocol === "file:") {
    const { readFile } = await import("node:fs/promises");
    return readFile(assetUrl, "utf8");
  }

  const response = await fetch(assetUrl);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function setSvgAttribute(node, attribute) {
  if (!attribute) return;
  if (attribute.namespaceURI) {
    node.setAttributeNS(attribute.namespaceURI, attribute.name, attribute.value);
    return;
  }
  node.setAttribute(attribute.name, attribute.value);
}

function removeSvgAttribute(node, attribute) {
  if (!attribute) return;
  if (attribute.namespaceURI) {
    node.removeAttributeNS(attribute.namespaceURI, attribute.localName);
    return;
  }
  node.removeAttribute(attribute.name);
}

function finalizeWallpaperSvg(svg) {
  svg.classList.add("mha-ios-organic-wallpaper");
  svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  return svg;
}

function resolveWallpaperHost(svg) {
  const rootNode = svg.getRootNode?.();
  return rootNode?.host ?? null;
}

function parseCssPxValue(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveWallpaperBlurStdDeviation(svg) {
  const host = resolveWallpaperHost(svg);
  if (!host || typeof getComputedStyle !== "function") return 16;

  const computedStyle = getComputedStyle(host);
  const blurToken = computedStyle.getPropertyValue("--mha-blur-primary")
    || computedStyle.getPropertyValue("--mha-surface-blur");

  return parseCssPxValue(blurToken, 16);
}

function ensureWallpaperFilters(svg) {
  let defs = svg.querySelector("defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }

  let filter = defs.querySelector(`#${WALLPAPER_BLUR_FILTER_ID}`);
  if (!filter) {
    filter = document.createElementNS(SVG_NS, "filter");
    filter.setAttribute("id", WALLPAPER_BLUR_FILTER_ID);
    defs.append(filter);
  }

  filter.setAttribute("x", "-20%");
  filter.setAttribute("y", "-20%");
  filter.setAttribute("width", "140%");
  filter.setAttribute("height", "140%");
  filter.setAttribute("color-interpolation-filters", "sRGB");

  let gaussianBlur = filter.querySelector("feGaussianBlur");
  if (!gaussianBlur) {
    gaussianBlur = document.createElementNS(SVG_NS, "feGaussianBlur");
    filter.replaceChildren(gaussianBlur);
  }

  gaussianBlur.setAttribute("in", "SourceGraphic");
  gaussianBlur.setAttribute("stdDeviation", String(resolveWallpaperBlurStdDeviation(svg)));

  BLURRED_SHEET_SELECTORS.forEach((selector) => {
    const path = svg.querySelector(selector);
    if (!path) return;
    path.setAttribute("filter", `url(#${WALLPAPER_BLUR_FILTER_ID})`);
  });
}

function observeWallpaperHost(svg) {
  const host = resolveWallpaperHost(svg);
  if (!host || typeof MutationObserver !== "function") return;
  if (host === observedWallpaperHost) return;

  wallpaperHostObserver?.disconnect();
  observedWallpaperHost = host;
  wallpaperHostObserver = new MutationObserver(() => ensureWallpaperFilters(svg));
  wallpaperHostObserver.observe(host, {
    attributes: true,
    attributeFilter: ["data-theme", "data-theme-style", "data-ios-glass", "style", "class"],
  });
}

async function loadWallpaperTemplate() {
  if (typeof DOMParser !== "function") return null;

  if (!cachedTemplatePromise) {
    cachedTemplatePromise = readWallpaperMarkup()
      .then((markup) => {
        const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
        const parserError = parsed.querySelector("parsererror");
        const svg = parsed.documentElement;

        if (parserError || svg?.nodeName !== "svg") {
          throw new Error("Invalid SVG document");
        }

        return svg;
      })
      .catch((error) => {
        cachedTemplatePromise = null;
        throw error;
      });
  }

  return cachedTemplatePromise;
}

async function hydrateWallpaper(svg) {
  try {
    const template = await loadWallpaperTemplate();
    if (!template) return;
    const templateAttributes = [...template.attributes];
    const currentAttributes = [...svg.attributes];

    currentAttributes.forEach((attribute) => removeSvgAttribute(svg, attribute));
    templateAttributes.forEach((attribute) => setSvgAttribute(svg, attribute));
    svg.replaceChildren(
      ...[...template.childNodes].map((node) => svg.ownerDocument.importNode(node, true)),
    );
    ensureWallpaperFilters(svg);
    observeWallpaperHost(svg);
    finalizeWallpaperSvg(svg);
  } catch (error) {
    console.warn("[MHA] iOS organic wallpaper SVG could not be loaded.", error);
  }
}

export function createIosOrganicWallpaper() {
  if (cachedWallpaper) {
    ensureWallpaperFilters(cachedWallpaper);
    observeWallpaperHost(cachedWallpaper);
    return cachedWallpaper;
  }

  const svg = finalizeWallpaperSvg(document.createElementNS(SVG_NS, "svg"));
  cachedWallpaper = svg;
  hydrateWallpaper(svg);
  return svg;
}
