import { readFile } from "node:fs/promises";
import { getAllowedFiles, readTheme } from "./theme-reader.js";
import { assertAllowedFile, resolveRepoFile } from "./repo-guard.js";
import { applyDeclarationChanges, findDeclaration, formatDiff } from "./theme-parser.js";
import { validateCssValue } from "./theme-validator.js";

export function collectOverrides(themeData, values, mode = "dark") {
  const changes = new Map();
  for (const definition of themeData.controls) {
    if (!definition.available) continue;
    if (definition.mode !== "shared" && definition.mode !== mode) continue;
    if (!(definition.id in values)) continue;
    if (definition.readOnly || definition.control === "readonly") throw new Error(`${definition.label}: token en lecture seule.`);
    const value = validateCssValue(definition, values[definition.id]);
    if (value === definition.value) continue;
    const key = `${definition.file}:${definition.token}:${definition.selector}:${definition.line || ""}`;
    changes.set(key, { ...definition, value });
  }
  return [...changes.values()];
}

export async function buildDiff(repoRoot, themeId, values, mode = "dark") {
  const themeData = await readTheme(repoRoot, themeId);
  const changes = collectOverrides(themeData, values, mode);
  const allowedFiles = getAllowedFiles(themeId);
  const byFile = new Map();
  for (const change of changes) {
    const relativePath = assertAllowedFile(change.file, allowedFiles);
    const current = byFile.get(relativePath) || await readFile(resolveRepoFile(repoRoot, relativePath, allowedFiles), "utf8");
    const declaration = findDeclaration(current, change);
    if (!declaration) throw new Error(`Token introuvable: ${change.token} dans ${relativePath}.`);
    const next = applyDeclarationChanges(current, [{ ...change, declaration }]);
    byFile.set(relativePath, next);
  }
  const files = [...byFile.entries()].map(([path, after]) => {
    const before = themeData.files.find(file => file.path === path)?.content || "";
    return { path, beforeSha256: themeData.files.find(file => file.path === path)?.sha256 || "", diff: formatDiff(path, before, after), before, after };
  });
  return {
    themeId,
    mode,
    changes: changes.map(change => ({ id: change.id, token: change.token, label: change.label, file: change.file, line: themeData.controls.find(item => item.id === change.id)?.line, oldValue: themeData.controls.find(item => item.id === change.id)?.value, newValue: change.value })),
    files,
  };
}
