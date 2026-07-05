const SVG_NS = "http://www.w3.org/2000/svg";
const SHEET_GRADIENT_SPECS = [
  { selector: ".sheet-1", id: "mha-ios-sheet-fill-1", x1: "14%", y1: "10%", x2: "82%", y2: "88%" },
  { selector: ".sheet-2", id: "mha-ios-sheet-fill-2", x1: "12%", y1: "18%", x2: "86%", y2: "82%" },
  { selector: ".sheet-3", id: "mha-ios-sheet-fill-3", x1: "18%", y1: "8%", x2: "74%", y2: "92%" },
  { selector: ".sheet-4", id: "mha-ios-sheet-fill-4", x1: "16%", y1: "16%", x2: "84%", y2: "84%" },
  { selector: ".sheet-5", id: "mha-ios-sheet-fill-5", x1: "20%", y1: "10%", x2: "78%", y2: "90%" },
  { selector: ".sheet-6", id: "mha-ios-sheet-fill-6", x1: "24%", y1: "12%", x2: "76%", y2: "88%" },
  { selector: ".sheet-7", id: "mha-ios-sheet-fill-7", x1: "28%", y1: "8%", x2: "72%", y2: "92%" },
];

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

function createGradientStop(offset, colorVariableName) {
  const stop = document.createElementNS(SVG_NS, "stop");
  stop.setAttribute("offset", offset);
  stop.setAttribute("style", `stop-color: var(${colorVariableName});`);
  return stop;
}

function ensureWallpaperDefs(svg) {
  let defs = svg.__mhaWallpaperDefs;
  if (defs?.parentNode === svg) return defs;

  defs = document.createElementNS(SVG_NS, "defs");
  if (typeof svg.insertBefore === "function") {
    svg.insertBefore(defs, svg.firstChild ?? null);
  } else if (typeof svg.append === "function") {
    svg.append(defs);
  }

  svg.__mhaWallpaperDefs = defs;
  return defs;
}

function ensureSheetGradients(svg) {
  const defs = ensureWallpaperDefs(svg);
  svg.__mhaWallpaperGradients ??= new Map();

  SHEET_GRADIENT_SPECS.forEach(({ selector, id, x1, y1, x2, y2 }, index) => {
    let gradient = svg.__mhaWallpaperGradients.get(id);
    if (!gradient) {
      gradient = document.createElementNS(SVG_NS, "linearGradient");
      gradient.setAttribute("id", id);
      defs.append(gradient);
      svg.__mhaWallpaperGradients.set(id, gradient);
    }

    gradient.setAttribute("x1", x1);
    gradient.setAttribute("y1", y1);
    gradient.setAttribute("x2", x2);
    gradient.setAttribute("y2", y2);
    gradient.replaceChildren(
      createGradientStop("0%", `--mha-ios-sheet-${index + 1}-top`),
      createGradientStop("100%", `--mha-ios-sheet-${index + 1}-bottom`),
    );

    const path = svg.querySelector?.(`${selector}[id]`);
    if (!path) return;

    path.setAttribute("fill", `url(#${id})`);
    path.removeAttribute("filter");
    path.removeAttribute("mask");
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
    svg.__mhaWallpaperDefs = null;
    svg.__mhaWallpaperGradients = null;
    svg.replaceChildren(
      ...[...template.childNodes].map((node) => svg.ownerDocument.importNode(node, true)),
    );
    ensureSheetGradients(svg);
    finalizeWallpaperSvg(svg);
  } catch (error) {
    console.warn("[MHA] iOS organic wallpaper SVG could not be loaded.", error);
  }
}

export function createIosOrganicWallpaper() {
  if (cachedWallpaper) {
    ensureSheetGradients(cachedWallpaper);
    return cachedWallpaper;
  }

  const svg = finalizeWallpaperSvg(document.createElementNS(SVG_NS, "svg"));
  cachedWallpaper = svg;
  hydrateWallpaper(svg);
  return svg;
}
