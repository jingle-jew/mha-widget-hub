import path from "node:path";

export const REGISTRY_FILE = "src/settings/theme-registry.js";

export function normalizeRepoRelativePath(value) {
  const input = String(value || "").replaceAll("\\", "/");
  if (!input || input.startsWith("/") || input.includes("\0") || input.split("/").includes("..")) {
    throw new Error("Chemin de fichier refusé.");
  }
  const normalized = path.posix.normalize(input);
  if (normalized === "." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Chemin de fichier refusé.");
  }
  return normalized;
}

export function assertAllowedFile(relativePath, allowedFiles) {
  const normalized = normalizeRepoRelativePath(relativePath);
  if (!allowedFiles.has(normalized)) {
    throw new Error(`Fichier non autorisé par le contrat Theme Studio: ${normalized}`);
  }
  return normalized;
}

export function resolveRepoFile(repoRoot, relativePath, allowedFiles) {
  const safePath = assertAllowedFile(relativePath, allowedFiles);
  const absolute = path.resolve(repoRoot, safePath);
  const root = path.resolve(repoRoot);
  if (absolute !== root && !absolute.startsWith(`${root}${path.sep}`)) {
    throw new Error("Le fichier ciblé est hors du dépôt.");
  }
  return absolute;
}

export function validateThemeId(value) {
  const id = String(value || "").trim().toLowerCase();
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(id)) {
    throw new Error("Identifiant de thème invalide: utilisez 2 à 40 caractères minuscules, chiffres ou tirets.");
  }
  return id;
}
