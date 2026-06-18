import { en } from "./en.js";
import { fr } from "./fr.js";
import { es } from "./es.js";

const SUPPORTED_LANGUAGES = Object.freeze(["en", "fr", "es"]);
const DICTIONARIES = Object.freeze({ en, fr, es });

let currentLanguage = normalizeLanguage(globalThis.navigator?.language || "en");

function readPath(source, key) {
  return String(key || "")
    .split(".")
    .filter(Boolean)
    .reduce((value, part) => value?.[part], source);
}

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => (
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
  ));
}

export function normalizeLanguage(value = "") {
  const language = String(value || "").trim().toLowerCase().split(/[-_]/u)[0];
  return SUPPORTED_LANGUAGES.includes(language) ? language : "en";
}

function getConfigLanguage(config = {}) {
  return config?.language
    || config?.locale
    || config?.settings?.language
    || config?.settings?.locale
    || config?.preferences?.language
    || config?.preferences?.locale
    || "";
}

function getHassLanguage(hass = {}) {
  const locale = hass?.locale;
  return (typeof locale === "string" ? locale : locale?.language)
    || hass?.language
    || hass?.selected_language
    || hass?.user?.language
    || "";
}

export function detectLanguage({
  config,
  hass,
  navigatorLanguage = globalThis.navigator?.language || "",
} = {}) {
  return normalizeLanguage(
    getConfigLanguage(config)
    || getHassLanguage(hass)
    || navigatorLanguage
    || "en",
  );
}

export function setLanguage(language = "en") {
  currentLanguage = normalizeLanguage(language);
  return currentLanguage;
}

export function configureI18n({ config, hass, navigatorLanguage } = {}) {
  return setLanguage(detectLanguage({ config, hass, navigatorLanguage }));
}

export function getLanguage() {
  return currentLanguage;
}

export function t(key, fallback = "", params = {}) {
  const translated = readPath(DICTIONARIES[currentLanguage], key);
  const english = readPath(en, key);
  const value = translated ?? english ?? fallback ?? key;
  return interpolate(value, params);
}
