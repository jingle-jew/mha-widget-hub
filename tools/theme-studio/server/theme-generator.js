import { readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { getThemeDefinition, getThemeDefinitions } from "../../../src/settings/theme-registry.js";
import { getAllowedFiles } from "./theme-reader.js";
import { resolveRepoFile, REGISTRY_FILE, validateThemeId } from "./repo-guard.js";

const hash = value => createHash("sha256").update(value).digest("hex");
const json = value => JSON.stringify(value);

function registryEntry({ id, label, source, css, dockCss }) {
  const dock = source.dock || {};
  const cssEntries = css.map(file => `"${file}"`).join(", ");
  const dockEntries = dockCss.map(file => `"${file}"`).join(", ");
  return `  ${id}: normalizeThemeDefinition({\n    id: ${json(id)},\n    label: ${json(label)},\n    order: ${Number(source.order || 0) + 5},\n    defaultIconShape: ${json(source.defaultIconShape || "rounded-square")},\n    css: css(${cssEntries}),\n    wallpaper: { type: "advanced", accentSource: { type: "color", light: "#7f94ef", dark: "#5f7dff" } },\n    variants: ${JSON.stringify(source.variants || [])},\n    accents: [],\n    defaultAccent: "",\n    supportsAutoAccent: false,\n    aliases: [],\n    dock: { usesDock: ${dockCss.length > 0}, contentBuilder: "default", css: [${dockEntries}], supportedPositions: ["left", "right", "bottom"] },\n  }),\n`;
}

export async function buildThemeCreationPlan(repoRoot, { sourceTheme = "oneui", newId, label, includeDock = true }) {
  const id = validateThemeId(newId);
  const source = getThemeDefinition(sourceTheme);
  if (!source || source.id !== sourceTheme) throw new Error("Thème source inconnu.");
  if (getThemeDefinitions().some(theme => theme.id === id)) throw new Error(`Le thème ${id} existe déjà.`);

  const sourceBase = source.css?.[0] || `styles/themes/${sourceTheme}.css`;
  const sourceBaseContent = await readFile(resolveRepoFile(repoRoot, sourceBase, new Set([sourceBase])) , "utf8");
  const cssFile = `styles/themes/${id}.css`;
  const files = [{ path: cssFile, content: sourceBaseContent.replaceAll(`[data-theme-style="${sourceTheme}"]`, `[data-theme-style="${id}"]`) }];
  const dockCss = includeDock ? (source.dock?.css || []) : [];
  for (const sourceDock of dockCss) {
    const dockPath = `styles/themes/${id}-dock.css`;
    const sourceDockContent = await readFile(resolveRepoFile(repoRoot, sourceDock, new Set([sourceDock])), "utf8");
    files.push({ path: dockPath, content: sourceDockContent.replaceAll(`[data-theme-style="${sourceTheme}"]`, `[data-theme-style="${id}"]`) });
  }
  const dockFiles = files.slice(1).map(file => file.path);
  const registryPath = resolveRepoFile(repoRoot, REGISTRY_FILE, new Set([REGISTRY_FILE]));
  const registryBefore = await readFile(registryPath, "utf8");
  const marker = "  alexa: normalizeThemeDefinition({";
  if (!registryBefore.includes(marker)) throw new Error("Point d'insertion du registre introuvable.");
  const entry = registryEntry({ id, label: String(label || id), source, css: [cssFile], dockCss: dockFiles });
  const registryAfter = registryBefore.replace(marker, `${entry}${marker}`);
  files.push({ path: REGISTRY_FILE, content: registryAfter, registry: true });
  const existing = await Promise.all(files.map(async file => ({ path: file.path, exists: await stat(resolveRepoFile(repoRoot, file.path, new Set(files.map(item => item.path)))).then(() => true).catch(() => false) })));
  if (existing.some(file => file.exists && file.path !== REGISTRY_FILE)) throw new Error("Un des fichiers du nouveau thème existe déjà.");
  return {
    id,
    label: String(label || id),
    sourceTheme,
    manifestNote: "Le manifest CSS est dérivé du registre; aucune édition séparée n'est requise.",
    registrySha256: hash(registryBefore),
    files: files.map(file => ({ path: file.path, content: file.content, sha256: hash(file.content), kind: file.registry ? "registry" : "theme" })),
  };
}

export async function applyThemeCreationPlan(repoRoot, plan) {
  const id = validateThemeId(plan?.id);
  const expectedThemeFiles = new Set([`styles/themes/${id}.css`, `styles/themes/${id}-dock.css`]);
  const allowedPlanFiles = new Set([REGISTRY_FILE, ...expectedThemeFiles]);
  if (!Array.isArray(plan?.files) || plan.files.length < 2) throw new Error("Plan de création invalide.");
  if (plan.files.some(file => !allowedPlanFiles.has(file.path) || typeof file.content !== "string" || file.content.length > 500_000)) {
    throw new Error("Plan de création refusé: fichier ou contenu non autorisé.");
  }
  const registryFile = plan.files.find(file => file.path === REGISTRY_FILE);
  if (!registryFile || !plan.files.some(file => file.path === `styles/themes/${id}.css`)) throw new Error("Plan de création incomplet.");
  const currentRegistry = await readFile(resolveRepoFile(repoRoot, REGISTRY_FILE, new Set([REGISTRY_FILE])), "utf8");
  if (hash(currentRegistry) !== plan.registrySha256) throw new Error("Le registre a changé depuis la génération du plan.");
  for (const file of plan.files.filter(item => item.path !== REGISTRY_FILE)) {
    const existing = await stat(resolveRepoFile(repoRoot, file.path, allowedPlanFiles)).catch(() => null);
    if (existing) throw new Error(`Le fichier ${file.path} existe déjà.`);
  }
  for (const file of plan.files) await import("node:fs/promises").then(fs => fs.writeFile(resolveRepoFile(repoRoot, file.path, allowedPlanFiles), file.content, "utf8"));
  return { applied: true, files: plan.files.map(({ path, sha256, kind }) => ({ path, sha256, kind })) };
}
