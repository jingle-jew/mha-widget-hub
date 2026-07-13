import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { getThemeDefinitions, getThemeDefinition } from "../../../src/settings/theme-registry.js";
import { getControlsForTheme } from "../schema/theme-controls.js";
import { REGISTRY_FILE, resolveRepoFile } from "./repo-guard.js";
import { findDeclaration, parseDeclarations } from "./theme-parser.js";

const SHARED_THEME_FILES = Object.freeze([
  "styles/themes/accent-palettes.css",
  "styles/themes/semantic-tokens.css",
  "styles/core/tokens.css",
  "styles/themes/ios-raw-materials.css",
  "styles/themes/ios-surface-map.css",
]);
const SIMPLE_COLOR = /^(#(?:[\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\))$/i;
const BLEND_MODES = new Set(["normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-dodge", "color-burn", "darken", "lighten"]);

function themeSourceFiles(themeId) {
  const definition = getThemeDefinition(themeId);
  return [...new Set([
    ...SHARED_THEME_FILES,
    ...(definition?.css || []),
    ...(definition?.dock?.css || []),
  ])];
}

function appliesToTheme(selector, themeId) {
  const themeSelectors = [...String(selector || "").matchAll(/data-theme-style=["']([^"']+)["']/g)].map(match => match[1]);
  return themeSelectors.length === 0 || themeSelectors.includes(themeId);
}

function categoryForToken(token) {
  const value = token.replace(/^--mha-/, "");
  if (/radius|rounded/.test(value)) return "rayons";
  if (/blur|filter/.test(value)) return "blur";
  if (/saturation/.test(value)) return "saturation";
  if (/opacity|alpha/.test(value)) return "opacity";
  if (/noise|grain/.test(value)) return "grain";
  if (/reflection|highlight|shine/.test(value)) return "reflets";
  if (/border|outline|stroke/.test(value)) return "bordures";
  if (/shadow|elevation/.test(value)) return "ombres";
  if (/dock/.test(value)) return "dock";
  if (/status/.test(value)) return "status-bar";
  if (/widget/.test(value)) return "widgets";
  if (/control|slider|toggle|button/.test(value)) return "controls";
  if (/font|text|type|line-height|letter/.test(value)) return "typography";
  if (/surface|background|bg-|panel|shell|tile/.test(value)) return "surfaces";
  if (/color|accent|tint|palette/.test(value)) return "couleurs";
  if (/spacing|space|gap|padding|margin|size|width|height|inset|position/.test(value)) return "dimensions";
  return "general";
}

function labelForToken(token) {
  return token.replace(/^--mha-/, "").split("-").map(part => part ? part[0].toUpperCase() + part.slice(1) : "").join(" ");
}

function inferAutomaticControl(token, value) {
  const trimmed = String(value || "").trim();
  if (SIMPLE_COLOR.test(trimmed)) return { control: "color-alpha", readOnly: false };
  if (BLEND_MODES.has(trimmed)) return { control: "select", options: [...BLEND_MODES], readOnly: false };
  if (trimmed === "true" || trimmed === "false") return { control: "select", options: ["true", "false"], readOnly: false };
  const numeric = trimmed.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]*)$/i);
  if (numeric) {
    const number = Number(numeric[1]);
    const unit = numeric[2];
    const tokenName = token.toLowerCase();
    const isOpacity = /opacity|alpha/.test(tokenName);
    const min = isOpacity ? 0 : (number < 0 ? number * 2 : 0);
    const max = isOpacity ? 1 : Math.max(number * 2, unit === "%" ? 300 : unit === "px" ? 100 : 1);
    const step = isOpacity || (!unit && Math.abs(number) < 1) ? 0.01 : unit === "rem" ? 0.05 : 1;
    return { control: "range", min, max, step, unit, readOnly: false };
  }
  return { control: "readonly", readOnly: true };
}

function modeForSelector(selector) {
  if (selector.includes('data-theme="light"')) return "light";
  if (selector.includes('data-theme="dark"')) return "dark";
  return "shared";
}

