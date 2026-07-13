import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { buildDiff } from "./diff-service.js";
import { getAllowedFiles, readTheme } from "./theme-reader.js";
import { resolveRepoFile } from "./repo-guard.js";

const hash = value => createHash("sha256").update(value).digest("hex");

export async function applyThemeChanges(repoRoot, themeId, values, mode, snapshots = []) {
  const diff = await buildDiff(repoRoot, themeId, values, mode);
  if (!diff.files.length) return { ...diff, applied: false, message: "Aucun changement à appliquer." };
  const allowedFiles = getAllowedFiles(themeId);
  const expected = new Map(snapshots.map(file => [file.path, file.sha256 || file.beforeSha256]));

  for (const file of diff.files) {
    const current = await readFile(resolveRepoFile(repoRoot, file.path, allowedFiles), "utf8");
    const expectedHash = expected.get(file.path) || file.beforeSha256;
    if (!expectedHash || hash(current) !== expectedHash) {
      const error = new Error(`Le fichier ${file.path} a changé depuis sa lecture. Rechargez le thème avant de sauvegarder.`);
      error.code = "FILE_CONFLICT";
      throw error;
    }
  }

  for (const file of diff.files) {
    await writeFile(resolveRepoFile(repoRoot, file.path, allowedFiles), file.after, "utf8");
  }
  const reloaded = await readTheme(repoRoot, themeId);
  return { ...diff, applied: true, files: diff.files.map(file => ({ path: file.path, sha256: reloaded.files.find(item => item.path === file.path)?.sha256 })) };
}
