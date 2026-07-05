const SVG_NS = "http://www.w3.org/2000/svg";

const WALLPAPER_ASSET_URL = (() => {
  const assetUrl = new URL("../../styles/themes/wallpaper.svg", import.meta.url);
  const version = new URL(import.meta.url).searchParams.get("v");
  if (version) assetUrl.searchParams.set("v", version);
  return assetUrl.href;
})();

let cachedWallpaper = null;
let cachedTemplatePromise = null;

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
    finalizeWallpaperSvg(svg);
  } catch (error) {
    console.warn("[MHA] iOS organic wallpaper SVG could not be loaded.", error);
  }
}

export function createIosOrganicWallpaper() {
  if (cachedWallpaper) return cachedWallpaper;

  const svg = finalizeWallpaperSvg(document.createElementNS(SVG_NS, "svg"));
  cachedWallpaper = svg;
  hydrateWallpaper(svg);
  return svg;
}