function variantForSelector(selector) {
  return selector.match(/data-ios-glass=["']([^"']+)["']/)?.[1] || "";
}

function controlKey(control) {
  return `${control.file}|${control.token}|${control.selector}`;
}

function isNativeDeclaration(filePath, value) {
  return filePath !== "styles/core/surface-contract/aliases.css" && !String(value || "").includes("var(");
}

async function discoverThemeControls(themeId, explicitControls, files) {
  const explicitKeys = new Set(explicitControls.map(controlKey));
  const discovered = [];
  for (const filePath of themeSourceFiles(themeId)) {
    const file = files.get(filePath);
    if (!file) continue;
    for (const declaration of parseDeclarations(file.content)) {
      if (!appliesToTheme(declaration.selector, themeId)) continue;
      if (!isNativeDeclaration(filePath, declaration.value)) continue;
      const definition = { file: filePath, token: declaration.token, selector: declaration.selector };
      if (explicitKeys.has(controlKey(definition))) continue;
      const inferred = inferAutomaticControl(declaration.token, declaration.value);
      const variant = variantForSelector(declaration.selector);
      discovered.push({
        id: `token.${filePath.replace(/[^a-z0-9]+/gi, ".")}.${declaration.token.replace(/^--mha-/, "").replace(/[^a-z0-9]+/gi, ".")}.${declaration.line}`,
        token: declaration.token,
        label: labelForToken(declaration.token),
        description: `${inferred.readOnly ? "Token détecté automatiquement; édition protégée indisponible pour cette valeur." : "Token détecté automatiquement et validé par le Theme Studio."}${variant ? ` Variante iOS: ${variant}.` : ""}`,
        category: categoryForToken(declaration.token),
        mode: modeForSelector(declaration.selector),
        variant,
        themes: [themeId],
        ...inferred,
        file: filePath,
        selector: declaration.selector,
        line: declaration.line,
      });
    }
  }
  return discovered;
}

export function getRegisteredThemes() {
  return getThemeDefinitions().map(theme => ({
    id: theme.id,
    label: theme.label,
    order: theme.order,
    variants: theme.variants,
    defaultVariant: theme.defaultVariant,
    hasSchema: getControlsForTheme(theme.id).length > 0 || Boolean(theme.css?.length),
    readOnly: !theme.css?.length,
  }));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function getAllowedFiles(themeId) {
  return new Set([REGISTRY_FILE, ...themeSourceFiles(themeId)]);
}

export async function readTheme(repoRoot, themeId) {
  const theme = getThemeDefinition(themeId);
  if (!theme || theme.id !== themeId) throw new Error("Thème inconnu.");
  const explicitControls = getControlsForTheme(themeId);
  const allowedFiles = getAllowedFiles(themeId);
  const files = new Map();

  for (const relativePath of allowedFiles) {
    const absolutePath = resolveRepoFile(repoRoot, relativePath, allowedFiles);
    const content = await readFile(absolutePath, "utf8").catch(() => null);
    if (content === null) continue;
    const fileStat = await stat(absolutePath);
    files.set(relativePath, { path: relativePath, content, sha256: sha256(content), mtimeMs: fileStat.mtimeMs });
  }

  const controls = [...explicitControls, ...(await discoverThemeControls(themeId, explicitControls, files))];
  const serializedControls = controls.map(definition => {
    const file = files.get(definition.file);
    const declaration = file ? findDeclaration(file.content, definition) : null;
    return {
      ...definition,
      value: declaration?.value || "",
      line: declaration?.line || null,
      available: Boolean(declaration),
    };
  });

  return {
    theme: getRegisteredThemes().find(item => item.id === themeId),
    files: [...files.values()],
    controls: serializedControls,
    registry: files.get(REGISTRY_FILE),
  };
}

export function getFileContents(readResult) {
  return new Map(readResult.files.map(file => [file.path, file]));
}

export function resolveSourcePath(repoRoot, relativePath, themeId) {
  return resolveRepoFile(repoRoot, relativePath, getAllowedFiles(themeId));
}

export function getPreviewAssetsRoot(repoRoot) {
  return path.resolve(repoRoot);
}
