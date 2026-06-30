import { getEntityDomain } from "../ha/entity.js";

const LABEL_ICON_RULES = Object.freeze([
  Object.freeze({ icon: "lamp", keywords: Object.freeze(["lampe", "lamp", "lumiere", "light", "lights", "eclairage", "lighting", "luminaire", "plafonnier"]) }),
  Object.freeze({ icon: "lightbulb", keywords: Object.freeze(["ampoule", "bulb", "bulbs"]) }),
  Object.freeze({ icon: "tv", keywords: Object.freeze(["tv", "tele", "television", "televiseur", "ecran", "screen"]) }),
  Object.freeze({ icon: "coffee", keywords: Object.freeze(["cafe", "coffee", "espresso", "cafetiere", "machine a cafe", "machine cafe"]) }),
  Object.freeze({ icon: "fan", keywords: Object.freeze(["ventilateur", "ventilo", "fan", "ceiling fan"]) }),
  Object.freeze({ icon: "flame", keywords: Object.freeze(["chauffage", "chauffe", "heater", "heat", "heating", "fournaise", "foyer", "fireplace", "radiateur", "radiator", "boiler"]) }),
  Object.freeze({ icon: "snowflake", keywords: Object.freeze(["clim", "climatisation", "air clim", "air climatise", "ac", "cooling", "air conditioning", "air conditioning unit"]) }),
  Object.freeze({ icon: "door", keywords: Object.freeze(["porte", "door", "entry", "entree", "front door", "back door"]) }),
  Object.freeze({ icon: "garage", keywords: Object.freeze(["garage", "porte garage", "garage door"]) }),
  Object.freeze({ icon: "lock", keywords: Object.freeze(["lock", "locked", "serrure", "verrou", "verrouille", "barrer", "deadbolt"]) }),
  Object.freeze({ icon: "shield", keywords: Object.freeze(["alarme", "alarm", "security", "securite", "surveillance", "protect"]) }),
  Object.freeze({ icon: "music", keywords: Object.freeze(["musique", "music", "audio", "playlist", "spotify", "deezer", "sonos"]) }),
  Object.freeze({ icon: "device-speaker", keywords: Object.freeze(["speaker", "speakers", "haut parleur", "hautparleur", "enceinte", "soundbar", "homepod", "alexa", "google home"]) }),
  Object.freeze({ icon: "power", keywords: Object.freeze(["power", "on off", "toggle", "marche arret", "marche", "arret"]) }),
  Object.freeze({ icon: "plug", keywords: Object.freeze(["prise", "prise connectee", "plug", "outlet", "socket", "smart plug"]) }),
  Object.freeze({ icon: "camera", keywords: Object.freeze(["camera", "cam", "camera", "webcam", "surveillance camera"]) }),
  Object.freeze({ icon: "movie", keywords: Object.freeze(["cinema", "movie", "film", "projecteur", "projector", "home cinema", "theatre"]) }),
  Object.freeze({ icon: "living-room", keywords: Object.freeze(["sofa", "couch", "canape", "canapee", "salon", "living room", "sejour"]) }),
  Object.freeze({ icon: "bedroom", keywords: Object.freeze(["lit", "bed", "bedroom", "chambre", "master bedroom", "table de chevet", "chevet", "nightstand", "night stand"]) }),
  Object.freeze({ icon: "bathroom", keywords: Object.freeze(["bain", "bath", "bathroom", "salle de bain", "sdb", "toilette"]) }),
  Object.freeze({ icon: "kitchen", keywords: Object.freeze(["cuisine", "kitchen", "cook", "cuisson", "frigo", "refrigerateur", "refrigerator", "fridge"]) }),
  Object.freeze({ icon: "office", keywords: Object.freeze(["bureau", "desk", "office", "workspace", "work desk"]) }),
]);

const DOMAIN_ICON_FALLBACKS = Object.freeze({
  light: "lamp",
  switch: "toggle",
  input_boolean: "toggle",
  media_player: "device-speaker",
  button: "button",
  cover: "door",
  climate: "temperature",
  sensor: "meter",
  binary_sensor: "shield",
  camera: "camera",
  weather: "weather",
});

function normalizeText(value = "") {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function hasKeywordMatch(label, keyword) {
  if (!label || !keyword) return false;
  if (keyword.includes(" ")) return label.includes(keyword);

  return label.split(" ").includes(keyword);
}

function resolveIconFromLabel(label = "") {
  const normalizedLabel = normalizeText(label);
  if (!normalizedLabel) return "";

  for (const rule of LABEL_ICON_RULES) {
    if (rule.keywords.some(keyword => hasKeywordMatch(normalizedLabel, keyword))) {
      return rule.icon;
    }
  }

  return "";
}

function resolveIconFromDomain(domain = "") {
  const normalizedDomain = normalizeText(domain);
  return DOMAIN_ICON_FALLBACKS[normalizedDomain] || "";
}

export function normalizeIconResolverText(value = "") {
  return normalizeText(value);
}

export function resolveWidgetIconName({
  explicitIcon = "",
  label = "",
  entityId = "",
  domain = "",
  kind = "",
  fallback = "",
} = {}) {
  const normalizedExplicitIcon = String(explicitIcon ?? "").trim();
  if (normalizedExplicitIcon && normalizeText(normalizedExplicitIcon) !== "auto") {
    return normalizedExplicitIcon;
  }

  const labelMatch = resolveIconFromLabel(label);
  if (labelMatch) return labelMatch;

  const domainMatch = resolveIconFromDomain(domain || getEntityDomain(entityId));
  if (domainMatch) return domainMatch;

  return String(fallback || kind || "grid").trim() || "grid";
}
